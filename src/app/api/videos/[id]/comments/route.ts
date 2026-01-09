import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Video from '@/models/Video';
import Comment from '@/models/Comment';
import Channel from '@/models/Channel';
import Notification from '@/models/Notification';
import { getCurrentUser } from '@/lib/auth';
import {
  successResponse,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
  validationErrorResponse,
} from '@/lib/api-response';

interface CreateCommentBody {
  content: string;
  parentCommentId?: string;
}

// Get comments for a video
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Check if video exists
    const video = await Video.findById(id);
    if (!video) {
      return notFoundResponse('Video not found');
    }

    // Get top-level comments
    const [comments, total] = await Promise.all([
      Comment.find({ videoId: id, parentCommentId: null })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'username'),
      Comment.countDocuments({ videoId: id, parentCommentId: null }),
    ]);

    // Get replies for each comment
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = await Comment.find({ parentCommentId: comment._id })
          .sort({ createdAt: 1 })
          .populate('userId', 'username');

        return {
          ...comment.toObject(),
          likeCount: comment.likes.length,
          replies: replies.map((reply) => ({
            ...reply.toObject(),
            likeCount: reply.likes.length,
          })),
        };
      })
    );

    // Get user's liked comments
    const user = await getCurrentUser(request);
    let likedCommentIds: string[] = [];

    if (user) {
      const allCommentIds = [
        ...comments.map((c) => c._id.toString()),
        ...commentsWithReplies.flatMap((c) =>
          c.replies.map((r) => r._id.toString())
        ),
      ];

      const userLikedComments = await Comment.find({
        _id: { $in: allCommentIds },
        likes: user._id,
      }).select('_id');

      likedCommentIds = userLikedComments.map((c) => c._id.toString());
    }

    return successResponse({
      comments: commentsWithReplies,
      likedCommentIds,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get comments error:', error);
    return serverErrorResponse(error);
  }
}

// Create a comment
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

    // Check if video exists
    const video = await Video.findById(id).populate('channelId');
    if (!video) {
      return notFoundResponse('Video not found');
    }

    const body: CreateCommentBody = await request.json();
    const { content, parentCommentId } = body;

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

    // If it's a reply, check if parent comment exists
    let parentComment = null;
    if (parentCommentId) {
      parentComment = await Comment.findById(parentCommentId);
      if (!parentComment) {
        return notFoundResponse('Parent comment not found');
      }
    }

    // Create comment
    const comment = await Comment.create({
      content: content.trim(),
      videoId: id,
      userId: user._id,
      parentCommentId: parentCommentId || null,
    });

    // Populate user info
    await comment.populate('userId', 'username');

    // Create notifications
    const channel = video.channelId as typeof video.channelId & {
      userId: { toString: () => string };
    };

    if (parentComment) {
      // It's a reply - notify parent comment author
      if (parentComment.userId.toString() !== user._id.toString()) {
        await Notification.create({
          userId: parentComment.userId,
          type: 'comment_reply',
          message: `${user.username} replied to your comment on "${video.title}"`,
          videoId: video._id,
          commentId: comment._id,
          actorId: user._id,
        });
      }
    } else {
      // It's a top-level comment - notify video owner
      if (channel.userId.toString() !== user._id.toString()) {
        await Notification.create({
          userId: channel.userId,
          type: 'comment',
          message: `${user.username} commented on your video "${video.title}"`,
          videoId: video._id,
          commentId: comment._id,
          actorId: user._id,
        });
      }
    }

    return successResponse(
      {
        ...comment.toObject(),
        likeCount: 0,
        replies: [],
      },
      'Comment added successfully',
      201
    );
  } catch (error) {
    console.error('Create comment error:', error);
    return serverErrorResponse(error);
  }
}
