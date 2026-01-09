import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Video from '@/models/Video';
import Channel from '@/models/Channel';
import Comment from '@/models/Comment';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import { calculateGlobalRankingScore, VideoData } from '@/lib/search/ranking';
import { clearGlobalCache } from '@/lib/search/cache';

/**
 * Update Ranking Scores for All Videos
 * Should be run periodically (every 6 hours) via cron job
 * Calculates and stores ranking scores in database for faster retrieval
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Verify admin authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
      return errorResponse('Unauthorized', 401);
    }

    const startTime = Date.now();
    const batchSize = 100; // Process in batches to avoid memory issues

    // Get total video count
    const totalVideos = await Video.countDocuments();
    let processed = 0;
    let updated = 0;
    let errors = 0;

    // Process videos in batches
    for (let skip = 0; skip < totalVideos; skip += batchSize) {
      try {
        // Fetch batch of videos with channel info
        const videos = await Video.find()
          .skip(skip)
          .limit(batchSize)
          .populate('channelId', 'name subscriberCount')
          .lean();

        // Get comment counts for this batch
        const videoIds = videos.map((v: any) => v._id);
        const commentCounts = await Comment.aggregate([
          { $match: { videoId: { $in: videoIds } } },
          { $group: { _id: '$videoId', count: { $sum: 1 } } },
        ]);

        const commentCountMap = new Map(
          commentCounts.map((c) => [c._id.toString(), c.count])
        );

        // Calculate ranking score for each video
        const bulkOps = videos.map((video: any) => {
          const videoData: VideoData = {
            _id: video._id.toString(),
            title: video.title,
            description: video.description,
            tags: video.tags || [],
            channelName: video.channelId?.name || '',
            views: video.views || 0,
            likes: video.likes?.length || 0,
            commentCount: commentCountMap.get(video._id.toString()) || 0,
            uploadDate: video.uploadDate,
            duration: video.duration,
            channelSubscribers: video.channelId?.subscriberCount || 0,
          };

          const rankingScore = calculateGlobalRankingScore(videoData);

          return {
            updateOne: {
              filter: { _id: video._id },
              update: {
                $set: {
                  rankingScore,
                  commentCount: videoData.commentCount,
                },
              },
            },
          };
        });

        // Execute bulk update
        if (bulkOps.length > 0) {
          const result = await Video.bulkWrite(bulkOps);
          updated += result.modifiedCount;
        }

        processed += videos.length;
      } catch (batchError) {
        console.error(`Error processing batch at skip ${skip}:`, batchError);
        errors++;
      }
    }

    // Clear search cache after updating rankings
    clearGlobalCache();

    const duration = Date.now() - startTime;

    return successResponse({
      message: 'Video rankings updated successfully',
      duration: `${duration}ms`,
      stats: {
        totalVideos,
        processed,
        updated,
        errors,
        batchSize,
      },
    });
  } catch (error) {
    console.error('Update rankings error:', error);
    return serverErrorResponse(error);
  }
}

/**
 * Get ranking statistics
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get statistics about video rankings
    const stats = await Video.aggregate([
      {
        $group: {
          _id: null,
          totalVideos: { $sum: 1 },
          avgRankingScore: { $avg: '$rankingScore' },
          maxRankingScore: { $max: '$rankingScore' },
          minRankingScore: { $min: '$rankingScore' },
          avgViews: { $avg: '$views' },
          avgLikes: { $avg: { $size: '$likes' } },
          avgCommentCount: { $avg: '$commentCount' },
        },
      },
    ]);

    // Get top ranked videos
    const topRanked = await Video.find()
      .sort({ rankingScore: -1 })
      .limit(10)
      .populate('channelId', 'name')
      .select('title views likes commentCount rankingScore uploadDate')
      .lean();

    // Get recently updated videos
    const recentlyUpdated = await Video.find({ rankingScore: { $exists: true } })
      .sort({ updatedAt: -1 })
      .limit(10)
      .populate('channelId', 'name')
      .select('title rankingScore updatedAt')
      .lean();

    return successResponse({
      stats: stats[0] || {},
      topRanked,
      recentlyUpdated,
    });
  } catch (error) {
    console.error('Get ranking stats error:', error);
    return serverErrorResponse(error);
  }
}

/**
 * Update ranking for a specific video
 */
export async function PATCH(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return errorResponse('Video ID is required', 400);
    }

    // Fetch video with channel info
    const video = await Video.findById(videoId)
      .populate('channelId', 'name subscriberCount')
      .lean();

    if (!video) {
      return errorResponse('Video not found', 404);
    }

    // Get comment count
    const commentCount = await Comment.countDocuments({ videoId: video._id });

    // Prepare video data
    const videoData: VideoData = {
      _id: video._id.toString(),
      title: video.title,
      description: video.description,
      tags: (video as any).tags || [],
      channelName: (video as any).channelId?.name || '',
      views: video.views || 0,
      likes: video.likes?.length || 0,
      commentCount,
      uploadDate: video.uploadDate,
      duration: video.duration,
      channelSubscribers: (video as any).channelId?.subscriberCount || 0,
    };

    // Calculate ranking score
    const rankingScore = calculateGlobalRankingScore(videoData);

    // Update video
    await Video.findByIdAndUpdate(videoId, {
      $set: { rankingScore, commentCount },
    });

    return successResponse({
      message: 'Video ranking updated successfully',
      videoId,
      rankingScore,
      commentCount,
    });
  } catch (error) {
    console.error('Update single video ranking error:', error);
    return serverErrorResponse(error);
  }
}
