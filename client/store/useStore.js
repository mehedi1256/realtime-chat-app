import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useStore = create(
  persist(
    (set, get) => ({
      hasHydrated: false,
      user: null,
      token: null,
      users: [],
      selectedUser: null,
      messages: [],
      typingUsers: new Set(),
      groups: [],
      selectedGroup: null,
      groupMessages: [],
      groupTyping: new Map(),
      darkMode: false,
      onlineUsers: new Set(),
      groupCallState: null,

      setHydrated: (value) => set({ hasHydrated: value }),
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),

      login: (user, token) => set({ user, token }),
      logout: () =>
        set({
          user: null,
          token: null,
          users: [],
          selectedUser: null,
          messages: [],
          typingUsers: new Set(),
          groups: [],
          selectedGroup: null,
          groupMessages: [],
          groupTyping: new Map(),
          onlineUsers: new Set(),
          groupCallState: null,
        }),

      setUsers: (users) => set({ users }),

      setSelectedUser: (selectedUser) => set({ selectedUser, messages: [] }),

      setGroups: (groups) => set({ groups }),
      setSelectedGroup: (selectedGroup) => set({ selectedGroup, groupMessages: [] }),
      setGroupMessages: (groupMessages) => set({ groupMessages }),
      addGroupMessage: (message) =>
        set((state) => {
          if (state.groupMessages.some((m) => m._id === message._id)) return state;
          return { groupMessages: [...state.groupMessages, message] };
        }),
      setGroupTyping: (groupId, userId, isTyping) =>
        set((state) => {
          const next = new Map(state.groupTyping);
          const prevSet = next.get(groupId);
          const set = new Set(prevSet || []);
          if (isTyping) set.add(userId);
          else set.delete(userId);
          if (set.size) next.set(groupId, set);
          else next.delete(groupId);
          return { groupTyping: next };
        }),
      updateGroupInList: (group) =>
        set((state) => ({
          groups: state.groups.map((g) => (g._id === group._id ? group : g)),
        })),
      updateGroupLastMessage: (groupId, message) =>
        set((state) => ({
          groups: state.groups.map((g) =>
            g._id === groupId ? { ...g, lastMessage: message } : g
          ),
        })),

      setMessages: (messages) => set({ messages }),

      addMessage: (message) =>
        set((state) => {
          const exists = state.messages.find((m) => m._id === message._id);
          if (exists) return state;
          return { messages: [...state.messages, message] };
        }),

      updateMessage: (updatedMessage) =>
        set((state) => ({
          messages: state.messages.map((m) =>
            m._id === updatedMessage._id ? updatedMessage : m
          ),
        })),

      removeMessage: (messageId) =>
        set((state) => ({
          messages: state.messages.map((m) =>
            m._id === messageId ? { ...m, isDeleted: true, encryptedMessage: '', fileUrl: '' } : m
          ),
        })),

      setTyping: (userId, isTyping) =>
        set((state) => {
          const newTyping = new Set(state.typingUsers);
          if (isTyping) {
            newTyping.add(userId);
          } else {
            newTyping.delete(userId);
          }
          return { typingUsers: newTyping };
        }),

      setUserOnline: (userId) =>
        set((state) => {
          const newOnline = new Set(state.onlineUsers);
          newOnline.add(userId);
          const updatedUsers = state.users.map((u) =>
            u._id === userId ? { ...u, isOnline: true } : u
          );
          return { onlineUsers: newOnline, users: updatedUsers };
        }),

      setUserOffline: (userId, lastSeen) =>
        set((state) => {
          const newOnline = new Set(state.onlineUsers);
          newOnline.delete(userId);
          const updatedUsers = state.users.map((u) =>
            u._id === userId ? { ...u, isOnline: false, lastSeen } : u
          );
          return { onlineUsers: newOnline, users: updatedUsers };
        }),

      incrementUnread: (userId) =>
        set((state) => ({
          users: state.users.map((u) =>
            u._id === userId
              ? { ...u, unreadCount: (u.unreadCount || 0) + 1 }
              : u
          ),
        })),

      resetUnread: (userId) =>
        set((state) => ({
          users: state.users.map((u) =>
            u._id === userId ? { ...u, unreadCount: 0 } : u
          ),
        })),

      updateLastMessage: (userId, message) =>
        set((state) => ({
          users: state.users.map((u) =>
            u._id === userId ? { ...u, lastMessage: message } : u
          ),
        })),

      markMessagesSeen: (senderId) =>
        set((state) => ({
          messages: state.messages.map((m) =>
            m.sender?._id === senderId || m.sender === senderId
              ? { ...m, isSeen: true }
              : m
          ),
        })),

      toggleDarkMode: () =>
        set((state) => ({ darkMode: !state.darkMode })),

      // Call state
      callState: null,
      // callState shape: { type: 'audio'|'video', status: 'ringing'|'connected'|'ended', direction: 'incoming'|'outgoing', peerId, peerName, peerPicture }

      setCallState: (callState) => set({ callState }),

      startOutgoingCall: (peer, type) =>
        set({
          callState: {
            type,
            status: 'ringing',
            direction: 'outgoing',
            peerId: peer._id,
            peerName: peer.name,
            peerPicture: peer.profilePicture,
          },
        }),

      receiveIncomingCall: (caller, type) =>
        set({
          callState: {
            type,
            status: 'ringing',
            direction: 'incoming',
            peerId: caller.id,
            peerName: caller.name,
            peerPicture: caller.profilePicture,
          },
        }),

      acceptCall: () =>
        set((state) =>
          state.callState
            ? { callState: { ...state.callState, status: 'connected' } }
            : state
        ),

      endCall: () => set({ callState: null }),

      setGroupCallState: (groupCallState) => set({ groupCallState }),
      endGroupCall: () => set({ groupCallState: null }),
    }),
    {
      name: 'chat-store',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        darkMode: state.darkMode,
      }),
      onRehydrateStorage: () => (state, err) => {
        if (!err) useStore.getState().setHydrated(true);
      },
    }
  )
);

export default useStore;
