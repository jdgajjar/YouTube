import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Channel from '@/models/Channel';
import User from '@/models/User';
import { getCurrentUser } from '@/lib/auth';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  serverErrorResponse,
  validationErrorResponse,
} from '@/lib/api-response';

interface CreateChannelBody {
  name: string;
  description?: string;
  avatar?: string;
  banner?: string;
}

// Create a new channel
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const user = await getCurrentUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    // Check if user already has a channel
    if (user.channelId) {
      return errorResponse('You already have a channel', 400);
    }

    const body: CreateChannelBody = await request.json();
    const { name, description, avatar, banner } = body;

    // Validation
    const errors: Record<string, string> = {};

    if (!name || !name.trim()) {
      errors.name = 'Channel name is required';
    } else if (name.length < 3) {
      errors.name = 'Channel name must be at least 3 characters';
    } else if (name.length > 50) {
      errors.name = 'Channel name cannot exceed 50 characters';
    }

    if (description && description.length > 1000) {
      errors.description = 'Description cannot exceed 1000 characters';
    }

    if (Object.keys(errors).length > 0) {
      return validationErrorResponse(errors);
    }

    // Create channel
    const channel = await Channel.create({
      name,
      description: description || '',
      avatar: avatar || '/default-avatar.png',
      banner: banner || '/default-banner.jpg',
      userId: user._id,
    });

    // Update user with channel reference
    await User.findByIdAndUpdate(user._id, { channelId: channel._id });

    return successResponse(channel, 'Channel created successfully', 201);
  } catch (error) {
    console.error('Create channel error:', error);
    return serverErrorResponse(error);
  }
}

// Get all channels (for discovery)
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {};
    if (search) {
      query.$text = { $search: search };
    }

    const [channels, total] = await Promise.all([
      Channel.find(query)
        .sort({ subscriberCount: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'username email'),
      Channel.countDocuments(query),
    ]);

    return successResponse({
      channels,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get channels error:', error);
    return serverErrorResponse(error);
  }
}
