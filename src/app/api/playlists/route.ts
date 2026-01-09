import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Playlist from '@/models/Playlist';
import Channel from '@/models/Channel';
import Video from '@/models/Video';
import { getCurrentUser } from '@/lib/auth';
import {
  successResponse,
  unauthorizedResponse,
  serverErrorResponse,
  validationErrorResponse,
} from '@/lib/api-response';

interface CreatePlaylistBody {
  title: string;
  description?: string;
  visibility?: 'public' | 'private' | 'unlisted';
}

// Get playlists (with optional channelId filter)
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');
    const user = await getCurrentUser(request);

    // Build query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {};
    
    if (channelId) {
      // Validate ObjectId
      if (!mongoose.Types.ObjectId.isValid(channelId)) {
        return successResponse([]);
      }
      
      query.channelId = new mongoose.Types.ObjectId(channelId);
      
      // Check if user owns this channel
      const channel = await Channel.findById(channelId);
      const isOwner = user && channel && channel.userId.toString() === user._id.toString();
      
      // If not owner, only show public playlists
      if (!isOwner) {
        query.visibility = 'public';
      }
    } else {
      // If no channelId, only show public playlists
      query.visibility = 'public';
    }

    const playlists = await Playlist.find(query)
      .populate({
        path: 'channelId',
        select: 'name avatar',
      })
      .populate({
        path: 'videos',
        select: 'thumbnailUrl title duration',
        options: { limit: 4 },
      })
      .sort({ updatedAt: -1 })
      .lean();

    // Transform playlists to ensure proper structure
    const transformedPlaylists = playlists.map((playlist) => ({
      ...playlist,
      _id: playlist._id.toString(),
      thumbnailUrl: playlist.thumbnailUrl || 
        (playlist.videos && playlist.videos.length > 0 
          ? (playlist.videos[0] as { thumbnailUrl?: string })?.thumbnailUrl || ''
          : ''),
      videoCount: playlist.videoCount || (playlist.videos?.length || 0),
    }));

    return successResponse(transformedPlaylists);
  } catch (error) {
    console.error('Get playlists error:', error);
    return serverErrorResponse(error);
  }
}

// Create playlist
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const user = await getCurrentUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    // User must have a channel
    if (!user.channelId) {
      return validationErrorResponse({ channel: 'You must create a channel first' });
    }

    // Get channelId as string or ObjectId
    const channelId = typeof user.channelId === 'object' 
      ? (user.channelId as { _id: mongoose.Types.ObjectId })._id 
      : user.channelId;

    const body: CreatePlaylistBody = await request.json();
    const { title, description, visibility } = body;

    // Validation
    const errors: Record<string, string> = {};

    if (!title || !title.trim()) {
      errors.title = 'Playlist title is required';
    } else if (title.length > 150) {
      errors.title = 'Title cannot exceed 150 characters';
    }

    if (description && description.length > 5000) {
      errors.description = 'Description cannot exceed 5000 characters';
    }

    if (visibility && !['public', 'private', 'unlisted'].includes(visibility)) {
      errors.visibility = 'Invalid visibility option';
    }

    if (Object.keys(errors).length > 0) {
      return validationErrorResponse(errors);
    }

    // Create playlist with proper ObjectId conversion
    const playlist = await Playlist.create({
      title: title.trim(),
      description: description?.trim() || '',
      visibility: visibility || 'public',
      channelId: new mongoose.Types.ObjectId(channelId.toString()),
      videos: [],
      videoCount: 0,
      thumbnailUrl: '',
    });

    const populatedPlaylist = await Playlist.findById(playlist._id)
      .populate({
        path: 'channelId',
        select: 'name avatar',
      })
      .lean();

    // Transform to ensure proper structure
    const result = {
      ...populatedPlaylist,
      _id: populatedPlaylist?._id.toString(),
    };

    return successResponse(result, 'Playlist created successfully');
  } catch (error) {
    console.error('Create playlist error:', error);
    return serverErrorResponse(error);
  }
}
