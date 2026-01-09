import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Playlist from '@/models/Playlist';
import Channel from '@/models/Channel';
import Video from '@/models/Video';
import { getCurrentUser } from '@/lib/auth';
import {
  successResponse,
  unauthorizedResponse,
  notFoundResponse,
  forbiddenResponse,
  serverErrorResponse,
  validationErrorResponse,
} from '@/lib/api-response';

interface UpdatePlaylistBody {
  title?: string;
  description?: string;
  visibility?: 'public' | 'private' | 'unlisted';
  addVideoId?: string;
  removeVideoId?: string;
}

// Get playlist by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const user = await getCurrentUser(request);

    const playlist = await Playlist.findById(id)
      .populate({
        path: 'channelId',
        select: 'name avatar userId',
      })
      .populate({
        path: 'videos',
        populate: {
          path: 'channelId',
          select: 'name avatar',
        },
      });

    if (!playlist) {
      return notFoundResponse('Playlist not found');
    }

    // Check visibility permissions
    const channel = playlist.channelId as typeof playlist.channelId & { userId: { toString: () => string } };
    const isOwner = user && channel?.userId?.toString() === user._id.toString();

    if (playlist.visibility === 'private' && !isOwner) {
      return notFoundResponse('Playlist not found');
    }

    return successResponse({
      playlist,
      isOwner,
    });
  } catch (error) {
    console.error('Get playlist error:', error);
    return serverErrorResponse(error);
  }
}

// Update playlist
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
    const playlist = await Playlist.findById(id).populate('channelId');

    if (!playlist) {
      return notFoundResponse('Playlist not found');
    }

    // Check ownership
    const channel = playlist.channelId as typeof playlist.channelId & { userId: { toString: () => string } };
    if (channel.userId.toString() !== user._id.toString()) {
      return forbiddenResponse('You can only edit your own playlists');
    }

    const body: UpdatePlaylistBody = await request.json();
    const { title, description, visibility, addVideoId, removeVideoId } = body;

    // Validation
    const errors: Record<string, string> = {};

    if (title !== undefined) {
      if (!title.trim()) {
        errors.title = 'Playlist title cannot be empty';
      } else if (title.length > 150) {
        errors.title = 'Title cannot exceed 150 characters';
      }
    }

    if (description !== undefined && description.length > 5000) {
      errors.description = 'Description cannot exceed 5000 characters';
    }

    if (visibility !== undefined && !['public', 'private', 'unlisted'].includes(visibility)) {
      errors.visibility = 'Invalid visibility option';
    }

    if (Object.keys(errors).length > 0) {
      return validationErrorResponse(errors);
    }

    // Handle add video
    if (addVideoId) {
      const video = await Video.findById(addVideoId);
      if (!video) {
        return notFoundResponse('Video not found');
      }

      // Check if video is already in playlist
      const videoExists = playlist.videos.some(
        (v) => v.toString() === addVideoId
      );

      if (!videoExists) {
        await Playlist.findByIdAndUpdate(id, {
          $push: { videos: addVideoId },
          $inc: { videoCount: 1 },
        });

        // Update thumbnail if it's the first video
        if (playlist.videos.length === 0) {
          await Playlist.findByIdAndUpdate(id, {
            thumbnailUrl: video.thumbnailUrl,
          });
        }
      }

      const updatedPlaylist = await Playlist.findById(id)
        .populate({
          path: 'channelId',
          select: 'name avatar',
        })
        .populate({
          path: 'videos',
          populate: {
            path: 'channelId',
            select: 'name avatar',
          },
        });

      return successResponse(updatedPlaylist, 'Video added to playlist');
    }

    // Handle remove video
    if (removeVideoId) {
      const videoExists = playlist.videos.some(
        (v) => v.toString() === removeVideoId
      );

      if (videoExists) {
        await Playlist.findByIdAndUpdate(id, {
          $pull: { videos: removeVideoId },
          $inc: { videoCount: -1 },
        });

        // Update thumbnail if needed
        const updatedPlaylist = await Playlist.findById(id);
        if (updatedPlaylist && updatedPlaylist.videos.length > 0) {
          const firstVideo = await Video.findById(updatedPlaylist.videos[0]);
          if (firstVideo) {
            await Playlist.findByIdAndUpdate(id, {
              thumbnailUrl: firstVideo.thumbnailUrl,
            });
          }
        } else if (updatedPlaylist) {
          await Playlist.findByIdAndUpdate(id, {
            thumbnailUrl: '',
          });
        }
      }

      const finalPlaylist = await Playlist.findById(id)
        .populate({
          path: 'channelId',
          select: 'name avatar',
        })
        .populate({
          path: 'videos',
          populate: {
            path: 'channelId',
            select: 'name avatar',
          },
        });

      return successResponse(finalPlaylist, 'Video removed from playlist');
    }

    // Update playlist metadata
    const updateData: Partial<UpdatePlaylistBody> = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (visibility !== undefined) updateData.visibility = visibility;

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    )
      .populate({
        path: 'channelId',
        select: 'name avatar',
      })
      .populate({
        path: 'videos',
        populate: {
          path: 'channelId',
          select: 'name avatar',
        },
      });

    return successResponse(updatedPlaylist, 'Playlist updated successfully');
  } catch (error) {
    console.error('Update playlist error:', error);
    return serverErrorResponse(error);
  }
}

// Delete playlist
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
    const playlist = await Playlist.findById(id).populate('channelId');

    if (!playlist) {
      return notFoundResponse('Playlist not found');
    }

    // Check ownership
    const channel = playlist.channelId as typeof playlist.channelId & { userId: { toString: () => string } };
    if (channel.userId.toString() !== user._id.toString()) {
      return forbiddenResponse('You can only delete your own playlists');
    }

    await Playlist.findByIdAndDelete(id);

    return successResponse(null, 'Playlist deleted successfully');
  } catch (error) {
    console.error('Delete playlist error:', error);
    return serverErrorResponse(error);
  }
}
