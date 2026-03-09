const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');

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
      const receiverSocketId = onlineUsers.get(to);
      if (receiverSocketId) {
        io.to(to).emit('incoming_call', {
          from: {
            id: userId,
            name: socket.user.name,
            profilePicture: socket.user.profilePicture,
          },
          offer,
          type,
        });
      } else {
        socket.emit('call_unavailable', { userId: to });
      }
    });

    socket.on('call_accepted', ({ to, answer }) => {
      io.to(to).emit('call_accepted', { answer });
    });

    socket.on('call_rejected', ({ to }) => {
      io.to(to).emit('call_rejected', { userId });
    });

    socket.on('ice_candidate', ({ to, candidate }) => {
      io.to(to).emit('ice_candidate', { candidate, from: userId });
    });

    socket.on('call_ended', ({ to }) => {
      io.to(to).emit('call_ended', { userId });
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
