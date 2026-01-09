'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import VideoCard from '@/components/video/VideoCard';
import { VideoListSkeleton } from '@/components/ui/Skeleton';
import { IVideo, IChannel } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

type VideoWithChannel = IVideo & { channelId: IChannel };

// Chunk size for lazy loading
const INITIAL_CHUNK_SIZE = 12;
const LOAD_MORE_SIZE = 8;
const INTERSECTION_THRESHOLD = 0.1;

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const [videos, setVideos] = useState<VideoWithChannel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalVideos, setTotalVideos] = useState(0);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const isLoadingRef = useRef(false);

  // Fetch videos with chunked loading
  const fetchVideos = useCallback(async (pageNum: number, append: boolean = false) => {
    // Prevent duplicate requests
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    try {
      const limit = pageNum === 1 ? INITIAL_CHUNK_SIZE : LOAD_MORE_SIZE;
      
      if (pageNum === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      const response = await fetch(`/api/videos?page=${pageNum}&limit=${limit}`, {
        credentials: 'include',
        // Add cache headers for better performance
        headers: {
          'Cache-Control': 'max-age=60',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const newVideos = data.data.videos || [];
        const pagination = data.data.pagination;

        if (append && pageNum > 1) {
          setVideos((prev) => {
            // Prevent duplicates
            const existingIds = new Set(prev.map(v => v._id));
            const uniqueNewVideos = newVideos.filter((v: VideoWithChannel) => !existingIds.has(v._id));
            return [...prev, ...uniqueNewVideos];
          });
        } else {
          setVideos(newVideos);
        }

        setTotalVideos(pagination.total);
        setHasMore(pageNum < pagination.pages);
      }
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      isLoadingRef.current = false;
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchVideos(1);
  }, [fetchVideos]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    // Cleanup previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Create new observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !isLoadingMore && hasMore && !isLoadingRef.current) {
          setPage((prev) => {
            const nextPage = prev + 1;
            fetchVideos(nextPage, true);
            return nextPage;
          });
        }
      },
      {
        root: null,
        rootMargin: '200px',
        threshold: INTERSECTION_THRESHOLD,
      }
    );

    // Observe the load more trigger element
    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isLoadingMore, hasMore, fetchVideos]);

  // Add to watch later
  const handleAddToWatchLater = useCallback(async (videoId: string) => {
    try {
      const response = await fetch('/api/watch-later', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoId }),
        credentials: 'include',
      });

      if (response.ok) {
        alert('Added to Watch Later');
      }
    } catch (error) {
      console.error('Failed to add to watch later:', error);
    }
  }, []);

  // Memoize video cards to prevent unnecessary re-renders
  const videoCards = useMemo(() => {
    return videos.map((video, index) => (
      <VideoCard
        key={video._id}
        video={video}
        onAddToWatchLater={isAuthenticated ? handleAddToWatchLater : undefined}
        priority={index < 4} // Prioritize first 4 videos for LCP
      />
    ));
  }, [videos, isAuthenticated, handleAddToWatchLater]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <VideoListSkeleton count={INITIAL_CHUNK_SIZE} />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <svg className="w-24 h-24 text-yt-text mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <h2 className="text-xl font-semibold mb-2">No videos yet</h2>
        <p className="text-yt-text">Be the first to upload a video!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Video count indicator */}
      {totalVideos > 0 && (
        <p className="text-sm text-yt-text">
          Showing {videos.length} of {totalVideos} videos
        </p>
      )}

      {/* Video grid */}
      <div className="video-grid">
        {videoCards}
      </div>

      {/* Loading more indicator */}
      {isLoadingMore && (
        <div className="mt-6">
          <VideoListSkeleton count={LOAD_MORE_SIZE} />
        </div>
      )}

      {/* Intersection observer target */}
      <div 
        ref={loadMoreRef} 
        className="h-10 w-full"
        aria-hidden="true"
      />

      {/* End of content message */}
      {!hasMore && videos.length > 0 && (
        <div className="text-center py-8">
          <p className="text-yt-text">You&apos;ve reached the end!</p>
          <p className="text-sm text-yt-text/70 mt-1">
            {totalVideos} total videos
          </p>
        </div>
      )}
    </div>
  );
}
