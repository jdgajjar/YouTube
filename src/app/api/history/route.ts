import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Video from '@/models/Video';
import { getCurrentUser } from '@/lib/auth';
import {
  successResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api-response';

// Get watch history
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

    // Get user with populated watch history
    const userWithHistory = await User.findById(user._id).populate({
      path: 'watchHistory',
      populate: {
        path: 'channelId',
        select: 'name avatar',
      },
    });

    if (!userWithHistory) {
      return unauthorizedResponse();
    }

    // Paginate manually since watchHistory is an array
    const total = userWithHistory.watchHistory.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedHistory = userWithHistory.watchHistory.slice(start, end);

    return successResponse({
      videos: paginatedHistory,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get watch history error:', error);
    return serverErrorResponse(error);
  }
}

// Remove from watch history
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
      // Clear entire watch history
      await User.findByIdAndUpdate(user._id, {
        $set: { watchHistory: [] },
      });
      return successResponse(null, 'Watch history cleared');
    } else if (videoId) {
      // Remove specific video from history
      await User.findByIdAndUpdate(user._id, {
        $pull: { watchHistory: videoId },
      });
      return successResponse(null, 'Video removed from history');
    }

    return successResponse(null, 'No action taken');
  } catch (error) {
    console.error('Delete from watch history error:', error);
    return serverErrorResponse(error);
  }
}
