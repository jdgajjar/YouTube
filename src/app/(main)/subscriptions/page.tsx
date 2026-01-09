'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import VideoCard from '@/components/video/VideoCard';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import { VideoListSkeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { IVideo, IChannel } from '@/types';

type VideoWithChannel = IVideo & { channelId: IChannel };

export default function SubscriptionsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [videos, setVideos] = useState<VideoWithChannel[]>([]);
  const [channels, setChannels] = useState<IChannel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Fetch subscriptions
  const fetchSubscriptions = useCallback(async (pageNum: number, append: boolean = false) => {
    if (!isAuthenticated) return;

    try {
      if (pageNum === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      const response = await fetch(`/api/subscriptions?page=${pageNum}&limit=20`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();

        if (append) {
          setVideos((prev) => [...prev, ...data.data.videos]);
        } else {
          setVideos(data.data.videos);
          setChannels(data.data.channels);
        }

        setHasMore(pageNum < data.data.pagination.pages);
      }
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchSubscriptions(1);
    } else if (!authLoading && !isAuthenticated) {
      setIsLoading(false);
    }
  }, [authLoading, isAuthenticated, fetchSubscriptions]);

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
            fetchSubscriptions(nextPage, true);
            return nextPage;
          });
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isLoadingMore, hasMore, fetchSubscriptions]);

  // Add to watch later
  const handleAddToWatchLater = async (videoId: string) => {
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
  };

  if (authLoading || isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Subscriptions</h1>
        <VideoListSkeleton count={12} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <svg className="w-24 h-24 text-yt-text mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <h2 className="text-xl font-semibold mb-2">Don&apos;t miss new videos</h2>
        <p className="text-yt-text mb-4">Sign in to see updates from your favorite channels</p>
        <Link href="/login">
          <Button>Sign In</Button>
        </Link>
      </div>
    );
  }

  if (channels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <svg className="w-24 h-24 text-yt-text mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <h2 className="text-xl font-semibold mb-2">No subscriptions yet</h2>
        <p className="text-yt-text mb-4">Subscribe to channels to see their latest videos here</p>
        <Link href="/">
          <Button>Browse Videos</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Subscriptions</h1>

      {/* Subscribed channels carousel */}
      <div className="flex gap-4 overflow-x-auto pb-4 mb-6 scrollbar-hide">
        {channels.map((channel) => (
          <Link
            key={channel._id}
            href={`/channel/${channel._id}`}
            className="flex flex-col items-center gap-2 min-w-[80px]"
          >
            <Avatar
              src={channel.avatar}
              alt={channel.name}
              size="lg"
            />
            <span className="text-xs text-center line-clamp-1">{channel.name}</span>
          </Link>
        ))}
      </div>

      {/* Videos */}
      {videos.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-yt-text">No new videos from your subscriptions</p>
        </div>
      ) : (
        <div className="video-grid">
          {videos.map((video) => (
            <VideoCard
              key={video._id}
              video={video}
              onAddToWatchLater={handleAddToWatchLater}
            />
          ))}
        </div>
      )}

      {isLoadingMore && (
        <div className="mt-8">
          <VideoListSkeleton count={4} />
        </div>
      )}

      {!hasMore && videos.length > 0 && (
        <p className="text-center text-yt-text py-8">No more videos to load</p>
      )}
    </div>
  );
}
