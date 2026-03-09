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

const AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: { ideal: 48000 },
  channelCount: 1,
};

const VIDEO_CONSTRAINTS = {
  width: { ideal: 1280, min: 640 },
  height: { ideal: 720, min: 480 },
  frameRate: { ideal: 24, min: 15 },
};

function setHighQualityAudioInSdp(sdp) {
  if (!sdp) return sdp;
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

export default function useGroupCall() {
  const groupCallState = useStore((s) => s.groupCallState);
  const endGroupCallStore = useStore((s) => s.endGroupCall);
  const setGroupCallState = useStore((s) => s.setGroupCallState);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingOfferRef = useRef(null);
  const iceQueueRef = useRef([]);
  const remoteUserIdRef = useRef(null);

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [participants, setParticipants] = useState([]);

  const groupId = groupCallState?.groupId;

  const cleanup = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    iceQueueRef.current = [];
    pendingOfferRef.current = null;
    remoteUserIdRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setParticipants([]);
  }, []);

  const createPC = useCallback((peerUserId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    const socket = getSocket();

    pc.onicecandidate = (e) => {
      if (e.candidate && socket && groupId) {
        socket.emit('webrtc_ice_candidate', { groupId, toUserId: peerUserId, candidate: e.candidate });
      }
    };

    pc.ontrack = (e) => {
      if (e.streams?.[0]) setRemoteStream(e.streams[0]);
    };

    pcRef.current = pc;
    remoteUserIdRef.current = peerUserId;
    return pc;
  }, [groupId]);

  const flushIceQueue = useCallback(() => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) return;
    while (iceQueueRef.current.length > 0) {
      const c = iceQueueRef.current.shift();
      pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
    }
  }, []);

  const startGroupCall = useCallback(async (gId, type) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: AUDIO_CONSTRAINTS,
        video: type === 'video' ? VIDEO_CONSTRAINTS : false,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      const socket = getSocket();
      if (socket) socket.emit('group_call_start', { groupId: gId, type });
      const s = useStore.getState().groupCallState;
      if (s) setGroupCallState({ ...s, status: 'connected' });
    } catch (err) {
      console.error('Group call getMedia failed:', err);
      cleanup();
      endGroupCallStore();
    }
  }, [setGroupCallState, cleanup, endGroupCallStore]);

  const joinGroupCall = useCallback(async (gId, type) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: AUDIO_CONSTRAINTS,
        video: type === 'video' ? VIDEO_CONSTRAINTS : false,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      const socket = getSocket();
      if (socket) socket.emit('join_group_call', { groupId: gId });
      const s = useStore.getState().groupCallState;
      if (s) setGroupCallState({ ...s, status: 'connected' });
    } catch (err) {
      console.error('Group call join getMedia failed:', err);
      cleanup();
      endGroupCallStore();
    }
  }, [setGroupCallState, cleanup, endGroupCallStore]);

  const leaveGroupCall = useCallback(() => {
    const socket = getSocket();
    if (socket && groupId) {
      socket.emit('leave_group_call', { groupId });
    }
    cleanup();
    endGroupCallStore();
  }, [groupId, cleanup, endGroupCallStore]);

  const endGroupCallAsInitiator = useCallback(() => {
    const socket = getSocket();
    if (socket && groupId) {
      socket.emit('end_group_call', { groupId });
    }
    cleanup();
    endGroupCallStore();
  }, [groupId, cleanup, endGroupCallStore]);

  useEffect(() => {
    if (!groupId) return;
    const socket = getSocket();
    if (!socket) return;

    const onParticipantJoined = async ({ userId: peerId, name, profilePicture }) => {
      setParticipants((p) => [...p.filter((x) => x.userId !== peerId), { userId: peerId, name, profilePicture }]);
      if (!localStreamRef.current) return;
      const pc = createPC(peerId);
      localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current));
      const offer = await pc.createOffer();
      offer.sdp = setHighQualityAudioInSdp(offer.sdp);
      await pc.setLocalDescription(offer);
      socket.emit('webrtc_offer', { groupId, toUserId: peerId, offer });
    };

    const onWebrtcOffer = async ({ from, offer }) => {
      pendingOfferRef.current = { from, offer };
      if (!localStreamRef.current) return;
      const pc = createPC(from);
      localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current));
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      pendingOfferRef.current = null;
      const answer = await pc.createAnswer();
      answer.sdp = setHighQualityAudioInSdp(answer.sdp);
      await pc.setLocalDescription(answer);
      socket.emit('webrtc_answer', { groupId, toUserId: from, answer });
      flushIceQueue();
    };

    const onWebrtcAnswer = ({ from, answer }) => {
      const pc = pcRef.current;
      if (pc) {
        pc.setRemoteDescription(new RTCSessionDescription(answer)).then(flushIceQueue).catch(() => {});
      }
    };

    const onIceCandidate = ({ from, candidate }) => {
      const pc = pcRef.current;
      if (pc && pc.remoteDescription) {
        pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
      } else {
        iceQueueRef.current.push(candidate);
      }
    };

    socket.on('group_call_participant_joined', onParticipantJoined);
    socket.on('webrtc_offer', onWebrtcOffer);
    socket.on('webrtc_answer', onWebrtcAnswer);
    socket.on('webrtc_ice_candidate', onIceCandidate);

    return () => {
      socket.off('group_call_participant_joined', onParticipantJoined);
      socket.off('webrtc_offer', onWebrtcOffer);
      socket.off('webrtc_answer', onWebrtcAnswer);
      socket.off('webrtc_ice_candidate', onIceCandidate);
    };
  }, [groupId, createPC, flushIceQueue]);

  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      return !track.enabled;
    }
    return false;
  }, []);

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
    participants,
    startGroupCall,
    joinGroupCall,
    leaveGroupCall,
    endGroupCallAsInitiator,
    toggleMute,
    toggleCamera,
  };
}
