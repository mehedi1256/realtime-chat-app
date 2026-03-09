'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { HiOutlineArrowLeft } from 'react-icons/hi';
import useStore from '@/store/useStore';
import AudioRecorder from '@/components/AudioRecorder';
import VideoRecorder from '@/components/VideoRecorder';

export default function RecordingsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const hasHydrated = useStore((s) => s.hasHydrated);
  const token = useStore((s) => s.token);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!token) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [hasHydrated, token, router, pathname]);

  if (!hasHydrated || !token) return null;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 overflow-x-hidden">
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 sm:px-4 py-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/chat"
            className="min-h-touch min-w-touch flex items-center justify-center p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors touch-manipulation -ml-1"
          >
            <HiOutlineArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </Link>
          <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate flex-1 min-w-0">
            Audio & Video Recorder
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 ml-9 sm:ml-11">
          Recordings are saved in your browser (IndexedDB) and stay on this device.
        </p>
      </header>

      <main className="p-3 sm:p-4 max-w-2xl mx-auto space-y-4 sm:space-y-6">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <AudioRecorder />
        </motion.section>
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <VideoRecorder />
        </motion.section>
      </main>
    </div>
  );
}
