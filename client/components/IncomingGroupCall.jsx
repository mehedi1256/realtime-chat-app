'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlinePhone, HiOutlinePhoneMissedCall } from 'react-icons/hi';
import useStore from '@/store/useStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function IncomingGroupCall({ onAccept, onReject }) {
  const groupCallState = useStore((s) => s.groupCallState);

  if (!groupCallState || groupCallState.status !== 'ringing' || groupCallState.direction !== 'incoming') {
    return null;
  }

  const from = groupCallState.from;
  const isVideo = groupCallState.type === 'video';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-4 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center gap-3">
          {from?.profilePicture ? (
            <img
              src={`${API_URL}${from.profilePicture}`}
              alt=""
              className="w-14 h-14 rounded-full object-cover"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-2xl font-bold text-primary-600">
              {from?.name?.[0] || '?'}
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">
              {from?.name || 'Unknown'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Incoming {isVideo ? 'video' : 'voice'} group call
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onReject?.()}
            className="p-3 rounded-full bg-red-500 text-white hover:bg-red-600"
          >
            <HiOutlinePhoneMissedCall className="w-6 h-6" />
          </button>
          <button
            onClick={() => onAccept?.()}
            className="p-3 rounded-full bg-green-500 text-white hover:bg-green-600"
          >
            <HiOutlinePhone className="w-6 h-6" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
