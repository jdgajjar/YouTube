import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Video from '@/models/Video';
import Channel from '@/models/Channel';
import Notification from '@/models/Notification';
import { getCurrentUser } from '@/lib/auth';
import {
  successResponse,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/api-response';

// Toggle like on a video
export async function POST(
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

    const userId = user._id.toString();
    const isLiked = video.likes.some(
      (likeId) => likeId.toString() === userId
    );

    if (isLiked) {
      // Unlike
      await Video.findByIdAndUpdate(id, {
        $pull: { likes: user._id },
      });
    } else {
      // Like
      await Video.findByIdAndUpdate(id, {
        $addToSet: { likes: user._id },
      });

      // Create notification for video owner (if not self)
      const channel = video.channelId as typeof video.channelId & {
        userId: { toString: () => string };
        name: string;
      };
      if (channel.userId.toString() !== userId) {
        await Notification.create({
          userId: channel.userId,
          type: 'video_like',
          message: `${user.username} liked your video "${video.title}"`,
          videoId: video._id,
          actorId: user._id,
        });
      }
    }

    const updatedVideo = await Video.findById(id);

    return successResponse({
      liked: !isLiked,
      likeCount: updatedVideo?.likes.length || 0,
    });
  } catch (error) {
    console.error('Like video error:', error);
    return serverErrorResponse(error);
  }
}

// Get like status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const user = await getCurrentUser(request);
    const { id } = await params;
    const video = await Video.findById(id);

    if (!video) {
      return notFoundResponse('Video not found');
    }

    const isLiked = user
      ? video.likes.some((likeId) => likeId.toString() === user._id.toString())
      : false;

    return successResponse({
      liked: isLiked,
      likeCount: video.likes.length,
    });
  } catch (error) {
    console.error('Get like status error:', error);
    return serverErrorResponse(error);
  }
}
