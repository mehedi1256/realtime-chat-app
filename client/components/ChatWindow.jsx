'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlinePaperAirplane,
  HiOutlinePaperClip,
  HiOutlineArrowLeft,
  HiOutlineX,
  HiOutlinePhone,
  HiOutlineVideoCamera,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import Avatar from './Avatar';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import EmojiPicker from './EmojiPicker';
import FileUpload from './FileUpload';
import { messageAPI } from '@/services/api';
import { getSocket } from '@/services/socket';
import {
  encryptMessage,
  generateConversationKey,
} from '@/utils/encryption';
import { formatLastSeen } from '@/utils/formatTime';
import useStore from '@/store/useStore';

export default function ChatWindow({ onBack, onStartCall }) {
  const user = useStore((s) => s.user);
  const selectedUser = useStore((s) => s.selectedUser);
  const messages = useStore((s) => s.messages);
  const setMessages = useStore((s) => s.setMessages);
  const addMessage = useStore((s) => s.addMessage);
  const updateMessage = useStore((s) => s.updateMessage);
  const removeMessage = useStore((s) => s.removeMessage);
  const typingUsers = useStore((s) => s.typingUsers);
  const resetUnread = useStore((s) => s.resetUnread);
  const markMessagesSeen = useStore((s) => s.markMessagesSeen);

  const [text, setText] = useState('');
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const conversationKey = generateConversationKey(user?._id, selectedUser?._id);
  const isTyping = typingUsers.has?.(selectedUser?._id) || false;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!selectedUser) return;

    const fetchMessages = async () => {
      try {
        const res = await messageAPI.getMessages(selectedUser._id);
        setMessages(res.data.messages);
      } catch {
        toast.error('Failed to load messages');
      }
    };

    fetchMessages();
    resetUnread(selectedUser._id);

    const socket = getSocket();
    if (socket) {
      socket.emit('message_seen', {
        senderId: selectedUser._id,
        receiverId: user?._id,
      });
    }
  }, [selectedUser, user, setMessages, resetUnread]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  const handleTyping = useCallback(() => {
    const socket = getSocket();
    if (!socket || !selectedUser) return;

    socket.emit('typing', { receiverId: selectedUser._id });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', { receiverId: selectedUser._id });
    }, 2000);
  }, [selectedUser]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!text.trim() && !editingMessage) return;

    if (editingMessage) {
      const encrypted = encryptMessage(editText, conversationKey);
      const socket = getSocket();
      if (socket) {
        socket.emit('message_edited', {
          messageId: editingMessage._id,
          encryptedMessage: encrypted,
          receiverId: selectedUser._id,
        });
      }
      setEditingMessage(null);
      setEditText('');
      return;
    }

    const encrypted = encryptMessage(text.trim(), conversationKey);
    const socket = getSocket();

    if (socket) {
      socket.emit('send_message', {
        receiverId: selectedUser._id,
        encryptedMessage: encrypted,
      });
      socket.emit('stop_typing', { receiverId: selectedUser._id });
    }

    setText('');
    inputRef.current?.focus();
  };

  const handleFileUploaded = (fileData) => {
    const socket = getSocket();
    if (socket) {
      socket.emit('send_message', {
        receiverId: selectedUser._id,
        encryptedMessage: '',
        fileUrl: fileData.fileUrl,
        fileName: fileData.fileName,
        fileType: fileData.fileType,
      });
    }
  };

  const handleEdit = (message, decryptedText) => {
    setEditingMessage(message);
    setEditText(decryptedText);
    inputRef.current?.focus();
  };

  const handleDelete = (messageId) => {
    const socket = getSocket();
    if (socket) {
      socket.emit('message_deleted', {
        messageId,
        receiverId: selectedUser._id,
      });
    }
    removeMessage(messageId);
  };

  const handleReact = (messageId, emoji) => {
    const socket = getSocket();
    if (socket) {
      socket.emit('message_reaction', {
        messageId,
        emoji,
        receiverId: selectedUser._id,
      });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!selectedUser) {
    return (
      <div className="flex-1 flex items-center justify-center bg-chat-bg dark:bg-chat-bg-dark chat-pattern">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8"
        >
          <div className="w-24 h-24 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-12 h-12 text-primary-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">
            ChatApp Web
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-sm">
            Select a conversation from the sidebar to start messaging. Your messages are end-to-end encrypted.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3 bg-chat-sidebar dark:bg-chat-header-dark border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={onBack}
          className="md:hidden p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
        >
          <HiOutlineArrowLeft className="w-5 h-5" />
        </button>
        <Avatar user={selectedUser} size="md" showOnline />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
            {selectedUser.name}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {selectedUser.isOnline
              ? isTyping
                ? 'typing...'
                : 'online'
              : formatLastSeen(selectedUser.lastSeen)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onStartCall?.('audio')}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-gray-600 dark:text-gray-300"
            title="Audio call"
          >
            <HiOutlinePhone className="w-5 h-5" />
          </button>
          <button
            onClick={() => onStartCall?.('video')}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-gray-600 dark:text-gray-300"
            title="Video call"
          >
            <HiOutlineVideoCamera className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin chat-pattern py-4">
        <AnimatePresence>
          {messages.map((msg) => (
            <MessageBubble
              key={msg._id}
              message={msg}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onReact={handleReact}
            />
          ))}
        </AnimatePresence>
        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {editingMessage && (
        <div className="flex items-center gap-2 px-4 py-2 bg-primary-50 dark:bg-primary-900/20 border-t border-primary-200 dark:border-primary-800">
          <div className="flex-1">
            <p className="text-xs text-primary-600 dark:text-primary-400 font-medium">Editing message</p>
            <p className="text-sm text-gray-600 dark:text-gray-300 truncate">{editText}</p>
          </div>
          <button
            onClick={() => { setEditingMessage(null); setEditText(''); }}
            className="p-1 hover:bg-primary-100 dark:hover:bg-primary-800 rounded"
          >
            <HiOutlineX className="w-4 h-4" />
          </button>
        </div>
      )}

      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 px-4 py-3 bg-chat-sidebar dark:bg-chat-header-dark border-t border-gray-200 dark:border-gray-700"
      >
        <EmojiPicker
          onSelect={(emoji) => {
            if (editingMessage) {
              setEditText((prev) => prev + emoji);
            } else {
              setText((prev) => prev + emoji);
            }
          }}
        />
        <button
          type="button"
          onClick={() => setShowFileUpload(true)}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          <HiOutlinePaperClip className="w-6 h-6" />
        </button>
        <input
          ref={inputRef}
          type="text"
          value={editingMessage ? editText : text}
          onChange={(e) => {
            if (editingMessage) {
              setEditText(e.target.value);
            } else {
              setText(e.target.value);
              handleTyping();
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2.5 bg-white dark:bg-chat-input-dark rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-500 outline-none border border-gray-200 dark:border-gray-600 focus:border-primary-500 transition-colors"
        />
        <motion.button
          whileTap={{ scale: 0.9 }}
          type="submit"
          disabled={editingMessage ? !editText.trim() : !text.trim()}
          className="p-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <HiOutlinePaperAirplane className="w-5 h-5 rotate-90" />
        </motion.button>
      </form>

      {showFileUpload && (
        <FileUpload
          onFileUploaded={handleFileUploaded}
          onClose={() => setShowFileUpload(false)}
        />
      )}
    </div>
  );
}
