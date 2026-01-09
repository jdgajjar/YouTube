'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import VideoPlayer from '@/components/video/VideoPlayer';
import VideoCard from '@/components/video/VideoCard';
import CommentSection from '@/components/comment/CommentSection';
import ShareModal from '@/components/video/ShareModal';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { VideoCardSkeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { IVideo, IChannel, IPlaylist } from '@/types';

type VideoWithChannel = IVideo & {
  channelId: IChannel & { userId: string };
  likeCount: number;
};

interface VideoPageData {
  video: VideoWithChannel;
  isLiked: boolean;
  isSubscribed: boolean;
  commentCount: number;
  relatedVideos: (IVideo & { channelId: IChannel })[];
}

type PlaylistVideoWithChannel = IVideo & { channelId: IChannel };

interface PlaylistData {
  playlist: IPlaylist & {
    channelId: IChannel;
    videos: PlaylistVideoWithChannel[];
  };
}

export default function WatchPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [videoId, setVideoId] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();
  const [data, setData] = useState<VideoPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDescription, setShowDescription] = useState(false);

  // Playlist states
  const [playlistId, setPlaylistId] = useState<string | null>(null);
  const [playlistData, setPlaylistData] = useState<PlaylistData | null>(null);
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState(0);
  const [isLoadingPlaylist, setIsLoadingPlaylist] = useState(false);

  // Playlist Modal States
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [userPlaylists, setUserPlaylists] = useState<IPlaylist[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [addingToPlaylist, setAddingToPlaylist] = useState<string | null>(null);

  // Resolve params on mount
  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await Promise.resolve(params);
      setVideoId(resolvedParams.id);
    };
    resolveParams();
  }, [params]);

  // Get playlist ID from URL
  useEffect(() => {
    const listId = searchParams.get('list');
    setPlaylistId(listId);
  }, [searchParams]);

  // Fetch playlist data
  const fetchPlaylist = useCallback(async () => {
    if (!playlistId) return;
    
    try {
      setIsLoadingPlaylist(true);
      const response = await fetch(`/api/playlists/${playlistId}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        setPlaylistData(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch playlist:', error);
    } finally {
      setIsLoadingPlaylist(false);
    }
  }, [playlistId]);

  useEffect(() => {
    if (playlistId) {
      fetchPlaylist();
    } else {
      setPlaylistData(null);
    }
  }, [playlistId, fetchPlaylist]);

  // Update current playlist index when video changes
  useEffect(() => {
    if (playlistData && videoId) {
      const index = playlistData.playlist.videos.findIndex(v => v._id === videoId);
      if (index !== -1) {
        setCurrentPlaylistIndex(index);
      }
    }
  }, [playlistData, videoId]);

  // Fetch video data
  const fetchVideo = useCallback(async () => {
    if (!videoId) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/videos/${videoId}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        setData(result.data);
        setIsLiked(result.data.isLiked);
        setLikeCount(result.data.video.likeCount);
        setIsSubscribed(result.data.isSubscribed);
        setSubscriberCount(result.data.video.channelId.subscriberCount);
      }
    } catch (error) {
      console.error('Failed to fetch video:', error);
    } finally {
      setIsLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    if (videoId) {
      fetchVideo();
    }
  }, [videoId, fetchVideo]);

  // Get the channel ID as a string (handle both string and object cases)
  const getUserChannelId = useCallback((): string | null => {
    if (!user?.channelId) return null;
    // If channelId is an object (populated), get its _id
    if (typeof user.channelId === 'object' && user.channelId !== null) {
      return (user.channelId as unknown as { _id: string })._id;
    }
    // If it's already a string
    return user.channelId as string;
  }, [user?.channelId]);

  // Fetch user playlists
  const fetchUserPlaylists = useCallback(async () => {
    const channelId = getUserChannelId();
    if (!channelId) return;

    try {
      setLoadingPlaylists(true);
      const response = await fetch(`/api/playlists?channelId=${channelId}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        // Ensure we have an array
        const playlists = Array.isArray(result.data) ? result.data : [];
        setUserPlaylists(playlists);
      } else {
        console.error('Failed to fetch playlists:', response.status);
        setUserPlaylists([]);
      }
    } catch (error) {
      console.error('Failed to fetch playlists:', error);
      setUserPlaylists([]);
    } finally {
      setLoadingPlaylists(false);
    }
  }, [getUserChannelId]);

  // Navigate to next video in playlist
  const handleNextVideo = useCallback(() => {
    if (playlistData && currentPlaylistIndex < playlistData.playlist.videos.length - 1) {
      const nextVideo = playlistData.playlist.videos[currentPlaylistIndex + 1];
      router.push(`/watch/${nextVideo._id}?list=${playlistId}`);
    }
  }, [playlistData, currentPlaylistIndex, playlistId, router]);

  // Navigate to previous video in playlist
  const handlePreviousVideo = useCallback(() => {
    if (playlistData && currentPlaylistIndex > 0) {
      const prevVideo = playlistData.playlist.videos[currentPlaylistIndex - 1];
      router.push(`/watch/${prevVideo._id}?list=${playlistId}`);
    }
  }, [playlistData, currentPlaylistIndex, playlistId, router]);

  // Auto-play next video when current one ends
  const handleVideoEnded = useCallback(() => {
    if (playlistData && currentPlaylistIndex < playlistData.playlist.videos.length - 1) {
      handleNextVideo();
    }
  }, [playlistData, currentPlaylistIndex, handleNextVideo]);

  // Handle like
  const handleLike = async () => {
    if (!isAuthenticated) {
      alert('Please sign in to like videos');
      return;
    }
    
    if (!videoId) return;

    try {
      const response = await fetch(`/api/videos/${videoId}/like`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        setIsLiked(result.data.liked);
        setLikeCount(result.data.likeCount);
      }
    } catch (error) {
      console.error('Failed to like video:', error);
    }
  };

  // Handle subscribe
  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      alert('Please sign in to subscribe');
      return;
    }

    if (!data?.video.channelId._id) return;

    try {
      const response = await fetch(`/api/subscribe/${data.video.channelId._id}`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        setIsSubscribed(result.data.subscribed);
        setSubscriberCount(result.data.subscriberCount);
      }
    } catch (error) {
      console.error('Failed to subscribe:', error);
    }
  };

  // Add to watch later
  const handleAddToWatchLater = async () => {
    if (!isAuthenticated) {
      alert('Please sign in to save videos');
      return;
    }
    
    if (!videoId) return;

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

  // Open playlist modal
  const handleOpenPlaylistModal = async () => {
    if (!isAuthenticated) {
      alert('Please sign in to add videos to playlists');
      return;
    }

    const channelId = getUserChannelId();
    if (!channelId) {
      alert('Please create a channel first to use playlists');
      return;
    }

    setShowPlaylistModal(true);
    fetchUserPlaylists();
  };

  // Add to playlist
  const handleAddToPlaylist = async (targetPlaylistId: string) => {
    if (!videoId) return;

    try {
      setAddingToPlaylist(targetPlaylistId);

      const response = await fetch(`/api/playlists/${targetPlaylistId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ addVideoId: videoId }),
        credentials: 'include',
      });

      if (response.ok) {
        alert('Added to playlist!');
        setShowPlaylistModal(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add to playlist');
      }
    } catch (error) {
      console.error('Failed to add to playlist:', error);
      alert('Failed to add to playlist');
    } finally {
      setAddingToPlaylist(null);
    }
  };

  // Format numbers
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  // Format date
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <div className="aspect-video bg-yt-gray rounded-lg skeleton" />
          <div className="mt-4 space-y-4">
            <div className="h-6 bg-yt-gray rounded skeleton w-3/4" />
            <div className="h-4 bg-yt-gray rounded skeleton w-1/2" />
          </div>
        </div>
        <div className="w-full lg:w-96 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <VideoCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-xl font-semibold mb-2">Video not found</h2>
        <p className="text-yt-text mb-4">The video you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/">
          <Button>Go Home</Button>
        </Link>
      </div>
    );
  }

  const { video, commentCount, relatedVideos } = data;
  const channelUserId = typeof video?.channelId === 'object' ? video.channelId?.userId : null;
  const isOwner = user?._id === channelUserId;

  // Playlist navigation helpers
  const hasNextVideo = playlistData ? currentPlaylistIndex < playlistData.playlist.videos.length - 1 : false;
  const hasPreviousVideo = playlistData ? currentPlaylistIndex > 0 : false;

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
      {/* Main content */}
      <div className="flex-1 min-w-0 lg:max-w-4xl">
        {/* Video player */}
        <VideoPlayer
          videoUrl={video?.videoUrl || ''}
          thumbnailUrl={video?.thumbnailUrl || ''}
          title={video?.title || 'Video'}
          autoPlay
          onEnded={handleVideoEnded}
          onNext={hasNextVideo ? handleNextVideo : undefined}
          onPrevious={hasPreviousVideo ? handlePreviousVideo : undefined}
          hasNext={hasNextVideo}
          hasPrevious={hasPreviousVideo}
        />

        {/* Video info */}
        <div className="mt-4">
          <h1 className="text-xl font-semibold">{video?.title || 'Untitled Video'}</h1>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4">
            {/* Channel info */}
            <div className="flex items-center gap-3">
              {video?.channelId && typeof video.channelId === 'object' && (
                <>
                  <Link href={`/channel/${video.channelId._id}`}>
                    <Avatar
                      src={video.channelId.avatar || '/default-avatar.jpg'}
                      alt={video.channelId.name || 'Channel'}
                      size="lg"
                    />
                  </Link>
                  <div>
                    <Link
                      href={`/channel/${video.channelId._id}`}
                      className="font-medium hover:text-blue-400"
                    >
                      {video.channelId.name}
                    </Link>
                    <p className="text-sm text-yt-text">
                      {formatNumber(subscriberCount)} subscribers
                    </p>
                  </div>
                </>
              )}
              {!isOwner && (
                <Button
                  variant={isSubscribed ? 'secondary' : 'primary'}
                  className={`ml-4 ${isSubscribed ? 'subscribe-btn subscribed' : 'subscribe-btn'}`}
                  onClick={handleSubscribe}
                >
                  {isSubscribed ? 'Subscribed' : 'Subscribe'}
                </Button>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              {/* Like button */}
              <button
                onClick={handleLike}
                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-full text-sm ${
                  isLiked ? 'bg-blue-600' : 'bg-yt-gray hover:bg-yt-light-gray'
                }`}
              >
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5"
                  fill={isLiked ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                  />
                </svg>
                <span className="hidden xs:inline">{formatNumber(likeCount)}</span>
                <span className="xs:hidden">{formatNumber(likeCount)}</span>
              </button>

              {/* Share button */}
              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-full bg-yt-gray hover:bg-yt-light-gray text-sm"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span className="hidden sm:inline">Share</span>
              </button>

              {/* Save button with dropdown functionality */}
              <button
                onClick={handleAddToWatchLater}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-full bg-yt-gray hover:bg-yt-light-gray text-sm"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="hidden sm:inline">Save</span>
              </button>

              {/* Add to Playlist button */}
              <button
                onClick={handleOpenPlaylistModal}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-full bg-yt-gray hover:bg-yt-light-gray text-sm"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span className="hidden sm:inline">Playlist</span>
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="mt-4 bg-yt-gray rounded-lg p-3">
            <div className="flex items-center gap-4 text-sm font-medium">
              <span>{formatNumber(video?.views || 0)} views</span>
              <span>{formatDate(video?.uploadDate || new Date())}</span>
            </div>
            {video?.description && (
              <>
                <div
                  className={`mt-2 text-sm whitespace-pre-wrap ${
                    showDescription ? '' : 'line-clamp-3'
                  }`}
                >
                  {video.description}
                </div>
                {video.description.length > 200 && (
                  <button
                    onClick={() => setShowDescription(!showDescription)}
                    className="mt-2 text-sm font-medium hover:text-blue-400"
                  >
                    {showDescription ? 'Show less' : 'Show more'}
                  </button>
                )}
              </>
            )}
          </div>

          {/* Comments */}
          {video?._id && channelUserId && (
            <CommentSection
              videoId={video._id}
              videoOwnerId={channelUserId}
            />
          )}
        </div>
      </div>

      {/* Sidebar - Playlist or Related Videos */}
      <div className="w-full lg:w-[400px] xl:w-[420px] lg:flex-shrink-0">
        {/* Playlist Panel - shown when watching from a playlist */}
        {playlistData && (
          <div className="bg-yt-gray rounded-lg mb-4 overflow-hidden">
            {/* Playlist Header */}
            <div className="p-3 bg-gradient-to-r from-yt-gray to-yt-light-gray">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <Link 
                    href={`/playlist/${playlistId}`}
                    className="font-semibold text-white hover:text-blue-400 line-clamp-1 transition-colors"
                  >
                    {playlistData.playlist.title}
                  </Link>
                  <div className="flex items-center gap-2 mt-1 text-sm text-yt-text">
                    <Link 
                      href={`/channel/${playlistData.playlist.channelId._id}`}
                      className="hover:text-white transition-colors"
                    >
                      {playlistData.playlist.channelId.name}
                    </Link>
                    <span>•</span>
                    <span>{currentPlaylistIndex + 1} / {playlistData.playlist.videos.length}</span>
                  </div>
                </div>
                <Link
                  href={`/playlist/${playlistId}`}
                  className="text-yt-text hover:text-white transition-colors p-1"
                  title="View full playlist"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Playlist Videos */}
            <div className="max-h-[400px] overflow-y-auto">
              {playlistData.playlist.videos.map((playlistVideo, index) => (
                <Link
                  key={playlistVideo._id}
                  href={`/watch/${playlistVideo._id}?list=${playlistId}`}
                  className={`flex items-start gap-2 p-2 hover:bg-yt-light-gray/50 transition-colors ${
                    playlistVideo._id === videoId ? 'bg-yt-light-gray/30' : ''
                  }`}
                >
                  <span className={`text-xs w-6 text-center pt-4 flex-shrink-0 ${
                    playlistVideo._id === videoId ? 'text-white font-bold' : 'text-yt-text'
                  }`}>
                    {playlistVideo._id === videoId ? (
                      <svg className="w-4 h-4 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </span>
                  <div className="relative flex-shrink-0 w-[100px] aspect-video">
                    <Image
                      src={playlistVideo.thumbnailUrl}
                      alt={playlistVideo.title}
                      fill
                      className="object-cover rounded"
                      sizes="100px"
                    />
                  </div>
                  <div className="flex-1 min-w-0 py-0.5">
                    <h4 className={`text-xs font-medium line-clamp-2 ${
                      playlistVideo._id === videoId ? 'text-white' : 'text-yt-white'
                    }`}>
                      {playlistVideo.title}
                    </h4>
                    <p className="text-xs text-yt-text mt-1">
                      {playlistVideo.channelId?.name || 'Unknown Channel'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Related Videos */}
        <div>
          <h3 className="font-semibold text-lg mb-4 px-1">
            {playlistData ? 'More Videos' : 'Related Videos'}
          </h3>
          <div className="space-y-2">
            {relatedVideos.map((relatedVideo) => (
              <div 
                key={relatedVideo._id} 
                className="rounded-lg hover:bg-yt-gray/50 transition-colors p-2"
              >
                <VideoCard
                  video={relatedVideo}
                  layout="list"
                />
              </div>
            ))}
          </div>
          {relatedVideos.length === 0 && (
            <div className="text-center py-8 text-yt-text">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p>No related videos found</p>
            </div>
          )}
        </div>
      </div>

      {/* Share modal */}
      {video?._id && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          videoId={video._id}
          videoTitle={video.title || 'Video'}
        />
      )}

      {/* Add to Playlist Modal */}
      <Modal
        isOpen={showPlaylistModal}
        onClose={() => setShowPlaylistModal(false)}
        title="Add to Playlist"
        size="sm"
      >
        <div className="space-y-2">
          {loadingPlaylists ? (
            <div className="py-8 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto"></div>
              <p className="text-yt-text mt-2">Loading playlists...</p>
            </div>
          ) : userPlaylists.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-yt-text mb-4">You don&apos;t have any playlists yet.</p>
              <Link href={`/channel/${getUserChannelId()}`}>
                <Button>Create a Playlist</Button>
              </Link>
            </div>
          ) : (
            <>
              {userPlaylists.map((playlist) => (
                <button
                  key={playlist._id}
                  onClick={() => handleAddToPlaylist(playlist._id)}
                  disabled={addingToPlaylist === playlist._id}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-yt-gray transition-colors disabled:opacity-50"
                >
                  <svg className="w-6 h-6 text-yt-text shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <div className="flex-1 text-left">
                    <p className="font-medium">{playlist.title}</p>
                    <p className="text-sm text-yt-text">
                      {playlist.videoCount} video{playlist.videoCount !== 1 ? 's' : ''}
                      {playlist.visibility !== 'public' && ` • ${playlist.visibility}`}
                    </p>
                  </div>
                  {addingToPlaylist === playlist._id && (
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                  )}
                </button>
              ))}
              <hr className="border-yt-gray my-2" />
              <Link
                href={`/channel/${getUserChannelId()}`}
                className="block w-full p-3 text-center text-blue-500 hover:text-blue-400 transition-colors"
              >
                Create new playlist
              </Link>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
