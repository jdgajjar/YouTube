import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Video from '@/models/Video';
import Channel from '@/models/Channel';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
} from '@/lib/api-response';

/**
 * Build Search Index
 * Creates/updates text indexes for efficient searching
 * Should be run once after deployment or when adding new fields
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Verify admin authorization (you can add JWT check here)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
      return errorResponse('Unauthorized', 401);
    }

    const startTime = Date.now();
    const results: any = {
      videos: {},
      channels: {},
    };

    // Build indexes for Video collection
    try {
      // Drop existing text indexes if needed (optional)
      // await Video.collection.dropIndex('title_text_description_text');

      // Create compound text index on title, description, and tags
      await Video.collection.createIndex(
        { title: 'text', description: 'text', tags: 'text' },
        {
          weights: {
            title: 10, // Title is most important
            tags: 5,   // Tags are second
            description: 1, // Description is third
          },
          name: 'video_search_index',
        }
      );

      // Create other performance indexes
      await Video.collection.createIndex({ channelId: 1 });
      await Video.collection.createIndex({ views: -1 });
      await Video.collection.createIndex({ uploadDate: -1 });
      await Video.collection.createIndex({ category: 1 });
      await Video.collection.createIndex({ rankingScore: -1 });
      await Video.collection.createIndex({ createdAt: -1 });

      // Compound index for filtered searches
      await Video.collection.createIndex({ category: 1, uploadDate: -1 });
      await Video.collection.createIndex({ category: 1, views: -1 });

      const videoIndexes = await Video.collection.indexes();
      results.videos = {
        success: true,
        indexCount: videoIndexes.length,
        indexes: videoIndexes.map((idx) => idx.name),
      };
    } catch (videoError) {
      console.error('Video index error:', videoError);
      results.videos = {
        success: false,
        error: videoError instanceof Error ? videoError.message : 'Unknown error',
      };
    }

    // Build indexes for Channel collection
    try {
      await Channel.collection.createIndex(
        { name: 'text', description: 'text' },
        {
          weights: {
            name: 10,
            description: 1,
          },
          name: 'channel_search_index',
        }
      );

      await Channel.collection.createIndex({ subscriberCount: -1 });
      await Channel.collection.createIndex({ userId: 1 }, { unique: true });

      const channelIndexes = await Channel.collection.indexes();
      results.channels = {
        success: true,
        indexCount: channelIndexes.length,
        indexes: channelIndexes.map((idx) => idx.name),
      };
    } catch (channelError) {
      console.error('Channel index error:', channelError);
      results.channels = {
        success: false,
        error: channelError instanceof Error ? channelError.message : 'Unknown error',
      };
    }

    const duration = Date.now() - startTime;

    return successResponse({
      message: 'Search indexes built successfully',
      duration: `${duration}ms`,
      results,
    });
  } catch (error) {
    console.error('Build index error:', error);
    return serverErrorResponse(error);
  }
}

/**
 * Get index information
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const videoIndexes = await Video.collection.indexes();
    const channelIndexes = await Channel.collection.indexes();

    const videoCount = await Video.countDocuments();
    const channelCount = await Channel.countDocuments();

    return successResponse({
      videos: {
        count: videoCount,
        indexes: videoIndexes,
      },
      channels: {
        count: channelCount,
        indexes: channelIndexes,
      },
    });
  } catch (error) {
    console.error('Get index info error:', error);
    return serverErrorResponse(error);
  }
}
