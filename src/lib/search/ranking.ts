/**
 * Video Ranking Algorithm
 * CPU-efficient ranking system for Render free tier
 * Combines relevance, engagement, freshness, and authority
 */

import { preprocessText, calculateJaccardSimilarity } from './text-processor';

export interface VideoData {
  _id: string;
  title: string;
  description: string;
  tags?: string[];
  channelName?: string;
  views: number;
  likes: number;
  commentCount?: number;
  uploadDate: Date;
  duration?: number;
  watchTime?: number;
  channelSubscribers?: number;
  channelVerified?: boolean;
}

export interface RankingWeights {
  relevance: number;
  engagement: number;
  freshness: number;
  views: number;
  authority: number;
}

export interface RankingResult {
  videoId: string;
  finalScore: number;
  relevanceScore: number;
  engagementScore: number;
  freshnessScore: number;
  viewScore: number;
  authorityScore: number;
}

// Default weights (total = 1.0)
export const DEFAULT_WEIGHTS: RankingWeights = {
  relevance: 0.40,   // 40% - Most important
  engagement: 0.25,  // 25%
  freshness: 0.15,   // 15%
  views: 0.15,       // 15%
  authority: 0.05,   // 5%
};

/**
 * Calculate relevance score using TF-IDF and semantic similarity
 */
export function calculateRelevanceScore(
  query: string,
  video: VideoData,
  tfidfScore: number = 0
): number {
  const queryTokens = preprocessText(query);
  
  // Multi-field matching with different weights
  const titleTokens = preprocessText(video.title);
  const descTokens = preprocessText(video.description);
  const tagsTokens = video.tags ? video.tags.flatMap(tag => preprocessText(tag)) : [];
  const channelTokens = video.channelName ? preprocessText(video.channelName) : [];
  
  // Calculate similarity for each field
  const titleSimilarity = calculateJaccardSimilarity(queryTokens, titleTokens);
  const descSimilarity = calculateJaccardSimilarity(queryTokens, descTokens);
  const tagsSimilarity = calculateJaccardSimilarity(queryTokens, tagsTokens);
  const channelSimilarity = calculateJaccardSimilarity(queryTokens, channelTokens);
  
  // Weighted combination
  const semanticScore = 
    titleSimilarity * 0.40 +
    descSimilarity * 0.30 +
    tagsSimilarity * 0.20 +
    channelSimilarity * 0.10;
  
  // Combine with TF-IDF score (if provided)
  const relevanceScore = tfidfScore > 0
    ? (tfidfScore * 0.6 + semanticScore * 0.4)
    : semanticScore;
  
  return Math.min(relevanceScore, 1.0);
}

/**
 * Calculate engagement score
 * Based on likes, comments, and interaction rate
 */
export function calculateEngagementScore(video: VideoData): number {
  const { views, likes, commentCount = 0 } = video;
  
  if (views === 0) return 0;
  
  // Engagement rate: (likes + comments * 2) / views
  // Comments weighted more as they require more effort
  const engagementRate = (likes + commentCount * 2) / views;
  
  // Normalize using logarithmic scale to handle outliers
  const normalizedScore = Math.log10(engagementRate * 1000 + 1) / Math.log10(1001);
  
  return Math.min(normalizedScore, 1.0);
}

/**
 * Calculate freshness score
 * Recent videos get higher scores
 */
export function calculateFreshnessScore(uploadDate: Date): number {
  const now = new Date();
  const ageInDays = (now.getTime() - new Date(uploadDate).getTime()) / (1000 * 60 * 60 * 24);
  
  // Exponential decay: score decreases as video gets older
  // Half-life of ~30 days
  const freshnessScore = Math.exp(-ageInDays / 30);
  
  return Math.min(freshnessScore, 1.0);
}

/**
 * Calculate view score
 * Normalized by video age to avoid bias towards old videos
 */
