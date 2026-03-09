'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import toast from 'react-hot-toast';
import useStore from '@/store/useStore';
import { connectSocket, disconnectSocket, getSocket } from '@/services/socket';
import Sidebar from '@/components/Sidebar';
import ChatWindow from '@/components/ChatWindow';
import GroupChatWindow from '@/components/GroupChatWindow';
import CallScreen from '@/components/CallScreen';
import IncomingCall from '@/components/IncomingCall';
import IncomingGroupCall from '@/components/IncomingGroupCall';
import GroupCallScreen from '@/components/GroupCallScreen';
import useWebRTC from '@/utils/useWebRTC';
import useGroupCall from '@/utils/useGroupCall';

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const hasHydrated = useStore((s) => s.hasHydrated);
  const token = useStore((s) => s.token);
  const user = useStore((s) => s.user);
  const selectedUser = useStore((s) => s.selectedUser);
  const setSelectedUser = useStore((s) => s.setSelectedUser);
  const selectedGroup = useStore((s) => s.selectedGroup);
  const setSelectedGroup = useStore((s) => s.setSelectedGroup);
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
  const addGroupMessage = useStore((s) => s.addGroupMessage);
  const setGroupTyping = useStore((s) => s.setGroupTyping);
  const updateGroupInList = useStore((s) => s.updateGroupInList);
  const updateGroupLastMessage = useStore((s) => s.updateGroupLastMessage);
  const setGroups = useStore((s) => s.setGroups);

  const callState = useStore((s) => s.callState);
  const startOutgoingCall = useStore((s) => s.startOutgoingCall);
  const receiveIncomingCall = useStore((s) => s.receiveIncomingCall);
  const groupCallState = useStore((s) => s.groupCallState);
  const setGroupCallState = useStore((s) => s.setGroupCallState);
  const endGroupCall = useStore((s) => s.endGroupCall);

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

  const users = useStore((s) => s.users);
  const groups = useStore((s) => s.groups);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!token) {
      const redirect = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
      router.replace(redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login');
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

    // ── Group events ──
    socket.on('receive_group_message', (message) => {
      const gId = message.groupId?._id || message.groupId;
      if (gId) updateGroupLastMessage(gId, message);
      if (gId === useStore.getState().selectedGroup?._id) addGroupMessage(message);
    });
    socket.on('group_typing', ({ userId: uid, groupId: gid }) => setGroupTyping(gid, uid, true));
    socket.on('group_stop_typing', ({ userId: uid, groupId: gid }) => setGroupTyping(gid, uid, false));
    socket.on('group_updated', (group) => {
      updateGroupInList(group);
      if (useStore.getState().selectedGroup?._id === group._id) {
        setSelectedGroup(group);
      }
    });
    socket.on('added_to_group', ({ group: g }) => {
      const groups = useStore.getState().groups || [];
      if (!groups.some((x) => x._id === g._id)) setGroups([g, ...groups]);
      socket.emit('join_group', g._id);
    });
    socket.on('removed_from_group', ({ groupId: gid }) => {
      const groups = useStore.getState().groups || [];
      setGroups(groups.filter((g) => g._id !== gid));
      if (useStore.getState().selectedGroup?._id === gid) {
        setSelectedGroup(null);
        router.replace('/chat');
      }
      toast.error('You were removed from the group');
    });

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      disconnectSocket();
    };
  }, [hasHydrated, token, user?._id, pathname, searchParams, router]);

  // Restore selection from URL on load/refresh
  useEffect(() => {
    if (!hasHydrated || !token) return;
    const userId = searchParams.get('userId');
    const groupId = searchParams.get('groupId');
    if (!userId && !groupId) return;
    const state = useStore.getState();
    if (state.selectedUser || state.selectedGroup) return; // already have selection
    if (userId) {
      if (!users?.length) return;
      const u = users.find((x) => x._id === userId);
      if (u) {
        setSelectedUser(u);
        setSelectedGroup(null);
        setMobileShowChat(true);
      }
    } else if (groupId && groups?.length) {
      const g = groups.find((x) => x._id === groupId);
      if (g) {
        setSelectedGroup(g);
        setSelectedUser(null);
        setMobileShowChat(true);
        const socket = getSocket();
        if (socket) socket.emit('join_group', g._id);
      }
    }
  }, [hasHydrated, token, users, groups, searchParams, setSelectedUser, setSelectedGroup]);

  // Group call listeners
  useEffect(() => {
    if (!token || !hasHydrated) return;
    const socket = getSocket();
    if (!socket) return;
    socket.on('incoming_group_call', ({ groupId, from, offer, type }) => {
      setGroupCallState({
        groupId,
        type,
        status: 'ringing',
        direction: 'incoming',
        from: { id: from.id, name: from.name, profilePicture: from.profilePicture },
        offer,
      });
    });
    socket.on('group_call_ended', ({ groupId: gid }) => {
      if (useStore.getState().groupCallState?.groupId === gid) endGroupCall();
    });
    return () => {
      socket.off('incoming_group_call');
      socket.off('group_call_ended');
    };
  }, [token, hasHydrated, setGroupCallState, endGroupCall]);

  const handleSelectUser = useCallback(
    (u) => {
      if (selectedUser?._id === u._id) return; // same user, avoid clearing messages
      setSelectedGroup(null);
      setSelectedUser(u);
      setMobileShowChat(true);
      resetUnread(u._id);
      const socket = getSocket();
      if (socket) {
        socket.emit('message_seen', { senderId: u._id, receiverId: user?._id });
      }
    },
    [setSelectedUser, setSelectedGroup, resetUnread, user, selectedUser]
  );

  const handleSelectGroup = useCallback(
    (g) => {
      if (selectedGroup?._id === g._id) return; // same group, avoid clearing messages
      setSelectedUser(null);
      setSelectedGroup(g);
      setMobileShowChat(true);
      const socket = getSocket();
      if (socket) socket.emit('join_group', g._id);
    },
    [setSelectedGroup, setSelectedUser, selectedGroup]
  );

  // Sync URL with selection (runs after state updates, avoids race with restore)
  useEffect(() => {
    if (!hasHydrated || !token) return;
    const currentUrl = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
    if (selectedUser) {
      const expected = `/chat?userId=${selectedUser._id}`;
      if (currentUrl !== expected) router.replace(expected);
    } else if (selectedGroup) {
      const expected = `/chat?groupId=${selectedGroup._id}`;
      if (currentUrl !== expected) router.replace(expected);
    } else if (searchParams.get('userId') || searchParams.get('groupId')) {
      router.replace('/chat');
    }
  }, [hasHydrated, token, selectedUser, selectedGroup, pathname, searchParams, router]);

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

  const {
    localStream: groupLocalStream,
    remoteStream: groupRemoteStream,
    participants: groupParticipants,
    startGroupCall,
    joinGroupCall,
    leaveGroupCall,
    endGroupCallAsInitiator,
    toggleMute: groupToggleMute,
    toggleCamera: groupToggleCamera,
  } = useGroupCall();

  const handleStartGroupCall = useCallback((type) => {
    const group = useStore.getState().selectedGroup;
    if (!group) return;
    setGroupCallState({
      groupId: group._id,
      type,
      status: 'ringing',
      direction: 'outgoing',
      isInitiator: true,
    });
    startGroupCall(group._id, type);
  }, [setGroupCallState, startGroupCall]);

  const handleAcceptGroupCall = useCallback(() => {
    const state = useStore.getState().groupCallState;
    if (!state?.groupId) return;
    joinGroupCall(state.groupId, state.type);
  }, [joinGroupCall]);

  const handleRejectGroupCall = useCallback(() => {
    endGroupCall(); // clear group call state
  }, [endGroupCall]);

  const handleEndGroupCall = useCallback(() => {
    endGroupCallAsInitiator();
  }, [endGroupCallAsInitiator]);

  const handleLeaveGroupCall = useCallback(() => {
    leaveGroupCall();
  }, [leaveGroupCall]);

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
    <div className="h-screen flex flex-col md:flex-row bg-white dark:bg-gray-900 overflow-hidden">
      <div
        className={`w-full md:w-[320px] lg:w-[360px] xl:w-[400px] flex-shrink-0 min-w-0 ${
          mobileShowChat ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="w-full h-full min-w-0">
          <Sidebar
            onSelectUser={handleSelectUser}
            onSelectGroup={handleSelectGroup}
            isMobileOpen={!mobileShowChat}
          />
        </div>
      </div>

      <div className={`flex-1 min-w-0 min-h-0 ${mobileShowChat ? 'flex' : 'hidden md:flex'}`}>
        {selectedGroup ? (
          <GroupChatWindow
            key={selectedGroup._id}
            onBack={handleBack}
            onStartGroupCall={handleStartGroupCall}
          />
        ) : (
          <ChatWindow
            key={selectedUser?._id ?? 'empty'}
            onBack={handleBack}
            onStartCall={handleStartCall}
          />
        )}
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

      {groupCallState && (groupCallState.status === 'connected' || (groupCallState.status === 'ringing' && groupCallState.direction === 'outgoing')) && (
        <GroupCallScreen
          localStream={groupLocalStream}
          remoteStream={groupRemoteStream}
          participants={groupParticipants}
          onEndCall={handleEndGroupCall}
          onLeaveCall={handleLeaveGroupCall}
          onToggleMute={groupToggleMute}
          onToggleCamera={groupToggleCamera}
          isInitiator={groupCallState.isInitiator}
          canRecord={
            (selectedGroup?.settings?.whoCanRecordCall !== 'admin_only') ||
            selectedGroup?.groupAdmin?._id === user?._id ||
            selectedGroup?.groupAdmin === user?._id
          }
        />
      )}

      <IncomingGroupCall onAccept={handleAcceptGroupCall} onReject={handleRejectGroupCall} />
    </div>
  );
}
