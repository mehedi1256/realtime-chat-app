'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlinePaperAirplane,
  HiOutlinePaperClip,
  HiOutlineArrowLeft,
  HiOutlinePhone,
  HiOutlineVideoCamera,
  HiOutlineUserGroup,
  HiOutlineCog,
  HiOutlineLogout,
  HiOutlineTrash,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import Avatar from './Avatar';
import GroupMessageBubble from './GroupMessageBubble';
import EmojiPicker from './EmojiPicker';
import FileUpload from './FileUpload';
import AddGroupMembersModal from './AddGroupMembersModal';
import GroupSettingsModal from './GroupSettingsModal';
import { groupMessageAPI, groupAPI } from '@/services/api';
import { getSocket } from '@/services/socket';
import { encryptMessage, encryptFileContent, generateGroupKey } from '@/utils/encryption';
import useStore from '@/store/useStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function GroupChatWindow({ onBack, onStartGroupCall }) {
  const user = useStore((s) => s.user);
  const selectedGroup = useStore((s) => s.selectedGroup);
  const groupMessages = useStore((s) => s.groupMessages);
  const setGroupMessages = useStore((s) => s.setGroupMessages);
  const addGroupMessage = useStore((s) => s.addGroupMessage);
  const groupTyping = useStore((s) => s.groupTyping);
  const setGroupTyping = useStore((s) => s.setGroupTyping);
  const updateGroupInList = useStore((s) => s.updateGroupInList);
  const updateGroupLastMessage = useStore((s) => s.updateGroupLastMessage);
  const setSelectedGroup = useStore((s) => s.setSelectedGroup);
  const setGroups = useStore((s) => s.setGroups);

  const [text, setText] = useState('');
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const groupId = selectedGroup?._id;
  const groupKey = generateGroupKey(groupId);
  const isAdmin = selectedGroup?.groupAdmin?._id === user?._id || selectedGroup?.groupAdmin === user?._id;
  const settings = selectedGroup?.settings || {};
  const canSendMessages = settings.whoCanSendMessages !== 'admin_only' || isAdmin;
  const canSendFiles = settings.whoCanSendFiles !== 'admin_only' || isAdmin;
  const typingUserIds = groupId ? (groupTyping.get?.(groupId) || new Set()) : new Set();
  const isAnyoneTyping = typingUserIds.size > 0;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!groupId) return;

    const socket = getSocket();
    if (socket) socket.emit('join_group', groupId);

    const fetchMessages = async () => {
      try {
        const res = await groupMessageAPI.getMessages(groupId);
        setGroupMessages(res.data.messages || []);
      } catch {
        toast.error('Failed to load messages');
      }
    };
    fetchMessages();

    return () => {
      if (socket) socket.emit('leave_group', groupId);
    };
  }, [groupId, setGroupMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [groupMessages, isAnyoneTyping, scrollToBottom]);

  const handleTyping = useCallback(() => {
    const socket = getSocket();
    if (!socket || !groupId) return;
    socket.emit('group_typing', { groupId });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('group_stop_typing', { groupId });
    }, 2000);
  }, [groupId]);

  const handleSend = (e) => {
    e?.preventDefault();
    if (!text.trim() || !groupId) return;
    const socket = getSocket();
    if (!socket) return;
    const encrypted = encryptMessage(text.trim(), groupKey);
    socket.emit('send_group_message', {
      groupId,
      encryptedMessage: encrypted,
    });
    setText('');
    inputRef.current?.focus();
  };

  const handleFileUploaded = (fileData) => {
    const socket = getSocket();
    if (!socket || !groupId) return;
    if (fileData.encryptedMessage) {
      socket.emit('send_group_message', {
        groupId,
        encryptedMessage: fileData.encryptedMessage,
        fileName: fileData.fileName,
        fileType: fileData.fileType,
      });
    } else {
      socket.emit('send_group_message', {
        groupId,
        fileUrl: fileData.fileUrl,
        fileName: fileData.fileName,
        fileType: fileData.fileType,
      });
    }
  };

  const handleLeaveGroup = async () => {
    if (!groupId || !window.confirm('Leave this group?')) return;
    try {
      await groupAPI.leave(groupId);
      setGroups((useStore.getState().groups || []).filter((g) => g._id !== groupId));
      setSelectedGroup(null);
      toast.success('Left the group');
    } catch {
      toast.error('Failed to leave group');
    }
  };

  const handleAddMembersDone = (updatedGroup) => {
    updateGroupInList(updatedGroup);
    setSelectedGroup(updatedGroup);
    setShowAddMembers(false);
  };

  const handleSettingsSaved = (updatedGroup) => {
    updateGroupInList(updatedGroup);
    setSelectedGroup(updatedGroup);
    setShowSettings(false);
    const socket = getSocket();
    if (socket && groupId) {
      socket.emit('group_settings_updated', { groupId, group: updatedGroup });
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!groupId || !window.confirm('Remove this member from the group?')) return;
    try {
      const res = await groupAPI.removeMember(groupId, memberId);
      updateGroupInList(res.data.group);
      setSelectedGroup(res.data.group);
      const socket = getSocket();
      if (socket) socket.emit('group_member_removed', { groupId, group: res.data.group, removedUserId: memberId });
      toast.success('Member removed');
    } catch {
      toast.error('Failed to remove member');
    }
  };

  if (!selectedGroup) {
    return (
      <div className="flex-1 flex items-center justify-center bg-chat-bg dark:bg-chat-bg-dark chat-pattern">
        <p className="text-gray-500 dark:text-gray-400">Select a group</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3 bg-chat-sidebar dark:bg-chat-header-dark border-b border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onBack}
          className="md:hidden p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
        >
          <HiOutlineArrowLeft className="w-5 h-5" />
        </button>
        {selectedGroup.groupAvatar ? (
          <img
            src={`${API_URL}${selectedGroup.groupAvatar}`}
            alt=""
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center">
            <HiOutlineUserGroup className="w-5 h-5 text-primary-500" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
            {selectedGroup.groupName}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {selectedGroup.groupMembers?.length ?? 0} members
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onStartGroupCall?.('audio')}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-gray-600 dark:text-gray-300"
            title="Voice call"
          >
            <HiOutlinePhone className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => onStartGroupCall?.('video')}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-gray-600 dark:text-gray-300"
            title="Video call"
          >
            <HiOutlineVideoCamera className="w-5 h-5" />
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMembers(!showMembers)}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
            >
              <HiOutlineCog className="w-5 h-5" />
            </button>
            {showMembers && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMembers(false)}
                  aria-hidden
                />
                <div className="absolute right-0 top-full mt-1 py-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border dark:border-gray-700 z-20 min-w-[200px]">
                  <div className="px-4 py-2 border-b dark:border-gray-700">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Members</p>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {selectedGroup.groupMembers?.map((m) => {
                      const isMemberAdmin = selectedGroup.groupAdmin?._id === m._id || selectedGroup.groupAdmin === m._id;
                      return (
                        <div
                          key={m._id}
                          className="flex items-center justify-between gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar user={m} size="sm" showOnline />
                            <span className="text-sm truncate">{m.name}</span>
                            {isMemberAdmin && (
                              <span className="text-[10px] text-primary-500 flex-shrink-0">Admin</span>
                            )}
                          </div>
                          {isAdmin && !isMemberAdmin && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(m._id)}
                              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                              title="Remove member"
                            >
                              <HiOutlineTrash className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {isAdmin && (
                    <>
                      <button
                        type="button"
                        onClick={() => { setShowMembers(false); setShowSettings(true); }}
                        className="w-full px-4 py-2 text-left text-sm text-primary-600 dark:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        Group settings
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowMembers(false); setShowAddMembers(true); }}
                        className="w-full px-4 py-2 text-left text-sm text-primary-600 dark:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        Add members
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={handleLeaveGroup}
                    className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-2"
                  >
                    <HiOutlineLogout className="w-4 h-4" /> Leave group
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin chat-pattern py-4">
        <AnimatePresence>
          {groupMessages.map((msg) => (
            <GroupMessageBubble key={msg._id} message={msg} groupId={groupId} />
          ))}
        </AnimatePresence>
        {isAnyoneTyping && (
          <div className="px-4 py-1 text-sm text-gray-500 dark:text-gray-400 italic">
            Someone is typing...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {canSendMessages ? (
        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 px-4 py-3 bg-chat-sidebar dark:bg-chat-header-dark border-t border-gray-200 dark:border-gray-700"
        >
          <EmojiPicker
            onSelect={(emoji) => setText((prev) => prev + emoji)}
          />
          {canSendFiles ? (
            <button
              type="button"
              onClick={() => setShowFileUpload(true)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              <HiOutlinePaperClip className="w-6 h-6" />
            </button>
          ) : (
            <div className="p-2 text-gray-400 cursor-not-allowed" title="Only admin can send files">
              <HiOutlinePaperClip className="w-6 h-6" />
            </div>
          )}
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              handleTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 bg-white dark:bg-chat-input-dark rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-500 outline-none border border-gray-200 dark:border-gray-600 focus:border-primary-500 transition-colors"
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            type="submit"
            disabled={!text.trim()}
            className="p-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <HiOutlinePaperAirplane className="w-5 h-5 rotate-90" />
          </motion.button>
        </form>
      ) : (
        <div className="px-4 py-3 bg-chat-sidebar dark:bg-chat-header-dark border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-500 dark:text-gray-400">
          Only admin can send messages in this group
        </div>
      )}

      {showFileUpload && (
        <FileUpload
          onFileUploaded={handleFileUploaded}
          onClose={() => setShowFileUpload(false)}
          conversationKey={groupKey}
        />
      )}

      {showAddMembers && (
        <AddGroupMembersModal
          group={selectedGroup}
          onClose={() => setShowAddMembers(false)}
          onAdded={handleAddMembersDone}
        />
      )}

      {showSettings && (
        <GroupSettingsModal
          group={selectedGroup}
          onClose={() => setShowSettings(false)}
          onSaved={handleSettingsSaved}
        />
      )}
    </div>
  );
}
