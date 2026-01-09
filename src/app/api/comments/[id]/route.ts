import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Video from '@/models/Video';
import Comment from '@/models/Comment';
import Channel from '@/models/Channel';
import { getCurrentUser } from '@/lib/auth';
import {
  successResponse,
  unauthorizedResponse,
  notFoundResponse,
  forbiddenResponse,
  serverErrorResponse,
  validationErrorResponse,
} from '@/lib/api-response';

interface UpdateCommentBody {
  content: string;
}

// Get single comment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const comment = await Comment.findById(id)
      .populate('userId', 'username')
      .populate('videoId', 'title');

    if (!comment) {
      return notFoundResponse('Comment not found');
    }

    // Get replies
    const replies = await Comment.find({ parentCommentId: id })
      .sort({ createdAt: 1 })
      .populate('userId', 'username');

    return successResponse({
      comment: {
        ...comment.toObject(),
        likeCount: comment.likes.length,
        replies: replies.map((reply) => ({
          ...reply.toObject(),
          likeCount: reply.likes.length,
        })),
      },
    });
  } catch (error) {
    console.error('Get comment error:', error);
    return serverErrorResponse(error);
  }
}

// Update comment
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
    const comment = await Comment.findById(id);

    if (!comment) {
      return notFoundResponse('Comment not found');
    }

    // Check ownership - only comment author can edit
    if (comment.userId.toString() !== user._id.toString()) {
      return forbiddenResponse('You can only edit your own comments');
    }

    const body: UpdateCommentBody = await request.json();
    const { content } = body;

    // Validation
    const errors: Record<string, string> = {};

    if (!content || !content.trim()) {
      errors.content = 'Comment cannot be empty';
    } else if (content.length > 2000) {
      errors.content = 'Comment cannot exceed 2000 characters';
    }

    if (Object.keys(errors).length > 0) {
      return validationErrorResponse(errors);
    }

    // Update comment
    const updatedComment = await Comment.findByIdAndUpdate(
      id,
      { $set: { content: content.trim() } },
      { new: true }
    ).populate('userId', 'username');

    return successResponse(
      {
        ...updatedComment?.toObject(),
        likeCount: updatedComment?.likes.length || 0,
      },
      'Comment updated successfully'
    );
  } catch (error) {
    console.error('Update comment error:', error);
    return serverErrorResponse(error);
  }
}

// Delete comment
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
    const comment = await Comment.findById(id).populate('videoId');

    if (!comment) {
      return notFoundResponse('Comment not found');
    }

    // Check ownership - comment author or video owner can delete
    const video = await Video.findById(comment.videoId).populate('channelId');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel = video?.channelId as any;

    const isCommentAuthor = comment.userId.toString() === user._id.toString();
    const isVideoOwner = channel?.userId?.toString() === user._id.toString();

    if (!isCommentAuthor && !isVideoOwner) {
      return forbiddenResponse(
        'You can only delete your own comments or comments on your videos'
      );
    }

    // Delete all replies to this comment
    await Comment.deleteMany({ parentCommentId: id });

    // Delete the comment
    await Comment.findByIdAndDelete(id);

    return successResponse(null, 'Comment deleted successfully');
  } catch (error) {
    console.error('Delete comment error:', error);
    return serverErrorResponse(error);
  }
}
