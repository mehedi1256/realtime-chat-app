'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineX } from 'react-icons/hi';
import Avatar from './Avatar';
import { userAPI, groupAPI } from '@/services/api';
import { getSocket } from '@/services/socket';
import toast from 'react-hot-toast';

export default function AddGroupMembersModal({ group, onClose, onAdded }) {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);

  const memberIds = (group?.groupMembers || []).map((m) => (typeof m === 'object' ? m._id : m));

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await userAPI.getUsers();
        const list = (res.data.users || []).filter((u) => !memberIds.includes(u._id));
        setUsers(list);
      } catch {
        setUsers([]);
      }
    };
    fetch();
  }, [group?._id, memberIds.join(',')]);

  const filtered = search.trim()
    ? users.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()))
    : users;

  const toggleUser = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedIds.size === 0) {
      toast.error('Select at least one user');
      return;
    }
    setLoading(true);
    try {
      const memberIdsToAdd = Array.from(selectedIds);
      const res = await groupAPI.addMembers(group._id, memberIdsToAdd);
      const socket = getSocket();
      if (socket) {
        socket.emit('group_members_added', {
          groupId: group._id,
          group: res.data.group,
          addedIds: memberIdsToAdd,
        });
      }
      onAdded(res.data.group);
      toast.success(`Added ${memberIdsToAdd.length} member(s)`);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add members');
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
          className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col"
        >
          <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white text-base sm:text-lg">Add members</h3>
            <button type="button" onClick={onClose} className="min-h-touch min-w-touch flex items-center justify-center p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg touch-manipulation">
              <HiOutlineX className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="p-3 sm:p-4 overflow-y-auto">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users"
                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-primary-500 text-sm"
              />
              <div className="max-h-64 overflow-y-auto mt-3 border border-gray-200 dark:border-gray-600 rounded-xl divide-y dark:divide-gray-600">
                {filtered.length === 0 ? (
                  <p className="p-4 text-sm text-gray-500 text-center">No users to add</p>
                ) : (
                  filtered.map((u) => (
                    <label
                      key={u._id}
                      className="flex items-center gap-3 p-3 min-h-touch hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer touch-manipulation"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(u._id)}
                        onChange={() => toggleUser(u._id)}
                        className="w-4 h-4 rounded text-primary-500"
                      />
                      <Avatar user={u} size="sm" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {u.name}
                      </span>
                    </label>
                  ))
                )}
              </div>
              {selectedIds.size > 0 && (
                <p className="text-xs text-gray-500 mt-2">{selectedIds.size} selected</p>
              )}
            </div>

            <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 flex gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 min-h-touch border border-gray-300 dark:border-gray-600 rounded-xl font-medium text-gray-700 dark:text-gray-300 touch-manipulation"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || selectedIds.size === 0}
                className="flex-1 py-2.5 min-h-touch bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-medium rounded-xl touch-manipulation"
              >
                {loading ? 'Adding...' : 'Add'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
