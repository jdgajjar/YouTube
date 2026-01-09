import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IChannelDocument extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  avatar: string;
  banner: string;
  userId: mongoose.Types.ObjectId;
  subscribers: mongoose.Types.ObjectId[];
  videoCount: number;
  subscriberCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const channelSchema = new Schema<IChannelDocument>(
  {
    name: {
      type: String,
      required: [true, 'Channel name is required'],
      trim: true,
      minlength: [3, 'Channel name must be at least 3 characters'],
      maxlength: [50, 'Channel name cannot exceed 50 characters'],
    },
    description: {
      type: String,
      default: '',
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    avatar: {
      type: String,
      default: '/default-avatar.png',
    },
    banner: {
      type: String,
      default: '/default-banner.jpg',
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    subscribers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    videoCount: {
      type: Number,
      default: 0,
    },
    subscriberCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
channelSchema.index({ name: 'text' });
channelSchema.index({ userId: 1 });
channelSchema.index({ subscriberCount: -1 });

// Virtual for subscriber count
channelSchema.pre('save', function (next) {
  if (this.isModified('subscribers')) {
    this.subscriberCount = this.subscribers.length;
  }
  next();
});

const Channel: Model<IChannelDocument> =
  mongoose.models.Channel || mongoose.model<IChannelDocument>('Channel', channelSchema);

export default Channel;
