'use client';

import { motion } from 'framer-motion';
import FilePreview from './FilePreview';
import { decryptMessage, generateGroupKey } from '@/utils/encryption';
import { formatMessageTime } from '@/utils/formatTime';
import useStore from '@/store/useStore';
import Avatar from './Avatar';

export default function GroupMessageBubble({ message, groupId }) {
  const currentUser = useStore((s) => s.user);
  const groupKey = generateGroupKey(groupId || message.groupId);

  const isSender = (message.sender?._id || message.sender) === currentUser?._id;
  const senderName = message.sender?.name ?? 'Unknown';
  const senderPicture = message.sender?.profilePicture;

  const decryptedText = message.isDeleted
    ? ''
    : decryptMessage(message.encryptedMessage, groupKey);

  if (message.isDeleted) {
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
      <div className={`max-w-[85%] sm:max-w-[75%] md:max-w-[65%] min-w-0 flex ${isSender ? 'flex-row-reverse' : 'flex-row'} gap-2`}>
        {!isSender && (
          <div className="flex-shrink-0">
            <Avatar user={{ _id: message.sender?._id, name: senderName, profilePicture: senderPicture }} size="sm" />
          </div>
        )}
        <div className="flex flex-col min-w-0">
          {!isSender && (
            <span className="text-[11px] font-medium text-primary-600 dark:text-primary-400 mb-0.5">
              {senderName}
            </span>
          )}
          <div
            className={`relative px-3 py-2 rounded-2xl shadow-sm ${
              isSender
                ? 'bg-chat-sender dark:bg-chat-sender-dark text-gray-900 dark:text-gray-100 rounded-br-sm'
                : 'bg-chat-receiver dark:bg-chat-receiver-dark text-gray-900 dark:text-gray-100 rounded-bl-sm'
            }`}
          >
            {(message.fileUrl || (message.fileName && message.encryptedMessage)) && (
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
            <span className="text-[11px] opacity-50 mt-1 block">
              {formatMessageTime(message.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
