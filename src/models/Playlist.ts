import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IPlaylistDocument extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelId: mongoose.Types.ObjectId;
  videos: mongoose.Types.ObjectId[];
  visibility: 'public' | 'private' | 'unlisted';
  videoCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const playlistSchema = new Schema<IPlaylistDocument>(
  {
    title: {
      type: String,
      required: [true, 'Playlist title is required'],
      trim: true,
      minlength: [1, 'Playlist title must be at least 1 character'],
      maxlength: [150, 'Playlist title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      default: '',
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    thumbnailUrl: {
      type: String,
      default: '',
    },
    channelId: {
      type: Schema.Types.ObjectId,
      ref: 'Channel',
      required: true,
    },
    videos: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Video',
      },
    ],
    visibility: {
      type: String,
      enum: ['public', 'private', 'unlisted'],
      default: 'public',
    },
    videoCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
playlistSchema.index({ channelId: 1 });
playlistSchema.index({ visibility: 1 });
playlistSchema.index({ title: 'text' });

// Update video count on save
playlistSchema.pre('save', function (next) {
  if (this.isModified('videos')) {
    this.videoCount = this.videos.length;
  }
  next();
});

const Playlist: Model<IPlaylistDocument> =
  mongoose.models.Playlist || mongoose.model<IPlaylistDocument>('Playlist', playlistSchema);

export default Playlist;
