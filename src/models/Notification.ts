import mongoose, { Document, Schema, Model } from 'mongoose';

export type NotificationType =
  | 'new_video'
  | 'video_like'
  | 'comment'
  | 'comment_like'
  | 'comment_reply'
  | 'subscription';

export interface INotificationDocument extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  message: string;
  videoId?: mongoose.Types.ObjectId;
  commentId?: mongoose.Types.ObjectId;
  actorId: mongoose.Types.ObjectId;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotificationDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['new_video', 'video_like', 'comment', 'comment_like', 'comment_reply', 'subscription'],
      required: true,
    },
    message: {
      type: String,
      required: true,
      maxlength: [500, 'Message cannot exceed 500 characters'],
    },
    videoId: {
      type: Schema.Types.ObjectId,
      ref: 'Video',
    },
    commentId: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1 });

const Notification: Model<INotificationDocument> =
  mongoose.models.Notification ||
  mongoose.model<INotificationDocument>('Notification', notificationSchema);

export default Notification;
