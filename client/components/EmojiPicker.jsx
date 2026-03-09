'use client';

import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { HiOutlineEmojiHappy } from 'react-icons/hi';
import useStore from '@/store/useStore';

const Picker = dynamic(
  () => import('emoji-picker-react').then((mod) => mod.default),
  { ssr: false, loading: () => <span className="inline-block w-8 h-8" /> }
);

export default function EmojiPicker({ onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const darkMode = useStore((s) => s.darkMode);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
      >
        <HiOutlineEmojiHappy className="w-6 h-6" />
      </button>
      {open && (
        <div className="absolute bottom-12 left-0 z-50">
          <Picker
            onEmojiClick={(emojiData) => {
              onSelect(emojiData.emoji);
              setOpen(false);
            }}
            theme={darkMode ? 'dark' : 'light'}
            width={320}
            height={400}
            searchDisabled={false}
            skinTonesDisabled
            previewConfig={{ showPreview: false }}
          />
        </div>
      )}
    </div>
  );
}
