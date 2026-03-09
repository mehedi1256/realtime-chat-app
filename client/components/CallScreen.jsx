'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlinePhone, HiOutlineMicrophone, HiOutlineVideoCamera } from 'react-icons/hi';
import toast from 'react-hot-toast';
import Avatar from './Avatar';
import useStore from '@/store/useStore';
import { saveRecording } from '@/utils/recordingsDB';

export default function CallScreen({ localStream, remoteStream, onEndCall, onToggleMute, onToggleCamera }) {
  const callState = useStore((s) => s.callState);
  const currentUser = useStore((s) => s.user);

  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const timerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordChunksRef = useRef([]);

  const isVideo = callState?.type === 'video';
  const isConnected = callState?.status === 'connected';
  const isRinging = callState?.status === 'ringing';

  // Attach local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Duration timer
  useEffect(() => {
    if (isConnected) {
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isConnected]);

  // Stop recording when call ends
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const handleToggleMute = () => {
    const muted = onToggleMute();
    setIsMuted(muted);
  };

  const handleToggleCamera = () => {
    const off = onToggleCamera();
    setIsCamOff(off);
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
        const name = `Call with ${callState.peerName} - ${new Date().toLocaleString()}`;
        try {
          await saveRecording({
            type: isVideo ? 'video' : 'audio',
            blob,
            name,
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `call-recording-${Date.now()}.webm`;
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

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (!callState) return null;

  const peerUser = { name: callState.peerName, profilePicture: callState.peerPicture };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-gray-900 flex flex-col"
      >
        {isVideo ? (
          <div className="flex-1 relative bg-black">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {!isConnected && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-gray-900/80 to-gray-900">
                <Avatar user={peerUser} size="xl" />
                <h2 className="text-white text-xl font-semibold mt-4">{callState.peerName}</h2>
                <p className="text-gray-300 text-sm mt-1">
                  {isRinging
                    ? callState.direction === 'outgoing' ? 'Ringing...' : 'Incoming call...'
                    : 'Connecting...'}
                </p>
              </div>
            )}

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute top-4 right-4 w-32 h-44 md:w-40 md:h-56 rounded-2xl overflow-hidden shadow-2xl border-2 border-gray-700 bg-gray-800"
            >
              {isCamOff ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Avatar user={currentUser} size="lg" />
                </div>
              ) : (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
              )}
            </motion.div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-primary-900 via-gray-900 to-gray-900">
            <motion.div
              animate={isRinging ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="relative">
                <div className={`rounded-full p-1 ${isConnected ? 'ring-4 ring-green-500/30' : 'ring-4 ring-primary-500/30'}`}>
                  <Avatar user={peerUser} size="xl" />
                </div>
                {isRinging && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-primary-400"
                    animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                  />
                )}
              </div>
            </motion.div>
            <h2 className="text-white text-2xl font-semibold mt-6">{callState.peerName}</h2>
            <p className="text-gray-400 mt-2">
              {isConnected
                ? formatDuration(duration)
                : isRinging
                  ? callState.direction === 'outgoing' ? 'Ringing...' : 'Incoming audio call...'
                  : 'Connecting...'}
            </p>
            <audio ref={remoteVideoRef} autoPlay className="hidden" />
          </div>
        )}

        {isVideo && isConnected && (
          <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
            <span className="text-white text-sm font-medium">{formatDuration(duration)}</span>
          </div>
        )}

        <div className="bg-gray-900/95 backdrop-blur-sm border-t border-gray-800 px-6 py-5">
          <div className="flex items-center justify-center gap-6">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleToggleMute}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                isMuted ? 'bg-red-500/20 text-red-400' : 'bg-gray-700 text-white hover:bg-gray-600'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <HiOutlineMicrophone className="w-6 h-6" />
              )}
            </motion.button>

            {isConnected && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                  isRecording ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
                title={isRecording ? 'Stop recording' : 'Record call'}
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

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onEndCall}
              className="w-16 h-16 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-red-600/30"
            >
              <HiOutlinePhone className="w-7 h-7 rotate-[135deg]" />
            </motion.button>

            {isVideo && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleToggleCamera}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                  isCamOff ? 'bg-red-500/20 text-red-400' : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
                title={isCamOff ? 'Turn on camera' : 'Turn off camera'}
              >
                {isCamOff ? (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 18V6a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
                  </svg>
                ) : (
                  <HiOutlineVideoCamera className="w-6 h-6" />
                )}
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
