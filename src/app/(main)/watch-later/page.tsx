'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import VideoCard from '@/components/video/VideoCard';
import Button from '@/components/ui/Button';
import { VideoListSkeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { IVideo, IChannel } from '@/types';

type VideoWithChannel = IVideo & { channelId: IChannel };

export default function WatchLaterPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [videos, setVideos] = useState<VideoWithChannel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch watch later
  const fetchWatchLater = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setIsLoading(true);

      const response = await fetch('/api/watch-later', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setVideos(data.data.videos);
      }
    } catch (error) {
      console.error('Failed to fetch watch later:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchWatchLater();
    } else if (!authLoading && !isAuthenticated) {
      setIsLoading(false);
    }
  }, [authLoading, isAuthenticated, fetchWatchLater]);

  // Remove from watch later
  const handleRemoveFromWatchLater = async (videoId: string) => {
    try {
      const response = await fetch(`/api/watch-later?videoId=${videoId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setVideos((prev) => prev.filter((v) => v._id !== videoId));
      }
    } catch (error) {
      console.error('Failed to remove from watch later:', error);
    }
  };

  // Clear all
  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear your Watch Later list?')) {
      return;
    }

    try {
      const response = await fetch('/api/watch-later?clearAll=true', {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setVideos([]);
      }
    } catch (error) {
      console.error('Failed to clear watch later:', error);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Watch Later</h1>
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
        <h2 className="text-xl font-semibold mb-2">Save videos to watch later</h2>
        <p className="text-yt-text mb-4">Sign in to access your Watch Later list</p>
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
        <h2 className="text-xl font-semibold mb-2">No videos in Watch Later</h2>
        <p className="text-yt-text mb-4">Save videos to watch them later</p>
        <Link href="/">
          <Button>Browse Videos</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Watch Later</h1>
          <p className="text-yt-text">{videos.length} video{videos.length !== 1 ? 's' : ''}</p>
        </div>
        <Button variant="ghost" onClick={handleClearAll}>
          Clear All
        </Button>
      </div>

      <div className="video-grid">
        {videos.map((video) => (
          <VideoCard
            key={video._id}
            video={video}
            isInWatchLater
            onRemoveFromWatchLater={handleRemoveFromWatchLater}
          />
        ))}
      </div>
    </div>
  );
}
