'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlinePhone, HiOutlineVideoCamera } from 'react-icons/hi';
import Avatar from './Avatar';
import useStore from '@/store/useStore';
import { getSocket } from '@/services/socket';

export default function IncomingCall({ offer, onAccept }) {
  const callState = useStore((s) => s.callState);
  const endCallState = useStore((s) => s.endCall);

  const isVisible =
    callState?.direction === 'incoming' && callState?.status === 'ringing';

  const handleReject = () => {
    const socket = getSocket();
    if (socket && callState?.peerId) {
      socket.emit('call_rejected', { to: callState.peerId });
    }
    endCallState();
  };

  const handleAccept = () => {
    onAccept();
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -40 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[110] w-[92%] max-w-sm"
      >
        <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl shadow-black/40 p-5">
          {/* Caller info */}
          <div className="flex items-center gap-4 mb-5">
            <div className="relative">
              <motion.div
                className="absolute inset-0 rounded-full bg-primary-500/20"
                animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
              />
              <Avatar
                user={{
                  name: callState.peerName,
                  profilePicture: callState.peerPicture,
                }}
                size="lg"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold text-base truncate">
                {callState.peerName}
              </h3>
              <p className="text-gray-400 text-sm flex items-center gap-1.5">
                {callState.type === 'video' ? (
                  <>
                    <HiOutlineVideoCamera className="w-4 h-4" />
                    Incoming video call
                  </>
                ) : (
                  <>
                    <HiOutlinePhone className="w-4 h-4" />
                    Incoming audio call
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-8">
            <div className="flex flex-col items-center gap-1.5">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleReject}
                className="w-14 h-14 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center shadow-lg shadow-red-600/20"
              >
                <HiOutlinePhone className="w-6 h-6 text-white rotate-[135deg]" />
              </motion.button>
              <span className="text-gray-400 text-xs">Decline</span>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <motion.button
                whileTap={{ scale: 0.9 }}
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                onClick={handleAccept}
                className="w-14 h-14 bg-green-600 hover:bg-green-700 rounded-full flex items-center justify-center shadow-lg shadow-green-600/20"
              >
                {callState.type === 'video' ? (
                  <HiOutlineVideoCamera className="w-6 h-6 text-white" />
                ) : (
                  <HiOutlinePhone className="w-6 h-6 text-white" />
                )}
              </motion.button>
              <span className="text-gray-400 text-xs">Accept</span>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
