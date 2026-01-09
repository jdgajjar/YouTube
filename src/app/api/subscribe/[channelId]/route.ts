import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Channel from '@/models/Channel';
import Notification from '@/models/Notification';
import { getCurrentUser } from '@/lib/auth';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/api-response';

// Toggle subscription to a channel
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    await connectDB();

    const user = await getCurrentUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const { channelId } = await params;
    const channel = await Channel.findById(channelId);

    if (!channel) {
      return notFoundResponse('Channel not found');
    }

    // Can't subscribe to own channel
    if (channel.userId.toString() === user._id.toString()) {
      return errorResponse("You can't subscribe to your own channel", 400);
    }

    const userId = user._id.toString();
    const isSubscribed = channel.subscribers.some(
      (subId) => subId.toString() === userId
    );

    if (isSubscribed) {
      // Unsubscribe
      await Channel.findByIdAndUpdate(channelId, {
        $pull: { subscribers: user._id },
        $inc: { subscriberCount: -1 },
      });
    } else {
      // Subscribe
      await Channel.findByIdAndUpdate(channelId, {
        $addToSet: { subscribers: user._id },
        $inc: { subscriberCount: 1 },
      });

      // Create notification for channel owner
      await Notification.create({
        userId: channel.userId,
        type: 'subscription',
        message: `${user.username} subscribed to your channel`,
        actorId: user._id,
      });
    }

    const updatedChannel = await Channel.findById(channelId);

    return successResponse({
      subscribed: !isSubscribed,
      subscriberCount: updatedChannel?.subscriberCount || 0,
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    return serverErrorResponse(error);
  }
}

// Get subscription status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    await connectDB();

    const user = await getCurrentUser(request);
    const { channelId } = await params;
    const channel = await Channel.findById(channelId);

    if (!channel) {
      return notFoundResponse('Channel not found');
    }

    const isSubscribed = user
      ? channel.subscribers.some(
          (subId) => subId.toString() === user._id.toString()
        )
      : false;

    return successResponse({
      subscribed: isSubscribed,
      subscriberCount: channel.subscriberCount,
    });
  } catch (error) {
    console.error('Get subscription status error:', error);
    return serverErrorResponse(error);
  }
}
