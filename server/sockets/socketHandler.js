const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Group = require('../models/Group');
const GroupMessage = require('../models/GroupMessage');

const onlineUsers = new Map();

const initSocket = (server) => {
  const { Server } = require('socket.io');

  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    maxHttpBufferSize: 50 * 1024 * 1024,
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    console.log(`User connected: ${userId}`);

    onlineUsers.set(userId, socket.id);

    await User.findByIdAndUpdate(userId, { isOnline: true });
    io.emit('user_online', { userId });

    socket.join(userId);

    // Join all group rooms so user receives updates without having group open
    try {
      const groups = await Group.find({ groupMembers: userId }).select('_id').lean();
      groups.forEach((g) => socket.join(`group:${g._id}`));
    } catch (err) {
      console.error('join groups on connect error:', err);
    }

    // ── Group chat ──

    socket.on('join_group', async (groupId) => {
      try {
        const group = await Group.findById(groupId);
        if (!group) return;
        const isMember = group.groupMembers.some((m) => m.toString() === userId);
        if (!isMember) return;
        socket.join(`group:${groupId}`);
      } catch (err) {
        console.error('join_group error:', err);
      }
    });

    socket.on('leave_group', (groupId) => {
      socket.leave(`group:${groupId}`);
    });

    socket.on('send_group_message', async (data) => {
      try {
        const { groupId, encryptedMessage, fileUrl, fileName, fileType } = data;
        const group = await Group.findById(groupId);
        if (!group) return socket.emit('error', { message: 'Group not found' });
        const isMember = group.groupMembers.some((m) => m.toString() === userId);
        if (!isMember) return socket.emit('error', { message: 'Not a member' });

        const isAdmin = group.groupAdmin.toString() === userId;
        const settings = group.settings || {};
        const isFileMessage = !!(fileName || fileUrl);

        if (isFileMessage) {
          const whoCan = settings.whoCanSendFiles || 'all';
          if (whoCan === 'admin_only' && !isAdmin) {
            return socket.emit('error', { message: 'Only admin can send files' });
          }
        } else {
          const whoCan = settings.whoCanSendMessages || 'all';
          if (whoCan === 'admin_only' && !isAdmin) {
            return socket.emit('error', { message: 'Only admin can send messages' });
          }
        }

        const msg = await GroupMessage.create({
          groupId,
          sender: userId,
          encryptedMessage: encryptedMessage || '',
          fileUrl: fileUrl || '',
          fileName: fileName || '',
          fileType: fileType || '',
        });

        const populated = await GroupMessage.findById(msg._id).populate(
          'sender',
          'name profilePicture'
        );

        io.to(`group:${groupId}`).emit('receive_group_message', populated);
      } catch (error) {
        socket.emit('error', { message: 'Failed to send group message' });
      }
    });

    socket.on('group_typing', ({ groupId }) => {
      socket.to(`group:${groupId}`).emit('group_typing', { userId, groupId });
    });

    socket.on('group_stop_typing', ({ groupId }) => {
      socket.to(`group:${groupId}`).emit('group_stop_typing', { userId, groupId });
    });

    const getGroupMemberIds = (grp) => {
      const members = grp?.groupMembers || [];
      return members.map((m) => {
        if (!m) return null;
        const id = typeof m === 'object' && m._id ? m._id : m;
        return id.toString();
      }).filter(Boolean);
    };

    socket.on('group_members_added', ({ groupId, group, addedIds }) => {
      const populated = group;
      const memberIds = getGroupMemberIds(populated);
      memberIds.forEach((id) => io.to(id).emit('group_updated', populated));
      (addedIds || []).forEach((id) => {
        io.to(id).emit('added_to_group', { group: populated });
      });
    });

    socket.on('group_settings_updated', async ({ groupId, group }) => {
      try {
        const g = await Group.findById(groupId);
        if (!g || g.groupAdmin.toString() !== userId) return;
        const memberIds = getGroupMemberIds(group);
        memberIds.forEach((id) => io.to(id).emit('group_updated', group));
      } catch (err) {
        console.error('group_settings_updated error:', err);
      }
    });

    socket.on('group_member_removed', async ({ groupId, group, removedUserId }) => {
      try {
        const g = await Group.findById(groupId);
        if (!g || g.groupAdmin.toString() !== userId) return;
        const memberIds = getGroupMemberIds(group);
        memberIds.forEach((id) => io.to(id).emit('group_updated', group));
        io.to(removedUserId).emit('removed_from_group', { groupId });
      } catch (err) {
        console.error('group_member_removed error:', err);
      }
    });

    // ── Group calling ──

    socket.on('group_call_start', async ({ groupId, offer, type }) => {
      try {
        const gId = groupId != null ? String(groupId) : '';
        if (!gId) return;
        const group = await Group.findById(gId);
        if (!group) return socket.emit('error', { message: 'Group not found' });
        const isMember = group.groupMembers.some((m) => m.toString() === userId);
        if (!isMember) return;

        socket.join(`group-call:${gId}`);
        const payload = {
          groupId: gId,
          from: {
            id: userId,
            name: socket.user.name,
            profilePicture: socket.user.profilePicture,
          },
          offer: offer || null,
          type: type || 'video',
        };
        // Emit to every group member by userId (so they get the call even if group chat isn't open)
        const memberIds = group.groupMembers.map((m) => m.toString()).filter((id) => id !== userId);
        memberIds.forEach((memberId) => {
          io.to(memberId).emit('incoming_group_call', payload);
        });
      } catch (err) {
        console.error('group_call_start error:', err);
      }
    });

    socket.on('join_group_call', async ({ groupId, answer, toUserId }) => {
      socket.join(`group-call:${groupId}`);
      socket.to(`group-call:${groupId}`).emit('group_call_participant_joined', {
        groupId,
        userId,
        name: socket.user.name,
        profilePicture: socket.user.profilePicture,
      });
      if (toUserId && answer) {
        const toSocketId = onlineUsers.get(toUserId);
        if (toSocketId) io.to(toSocketId).emit('webrtc_answer', { from: userId, answer });
      }
    });

    socket.on('webrtc_offer', ({ groupId, toUserId, offer }) => {
      const toId = toUserId != null ? String(toUserId) : '';
      if (toId) io.to(toId).emit('webrtc_offer', { from: userId, offer });
    });

    socket.on('webrtc_answer', ({ groupId, toUserId, answer }) => {
      const toId = toUserId != null ? String(toUserId) : '';
      if (toId) io.to(toId).emit('webrtc_answer', { from: userId, answer });
    });

    socket.on('webrtc_ice_candidate', ({ groupId, toUserId, candidate }) => {
      const toId = toUserId != null ? String(toUserId) : '';
      if (toId) io.to(toId).emit('webrtc_ice_candidate', { from: userId, candidate });
    });

    socket.on('leave_group_call', ({ groupId }) => {
      socket.leave(`group-call:${groupId}`);
      socket.to(`group-call:${groupId}`).emit('group_call_participant_left', { groupId, userId });
    });

    socket.on('end_group_call', ({ groupId }) => {
      io.to(`group-call:${groupId}`).emit('group_call_ended', { groupId });
      socket.leave(`group-call:${groupId}`);
    });

    socket.on('send_message', async (data) => {
      try {
        const { receiverId, encryptedMessage, fileUrl, fileName, fileType } = data;

        const message = await Message.create({
          sender: userId,
          receiver: receiverId,
          encryptedMessage: encryptedMessage || '',
          fileUrl: fileUrl || '',
          fileName: fileName || '',
          fileType: fileType || '',
        });

        const populated = await Message.findById(message._id)
          .populate('sender', 'name profilePicture')
          .populate('receiver', 'name profilePicture');

        socket.emit('receive_message', populated);

        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverId).emit('receive_message', populated);
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('typing', ({ receiverId }) => {
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverId).emit('typing', { userId });
      }
    });

    socket.on('stop_typing', ({ receiverId }) => {
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverId).emit('stop_typing', { userId });
      }
    });

    socket.on('message_seen', async ({ senderId, receiverId }) => {
      try {
        await Message.updateMany(
          { sender: senderId, receiver: receiverId, isSeen: false },
          { isSeen: true }
        );

        const senderSocketId = onlineUsers.get(senderId);
        if (senderSocketId) {
          io.to(senderId).emit('message_seen', { seenBy: receiverId, senderId });
        }
      } catch (error) {
        console.error('Error marking messages as seen:', error);
      }
    });

    socket.on('message_deleted', async ({ messageId, receiverId }) => {
      try {
        const message = await Message.findById(messageId);
        if (message && message.sender.toString() === userId) {
          message.isDeleted = true;
          message.encryptedMessage = '';
          message.fileUrl = '';
          await message.save();

          socket.emit('message_deleted', { messageId });
          io.to(receiverId).emit('message_deleted', { messageId });
        }
      } catch (error) {
        console.error('Error deleting message:', error);
      }
    });

    socket.on('message_edited', async ({ messageId, encryptedMessage, receiverId }) => {
      try {
        const message = await Message.findById(messageId);
        if (message && message.sender.toString() === userId) {
          message.encryptedMessage = encryptedMessage;
          message.isEdited = true;
          await message.save();

          const populated = await Message.findById(messageId)
            .populate('sender', 'name profilePicture')
            .populate('receiver', 'name profilePicture');

          socket.emit('message_edited', populated);
          io.to(receiverId).emit('message_edited', populated);
        }
      } catch (error) {
        console.error('Error editing message:', error);
      }
    });

    socket.on('message_reaction', async ({ messageId, emoji, receiverId }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) return;

        const existing = message.reactions.find(
          (r) => r.userId.toString() === userId
        );

        if (existing) {
          if (existing.emoji === emoji) {
            message.reactions = message.reactions.filter(
              (r) => r.userId.toString() !== userId
            );
          } else {
            existing.emoji = emoji;
          }
        } else {
          message.reactions.push({ userId, emoji });
        }

        await message.save();

        const populated = await Message.findById(messageId)
          .populate('sender', 'name profilePicture')
          .populate('receiver', 'name profilePicture')
          .populate('reactions.userId', 'name');

        socket.emit('message_reaction', populated);
        io.to(receiverId).emit('message_reaction', populated);
      } catch (error) {
        console.error('Error reacting to message:', error);
      }
    });

    // ── WebRTC Call Signaling ──

    socket.on('call_user', ({ to, offer, type }) => {
      const toId = to != null ? String(to) : '';
      if (!toId) return;
      const receiverSocketId = onlineUsers.get(toId);
      if (receiverSocketId) {
        io.to(toId).emit('incoming_call', {
          from: {
            id: userId,
            name: socket.user.name,
            profilePicture: socket.user.profilePicture,
          },
          offer,
          type,
        });
      } else {
        socket.emit('call_unavailable', { userId: toId });
      }
    });

    socket.on('call_accepted', ({ to, answer }) => {
      const toId = to != null ? String(to) : '';
      if (toId) io.to(toId).emit('call_accepted', { answer });
    });

    socket.on('call_rejected', ({ to }) => {
      const toId = to != null ? String(to) : '';
      if (toId) io.to(toId).emit('call_rejected', { userId });
    });

    socket.on('ice_candidate', ({ to, candidate }) => {
      const toId = to != null ? String(to) : '';
      if (toId) io.to(toId).emit('ice_candidate', { candidate, from: userId });
    });

    socket.on('call_ended', ({ to }) => {
      const toId = to != null ? String(to) : '';
      if (toId) io.to(toId).emit('call_ended', { userId });
    });

    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${userId}`);
      onlineUsers.delete(userId);

      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastSeen: new Date(),
      });

      io.emit('user_offline', { userId, lastSeen: new Date() });
    });
  });

  return io;
};

module.exports = { initSocket };
