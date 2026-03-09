'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import useStore from '@/store/useStore';
import { connectSocket, disconnectSocket, getSocket } from '@/services/socket';
import Sidebar from '@/components/Sidebar';
import ChatWindow from '@/components/ChatWindow';
import CallScreen from '@/components/CallScreen';
import IncomingCall from '@/components/IncomingCall';
import useWebRTC from '@/utils/useWebRTC';

export default function ChatPage() {
  const router = useRouter();
  const hasHydrated = useStore((s) => s.hasHydrated);
  const token = useStore((s) => s.token);
  const user = useStore((s) => s.user);
  const selectedUser = useStore((s) => s.selectedUser);
  const setSelectedUser = useStore((s) => s.setSelectedUser);
  const addMessage = useStore((s) => s.addMessage);
  const updateMessage = useStore((s) => s.updateMessage);
  const removeMessage = useStore((s) => s.removeMessage);
  const setTyping = useStore((s) => s.setTyping);
  const setUserOnline = useStore((s) => s.setUserOnline);
  const setUserOffline = useStore((s) => s.setUserOffline);
  const incrementUnread = useStore((s) => s.incrementUnread);
  const updateLastMessage = useStore((s) => s.updateLastMessage);
  const markMessagesSeen = useStore((s) => s.markMessagesSeen);
  const resetUnread = useStore((s) => s.resetUnread);

  const callState = useStore((s) => s.callState);
  const startOutgoingCall = useStore((s) => s.startOutgoingCall);
  const receiveIncomingCall = useStore((s) => s.receiveIncomingCall);

  const [mobileShowChat, setMobileShowChat] = useState(false);

  const {
    localStream,
    remoteStream,
    startCall,
    storeOffer,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
    handleCallAccepted,
    handleIceCandidate,
    handleRemoteEnd,
  } = useWebRTC();

  useEffect(() => {
    if (!hasHydrated) return;
    if (!token) {
      router.replace('/login');
      return;
    }

    const socket = connectSocket(token);

    // ── Messaging events ──

    socket.on('receive_message', (message) => {
      const senderId = message.sender?._id || message.sender;
      const receiverId = message.receiver?._id || message.receiver;
      const currentSelectedId = useStore.getState().selectedUser?._id;

      if (
        (senderId === user?._id && receiverId === currentSelectedId) ||
        (senderId === currentSelectedId && receiverId === user?._id)
      ) {
        addMessage(message);
        if (senderId === currentSelectedId) {
          socket.emit('message_seen', {
            senderId: currentSelectedId,
            receiverId: user?._id,
          });
        }
      }

      if (senderId !== user?._id) {
        const otherUserId = senderId;
        updateLastMessage(otherUserId, message);
        if (otherUserId !== currentSelectedId) {
          incrementUnread(otherUserId);
          if ('Notification' in window && Notification.permission === 'granted') {
            const senderName = message.sender?.name || 'New message';
            new Notification(senderName, {
              body: message.fileUrl ? '📎 Sent a file' : 'New message',
              icon: '/favicon.ico',
            });
          }
        }
      }

      if (senderId === user?._id) {
        updateLastMessage(receiverId, message);
      }
    });

    socket.on('typing', ({ userId: typingUserId }) => setTyping(typingUserId, true));
    socket.on('stop_typing', ({ userId: typingUserId }) => setTyping(typingUserId, false));
    socket.on('user_online', ({ userId: onlineUserId }) => setUserOnline(onlineUserId));
    socket.on('user_offline', ({ userId: offlineUserId, lastSeen }) => setUserOffline(offlineUserId, lastSeen));
    socket.on('message_seen', () => markMessagesSeen(user?._id));
    socket.on('message_deleted', ({ messageId }) => removeMessage(messageId));
    socket.on('message_edited', (msg) => updateMessage(msg));
    socket.on('message_reaction', (msg) => updateMessage(msg));

    // ── Call signaling events ──

    socket.on('incoming_call', ({ from, offer, type }) => {
      const cs = useStore.getState().callState;
      if (cs) {
        socket.emit('call_rejected', { to: from.id });
        return;
      }
      storeOffer(offer);
      receiveIncomingCall(from, type);
    });

    socket.on('call_accepted', handleCallAccepted);
    socket.on('ice_candidate', handleIceCandidate);
    socket.on('call_ended', handleRemoteEnd);
    socket.on('call_rejected', handleRemoteEnd);
    socket.on('call_unavailable', handleRemoteEnd);

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      disconnectSocket();
    };
  }, [hasHydrated, token, user?._id]);

  const handleSelectUser = useCallback(
    (u) => {
      setSelectedUser(u);
      setMobileShowChat(true);
      resetUnread(u._id);
      const socket = getSocket();
      if (socket) {
        socket.emit('message_seen', { senderId: u._id, receiverId: user?._id });
      }
    },
    [setSelectedUser, resetUnread, user]
  );

  const handleBack = useCallback(() => {
    setMobileShowChat(false);
  }, []);

  const handleStartCall = useCallback(
    (type) => {
      const sel = useStore.getState().selectedUser;
      if (!sel) return;
      startOutgoingCall(sel, type);
      startCall(sel, type);
    },
    [startOutgoingCall, startCall]
  );

  const handleAcceptIncoming = useCallback(() => {
    acceptCall();
  }, [acceptCall]);

  if (!hasHydrated) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-white dark:bg-gray-900">
      <div
        className={`w-full md:w-[360px] lg:w-[400px] flex-shrink-0 ${
          mobileShowChat ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="w-full">
          <Sidebar onSelectUser={handleSelectUser} isMobileOpen={!mobileShowChat} />
        </div>
      </div>

      <div className={`flex-1 ${mobileShowChat ? 'flex' : 'hidden md:flex'}`}>
        <ChatWindow onBack={handleBack} onStartCall={handleStartCall} />
      </div>

      {/* Call UI */}
      {callState && callState.status !== 'ringing' && (
        <CallScreen
          localStream={localStream}
          remoteStream={remoteStream}
          onEndCall={endCall}
          onToggleMute={toggleMute}
          onToggleCamera={toggleCamera}
        />
      )}

      {callState && callState.status === 'ringing' && callState.direction === 'outgoing' && (
        <CallScreen
          localStream={localStream}
          remoteStream={remoteStream}
          onEndCall={endCall}
          onToggleMute={toggleMute}
          onToggleCamera={toggleCamera}
        />
      )}

      <IncomingCall onAccept={handleAcceptIncoming} />
    </div>
  );
}
