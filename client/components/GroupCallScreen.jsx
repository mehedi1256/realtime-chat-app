'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlinePhone, HiOutlineMicrophone, HiOutlineVideoCamera } from 'react-icons/hi';
import toast from 'react-hot-toast';
import Avatar from './Avatar';
import useStore from '@/store/useStore';
import { saveRecording } from '@/utils/recordingsDB';

export default function GroupCallScreen({
  localStream,
  remoteStream,
  participants,
  onEndCall,
  onLeaveCall,
  onToggleMute,
  onToggleCamera,
  isInitiator,
  canRecord = true,
}) {
  const groupCallState = useStore((s) => s.groupCallState);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const timerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordChunksRef = useRef([]);

  const isVideo = groupCallState?.type === 'video';
  const isConnected = groupCallState?.status === 'connected';

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (isConnected) {
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isConnected]);

  // Stop recording when call ends
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const handleEnd = () => {
    if (isInitiator) onEndCall?.();
    else onLeaveCall?.();
  };

  const formatDuration = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const startRecording = () => {
    if (!remoteStream || remoteStream.getTracks().length === 0) {
      toast.error('Wait for the call to connect');
      return;
    }
    const mimeVideo = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : 'video/webm';
    const mimeAudio = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';
    const mime = isVideo ? mimeVideo : mimeAudio;
    try {
      const recorder = new MediaRecorder(remoteStream, { mimeType: mime });
      recordChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        if (recordChunksRef.current.length === 0) return;
        const blob = new Blob(recordChunksRef.current, { type: mime });
        const name = `Group call - ${new Date().toLocaleString()}`;
        try {
          await saveRecording({
            type: isVideo ? 'video' : 'audio',
            blob,
            name,
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `group-call-recording-${Date.now()}.webm`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toast.success('Recording saved and downloaded');
        } catch (err) {
          toast.error('Failed to save recording');
        }
      };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      toast.success('Recording started');
    } catch (err) {
      toast.error('Recording not supported');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setIsRecording(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-gray-900 flex flex-col"
      >
        <div className="flex-1 flex flex-col md:flex-row gap-4 p-4">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0">
            {remoteStream && (
              <div className="relative rounded-xl overflow-hidden bg-gray-800">
                {isVideo ? (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Avatar
                      user={participants?.[0] ? { name: participants[0].name, profilePicture: participants[0].profilePicture } : null}
                      size="xl"
                      className="w-24 h-24"
                    />
                  </div>
                )}
                <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/50 text-white text-sm">
                  {(participants && participants[0]?.name) || 'Participant'}
                </div>
              </div>
            )}
            <div className="relative rounded-xl overflow-hidden bg-gray-800">
              {localStream && (
                isVideo ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover mirror"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-4xl font-bold text-gray-400">You</span>
                  </div>
                )
              )}
              <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/50 text-white text-sm">
                You
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 flex items-center justify-center gap-4 bg-black/30">
          <span className="text-white font-mono">{formatDuration(duration)}</span>
          <button
            onClick={() => {
              const muted = onToggleMute?.();
              setIsMuted(!!muted);
            }}
            className={`p-4 rounded-full transition-colors ${
              isMuted ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            <HiOutlineMicrophone className="w-6 h-6" />
          </button>

          {isConnected && canRecord && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-4 rounded-full transition-colors ${
                isRecording ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
              title={isRecording ? 'Stop recording' : 'Record group call'}
            >
              {isRecording ? (
                <span className="relative flex items-center justify-center">
                  <span className="w-5 h-5 rounded-sm bg-white" />
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                </span>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="6" />
                </svg>
              )}
            </motion.button>
          )}

          <button
            onClick={handleEnd}
            className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600"
            title={isInitiator ? 'End call for everyone' : 'Leave call'}
          >
            <HiOutlinePhone className="w-6 h-6 rotate-[135deg]" />
          </button>
          <button
            onClick={() => {
              const off = onToggleCamera?.();
              setIsCamOff(!!off);
            }}
            className={`p-4 rounded-full transition-colors ${
              isCamOff ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'
            }`}
            title={isCamOff ? 'Turn on camera' : 'Turn off camera'}
          >
            <HiOutlineVideoCamera className="w-6 h-6" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
