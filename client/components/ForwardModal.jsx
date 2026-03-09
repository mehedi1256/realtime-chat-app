'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineX } from 'react-icons/hi';
import Avatar from './Avatar';

export default function ForwardModal({ users, currentUserId, fileName, onClose, onForward }) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);

  const toggleUser = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const ids = users.filter((u) => u._id !== currentUserId).map((u) => u._id);
    setSelectedIds(new Set(ids));
  };

  const handleForward = async () => {
    if (selectedIds.size === 0) return;
    setLoading(true);
    try {
      await onForward(Array.from(selectedIds));
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const list = users.filter((u) => u._id !== currentUserId);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col"
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">Forward to</h3>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <HiOutlineX className="w-5 h-5" />
            </button>
          </div>

          {fileName && (
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 text-sm text-gray-600 dark:text-gray-300 truncate">
              File: {fileName}
            </div>
          )}

          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {selectedIds.size} selected
            </span>
            <button
              type="button"
              onClick={selectAll}
              className="text-sm text-primary-500 hover:text-primary-600 font-medium"
            >
              Select all
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 max-h-64">
            {list.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 p-4 text-center">
                No other users to forward to.
              </p>
            ) : (
              <ul className="space-y-0.5">
                {list.map((u) => (
                  <li key={u._id}>
                    <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(u._id)}
                        onChange={() => toggleUser(u._id)}
                        className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                      />
                      <Avatar user={u} size="sm" showOnline />
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {u.name}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleForward}
              disabled={selectedIds.size === 0 || loading}
              className="flex-1 py-2.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
            >
              {loading ? 'Sending...' : `Forward to ${selectedIds.size}`}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
