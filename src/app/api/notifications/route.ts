import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Notification from '@/models/Notification';
import { getCurrentUser } from '@/lib/auth';
import {
  successResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api-response';

// Get notifications for current user
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
    const unreadOnly = searchParams.get('unread') === 'true';

    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { userId: user._id };
    if (unreadOnly) {
      query.read = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('actorId', 'username')
        .populate('videoId', 'title thumbnailUrl'),
      Notification.countDocuments(query),
      Notification.countDocuments({ userId: user._id, read: false }),
    ]);

    return successResponse({
      notifications,
      unreadCount,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return serverErrorResponse(error);
  }
}

// Mark notifications as read
export async function PUT(request: NextRequest) {
  try {
    await connectDB();

    const user = await getCurrentUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const { notificationIds, markAll } = body;

    if (markAll) {
      // Mark all as read
      await Notification.updateMany(
        { userId: user._id, read: false },
        { $set: { read: true } }
      );
    } else if (notificationIds && notificationIds.length > 0) {
      // Mark specific notifications as read
      await Notification.updateMany(
        { _id: { $in: notificationIds }, userId: user._id },
        { $set: { read: true } }
      );
    }

    const unreadCount = await Notification.countDocuments({
      userId: user._id,
      read: false,
    });

    return successResponse({
      unreadCount,
      message: 'Notifications marked as read',
    });
  } catch (error) {
    console.error('Mark notifications error:', error);
    return serverErrorResponse(error);
  }
}

// Delete notifications
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();

    const user = await getCurrentUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');
    const deleteAll = searchParams.get('all') === 'true';

    if (deleteAll) {
      await Notification.deleteMany({ userId: user._id });
    } else if (notificationId) {
      await Notification.findOneAndDelete({
        _id: notificationId,
        userId: user._id,
      });
    }

    return successResponse(null, 'Notification(s) deleted');
  } catch (error) {
    console.error('Delete notifications error:', error);
    return serverErrorResponse(error);
  }
}
