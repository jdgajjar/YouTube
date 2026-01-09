'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { IVideo, IChannel } from '@/types';
import Avatar from '@/components/ui/Avatar';
import Dropdown from '@/components/ui/Dropdown';
import { useAuth } from '@/contexts/AuthContext';

interface VideoCardProps {
  video: IVideo & { channelId: IChannel };
  showChannel?: boolean;
  onAddToWatchLater?: (videoId: string) => void;
  onRemoveFromWatchLater?: (videoId: string) => void;
  onRemoveFromHistory?: (videoId: string) => void;
  onDeleteVideo?: (videoId: string) => void;
  isInWatchLater?: boolean;
  isOwner?: boolean; // Whether current user owns this video
  layout?: 'grid' | 'list';
  priority?: boolean; // For LCP optimization
}

export default function VideoCard({
  video,
  showChannel = true,
  onAddToWatchLater,
  onRemoveFromWatchLater,
  onRemoveFromHistory,
  onDeleteVideo,
  isInWatchLater = false,
  isOwner = false,
  layout = 'grid',
  priority = false,
}: VideoCardProps) {
  const { isAuthenticated } = useAuth();
  const [isHovered, setIsHovered] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);

  // Format view count
  const formatViews = (views: number): string => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M views`;
    }
    if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K views`;
    }
    return `${views} views`;
  };

  // Format time ago
  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const uploadDate = new Date(date);
    const diffMs = now.getTime() - uploadDate.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffYears > 0) return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
    if (diffMonths > 0) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
    if (diffWeeks > 0) return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;
    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle hover preview
  useEffect(() => {
    if (isHovered) {
      hoverTimeout.current = setTimeout(() => {
        setShowPreview(true);
      }, 500);
    } else {
      if (hoverTimeout.current) {
        clearTimeout(hoverTimeout.current);
      }
      setShowPreview(false);
    }

    return () => {
      if (hoverTimeout.current) {
        clearTimeout(hoverTimeout.current);
      }
    };
  }, [isHovered]);

  // Play preview video
  useEffect(() => {
    if (showPreview && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [showPreview]);

  // Get dropdown items
  const dropdownItems = [];

  if (isAuthenticated) {
    if (isInWatchLater && onRemoveFromWatchLater) {
      dropdownItems.push({
        label: 'Remove from Watch Later',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        onClick: () => onRemoveFromWatchLater(video._id),
      });
    } else if (onAddToWatchLater) {
      dropdownItems.push({
        label: 'Add to Watch Later',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        onClick: () => onAddToWatchLater(video._id),
      });
    }

    if (onRemoveFromHistory) {
      dropdownItems.push({
        label: 'Remove from History',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        ),
        onClick: () => onRemoveFromHistory(video._id),
      });
    }

    // Delete option - only for video owner
    if (isOwner && onDeleteVideo) {
      dropdownItems.push({
        label: 'Delete Video',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        ),
        onClick: () => {
          if (window.confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
            onDeleteVideo(video._id);
          }
        },
        danger: true,
      });
    }
  }

  dropdownItems.push({
    label: 'Share',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
      </svg>
    ),
    onClick: () => {
      navigator.clipboard.writeText(`${window.location.origin}/watch/${video._id}`);
      alert('Link copied to clipboard!');
    },
  });

  if (layout === 'list') {
    return (
      <div className="flex gap-2 sm:gap-3 group">
        <Link href={`/watch/${video._id}`} className="relative flex-shrink-0 w-[140px] sm:w-[160px] lg:w-[168px] aspect-video">
          <Image
            src={video.thumbnailUrl}
            alt={video.title}
            fill
            className="object-cover rounded-lg"
            sizes="168px"
            loading="lazy"
          />
          {video.duration > 0 && (
            <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded font-medium">
              {formatDuration(video.duration)}
            </span>
          )}
        </Link>

        <div className="flex-1 min-w-0 py-0.5">
          <Link href={`/watch/${video._id}`}>
            <h3 className="text-sm font-medium text-white line-clamp-2 leading-snug group-hover:text-blue-400 transition-colors">
              {video.title}
            </h3>
          </Link>
          {showChannel && video.channelId && (
            <Link
              href={`/channel/${video.channelId._id}`}
              className="block text-xs text-yt-text hover:text-white mt-1.5 truncate transition-colors"
            >
              {video.channelId.name}
            </Link>
          )}
          <div className="text-xs text-yt-text mt-0.5">
            {formatViews(video.views)} • {formatTimeAgo(video.uploadDate)}
          </div>
        </div>

        {dropdownItems.length > 0 && (
          <Dropdown
            trigger={
              <button className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 hover:bg-white/10 rounded-full">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                </svg>
              </button>
            }
            items={dropdownItems}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className="video-card group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Thumbnail */}
      <Link href={`/watch/${video._id}`} className="relative block aspect-video rounded-lg overflow-hidden">
        {showPreview ? (
          <video
            ref={videoRef}
            src={video.videoUrl}
            className="w-full h-full object-cover"
            muted
            loop
            playsInline
          />
        ) : (
          <Image
            src={video.thumbnailUrl}
            alt={video.title}
            fill
            className="object-cover transition-opacity"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={priority}
            loading={priority ? 'eager' : 'lazy'}
          />
        )}

        {/* Duration badge */}
        {video.duration > 0 && (
          <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
            {formatDuration(video.duration)}
          </span>
        )}
      </Link>

      {/* Video info */}
      <div className="flex gap-3 mt-3">
        {showChannel && video.channelId && (
          <Link href={`/channel/${video.channelId._id}`}>
            <Avatar
              src={video.channelId.avatar}
              alt={video.channelId.name}
              size="sm"
            />
          </Link>
        )}

        <div className="flex-1 min-w-0">
          <Link href={`/watch/${video._id}`}>
            <h3 className="text-sm font-medium text-white line-clamp-2 group-hover:text-blue-400">
              {video.title}
            </h3>
          </Link>

          {showChannel && video.channelId && (
            <Link
              href={`/channel/${video.channelId._id}`}
              className="text-sm text-yt-text hover:text-white mt-1 block"
            >
              {video.channelId.name}
            </Link>
          )}

          <div className="text-sm text-yt-text">
            {formatViews(video.views)} • {formatTimeAgo(video.uploadDate)}
          </div>
        </div>

        {/* Menu button */}
        {dropdownItems.length > 0 && (
          <Dropdown
            trigger={
              <button className="p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                </svg>
              </button>
            }
            items={dropdownItems}
          />
        )}
      </div>
    </div>
  );
}
