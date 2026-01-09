import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Video from '@/models/Video';
import Channel from '@/models/Channel';
import Notification from '@/models/Notification';
import { getCurrentUser } from '@/lib/auth';
import { uploadVideo, uploadImage, generateVideoThumbnail } from '@/lib/cloudinary';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  serverErrorResponse,
  validationErrorResponse,
} from '@/lib/api-response';

// Get all videos (public)
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const channelId = searchParams.get('channelId');
    const sortBy = searchParams.get('sortBy') || 'date';

    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {};
    if (channelId) {
      query.channelId = channelId;
    }

    // Determine sort order
    let sort: Record<string, 1 | -1> = { uploadDate: -1 };
    if (sortBy === 'views') {
      sort = { views: -1 };
    } else if (sortBy === 'likes') {
      sort = { 'likes.length': -1 };
    }

    const [videos, total] = await Promise.all([
      Video.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'channelId',
          select: 'name avatar subscriberCount',
        }),
      Video.countDocuments(query),
    ]);

    return successResponse({
      videos,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get videos error:', error);
    return serverErrorResponse(error);
  }
}

// Upload a new video
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const user = await getCurrentUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    // User must have a channel to upload
    if (!user.channelId) {
      return errorResponse('You need to create a channel first', 400);
    }

    const formData = await request.formData();
    const videoFile = formData.get('video') as File | null;
    const thumbnailFile = formData.get('thumbnail') as File | null;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;

    // Validation
    const errors: Record<string, string> = {};

    if (!videoFile) {
      errors.video = 'Video file is required';
    } else {
      // Check file type
      const validVideoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
      if (!validVideoTypes.includes(videoFile.type)) {
        errors.video = 'Invalid video format. Supported: MP4, WebM, OGG, MOV';
      }
    }

    if (!title || !title.trim()) {
      errors.title = 'Title is required';
    } else if (title.length < 3) {
      errors.title = 'Title must be at least 3 characters';
    } else if (title.length > 100) {
      errors.title = 'Title cannot exceed 100 characters';
    }

    if (!description || !description.trim()) {
      errors.description = 'Description is required';
    } else if (description.length > 5000) {
      errors.description = 'Description cannot exceed 5000 characters';
    }

    if (Object.keys(errors).length > 0) {
      return validationErrorResponse(errors);
    }

    // Upload video to Cloudinary
    const videoBuffer = Buffer.from(await videoFile!.arrayBuffer());
    const videoResult = await uploadVideo(videoBuffer);

    // Handle thumbnail
    let thumbnailUrl: string;
    if (thumbnailFile) {
      const thumbnailBuffer = Buffer.from(await thumbnailFile.arrayBuffer());
      const thumbnailResult = await uploadImage(
        thumbnailBuffer,
        'youtube-clone/thumbnails'
      );
      thumbnailUrl = thumbnailResult.secure_url;
    } else {
      // Auto-generate thumbnail from video first frame
      thumbnailUrl = generateVideoThumbnail(videoResult.public_id, '0');
    }

    // Create video record
    const video = await Video.create({
      title,
      description,
      videoUrl: videoResult.secure_url,
      thumbnailUrl,
      channelId: user.channelId,
      duration: videoResult.duration || 0,
    });

    // Update channel video count
    await Channel.findByIdAndUpdate(user.channelId, {
      $inc: { videoCount: 1 },
    });

    // Create notifications for subscribers
    const channel = await Channel.findById(user.channelId);
    if (channel && channel.subscribers.length > 0) {
      const notifications = channel.subscribers.map((subscriberId) => ({
        userId: subscriberId,
        type: 'new_video' as const,
        message: `${channel.name} uploaded a new video: ${title}`,
        videoId: video._id,
        actorId: user._id,
      }));

      await Notification.insertMany(notifications);
    }

    // Populate channel info and return
    const populatedVideo = await Video.findById(video._id).populate({
      path: 'channelId',
      select: 'name avatar subscriberCount',
    });

    return successResponse(populatedVideo, 'Video uploaded successfully', 201);
  } catch (error) {
    console.error('Upload video error:', error);
    return serverErrorResponse(error);
  }
}
