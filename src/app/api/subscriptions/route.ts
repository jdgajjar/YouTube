import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Channel from '@/models/Channel';
import Video from '@/models/Video';
import { getCurrentUser } from '@/lib/auth';
import {
  successResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api-response';

// Get videos from subscribed channels
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

    const skip = (page - 1) * limit;

    // Get subscribed channels
    const subscribedChannels = await Channel.find({
      subscribers: user._id,
    }).select('_id');

    const channelIds = subscribedChannels.map((c) => c._id);

    if (channelIds.length === 0) {
      return successResponse({
        videos: [],
        channels: [],
        pagination: {
          total: 0,
          page,
          limit,
          pages: 0,
        },
      });
    }

    // Get videos from subscribed channels
    const [videos, total] = await Promise.all([
      Video.find({ channelId: { $in: channelIds } })
        .sort({ uploadDate: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'channelId',
          select: 'name avatar subscriberCount',
        }),
      Video.countDocuments({ channelId: { $in: channelIds } }),
    ]);

    // Get full channel info for subscribed channels
    const channels = await Channel.find({
      _id: { $in: channelIds },
    }).select('name avatar subscriberCount videoCount');

    return successResponse({
      videos,
      channels,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    return serverErrorResponse(error);
  }
}
