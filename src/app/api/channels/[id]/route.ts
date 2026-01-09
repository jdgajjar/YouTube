import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Channel from '@/models/Channel';
import Video from '@/models/Video';
import Playlist from '@/models/Playlist';
import User from '@/models/User';
import { getCurrentUser } from '@/lib/auth';
import { uploadImage } from '@/lib/cloudinary';
import {
  successResponse,
  unauthorizedResponse,
  notFoundResponse,
  forbiddenResponse,
  serverErrorResponse,
  validationErrorResponse,
} from '@/lib/api-response';

interface UpdateChannelBody {
  name?: string;
  description?: string;
  avatar?: string;
  banner?: string;
}

// Get channel by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const channel = await Channel.findById(id).populate('userId', 'username email _id');

    if (!channel) {
      return notFoundResponse('Channel not found');
    }

    // Get channel videos with channel info populated
    const videos = await Video.find({ channelId: id })
      .populate({
        path: 'channelId',
        select: 'name avatar subscriberCount userId',
      })
      .sort({ uploadDate: -1 })
      .limit(50);

    // Check if current user is subscribed
    const user = await getCurrentUser(request);
    const isSubscribed = user
      ? channel.subscribers.some(
          (subId) => subId.toString() === user._id.toString()
        )
      : false;

    return successResponse({
      channel,
      videos,
      isSubscribed,
    });
  } catch (error) {
    console.error('Get channel error:', error);
    return serverErrorResponse(error);
  }
}

// Update channel
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
    const channel = await Channel.findById(id);

    if (!channel) {
      return notFoundResponse('Channel not found');
    }

    // Check ownership
    if (channel.userId.toString() !== user._id.toString()) {
      return forbiddenResponse('You can only edit your own channel');
    }

    // Handle form data or JSON
    const contentType = request.headers.get('content-type') || '';
    let name: string | undefined;
    let description: string | undefined;
    let avatarFile: File | null = null;
    let bannerFile: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      name = formData.get('name') as string || undefined;
      description = formData.get('description') as string || undefined;
      avatarFile = formData.get('avatar') as File | null;
      bannerFile = formData.get('banner') as File | null;
    } else {
      const body: UpdateChannelBody = await request.json();
      name = body.name;
      description = body.description;
    }

    // Validation
    const errors: Record<string, string> = {};

    if (name !== undefined) {
      if (!name.trim()) {
        errors.name = 'Channel name cannot be empty';
      } else if (name.length < 3) {
        errors.name = 'Channel name must be at least 3 characters';
      } else if (name.length > 50) {
        errors.name = 'Channel name cannot exceed 50 characters';
      }
    }

    if (description !== undefined && description.length > 1000) {
      errors.description = 'Description cannot exceed 1000 characters';
    }

    if (Object.keys(errors).length > 0) {
      return validationErrorResponse(errors);
    }

    // Handle avatar upload
    let avatarUrl: string | undefined;
    if (avatarFile && avatarFile.size > 0) {
      const avatarBuffer = Buffer.from(await avatarFile.arrayBuffer());
      const avatarResult = await uploadImage(
        avatarBuffer,
        'youtube-clone/avatars'
      );
      avatarUrl = avatarResult.secure_url;
    }

    // Handle banner upload
    let bannerUrl: string | undefined;
    if (bannerFile && bannerFile.size > 0) {
      const bannerBuffer = Buffer.from(await bannerFile.arrayBuffer());
      const bannerResult = await uploadImage(
        bannerBuffer,
        'youtube-clone/banners'
      );
      bannerUrl = bannerResult.secure_url;
    }

    // Update channel
    const updateData: UpdateChannelBody = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (avatarUrl) updateData.avatar = avatarUrl;
    if (bannerUrl) updateData.banner = bannerUrl;

    const updatedChannel = await Channel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    ).populate('userId', 'username email _id');

    return successResponse(updatedChannel, 'Channel updated successfully');
  } catch (error) {
    console.error('Update channel error:', error);
    return serverErrorResponse(error);
  }
}

// Delete channel
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
    const channel = await Channel.findById(id);

    if (!channel) {
      return notFoundResponse('Channel not found');
    }

    // Check ownership
    if (channel.userId.toString() !== user._id.toString()) {
      return forbiddenResponse('You can only delete your own channel');
    }

    // Delete all channel videos
    await Video.deleteMany({ channelId: id });

    // Delete all channel playlists
    await Playlist.deleteMany({ channelId: id });

    // Delete channel
    await Channel.findByIdAndDelete(id);

    // Remove channel reference from user
    await User.findByIdAndUpdate(user._id, { $unset: { channelId: 1 } });

    return successResponse(null, 'Channel deleted successfully');
  } catch (error) {
    console.error('Delete channel error:', error);
    return serverErrorResponse(error);
  }
}
