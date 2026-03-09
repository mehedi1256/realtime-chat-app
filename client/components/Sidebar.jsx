'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineSearch, HiOutlineLogout, HiOutlineVideoCamera } from 'react-icons/hi';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Avatar from './Avatar';
import DarkModeToggle from './DarkModeToggle';
import { userAPI } from '@/services/api';
import { decryptMessage, generateConversationKey } from '@/utils/encryption';
import { formatMessageTime } from '@/utils/formatTime';
import useStore from '@/store/useStore';
import { disconnectSocket } from '@/services/socket';

export default function Sidebar({ onSelectUser, isMobileOpen }) {
  const router = useRouter();
  const user = useStore((s) => s.user);
  const users = useStore((s) => s.users);
  const setUsers = useStore((s) => s.setUsers);
  const selectedUser = useStore((s) => s.selectedUser);
  const logout = useStore((s) => s.logout);

  const [search, setSearch] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await userAPI.getUsers();
      setUsers(res.data.users);
    } catch {
      // Silently fail, will retry on next interaction
    }
  }, [setUsers]);

  useEffect(() => {
    fetchUsers();
    const interval = setInterval(fetchUsers, 30000);
    return () => clearInterval(interval);
  }, [fetchUsers]);

  useEffect(() => {
    if (search.trim()) {
      const q = search.toLowerCase();
      setFilteredUsers(users.filter((u) => u.name.toLowerCase().includes(q)));
    } else {
      setFilteredUsers(users);
    }
  }, [search, users]);

  const handleLogout = () => {
    disconnectSocket();
    logout();
    toast.success('Logged out');
    router.push('/login');
  };

  const getLastMessagePreview = (u) => {
    if (!u.lastMessage) return '';
    if (u.lastMessage.fileUrl) return '📎 File';
    if (!u.lastMessage.encryptedMessage) return '';
    const key = generateConversationKey(user?._id, u._id);
    const decrypted = decryptMessage(u.lastMessage.encryptedMessage, key);
    return decrypted.length > 35 ? decrypted.slice(0, 35) + '...' : decrypted;
  };

  return (
    <div
      className={`h-full flex flex-col bg-chat-sidebar dark:bg-chat-sidebar-dark border-r border-gray-200 dark:border-gray-700 ${
        isMobileOpen ? 'block' : 'hidden md:flex'
      }`}
    >
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar user={user} size="md" />
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
                {user?.name}
              </h2>
              <p className="text-xs text-green-500">Online</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href="/recordings"
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-500"
              title="Recordings"
            >
              <HiOutlineVideoCamera className="w-5 h-5" />
            </Link>
            <DarkModeToggle />
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-500"
              title="Logout"
            >
              <HiOutlineLogout className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="relative">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search or start a new chat"
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-chat-input-dark rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 outline-none border border-gray-200 dark:border-gray-600 focus:border-primary-500 transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <AnimatePresence>
          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              {search ? 'No users found' : 'No conversations yet'}
            </div>
          ) : (
            filteredUsers.map((u) => (
              <motion.div
                key={u._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => onSelectUser(u)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/50 ${
                  selectedUser?._id === u._id
                    ? 'bg-gray-200 dark:bg-gray-700'
                    : ''
                }`}
              >
                <Avatar user={u} size="lg" showOnline />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                      {u.name}
                    </h3>
                    {u.lastMessage && (
                      <span className="text-[11px] text-gray-400 flex-shrink-0">
                        {formatMessageTime(u.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {u.lastMessage?.sender === user?._id && (
                        <span className="text-gray-400">You: </span>
                      )}
                      {getLastMessagePreview(u) || 'Start a conversation'}
                    </p>
                    {u.unreadCount > 0 && (
                      <span className="flex-shrink-0 w-5 h-5 bg-primary-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                        {u.unreadCount > 99 ? '99+' : u.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
