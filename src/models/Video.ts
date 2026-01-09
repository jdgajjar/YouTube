import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IVideoDocument extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  channelId: mongoose.Types.ObjectId;
  views: number;
  likes: mongoose.Types.ObjectId[];
  duration: number;
  uploadDate: Date;
  tags?: string[];
  category?: string;
  commentCount?: number;
  rankingScore?: number;
  createdAt: Date;
  updatedAt: Date;
}

const videoSchema = new Schema<IVideoDocument>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    videoUrl: {
      type: String,
      required: [true, 'Video URL is required'],
    },
    thumbnailUrl: {
      type: String,
      default: '/default-thumbnail.jpg',
    },
    channelId: {
      type: Schema.Types.ObjectId,
      ref: 'Channel',
      required: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    likes: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    duration: {
      type: Number,
      default: 0,
    },
    uploadDate: {
      type: Date,
      default: Date.now,
    },
    tags: {
      type: [String],
      default: [],
      maxlength: [50, 'Tag cannot exceed 50 characters'],
    },
    category: {
      type: String,
      default: 'General',
      maxlength: [50, 'Category cannot exceed 50 characters'],
    },
    commentCount: {
      type: Number,
      default: 0,
    },
    rankingScore: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Text index for search (including tags)
videoSchema.index({ title: 'text', description: 'text', tags: 'text' });
videoSchema.index({ channelId: 1 });
videoSchema.index({ views: -1 });
videoSchema.index({ uploadDate: -1 });
videoSchema.index({ createdAt: -1 });
videoSchema.index({ category: 1 });
videoSchema.index({ rankingScore: -1 });

// Virtual for like count
videoSchema.virtual('likeCount').get(function () {
  return this.likes.length;
});

// Ensure virtuals are included in JSON
videoSchema.set('toJSON', { virtuals: true });
videoSchema.set('toObject', { virtuals: true });

const Video: Model<IVideoDocument> =
  mongoose.models.Video || mongoose.model<IVideoDocument>('Video', videoSchema);

export default Video;
