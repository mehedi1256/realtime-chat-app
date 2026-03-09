const Group = require('../models/Group');
const GroupMessage = require('../models/GroupMessage');
const User = require('../models/User');

exports.createGroup = async (req, res) => {
  try {
    const { groupName, memberIds } = req.body;
    if (!groupName?.trim()) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const adminId = req.user._id;
    let members = [];
    if (typeof memberIds === 'string') {
      try {
        members = JSON.parse(memberIds);
      } catch {
        members = [];
      }
    } else if (Array.isArray(memberIds)) {
      members = memberIds;
    }
    if (!members.includes(adminId.toString())) {
      members.unshift(adminId.toString());
    }
    const uniqueMembers = [...new Set(members)];

    const group = await Group.create({
      groupName: groupName.trim(),
      groupAdmin: adminId,
      groupMembers: uniqueMembers,
      groupAvatar: req.file?.filename ? `/uploads/${req.file.filename}` : '',
    });

    const populated = await Group.findById(group._id)
      .populate('groupAdmin', 'name profilePicture')
      .populate('groupMembers', 'name profilePicture isOnline lastSeen');

    res.status(201).json({ group: populated });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
};

exports.getMyGroups = async (req, res) => {
  try {
    const groups = await Group.find({ groupMembers: req.user._id })
      .populate('groupAdmin', 'name profilePicture')
      .populate('groupMembers', 'name profilePicture isOnline lastSeen')
      .sort({ updatedAt: -1 });

    const groupsWithLastMessage = await Promise.all(
      groups.map(async (group) => {
        const lastMessage = await GroupMessage.findOne({ groupId: group._id, isDeleted: false })
          .sort({ createdAt: -1 })
          .populate('sender', 'name profilePicture')
          .select('encryptedMessage createdAt sender fileUrl fileName');
        return { ...group.toObject(), lastMessage };
      })
    );

    res.json({ groups: groupsWithLastMessage });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
};

exports.getGroupById = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
      .populate('groupAdmin', 'name profilePicture')
      .populate('groupMembers', 'name profilePicture isOnline lastSeen');

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const isMember = group.groupMembers.some(
      (m) => m._id.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    res.json({ group });
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({ error: 'Failed to fetch group' });
  }
};

exports.addMembers = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (group.groupAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only admin can add members' });
    }

    const { memberIds } = req.body;
    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ error: 'memberIds array is required' });
    }

    const existingIds = group.groupMembers.map((m) => m.toString());
    const toAdd = memberIds.filter((id) => !existingIds.includes(id));
    if (toAdd.length === 0) {
      return res.json({ group, added: [] });
    }

    const validUsers = await User.find({ _id: { $in: toAdd } }).select('_id');
    const validIds = validUsers.map((u) => u._id.toString());
    group.groupMembers.push(...validIds);
    await group.save();

    const populated = await Group.findById(group._id)
      .populate('groupAdmin', 'name profilePicture')
      .populate('groupMembers', 'name profilePicture isOnline lastSeen');

    res.json({ group: populated, added: validIds });
  } catch (error) {
    console.error('Add members error:', error);
    res.status(500).json({ error: 'Failed to add members' });
  }
};

exports.removeMember = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (group.groupAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only admin can remove members' });
    }

    const { userId } = req.params;
    if (userId === group.groupAdmin.toString()) {
      return res.status(400).json({ error: 'Admin cannot be removed' });
    }

    group.groupMembers = group.groupMembers.filter((m) => m.toString() !== userId);
    await group.save();

    const populated = await Group.findById(group._id)
      .populate('groupAdmin', 'name profilePicture')
      .populate('groupMembers', 'name profilePicture isOnline lastSeen');

    res.json({ group: populated });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
};

exports.leaveGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const userId = req.user._id.toString();
    const isMember = group.groupMembers.some((m) => m.toString() === userId);
    if (!isMember) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    if (group.groupAdmin.toString() === userId) {
      if (group.groupMembers.length <= 1) {
        await Group.findByIdAndDelete(group._id);
        return res.json({ left: true, groupDeleted: true });
      }
      const newAdmin = group.groupMembers.find((m) => m.toString() !== userId);
      group.groupAdmin = newAdmin;
    }

    group.groupMembers = group.groupMembers.filter((m) => m.toString() !== userId);
    await group.save();

    res.json({ left: true });
  } catch (error) {
    console.error('Leave group error:', error);
    res.status(500).json({ error: 'Failed to leave group' });
  }
};

exports.updateGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (group.groupAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only admin can update group' });
    }

    const { groupName } = req.body;
    if (groupName?.trim()) group.groupName = groupName.trim();
    if (req.file?.filename) group.groupAvatar = `/uploads/${req.file.filename}`;
    await group.save();

    const populated = await Group.findById(group._id)
      .populate('groupAdmin', 'name profilePicture')
      .populate('groupMembers', 'name profilePicture isOnline lastSeen');

    res.json({ group: populated });
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ error: 'Failed to update group' });
  }
};
