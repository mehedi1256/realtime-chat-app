'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { getSocket } from '@/services/socket';
import useStore from '@/store/useStore';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

// High-quality audio constraints for crystal-clear voice
const AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: { ideal: 48000 },
  channelCount: 1,
};

// High-quality video constraints for video calls
const VIDEO_CONSTRAINTS = {
  width: { ideal: 1280, min: 640 },
  height: { ideal: 720, min: 480 },
  frameRate: { ideal: 24, min: 15 },
};

// Increase Opus audio bitrate in SDP for crystal-clear voice (128 kbps)
function setHighQualityAudioInSdp(sdp) {
  if (!sdp) return sdp;
  // Opus fmtp line: add or replace maxaveragebitrate (payload type and order vary by browser)
  return sdp.replace(
    /a=fmtp:(\d+)\s*([^\r\n]*)/g,
    (match, pt, params) => {
      const hasMaxBitrate = /maxaveragebitrate=\d+/.test(params);
      const bitrate = 'maxaveragebitrate=128000';
      if (hasMaxBitrate) {
        return `a=fmtp:${pt} ${params.replace(/maxaveragebitrate=\d+/, bitrate)}`;
      }
      const sep = params.trim() ? ';' : '';
      return `a=fmtp:${pt} ${params.trim()}${sep}${bitrate}`;
    }
  );
}

export default function useWebRTC() {
  const callState = useStore((s) => s.callState);
  const endCallStore = useStore((s) => s.endCall);
  const acceptCallStore = useStore((s) => s.acceptCall);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingOffer = useRef(null);
  const iceCandidateQueue = useRef([]);

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const cleanup = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    iceCandidateQueue.current = [];
    pendingOffer.current = null;
    setLocalStream(null);
    setRemoteStream(null);
  }, []);

  const createPC = useCallback((peerId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    const socket = getSocket();

    pc.onicecandidate = (e) => {
      if (e.candidate && socket) {
        socket.emit('ice_candidate', { to: peerId, candidate: e.candidate });
      }
    };

    pc.ontrack = (e) => {
      setRemoteStream(e.streams[0]);
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        endCall();
      }
    };

    pcRef.current = pc;
    return pc;
  }, []);

  const flushIceCandidates = useCallback(() => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) return;
    while (iceCandidateQueue.current.length > 0) {
      const c = iceCandidateQueue.current.shift();
      pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
    }
  }, []);

  // Start outgoing call: get media, create offer, send via socket
  const startCall = useCallback(async (peer, type) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: AUDIO_CONSTRAINTS,
        video: type === 'video' ? VIDEO_CONSTRAINTS : false,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = createPC(peer._id);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      offer.sdp = setHighQualityAudioInSdp(offer.sdp);
      await pc.setLocalDescription(offer);

      const socket = getSocket();
      socket?.emit('call_user', { to: peer._id, offer, type });
    } catch (err) {
      console.error('Failed to start call:', err);
      cleanup();
      endCallStore();
    }
  }, [createPC, cleanup, endCallStore]);

  // Store offer for incoming call (called when incoming_call socket fires)
  const storeOffer = useCallback((offer) => {
    pendingOffer.current = offer;
  }, []);

  // Accept incoming call: get media, create answer, send via socket
  const acceptCall = useCallback(async () => {
    const cs = useStore.getState().callState;
    if (!cs || !pendingOffer.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: AUDIO_CONSTRAINTS,
        video: cs.type === 'video' ? VIDEO_CONSTRAINTS : false,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = createPC(cs.peerId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(pendingOffer.current));
      pendingOffer.current = null;

      const answer = await pc.createAnswer();
      answer.sdp = setHighQualityAudioInSdp(answer.sdp);
      await pc.setLocalDescription(answer);

      const socket = getSocket();
      socket?.emit('call_accepted', { to: cs.peerId, answer });

      flushIceCandidates();
      acceptCallStore();
    } catch (err) {
      console.error('Failed to accept call:', err);
      cleanup();
      endCallStore();
    }
  }, [createPC, flushIceCandidates, acceptCallStore, cleanup, endCallStore]);

  // Handle call_accepted from remote (for outgoing calls)
  const handleCallAccepted = useCallback(async ({ answer }) => {
    const pc = pcRef.current;
    if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
    flushIceCandidates();
    acceptCallStore();
  }, [flushIceCandidates, acceptCallStore]);

  // Handle ice candidate from remote
  const handleIceCandidate = useCallback(({ candidate }) => {
    const pc = pcRef.current;
    if (pc && pc.remoteDescription) {
      pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
    } else {
      iceCandidateQueue.current.push(candidate);
    }
  }, []);

  // End call
  const endCall = useCallback(() => {
    const cs = useStore.getState().callState;
    const socket = getSocket();
    if (socket && cs?.peerId) {
      socket.emit('call_ended', { to: cs.peerId });
    }
    cleanup();
    endCallStore();
  }, [cleanup, endCallStore]);

  // Reject incoming call
  const rejectCall = useCallback(() => {
    const cs = useStore.getState().callState;
    const socket = getSocket();
    if (socket && cs?.peerId) {
      socket.emit('call_rejected', { to: cs.peerId });
    }
    cleanup();
    endCallStore();
  }, [cleanup, endCallStore]);

  // Handle remote ending/rejecting
  const handleRemoteEnd = useCallback(() => {
    cleanup();
    endCallStore();
  }, [cleanup, endCallStore]);

  // Toggle audio
  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      return !track.enabled;
    }
    return false;
  }, []);

  // Toggle video
  const toggleCamera = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      return !track.enabled;
    }
    return false;
  }, []);

  return {
    localStream,
    remoteStream,
    startCall,
    storeOffer,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
    handleCallAccepted,
    handleIceCandidate,
    handleRemoteEnd,
  };
}
