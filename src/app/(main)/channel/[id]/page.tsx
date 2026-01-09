'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import VideoCard from '@/components/video/VideoCard';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { VideoListSkeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { IVideo, IChannel, IPlaylist } from '@/types';

type VideoWithChannel = IVideo & { channelId: IChannel };
type PlaylistWithVideos = IPlaylist & { videos: IVideo[] };

interface ChannelPageData {
  channel: IChannel & { userId: { _id: string; username: string } };
  videos: VideoWithChannel[];
  isSubscribed: boolean;
}

type TabType = 'videos' | 'playlists' | 'about';

export default function ChannelPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [channelId, setChannelId] = useState<string | null>(null);
  const { user, isAuthenticated, refreshUser } = useAuth();
  const [data, setData] = useState<ChannelPageData | null>(null);
  const [playlists, setPlaylists] = useState<PlaylistWithVideos[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>('videos');

  // Edit Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [bannerPreview, setBannerPreview] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);

  // Delete Modal States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Playlist Modal States
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [playlistForm, setPlaylistForm] = useState({
    title: '',
    description: '',
    visibility: 'public' as 'public' | 'private' | 'unlisted',
  });
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);

  // Resolve params on mount
  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await Promise.resolve(params);
      setChannelId(resolvedParams.id);
    };
    resolveParams();
  }, [params]);

  // Fetch channel data
  const fetchChannel = useCallback(async () => {
    if (!channelId) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/channels/${channelId}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        setData(result.data);
        setIsSubscribed(result.data.isSubscribed);
        setSubscriberCount(result.data.channel.subscriberCount);
        setEditForm({
          name: result.data.channel.name || '',
          description: result.data.channel.description || '',
        });
      }
    } catch (error) {
      console.error('Failed to fetch channel:', error);
    } finally {
      setIsLoading(false);
    }
  }, [channelId]);

  // Fetch playlists
  const fetchPlaylists = useCallback(async () => {
    if (!channelId) return;

    try {
      const response = await fetch(`/api/playlists?channelId=${channelId}`, {
        credentials: 'include',
        cache: 'no-store',
      });

      if (response.ok) {
        const result = await response.json();
        // Ensure we always have an array
        const playlistData = Array.isArray(result.data) ? result.data : [];
        setPlaylists(playlistData);
      } else {
        console.error('Failed to fetch playlists:', response.status);
        setPlaylists([]);
      }
    } catch (error) {
      console.error('Failed to fetch playlists:', error);
      setPlaylists([]);
    }
  }, [channelId]);

  useEffect(() => {
    if (channelId) {
      fetchChannel();
      fetchPlaylists();
    }
  }, [channelId, fetchChannel, fetchPlaylists]);

  // Handle subscribe
  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      alert('Please sign in to subscribe');
      return;
    }
    
    if (!channelId) return;

    try {
      const response = await fetch(`/api/subscribe/${channelId}`, {
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

  // Handle file change for logo
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  // Handle file change for banner
  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
    }
  };

  // Handle edit channel
  const handleEditChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelId) return;

    try {
      setIsEditing(true);

      const formData = new FormData();
      formData.append('name', editForm.name);
      formData.append('description', editForm.description);
      if (logoFile) {
        formData.append('avatar', logoFile);
      }
      if (bannerFile) {
        formData.append('banner', bannerFile);
      }

      const response = await fetch(`/api/channels/${channelId}`, {
        method: 'PUT',
        body: formData,
        credentials: 'include',
      });

      if (response.ok) {
        setShowEditModal(false);
        setLogoFile(null);
        setBannerFile(null);
        setLogoPreview('');
        setBannerPreview('');
        fetchChannel();
        refreshUser();
        alert('Channel updated successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update channel');
      }
    } catch (error) {
      console.error('Failed to update channel:', error);
      alert('Failed to update channel');
    } finally {
      setIsEditing(false);
    }
  };

  // Handle delete channel
  const handleDeleteChannel = async () => {
    if (!channelId) return;

    try {
      setIsDeleting(true);

      const response = await fetch(`/api/channels/${channelId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setShowDeleteModal(false);
        refreshUser();
        router.push('/');
        alert('Channel deleted successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete channel');
      }
    } catch (error) {
      console.error('Failed to delete channel:', error);
      alert('Failed to delete channel');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle create playlist
  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!playlistForm.title.trim()) {
      alert('Please enter a playlist title');
      return;
    }

    try {
      setIsCreatingPlaylist(true);

      const response = await fetch('/api/playlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: playlistForm.title.trim(),
          description: playlistForm.description.trim(),
          visibility: playlistForm.visibility,
        }),
        credentials: 'include',
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setShowCreatePlaylistModal(false);
        setPlaylistForm({ title: '', description: '', visibility: 'public' });
        // Immediately fetch playlists to show the new one
        await fetchPlaylists();
        alert('Playlist created successfully!');
      } else {
        const errorMsg = result.error || result.details?.title || 'Failed to create playlist';
        alert(errorMsg);
      }
    } catch (error) {
      console.error('Failed to create playlist:', error);
      alert('Failed to create playlist. Please try again.');
    } finally {
      setIsCreatingPlaylist(false);
    }
  };

  // Handle delete video
  const handleDeleteVideo = async (videoId: string) => {
    try {
      const response = await fetch(`/api/videos/${videoId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        // Remove the video from local state
        setData(prev => prev ? {
          ...prev,
          videos: prev.videos.filter(v => v._id !== videoId)
        } : null);
        alert('Video deleted successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete video');
      }
    } catch (error) {
      console.error('Failed to delete video:', error);
      alert('Failed to delete video');
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
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div>
        <div className="h-48 bg-yt-gray rounded-lg skeleton mb-4" />
        <div className="flex items-center gap-4 mb-8">
          <div className="w-20 h-20 rounded-full bg-yt-gray skeleton" />
          <div className="space-y-2">
            <div className="h-6 w-48 bg-yt-gray rounded skeleton" />
            <div className="h-4 w-32 bg-yt-gray rounded skeleton" />
          </div>
        </div>
        <VideoListSkeleton count={8} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-xl font-semibold mb-2">Channel not found</h2>
        <p className="text-yt-text">The channel you&apos;re looking for doesn&apos;t exist.</p>
      </div>
    );
  }

  const { channel, videos } = data;
  const isOwner = user?._id === channel?.userId?._id;

  return (
    <div>
      {/* Banner */}
      <div className="relative h-48 md:h-64 rounded-lg overflow-hidden bg-yt-gray">
        {channel?.banner && channel.banner !== '/default-banner.jpg' ? (
          <Image
            src={channel.banner}
            alt={`${channel?.name || 'Channel'} banner`}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-yt-gray to-yt-light-gray" />
        )}
      </div>

      {/* Channel info */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 mt-4 md:-mt-8 md:ml-6 relative z-10">
        <Avatar
          src={channel?.avatar || '/default-avatar.png'}
          alt={channel?.name || 'Channel'}
          size="xl"
          className="w-20 h-20 md:w-32 md:h-32 border-4 border-yt-black"
        />

        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold">{channel?.name || 'Channel'}</h1>
          <p className="text-yt-text mt-1">
            @{channel?.userId?.username || 'user'} • {formatNumber(subscriberCount)} subscribers • {channel?.videoCount || 0} videos
          </p>
          {channel?.description && (
            <p className="text-yt-text mt-2 line-clamp-2">{channel.description}</p>
          )}
        </div>

        <div className="flex gap-2 flex-wrap w-full md:w-auto">
          {!isOwner && (
            <Button
              variant={isSubscribed ? 'secondary' : 'primary'}
              className={isSubscribed ? 'subscribe-btn subscribed' : 'subscribe-btn'}
              onClick={handleSubscribe}
            >
              {isSubscribed ? 'Subscribed' : 'Subscribe'}
            </Button>
          )}

          {isOwner && (
            <>
              <Button variant="secondary" onClick={() => setShowEditModal(true)} className="flex-1 md:flex-none">
                <svg className="w-5 h-5 mr-1 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="hidden sm:inline">Customize</span>
                <span className="sm:hidden">Edit</span>
              </Button>
              <Button
                variant="secondary"
                className="!bg-red-600 hover:!bg-red-700"
                onClick={() => setShowDeleteModal(true)}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 sm:gap-6 border-b border-yt-gray mt-6 mb-4 overflow-x-auto">
        <button
          className={`pb-3 font-medium transition-colors ${
            activeTab === 'videos'
              ? 'border-b-2 border-white text-white'
              : 'text-yt-text hover:text-white'
          }`}
          onClick={() => setActiveTab('videos')}
        >
          Videos
        </button>
        <button
          className={`pb-3 font-medium transition-colors ${
            activeTab === 'playlists'
              ? 'border-b-2 border-white text-white'
              : 'text-yt-text hover:text-white'
          }`}
          onClick={() => setActiveTab('playlists')}
        >
          Playlists
        </button>
        <button
          className={`pb-3 font-medium transition-colors ${
            activeTab === 'about'
              ? 'border-b-2 border-white text-white'
              : 'text-yt-text hover:text-white'
          }`}
          onClick={() => setActiveTab('about')}
        >
          About
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'videos' && (
        <>
          {videos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <svg className="w-24 h-24 text-yt-text mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <h2 className="text-xl font-semibold mb-2">No videos yet</h2>
              <p className="text-yt-text">This channel hasn&apos;t uploaded any videos.</p>
              {isOwner && (
                <Link href="/upload">
                  <Button className="mt-4">Upload a Video</Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="video-grid">
              {videos.map((video) => (
                <VideoCard
                  key={video._id}
                  video={video}
                  showChannel={false}
                  isOwner={isOwner}
                  onDeleteVideo={isOwner ? handleDeleteVideo : undefined}
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'playlists' && (
        <>
          {isOwner && (
            <div className="mb-6">
              <Button onClick={() => setShowCreatePlaylistModal(true)}>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Playlist
              </Button>
            </div>
          )}

          {playlists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <svg className="w-24 h-24 text-yt-text mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h2 className="text-xl font-semibold mb-2">No playlists yet</h2>
              <p className="text-yt-text">This channel hasn&apos;t created any playlists.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {playlists.map((playlist) => (
                <Link
                  key={playlist._id}
                  href={`/playlist/${playlist._id}`}
                  className="group"
                >
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-yt-gray">
                    {playlist.thumbnailUrl ? (
                      <Image
                        src={playlist.thumbnailUrl}
                        alt={playlist.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-16 h-16 text-yt-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute bottom-0 right-0 bg-black/80 px-2 py-1 text-sm flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2" />
                      </svg>
                      {playlist.videoCount} videos
                    </div>
                    {playlist.visibility !== 'public' && (
                      <div className="absolute top-2 left-2 bg-black/80 px-2 py-1 text-xs rounded">
                        {playlist.visibility === 'private' ? 'Private' : 'Unlisted'}
                      </div>
                    )}
                  </div>
                  <h3 className="mt-2 font-medium line-clamp-2 group-hover:text-blue-400">
                    {playlist.title}
                  </h3>
                  <p className="text-sm text-yt-text">View full playlist</p>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'about' && (
        <div className="max-w-3xl">
          <div className="bg-yt-gray rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Description</h2>
            <p className="text-yt-text whitespace-pre-wrap">
              {channel?.description || 'No description available.'}
            </p>

            <hr className="border-yt-light-gray my-6" />

            <h2 className="text-xl font-semibold mb-4">Stats</h2>
            <div className="space-y-2 text-yt-text">
              <p>Joined {formatDate(channel?.createdAt || new Date())}</p>
              <p>{formatNumber(channel?.videoCount || 0)} videos</p>
              <p>{formatNumber(subscriberCount)} subscribers</p>
            </div>
          </div>
        </div>
      )}

      {/* Edit Channel Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Customize Channel"
        size="lg"
      >
        <form onSubmit={handleEditChannel} className="space-y-4">
          {/* Banner Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">Banner Image</label>
            <div className="relative h-32 bg-yt-gray rounded-lg overflow-hidden">
              {(bannerPreview || channel?.banner) && (
                <Image
                  src={bannerPreview || channel?.banner || ''}
                  alt="Banner preview"
                  fill
                  className="object-cover"
                />
              )}
              <label className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/50 opacity-0 hover:opacity-100 transition-opacity">
                <span className="text-white">Change Banner</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBannerChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">Channel Logo</label>
            <div className="flex items-center gap-4">
              <div className="relative w-24 h-24 rounded-full overflow-hidden bg-yt-gray">
                <Image
                  src={logoPreview || channel?.avatar || '/default-avatar.png'}
                  alt="Logo preview"
                  fill
                  className="object-cover"
                />
              </div>
              <label className="cursor-pointer">
                <span className="text-blue-500 hover:text-blue-400">Change Logo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Name */}
          <Input
            label="Channel Name"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            placeholder="Enter channel name"
            required
          />

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">About</label>
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              placeholder="Tell viewers about your channel"
              rows={4}
              className="w-full px-4 py-2 bg-yt-gray border border-yt-light-gray rounded-lg focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowEditModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isEditing}>
              {isEditing ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Channel Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Channel"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-yt-text">
            Are you sure you want to delete your channel? This action cannot be undone.
            All your videos and playlists will be permanently deleted.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button
              className="!bg-red-600 hover:!bg-red-700"
              onClick={handleDeleteChannel}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Channel'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Playlist Modal */}
      <Modal
        isOpen={showCreatePlaylistModal}
        onClose={() => setShowCreatePlaylistModal(false)}
        title="Create New Playlist"
        size="md"
      >
        <form onSubmit={handleCreatePlaylist} className="space-y-4">
          <Input
            label="Title"
            value={playlistForm.title}
            onChange={(e) => setPlaylistForm({ ...playlistForm, title: e.target.value })}
            placeholder="Enter playlist title"
            required
          />

          <div>
            <label className="block text-sm font-medium mb-2">Description (optional)</label>
            <textarea
              value={playlistForm.description}
              onChange={(e) => setPlaylistForm({ ...playlistForm, description: e.target.value })}
              placeholder="Add a description"
              rows={3}
              className="w-full px-4 py-2 bg-yt-gray border border-yt-light-gray rounded-lg focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Visibility</label>
            <select
              value={playlistForm.visibility}
              onChange={(e) => setPlaylistForm({ ...playlistForm, visibility: e.target.value as 'public' | 'private' | 'unlisted' })}
              className="w-full px-4 py-2 bg-yt-gray border border-yt-light-gray rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="public">Public</option>
              <option value="unlisted">Unlisted</option>
              <option value="private">Private</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCreatePlaylistModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreatingPlaylist}>
              {isCreatingPlaylist ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
