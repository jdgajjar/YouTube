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
import { getSearchCache, CacheKeys } from '@/lib/search/cache';
import { preprocessText } from '@/lib/search/text-processor';
import { calculateTFIDFScore } from '@/lib/search/tfidf';
import { rankVideos, VideoData } from '@/lib/search/ranking';

// Type for search results
interface SearchResults {
  videos?: any[];
  channels?: any[];
  totalVideos?: number;
  totalChannels?: number;
}

/**
 * Advanced Search Endpoint with Multi-Dimensional Ranking
 * Optimized for Render free tier (512MB RAM, CPU-only)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const type = searchParams.get('type') || 'all'; // all, videos, channels
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50); // Max 50 per page
    const sortBy = searchParams.get('sortBy') || 'relevance'; // relevance, date, views
    const dateFilter = searchParams.get('date'); // hour, today, week, month, year
    const category = searchParams.get('category');

    if (!query.trim()) {
      return errorResponse('Search query is required', 400);
    }

    // Check cache first
    const cache = getSearchCache();
    const cacheKey = CacheKeys.search(query, page, {
      type,
      sortBy,
      dateFilter,
      category,
    });
    
    const cachedResults = cache.get(cacheKey);
    if (cachedResults) {
      return successResponse({
        ...cachedResults,
        cached: true,
        searchTime: `${Date.now() - startTime}ms (from cache)`,
      });
    }

    const skip = (page - 1) * limit;

    // Build date filter
    let dateQuery = {};
    if (dateFilter) {
      const now = new Date();
      let startDate: Date;

      switch (dateFilter) {
        case 'hour':
          startDate = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0);
      }

      dateQuery = { uploadDate: { $gte: startDate } };
    }

    // Add category filter
    let categoryQuery = {};
    if (category) {
      categoryQuery = { category };
    }

    const results: SearchResults = {};

    // Search videos with advanced ranking
    if (type === 'all' || type === 'videos') {
      try {
        // Use multi-field search with regex for better semantic matching
        const queryTokens = preprocessText(query);
        const regexPatterns = queryTokens.map(
          (token) => new RegExp(token, 'i')
        );

        // Build search query with $or for multi-field matching
        const searchQuery = {
          $or: [
            { title: { $in: regexPatterns } },
            { description: { $in: regexPatterns } },
            { tags: { $in: regexPatterns } },
          ],
          ...dateQuery,
          ...categoryQuery,
        };

        // Fetch videos with lean() for better performance
        const videos = await Video.find(searchQuery)
          .populate({
            path: 'channelId',
            select: 'name avatar subscriberCount',
          })
          .select(
            'title description videoUrl thumbnailUrl views likes duration uploadDate tags category commentCount'
          )
          .lean()
          .limit(limit * 5); // Fetch more for ranking, then slice

        // Get comment counts for engagement calculation
        const videoIds = videos.map((v: any) => v._id);
        const commentCounts = await Comment.aggregate([
          { $match: { videoId: { $in: videoIds } } },
          { $group: { _id: '$videoId', count: { $sum: 1 } } },
        ]);

        const commentCountMap = new Map(
          commentCounts.map((c) => [c._id.toString(), c.count])
        );

        // Calculate term document frequencies for TF-IDF
        const termDocFreq = new Map<string, number>();
        videos.forEach((video: any) => {
          const tokens = new Set([
            ...preprocessText(video.title),
            ...preprocessText(video.description),
            ...(video.tags || []).flatMap((tag: string) => preprocessText(tag)),
          ]);
          tokens.forEach((term) => {
            termDocFreq.set(term, (termDocFreq.get(term) || 0) + 1);
          });
        });

        // Prepare video data for ranking
        const videoData: VideoData[] = videos.map((video: any) => ({
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
        }));

        // Calculate TF-IDF scores
        const tfidfScores = new Map<string, number>();
        videoData.forEach((video) => {
          // Safely handle possibly undefined tags
          const tags = video.tags ?? [];
          const text = `${video.title} ${video.description} ${tags.join(' ')}`;
          const score = calculateTFIDFScore(
            query,
            text,
            videos.length,
            termDocFreq
          );
          tfidfScores.set(video._id, score);
        });

        // Rank videos
        let rankedResults = rankVideos(query, videoData, tfidfScores);

        // Apply sorting
        if (sortBy === 'date') {
          rankedResults.sort(
            (a, b) =>
              new Date(
                videoData.find((v) => v._id === b.videoId)?.uploadDate || 0
              ).getTime() -
              new Date(
                videoData.find((v) => v._id === a.videoId)?.uploadDate || 0
              ).getTime()
          );
        } else if (sortBy === 'views') {
          rankedResults.sort(
            (a, b) =>
              (videoData.find((v) => v._id === b.videoId)?.views || 0) -
              (videoData.find((v) => v._id === a.videoId)?.views || 0)
          );
        }

        // Pagination
        const paginatedResults = rankedResults.slice(skip, skip + limit);

        // Map back to full video objects with ranking scores
        const rankedVideos = paginatedResults.map((result) => {
          const video = videos.find(
            (v: any) => v._id.toString() === result.videoId
          );
          return {
            ...video,
            _rankingScore: result.finalScore,
            _relevanceScore: result.relevanceScore,
            _engagementScore: result.engagementScore,
          };
        });

        results.videos = rankedVideos;
        results.totalVideos = rankedResults.length;
      } catch (videoError) {
        console.error('Video search error:', videoError);
        // Fallback to simple text search
        const fallbackVideos = await fallbackVideoSearch(
          query,
          dateQuery,
          categoryQuery,
          skip,
          limit
        );
        results.videos = fallbackVideos.videos;
        results.totalVideos = fallbackVideos.total;
      }
    }

    // Search channels (simpler ranking)
    if (type === 'all' || type === 'channels') {
      try {
        const channelRegex = new RegExp(query, 'i');
        const channelQuery = {
          $or: [{ name: channelRegex }, { description: channelRegex }],
        };

        const [channels, totalChannels] = await Promise.all([
          Channel.find(channelQuery)
            .sort({ subscriberCount: -1 })
            .skip(type === 'channels' ? skip : 0)
            .limit(type === 'channels' ? limit : 5)
            .populate('userId', 'username')
            .lean(),
          Channel.countDocuments(channelQuery),
        ]);

        results.channels = channels;
        results.totalChannels = totalChannels;
      } catch (channelError) {
        console.error('Channel search error:', channelError);
        results.channels = [];
        results.totalChannels = 0;
      }
    }

    const searchTime = `${Date.now() - startTime}ms`;

    const response = {
      query,
      ...results,
      pagination: {
        page,
        limit,
        totalResults: (results.totalVideos || 0) + (results.totalChannels || 0),
        totalPages: Math.ceil(
          ((results.totalVideos || 0) + (results.totalChannels || 0)) / limit
        ),
      },
      searchTime,
      cached: false,
    };

    // Cache results
    cache.set(cacheKey, response);

    return successResponse(response);
  } catch (error) {
    console.error('Search error:', error);
    return serverErrorResponse(error);
  }
}

/**
 * Fallback video search using simple regex
 */
async function fallbackVideoSearch(
  query: string,
  dateQuery: any,
  categoryQuery: any,
  skip: number,
  limit: number
) {
  const regex = new RegExp(query, 'i');
  const videoQuery = {
    $or: [{ title: regex }, { description: regex }, { tags: regex }],
    ...dateQuery,
    ...categoryQuery,
  };

  const [videos, total] = await Promise.all([
    Video.find(videoQuery)
      .sort({ views: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'channelId',
        select: 'name avatar subscriberCount',
      })
      .lean(),
    Video.countDocuments(videoQuery),
  ]);

  return { videos, total };
}
