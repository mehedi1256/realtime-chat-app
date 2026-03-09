const GroupMessage = require('../models/GroupMessage');
const Group = require('../models/Group');

exports.getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    const isMember = group.groupMembers.some(
      (m) => m.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    const messages = await GroupMessage.find({ groupId, isDeleted: false })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('sender', 'name profilePicture');

    const total = await GroupMessage.countDocuments({ groupId, isDeleted: false });

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
    console.error('Get group messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};
