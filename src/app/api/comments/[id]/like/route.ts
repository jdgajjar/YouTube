import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Comment from '@/models/Comment';
import Video from '@/models/Video';
import Notification from '@/models/Notification';
import { getCurrentUser } from '@/lib/auth';
import {
  successResponse,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/api-response';

// Toggle like on a comment
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
    const comment = await Comment.findById(id).populate('userId', 'username');

    if (!comment) {
      return notFoundResponse('Comment not found');
    }

    const userId = user._id.toString();
    const isLiked = comment.likes.some(
      (likeId) => likeId.toString() === userId
    );

    if (isLiked) {
      // Unlike
      await Comment.findByIdAndUpdate(id, {
        $pull: { likes: user._id },
      });
    } else {
      // Like
      await Comment.findByIdAndUpdate(id, {
        $addToSet: { likes: user._id },
      });

      // Create notification for comment owner (if not self)
      if (comment.userId._id.toString() !== userId) {
        const video = await Video.findById(comment.videoId);
        await Notification.create({
          userId: comment.userId._id,
          type: 'comment_like',
          message: `${user.username} liked your comment${
            video ? ` on "${video.title}"` : ''
          }`,
          videoId: comment.videoId,
          commentId: comment._id,
          actorId: user._id,
        });
      }
    }

    const updatedComment = await Comment.findById(id);

    return successResponse({
      liked: !isLiked,
      likeCount: updatedComment?.likes.length || 0,
    });
  } catch (error) {
    console.error('Like comment error:', error);
    return serverErrorResponse(error);
  }
}
