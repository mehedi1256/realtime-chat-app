'use client';

import { HiOutlineSun, HiOutlineMoon } from 'react-icons/hi';
import { motion } from 'framer-motion';
import useStore from '@/store/useStore';

export default function DarkModeToggle() {
  const darkMode = useStore((s) => s.darkMode);
  const toggleDarkMode = useStore((s) => s.toggleDarkMode);

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={toggleDarkMode}
      className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {darkMode ? (
        <HiOutlineSun className="w-5 h-5 text-yellow-400" />
      ) : (
        <HiOutlineMoon className="w-5 h-5 text-gray-600" />
      )}
    </motion.button>
  );
}
