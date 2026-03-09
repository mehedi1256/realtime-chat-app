const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema(
  {
    groupName: {
      type: String,
      required: [true, 'Group name is required'],
      trim: true,
      maxlength: 100,
    },
    groupAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    groupMembers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    groupAvatar: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

groupSchema.index({ groupMembers: 1 });
groupSchema.index({ groupAdmin: 1 });

module.exports = mongoose.model('Group', groupSchema);
