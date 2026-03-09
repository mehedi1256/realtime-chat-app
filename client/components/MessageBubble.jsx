'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  HiOutlineDotsVertical,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineCheck,
  HiOutlineShare,
} from 'react-icons/hi';
import FilePreview from './FilePreview';
import { decryptMessage, decryptFileContent, generateConversationKey } from '@/utils/encryption';
import { formatMessageTime } from '@/utils/formatTime';
import useStore from '@/store/useStore';

const QUICK_REACTIONS = ['❤️', '😂', '👍', '😮', '😢', '🙏'];

export default function MessageBubble({ message, onEdit, onDelete, onReact, onForward }) {
  const currentUser = useStore((s) => s.user);
  const selectedUser = useStore((s) => s.selectedUser);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [localFileUrl, setLocalFileUrl] = useState(null);

  const isSender = (message.sender?._id || message.sender) === currentUser?._id;
  const isDeleted = message.isDeleted;
  const isE2EFile = !isDeleted && message.fileName && message.encryptedMessage && !message.fileUrl;

  const conversationKey = generateConversationKey(
    currentUser?._id,
    selectedUser?._id
  );

  useEffect(() => {
    if (!isE2EFile || !message.encryptedMessage) return;
    const base64 = decryptFileContent(message.encryptedMessage, conversationKey);
    if (!base64) return;
    let url = null;
    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: message.fileType || 'application/octet-stream' });
      url = URL.createObjectURL(blob);
      setLocalFileUrl(url);
    } catch {
      return () => {};
    }
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [isE2EFile, message._id, conversationKey]);

  const decryptedText = isDeleted
    ? ''
    : isE2EFile
      ? ''
      : decryptMessage(message.encryptedMessage, conversationKey);

  if (isDeleted) {
    return (
      <div className={`flex ${isSender ? 'justify-end' : 'justify-start'} px-2 sm:px-4 py-0.5`}>
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
      className={`flex ${isSender ? 'justify-end' : 'justify-start'} px-2 sm:px-4 py-0.5 group`}
    >
      <div className="relative max-w-[85%] sm:max-w-[75%] md:max-w-[65%] min-w-0">
        <div
          className={`relative px-3 py-2 rounded-2xl shadow-sm ${
            isSender
              ? 'bg-chat-sender dark:bg-chat-sender-dark text-gray-900 dark:text-gray-100 rounded-br-sm'
              : 'bg-chat-receiver dark:bg-chat-receiver-dark text-gray-900 dark:text-gray-100 rounded-bl-sm'
          }`}
        >
          {(message.fileUrl || (isE2EFile && localFileUrl)) && (
            <FilePreview
              fileUrl={message.fileUrl}
              fileName={message.fileName}
              fileType={message.fileType}
              localBlobUrl={localFileUrl}
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
          {(message.fileUrl || (message.fileName && message.encryptedMessage)) && onForward && (
            <button
              onClick={() => onForward(message)}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full text-gray-400"
              title="Forward"
            >
              <HiOutlineShare className="w-4 h-4" />
            </button>
          )}
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
            {showDeleteConfirm ? (
              <>
                <p className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">Delete this message?</p>
                <div className="flex gap-2 px-3 py-2 border-t border-gray-200 dark:border-gray-600">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setShowMenu(false);
                    }}
                    className="flex-1 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      onDelete(message._id);
                      setShowDeleteConfirm(false);
                      setShowMenu(false);
                    }}
                    className="flex-1 py-1.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </>
            ) : (
              <>
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
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-red-500"
                >
                  <HiOutlineTrash className="w-4 h-4" /> Delete
                </button>
              </>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
