'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineX } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { groupAPI } from '@/services/api';

const OPTIONS = [
  { value: 'all', label: 'All members' },
  { value: 'admin_only', label: 'Only admin' },
];

export default function GroupSettingsModal({ group, onClose, onSaved }) {
  const [whoCanRecordCall, setWhoCanRecordCall] = useState('all');
  const [whoCanSendMessages, setWhoCanSendMessages] = useState('all');
  const [whoCanSendFiles, setWhoCanSendFiles] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const s = group?.settings;
    if (s) {
      setWhoCanRecordCall(s.whoCanRecordCall || 'all');
      setWhoCanSendMessages(s.whoCanSendMessages || 'all');
      setWhoCanSendFiles(s.whoCanSendFiles || 'all');
    }
  }, [group]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!group?._id) return;
    setLoading(true);
    try {
      const res = await groupAPI.update(group._id, {
        settings: {
          whoCanRecordCall,
          whoCanSendMessages,
          whoCanSendFiles,
        },
      });
      onSaved?.(res.data.group);
      toast.success('Group settings updated');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
            <h3 className="font-semibold text-gray-900 dark:text-white text-base sm:text-lg">Group settings</h3>
            <button
              type="button"
              onClick={onClose}
              className="min-h-touch min-w-touch flex items-center justify-center p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg touch-manipulation"
            >
              <HiOutlineX className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-3 sm:p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Who can record call
              </label>
              <select
                value={whoCanRecordCall}
                onChange={(e) => setWhoCanRecordCall(e.target.value)}
                className="w-full px-4 py-2.5 min-h-touch bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white"
              >
                {OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Who can send messages
              </label>
              <select
                value={whoCanSendMessages}
                onChange={(e) => setWhoCanSendMessages(e.target.value)}
                className="w-full px-4 py-2.5 min-h-touch bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white"
              >
                {OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Who can send files
              </label>
              <select
                value={whoCanSendFiles}
                onChange={(e) => setWhoCanSendFiles(e.target.value)}
                className="w-full px-4 py-2.5 min-h-touch bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white"
              >
                {OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 min-h-touch border border-gray-300 dark:border-gray-600 rounded-xl font-medium text-gray-700 dark:text-gray-300 touch-manipulation"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 min-h-touch bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-medium rounded-xl touch-manipulation"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
