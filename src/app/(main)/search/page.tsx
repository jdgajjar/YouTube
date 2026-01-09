'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import VideoCard from '@/components/video/VideoCard';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import { VideoListSkeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { IVideo, IChannel } from '@/types';

type VideoWithChannel = IVideo & { channelId: IChannel };

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const { isAuthenticated } = useAuth();

  const [videos, setVideos] = useState<VideoWithChannel[]>([]);
  const [channels, setChannels] = useState<IChannel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [type, setType] = useState<'all' | 'videos' | 'channels'>('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'views'>('relevance');

  // Fetch search results
  const fetchSearchResults = useCallback(async () => {
    if (!query.trim()) return;

    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(query)}&type=${type}&sortBy=${sortBy}`,
        {
          credentials: 'include',
        }
      );

      if (response.ok) {
        const data = await response.json();
        setVideos(data.data.videos || []);
        setChannels(data.data.channels || []);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [query, type, sortBy]);

  useEffect(() => {
    fetchSearchResults();
  }, [fetchSearchResults]);

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

  // Format subscriber count
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  if (!query) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <svg className="w-24 h-24 text-yt-text mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <h2 className="text-xl font-semibold mb-2">Search for videos</h2>
        <p className="text-yt-text">Enter a search term to find videos</p>
      </div>
    );
  }

  return (
    <div>
      {/* Search header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">
          Search results for &quot;{query}&quot;
        </h1>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          {/* Type filter */}
          <div className="flex gap-2">
            {(['all', 'videos', 'channels'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-4 py-2 rounded-full text-sm ${
                  type === t
                    ? 'bg-white text-black'
                    : 'bg-yt-gray text-white hover:bg-yt-light-gray'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Sort filter (for videos) */}
          {(type === 'all' || type === 'videos') && (
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'relevance' | 'date' | 'views')}
              className="bg-yt-gray text-white px-4 py-2 rounded-full text-sm focus:outline-none"
            >
              <option value="relevance">Relevance</option>
              <option value="date">Upload date</option>
              <option value="views">View count</option>
            </select>
          )}
        </div>
      </div>

      {isLoading ? (
        <VideoListSkeleton count={12} />
      ) : (
        <>
          {/* Channels */}
          {channels.length > 0 && (type === 'all' || type === 'channels') && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">Channels</h2>
              <div className="space-y-4">
                {channels.map((channel) => (
                  <Link
                    key={channel._id}
                    href={`/channel/${channel._id}`}
                    className="flex items-center gap-4 p-4 bg-yt-gray rounded-lg hover:bg-yt-light-gray transition-colors"
                  >
                    <Avatar
                      src={channel.avatar}
                      alt={channel.name}
                      size="xl"
                    />
                    <div className="flex-1">
                      <h3 className="font-medium text-lg">{channel.name}</h3>
                      <p className="text-sm text-yt-text">
                        {formatNumber(channel.subscriberCount)} subscribers • {channel.videoCount} videos
                      </p>
                      <p className="text-sm text-yt-text mt-1 line-clamp-2">
                        {channel.description}
                      </p>
                    </div>
                    <Button variant="secondary">View Channel</Button>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Videos */}
          {videos.length > 0 && (type === 'all' || type === 'videos') && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Videos</h2>
              <div className="space-y-4">
                {videos.map((video) => (
                  <VideoCard
                    key={video._id}
                    video={video}
                    layout="list"
                    onAddToWatchLater={isAuthenticated ? handleAddToWatchLater : undefined}
                  />
                ))}
              </div>
            </div>
          )}

          {/* No results */}
          {videos.length === 0 && channels.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
              <svg className="w-24 h-24 text-yt-text mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-xl font-semibold mb-2">No results found</h2>
              <p className="text-yt-text">Try different keywords or check your spelling</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<VideoListSkeleton count={12} />}>
      <SearchContent />
    </Suspense>
  );
}
