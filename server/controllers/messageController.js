const Message = require('../models/Message');

exports.getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: userId },
        { sender: userId, receiver: req.user._id },
      ],
    })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('sender', 'name profilePicture')
      .populate('receiver', 'name profilePicture')
      .populate('reactions.userId', 'name');

    const total = await Message.countDocuments({
      $or: [
        { sender: req.user._id, receiver: userId },
        { sender: userId, receiver: req.user._id },
      ],
    });

    res.json({
      messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

exports.markSeen = async (req, res) => {
  try {
    const { userId } = req.params;

    await Message.updateMany(
      {
        sender: userId,
        receiver: req.user._id,
        isSeen: false,
      },
      { isSeen: true }
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark messages as seen' });
  }
};

exports.editMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { encryptedMessage } = req.body;

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only edit your own messages' });
    }

    message.encryptedMessage = encryptedMessage;
    message.isEdited = true;
    await message.save();

    const populated = await Message.findById(id)
      .populate('sender', 'name profilePicture')
      .populate('receiver', 'name profilePicture');

    res.json({ message: populated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to edit message' });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }

    message.isDeleted = true;
    message.encryptedMessage = '';
    message.fileUrl = '';
    await message.save();

    res.json({ message });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete message' });
  }
};

exports.reactToMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const existingReaction = message.reactions.find(
      (r) => r.userId.toString() === req.user._id.toString()
    );

    if (existingReaction) {
      if (existingReaction.emoji === emoji) {
        message.reactions = message.reactions.filter(
          (r) => r.userId.toString() !== req.user._id.toString()
        );
      } else {
        existingReaction.emoji = emoji;
      }
    } else {
      message.reactions.push({ userId: req.user._id, emoji });
    }

    await message.save();

    const populated = await Message.findById(id)
      .populate('sender', 'name profilePicture')
      .populate('receiver', 'name profilePicture')
      .populate('reactions.userId', 'name');

    res.json({ message: populated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to react to message' });
  }
};

exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    res.json({
      fileUrl: `/uploads/${req.file.filename}`,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
    });
  } catch (error) {
    res.status(500).json({ error: 'File upload failed' });
  }
};
