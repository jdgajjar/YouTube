import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Video from '@/models/Video';
import Channel from '@/models/Channel';
import Comment from '@/models/Comment';
import User from '@/models/User';
import Notification from '@/models/Notification';
import Playlist from '@/models/Playlist';
import { getCurrentUser } from '@/lib/auth';
import { deleteResource, extractPublicId, uploadImage } from '@/lib/cloudinary';
import {
  successResponse,
  unauthorizedResponse,
  notFoundResponse,
  forbiddenResponse,
  serverErrorResponse,
  validationErrorResponse,
} from '@/lib/api-response';

interface UpdateVideoBody {
  title?: string;
  description?: string;
  thumbnailUrl?: string;
}

// Get video by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const video = await Video.findById(id).populate({
      path: 'channelId',
      select: 'name avatar subscriberCount subscribers userId',
    });

    if (!video) {
      return notFoundResponse('Video not found');
    }

    // Increment view count
    await Video.findByIdAndUpdate(id, { $inc: { views: 1 } });

    // Get current user to check if liked
    const user = await getCurrentUser(request);
    const isLiked = user
      ? video.likes.some((likeId) => likeId.toString() === user._id.toString())
      : false;

    // Check if user is subscribed to channel
    const channel = video.channelId as typeof video.channelId & {
      subscribers: string[];
    };
    const isSubscribed = user
      ? channel.subscribers?.some(
          (subId) => subId.toString() === user._id.toString()
        )
      : false;

    // Get comment count
    const commentCount = await Comment.countDocuments({
      videoId: id,
      parentCommentId: null,
    });

    // Add to watch history if user is logged in
    if (user) {
      await User.findByIdAndUpdate(user._id, {
        $pull: { watchHistory: id }, // Remove if exists
      });
      await User.findByIdAndUpdate(user._id, {
        $push: {
          watchHistory: {
            $each: [id],
            $position: 0, // Add to beginning
            $slice: 100, // Keep only last 100
          },
        },
      });
    }

    // Get related videos (same channel or similar)
    const relatedVideos = await Video.find({
      _id: { $ne: id },
    })
      .sort({ views: -1 })
      .limit(10)
      .populate({
        path: 'channelId',
        select: 'name avatar',
      });

    return successResponse({
      video: {
        ...video.toObject(),
        likeCount: video.likes.length,
      },
      isLiked,
      isSubscribed,
      commentCount,
      relatedVideos,
    });
  } catch (error) {
    console.error('Get video error:', error);
    return serverErrorResponse(error);
  }
}

// Update video
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const user = await getCurrentUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    const video = await Video.findById(id).populate('channelId');

    if (!video) {
      return notFoundResponse('Video not found');
    }

    // Check ownership
    const channel = video.channelId as typeof video.channelId & {
      userId: { toString: () => string };
    };
    if (channel.userId.toString() !== user._id.toString()) {
      return forbiddenResponse('You can only edit your own videos');
    }

    // Handle form data or JSON
    const contentType = request.headers.get('content-type') || '';
    let body: UpdateVideoBody = {};
    let thumbnailFile: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      body = {
        title: formData.get('title') as string || undefined,
        description: formData.get('description') as string || undefined,
      };
      thumbnailFile = formData.get('thumbnail') as File | null;
    } else {
      body = await request.json();
    }

    const { title, description } = body;

    // Validation
    const errors: Record<string, string> = {};

    if (title !== undefined) {
      if (!title.trim()) {
        errors.title = 'Title cannot be empty';
      } else if (title.length < 3) {
        errors.title = 'Title must be at least 3 characters';
      } else if (title.length > 100) {
        errors.title = 'Title cannot exceed 100 characters';
      }
    }

    if (description !== undefined && description.length > 5000) {
      errors.description = 'Description cannot exceed 5000 characters';
    }

    if (Object.keys(errors).length > 0) {
      return validationErrorResponse(errors);
    }

    // Handle thumbnail upload
    let thumbnailUrl: string | undefined;
    if (thumbnailFile) {
      const thumbnailBuffer = Buffer.from(await thumbnailFile.arrayBuffer());
      const thumbnailResult = await uploadImage(
        thumbnailBuffer,
        'youtube-clone/thumbnails'
      );
      thumbnailUrl = thumbnailResult.secure_url;
    }

    // Update video
    const updateData: UpdateVideoBody = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (thumbnailUrl) updateData.thumbnailUrl = thumbnailUrl;

    const updatedVideo = await Video.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    ).populate({
      path: 'channelId',
      select: 'name avatar subscriberCount',
    });

    return successResponse(updatedVideo, 'Video updated successfully');
  } catch (error) {
    console.error('Update video error:', error);
    return serverErrorResponse(error);
  }
}

// Delete video
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const user = await getCurrentUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    const video = await Video.findById(id).populate('channelId');

    if (!video) {
      return notFoundResponse('Video not found');
    }

    // Check ownership
    const channel = video.channelId as typeof video.channelId & {
      userId: { toString: () => string };
    };
    if (channel.userId.toString() !== user._id.toString()) {
      return forbiddenResponse('You can only delete your own videos');
    }

    // Delete video from Cloudinary
    const videoPublicId = extractPublicId(video.videoUrl);
    if (videoPublicId) {
      await deleteResource(videoPublicId, 'video');
    }

    // Delete thumbnail from Cloudinary if it's a custom one
    if (
      video.thumbnailUrl &&
      !video.thumbnailUrl.includes('/video/upload/') &&
      video.thumbnailUrl.includes('cloudinary')
    ) {
      const thumbnailPublicId = extractPublicId(video.thumbnailUrl);
      if (thumbnailPublicId) {
        await deleteResource(thumbnailPublicId, 'image');
      }
    }

    // Get all comment IDs for this video (to delete related notifications)
    const comments = await Comment.find({ videoId: id }).select('_id');
    const commentIds = comments.map(c => c._id);

    // Delete all comments on this video
    await Comment.deleteMany({ videoId: id });

    // Delete all notifications related to this video or its comments
    await Notification.deleteMany({
      $or: [
        { videoId: id },
        { commentId: { $in: commentIds } }
      ]
    });

    // Remove video from all playlists
    await Playlist.updateMany(
      { videos: id },
      { 
        $pull: { videos: id },
        $inc: { videoCount: -1 }
      }
    );

    // Delete video
    await Video.findByIdAndDelete(id);

    // Update channel video count
    await Channel.findByIdAndUpdate(video.channelId, {
      $inc: { videoCount: -1 },
    });

    // Remove from all users' watch history and watch later
    await User.updateMany(
      {},
      {
        $pull: {
          watchHistory: id,
          watchLater: id,
        },
      }
    );

    return successResponse(null, 'Video deleted successfully');
  } catch (error) {
    console.error('Delete video error:', error);
    return serverErrorResponse(error);
  }
}
