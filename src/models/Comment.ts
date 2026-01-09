import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ICommentDocument extends Document {
  _id: mongoose.Types.ObjectId;
  content: string;
  videoId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  likes: mongoose.Types.ObjectId[];
  parentCommentId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<ICommentDocument>(
  {
    content: {
      type: String,
      required: [true, 'Comment content is required'],
      trim: true,
      minlength: [1, 'Comment must have at least 1 character'],
      maxlength: [2000, 'Comment cannot exceed 2000 characters'],
    },
    videoId: {
      type: Schema.Types.ObjectId,
      ref: 'Video',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    likes: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    parentCommentId: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
commentSchema.index({ videoId: 1, createdAt: -1 });
commentSchema.index({ parentCommentId: 1 });
commentSchema.index({ userId: 1 });

// Virtual for like count
commentSchema.virtual('likeCount').get(function () {
  return this.likes.length;
});

// Ensure virtuals are included in JSON
commentSchema.set('toJSON', { virtuals: true });
commentSchema.set('toObject', { virtuals: true });

const Comment: Model<ICommentDocument> =
  mongoose.models.Comment || mongoose.model<ICommentDocument>('Comment', commentSchema);

export default Comment;
