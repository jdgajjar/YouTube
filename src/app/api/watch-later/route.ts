import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Video from '@/models/Video';
import { getCurrentUser } from '@/lib/auth';
import {
  successResponse,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/api-response';

// Get watch later list
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const user = await getCurrentUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Get user with populated watch later
    const userWithWatchLater = await User.findById(user._id).populate({
      path: 'watchLater',
      populate: {
        path: 'channelId',
        select: 'name avatar',
      },
    });

    if (!userWithWatchLater) {
      return unauthorizedResponse();
    }

    // Paginate manually since watchLater is an array
    const total = userWithWatchLater.watchLater.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedWatchLater = userWithWatchLater.watchLater.slice(start, end);

    return successResponse({
      videos: paginatedWatchLater,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get watch later error:', error);
    return serverErrorResponse(error);
  }
}

// Add to watch later
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const user = await getCurrentUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const { videoId } = body;

    // Check if video exists
    const video = await Video.findById(videoId);
    if (!video) {
      return notFoundResponse('Video not found');
    }

    // Check if already in watch later
    const isInWatchLater = user.watchLater.some(
      (id) => id.toString() === videoId
    );

    if (isInWatchLater) {
      return successResponse({ added: false }, 'Video already in watch later');
    }

    // Add to watch later
    await User.findByIdAndUpdate(user._id, {
      $addToSet: { watchLater: videoId },
    });

    return successResponse({ added: true }, 'Added to watch later', 201);
  } catch (error) {
    console.error('Add to watch later error:', error);
    return serverErrorResponse(error);
  }
}

// Remove from watch later
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();

    const user = await getCurrentUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');
    const clearAll = searchParams.get('clearAll') === 'true';

    if (clearAll) {
      // Clear entire watch later list
      await User.findByIdAndUpdate(user._id, {
        $set: { watchLater: [] },
      });
      return successResponse(null, 'Watch later list cleared');
    } else if (videoId) {
      // Remove specific video from watch later
      await User.findByIdAndUpdate(user._id, {
        $pull: { watchLater: videoId },
      });
      return successResponse(null, 'Video removed from watch later');
    }

    return successResponse(null, 'No action taken');
  } catch (error) {
    console.error('Delete from watch later error:', error);
    return serverErrorResponse(error);
  }
}
