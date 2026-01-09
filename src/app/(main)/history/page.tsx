'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import VideoCard from '@/components/video/VideoCard';
import Button from '@/components/ui/Button';
import { VideoListSkeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { IVideo, IChannel } from '@/types';

type VideoWithChannel = IVideo & { channelId: IChannel };

export default function HistoryPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [videos, setVideos] = useState<VideoWithChannel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Fetch history
  const fetchHistory = useCallback(async (pageNum: number, append: boolean = false) => {
    if (!isAuthenticated) return;

    try {
      if (pageNum === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      const response = await fetch(`/api/history?page=${pageNum}&limit=20`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();

        if (append) {
          setVideos((prev) => [...prev, ...data.data.videos]);
        } else {
          setVideos(data.data.videos);
        }

        setHasMore(pageNum < data.data.pagination.pages);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchHistory(1);
    } else if (!authLoading && !isAuthenticated) {
      setIsLoading(false);
    }
  }, [authLoading, isAuthenticated, fetchHistory]);

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 1000
      ) {
        if (!isLoadingMore && hasMore) {
          setPage((prev) => {
            const nextPage = prev + 1;
            fetchHistory(nextPage, true);
            return nextPage;
          });
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isLoadingMore, hasMore, fetchHistory]);

  // Remove from history
  const handleRemoveFromHistory = async (videoId: string) => {
    try {
      const response = await fetch(`/api/history?videoId=${videoId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setVideos((prev) => prev.filter((v) => v._id !== videoId));
      }
    } catch (error) {
      console.error('Failed to remove from history:', error);
    }
  };

  // Clear all history
  const handleClearHistory = async () => {
    if (!confirm('Are you sure you want to clear your entire watch history?')) {
      return;
    }

    try {
      const response = await fetch('/api/history?clearAll=true', {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setVideos([]);
      }
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Watch History</h1>
        <VideoListSkeleton count={12} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <svg className="w-24 h-24 text-yt-text mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 className="text-xl font-semibold mb-2">Keep track of what you watch</h2>
        <p className="text-yt-text mb-4">Watch history isn&apos;t viewable when signed out</p>
        <Link href="/login">
          <Button>Sign In</Button>
        </Link>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <svg className="w-24 h-24 text-yt-text mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 className="text-xl font-semibold mb-2">No watch history</h2>
        <p className="text-yt-text mb-4">Videos you watch will appear here</p>
        <Link href="/">
          <Button>Browse Videos</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Watch History</h1>
        <Button variant="ghost" onClick={handleClearHistory}>
          Clear All History
        </Button>
      </div>

      <div className="video-grid">
        {videos.map((video) => (
          <VideoCard
            key={video._id}
            video={video}
            onRemoveFromHistory={handleRemoveFromHistory}
          />
        ))}
      </div>

      {isLoadingMore && (
        <div className="mt-8">
          <VideoListSkeleton count={4} />
        </div>
      )}

      {!hasMore && videos.length > 0 && (
        <p className="text-center text-yt-text py-8">End of watch history</p>
      )}
    </div>
  );
}
