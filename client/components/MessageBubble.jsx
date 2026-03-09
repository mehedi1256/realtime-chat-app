'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  HiOutlineDotsVertical,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineCheck,
} from 'react-icons/hi';
import FilePreview from './FilePreview';
import { decryptMessage, generateConversationKey } from '@/utils/encryption';
import { formatMessageTime } from '@/utils/formatTime';
import useStore from '@/store/useStore';

const QUICK_REACTIONS = ['❤️', '😂', '👍', '😮', '😢', '🙏'];

export default function MessageBubble({ message, onEdit, onDelete, onReact }) {
  const currentUser = useStore((s) => s.user);
  const selectedUser = useStore((s) => s.selectedUser);
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);

  const isSender = (message.sender?._id || message.sender) === currentUser?._id;
  const isDeleted = message.isDeleted;

  const conversationKey = generateConversationKey(
    currentUser?._id,
    selectedUser?._id
  );

  const decryptedText = isDeleted
    ? ''
    : decryptMessage(message.encryptedMessage, conversationKey);

  if (isDeleted) {
    return (
      <div className={`flex ${isSender ? 'justify-end' : 'justify-start'} px-4 py-0.5`}>
        <div className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 italic text-gray-400 text-sm">
          This message was deleted
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isSender ? 'justify-end' : 'justify-start'} px-4 py-0.5 group`}
    >
      <div className="relative max-w-[75%] md:max-w-[65%]">
        <div
          className={`relative px-3 py-2 rounded-2xl shadow-sm ${
            isSender
              ? 'bg-chat-sender dark:bg-chat-sender-dark text-gray-900 dark:text-gray-100 rounded-br-sm'
              : 'bg-chat-receiver dark:bg-chat-receiver-dark text-gray-900 dark:text-gray-100 rounded-bl-sm'
          }`}
        >
          {message.fileUrl && (
            <FilePreview
              fileUrl={message.fileUrl}
              fileName={message.fileName}
              fileType={message.fileType}
            />
          )}

          {decryptedText && (
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
              {decryptedText}
            </p>
          )}

          <div className={`flex items-center gap-1 mt-1 ${isSender ? 'justify-end' : 'justify-start'}`}>
            <span className="text-[11px] opacity-50">
              {formatMessageTime(message.createdAt)}
            </span>
            {message.isEdited && (
              <span className="text-[10px] opacity-40">edited</span>
            )}
            {isSender && (
              <span className="text-[11px]">
                {message.isSeen ? (
                  <span className="text-blue-500">
                    <HiOutlineCheck className="w-3 h-3 inline" />
                    <HiOutlineCheck className="w-3 h-3 inline -ml-1.5" />
                  </span>
                ) : (
                  <HiOutlineCheck className="w-3 h-3 inline opacity-50" />
                )}
              </span>
            )}
          </div>
        </div>

        {message.reactions?.length > 0 && (
          <div className={`flex gap-0.5 mt-0.5 ${isSender ? 'justify-end' : 'justify-start'}`}>
            <div className="flex items-center bg-white dark:bg-gray-700 rounded-full px-1.5 py-0.5 shadow-sm border dark:border-gray-600">
              {[...new Set(message.reactions.map((r) => r.emoji))].map((emoji) => (
                <span key={emoji} className="text-sm">{emoji}</span>
              ))}
              {message.reactions.length > 1 && (
                <span className="text-[10px] text-gray-500 ml-0.5">{message.reactions.length}</span>
              )}
            </div>
          </div>
        )}

        <div
          className={`absolute top-1 ${isSender ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 px-1`}
        >
          <button
            onClick={() => setShowReactions(!showReactions)}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full text-gray-400"
            title="React"
          >
            😊
          </button>
          {isSender && (
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full text-gray-400"
            >
              <HiOutlineDotsVertical className="w-4 h-4" />
            </button>
          )}
        </div>

        {showReactions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`absolute bottom-full mb-1 ${isSender ? 'right-0' : 'left-0'} bg-white dark:bg-gray-700 rounded-full shadow-lg border dark:border-gray-600 px-2 py-1 flex gap-1 z-10`}
          >
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onReact(message._id, emoji);
                  setShowReactions(false);
                }}
                className="text-lg hover:scale-125 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </motion.div>
        )}

        {showMenu && isSender && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`absolute top-full mt-1 ${isSender ? 'right-0' : 'left-0'} bg-white dark:bg-gray-700 rounded-xl shadow-lg border dark:border-gray-600 py-1 z-10 min-w-[140px]`}
          >
            {decryptedText && (
              <button
                onClick={() => {
                  onEdit(message, decryptedText);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                <HiOutlinePencil className="w-4 h-4" /> Edit
              </button>
            )}
            <button
              onClick={() => {
                onDelete(message._id);
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-red-500"
            >
              <HiOutlineTrash className="w-4 h-4" /> Delete
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
