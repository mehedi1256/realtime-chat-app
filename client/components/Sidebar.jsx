'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineSearch, HiOutlineLogout, HiOutlineVideoCamera, HiOutlineUserGroup, HiOutlinePlus } from 'react-icons/hi';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Avatar from './Avatar';
import DarkModeToggle from './DarkModeToggle';
import CreateGroupModal from './CreateGroupModal';
import { userAPI, groupAPI } from '@/services/api';
import { decryptMessage, generateConversationKey } from '@/utils/encryption';
import { formatMessageTime } from '@/utils/formatTime';
import useStore from '@/store/useStore';
import { disconnectSocket, getSocket } from '@/services/socket';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function Sidebar({ onSelectUser, onSelectGroup, isMobileOpen }) {
  const router = useRouter();
  const user = useStore((s) => s.user);
  const users = useStore((s) => s.users);
  const setUsers = useStore((s) => s.setUsers);
  const groups = useStore((s) => s.groups);
  const setGroups = useStore((s) => s.setGroups);
  const selectedUser = useStore((s) => s.selectedUser);
  const selectedGroup = useStore((s) => s.selectedGroup);
  const updateGroupInList = useStore((s) => s.updateGroupInList);
  const logout = useStore((s) => s.logout);

  const [search, setSearch] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [activeTab, setActiveTab] = useState('chats');

  const fetchUsers = useCallback(async () => {
    try {
      const res = await userAPI.getUsers();
      setUsers(res.data.users);
    } catch {
      // Silently fail, will retry on next interaction
    }
  }, [setUsers]);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await groupAPI.getMyGroups();
      setGroups(res.data.groups || []);
    } catch {
      setGroups([]);
    }
  }, [setGroups]);

  useEffect(() => {
    fetchUsers();
    const interval = setInterval(fetchUsers, 30000);
    return () => clearInterval(interval);
  }, [fetchUsers]);

  useEffect(() => {
    fetchGroups();
    const interval = setInterval(fetchGroups, 30000);
    return () => clearInterval(interval);
  }, [fetchGroups]);

  useEffect(() => {
    if (search.trim()) {
      const q = search.toLowerCase();
      setFilteredUsers(users.filter((u) => u.name.toLowerCase().includes(q)));
      setFilteredGroups(groups.filter((g) => g.groupName?.toLowerCase().includes(q)));
    } else {
      setFilteredUsers(users);
      setFilteredGroups(groups);
    }
  }, [search, users, groups]);

  const handleLogout = () => {
    disconnectSocket();
    logout();
    toast.success('Logged out');
    router.push('/login');
  };

  const getLastMessagePreview = (u) => {
    if (!u.lastMessage) return '';
    if (u.lastMessage.fileUrl || (u.lastMessage.fileName && u.lastMessage.encryptedMessage)) return '📎 File';
    if (!u.lastMessage.encryptedMessage) return '';
    const key = generateConversationKey(user?._id, u._id);
    const decrypted = decryptMessage(u.lastMessage.encryptedMessage, key);
    return decrypted.length > 35 ? decrypted.slice(0, 35) + '...' : decrypted;
  };

  const getGroupLastPreview = (g) => {
    if (!g.lastMessage) return 'No messages yet';
    if (g.lastMessage.fileUrl || g.lastMessage.fileName) return '📎 File';
    return g.lastMessage.encryptedMessage ? 'Encrypted message' : 'No messages yet';
  };

  const handleCreateGroup = async (data) => {
    const res = await groupAPI.create({
      groupName: data.groupName,
      memberIds: data.memberIds,
      groupAvatar: data.groupAvatar,
    });
    const current = useStore.getState().groups || [];
    setGroups([res.data.group, ...current]);
    onSelectGroup?.(res.data.group);
    setShowCreateGroup(false);
    toast.success('Group created');
  };

  return (
    <div
      className={`h-full flex flex-col bg-chat-sidebar dark:bg-chat-sidebar-dark border-r border-gray-200 dark:border-gray-700 ${
        isMobileOpen ? 'block' : 'hidden md:flex'
      }`}
    >
      <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Avatar user={user} size="md" />
            <div className="min-w-0">
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                {user?.name}
              </h2>
              <p className="text-xs text-green-500">Online</p>
            </div>
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
            <Link
              href="/recordings"
              className="min-h-touch min-w-touch flex items-center justify-center p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-500 touch-manipulation"
              title="Recordings"
            >
              <HiOutlineVideoCamera className="w-5 h-5 sm:w-5 sm:h-5" />
            </Link>
            <DarkModeToggle />
            <button
              type="button"
              onClick={handleLogout}
              className="min-h-touch min-w-touch flex items-center justify-center p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-500 touch-manipulation"
              title="Logout"
            >
              <HiOutlineLogout className="w-5 h-5 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        <div className="relative">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats and groups"
            className="w-full pl-9 pr-4 py-2.5 sm:py-2 bg-white dark:bg-chat-input-dark rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 outline-none border border-gray-200 dark:border-gray-600 focus:border-primary-500 transition-colors min-h-touch"
          />
        </div>

        <div className="flex mt-2 gap-1 p-1 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('chats')}
            className={`flex-1 py-2 sm:py-1.5 rounded-md text-sm font-medium transition-colors min-h-touch touch-manipulation ${
              activeTab === 'chats'
                ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Chats
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('groups')}
            className={`flex-1 py-2 sm:py-1.5 rounded-md text-sm font-medium transition-colors min-h-touch touch-manipulation ${
              activeTab === 'groups'
                ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Groups
          </button>
        </div>
        {activeTab === 'groups' && (
          <button
            type="button"
            onClick={() => setShowCreateGroup(true)}
            className="mt-2 w-full flex items-center justify-center gap-2 py-3 sm:py-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-sm min-h-touch touch-manipulation"
          >
            <HiOutlinePlus className="w-4 h-4" /> New group
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin min-h-0">
        {activeTab === 'chats' && (
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
                className={`flex items-center gap-3 px-3 sm:px-4 py-3 min-h-touch cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/50 active:bg-gray-200 dark:active:bg-gray-600 touch-manipulation ${
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
        )}

        {activeTab === 'groups' && (
          <AnimatePresence>
            {filteredGroups.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                {search ? 'No groups found' : 'No groups yet. Create one!'}
              </div>
            ) : (
              filteredGroups.map((g) => (
                <motion.div
                  key={g._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => onSelectGroup(g)}
                  className={`flex items-center gap-3 px-3 sm:px-4 py-3 min-h-touch cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/50 active:bg-gray-200 dark:active:bg-gray-600 touch-manipulation ${
                    selectedGroup?._id === g._id ? 'bg-gray-200 dark:bg-gray-700' : ''
                  }`}
                >
                  {g.groupAvatar ? (
                    <img
                      src={`${API_URL}${g.groupAvatar}`}
                      alt=""
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover flex-shrink-0 max-w-full"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0">
                      <HiOutlineUserGroup className="w-6 h-6 text-primary-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                        {g.groupName}
                      </h3>
                      {g.lastMessage && (
                        <span className="text-[11px] text-gray-400 flex-shrink-0">
                          {formatMessageTime(g.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {g.groupMembers?.length > 0 && (
                        <span>{g.groupMembers.length} members · </span>
                      )}
                      {getGroupLastPreview(g)}
                    </p>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        )}
      </div>

      {showCreateGroup && (
        <CreateGroupModal
          onClose={() => setShowCreateGroup(false)}
          onCreate={handleCreateGroup}
        />
      )}
    </div>
  );
}
