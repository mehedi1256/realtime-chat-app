const User = require('../models/User');
const Message = require('../models/Message');

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } })
      .select('name email profilePicture isOnline lastSeen')
      .sort({ name: 1 });

    const usersWithLastMessage = await Promise.all(
      users.map(async (user) => {
        const lastMessage = await Message.findOne({
          $or: [
            { sender: req.user._id, receiver: user._id },
            { sender: user._id, receiver: req.user._id },
          ],
        })
          .sort({ createdAt: -1 })
          .select('encryptedMessage createdAt sender fileUrl');

        const unreadCount = await Message.countDocuments({
          sender: user._id,
          receiver: req.user._id,
          isSeen: false,
        });

        return {
          ...user.toObject(),
          lastMessage,
          unreadCount,
        };
      })
    );

    usersWithLastMessage.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt || new Date(0);
      const bTime = b.lastMessage?.createdAt || new Date(0);
      return bTime - aTime;
    });

    res.json({ users: usersWithLastMessage });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const users = await User.find({
      _id: { $ne: req.user._id },
      name: { $regex: q, $options: 'i' },
    }).select('name email profilePicture isOnline lastSeen');

    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
};