export function calculateViewScore(video: VideoData): number {
  const { views, uploadDate } = video;
  const now = new Date();
  const ageInDays = Math.max((now.getTime() - new Date(uploadDate).getTime()) / (1000 * 60 * 60 * 24), 1);
  
  // Views per day
  const viewsPerDay = views / ageInDays;
  
  // Normalize using logarithmic scale
  const normalizedScore = Math.log10(viewsPerDay + 1) / Math.log10(10001);
  
  return Math.min(normalizedScore, 1.0);
}

/**
 * Calculate authority score
 * Based on channel metrics
 */
export function calculateAuthorityScore(video: VideoData): number {
  const { channelSubscribers = 0, channelVerified = false } = video;
  
  // Logarithmic scale for subscribers
  const subscriberScore = Math.log10(channelSubscribers + 1) / Math.log10(10000001);
  
  // Bonus for verified channels
  const verifiedBonus = channelVerified ? 0.2 : 0;
  
  const authorityScore = subscriberScore * 0.8 + verifiedBonus;
  
  return Math.min(authorityScore, 1.0);
}

/**
 * Calculate final ranking score
 */
export function calculateRankingScore(
  query: string,
  video: VideoData,
  tfidfScore: number = 0,
  weights: RankingWeights = DEFAULT_WEIGHTS
): RankingResult {
  const relevanceScore = calculateRelevanceScore(query, video, tfidfScore);
  const engagementScore = calculateEngagementScore(video);
  const freshnessScore = calculateFreshnessScore(video.uploadDate);
  const viewScore = calculateViewScore(video);
  const authorityScore = calculateAuthorityScore(video);
  
  // Calculate weighted final score
  const finalScore =
    relevanceScore * weights.relevance +
    engagementScore * weights.engagement +
    freshnessScore * weights.freshness +
    viewScore * weights.views +
    authorityScore * weights.authority;
  
  return {
    videoId: video._id,
    finalScore,
    relevanceScore,
    engagementScore,
    freshnessScore,
    viewScore,
    authorityScore,
  };
}

/**
 * Rank multiple videos
 */
export function rankVideos(
  query: string,
  videos: VideoData[],
  tfidfScores?: Map<string, number>,
  weights?: RankingWeights
): RankingResult[] {
  const results = videos.map(video => {
    const tfidfScore = tfidfScores?.get(video._id) || 0;
    return calculateRankingScore(query, video, tfidfScore, weights);
  });
  
  // Sort by final score descending
  results.sort((a, b) => b.finalScore - a.finalScore);
  
  return results;
}

/**
 * Calculate a global ranking score for a video (without query)
 * Useful for pre-ranking videos
 */
export function calculateGlobalRankingScore(video: VideoData): number {
  const engagementScore = calculateEngagementScore(video);
  const freshnessScore = calculateFreshnessScore(video.uploadDate);
  const viewScore = calculateViewScore(video);
  const authorityScore = calculateAuthorityScore(video);
  
  // Global ranking without relevance
  const globalScore =
    engagementScore * 0.40 +
    viewScore * 0.30 +
    freshnessScore * 0.20 +
    authorityScore * 0.10;
  
  return globalScore;
}

/**
 * Boost score based on exact matches
 */
export function applyExactMatchBoost(
  query: string,
  video: VideoData,
  currentScore: number
): number {
  const queryLower = query.toLowerCase();
  const titleLower = video.title.toLowerCase();
  const descLower = video.description.toLowerCase();
  
  let boost = 1.0;
  
  // Exact title match: 50% boost
  if (titleLower.includes(queryLower)) {
    boost += 0.5;
  }
  
  // Exact description match: 20% boost
  if (descLower.includes(queryLower)) {
    boost += 0.2;
  }
  
  // Title starts with query: 30% boost
  if (titleLower.startsWith(queryLower)) {
    boost += 0.3;
  }
  
  return currentScore * boost;
}
