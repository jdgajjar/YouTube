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

interface PlaylistPageData {
  playlist: IPlaylist & {
    channelId: IChannel & { userId: { _id: string; username: string } };
    videos: VideoWithChannel[];
  };
  isOwner: boolean;
}

export default function PlaylistPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [playlistId, setPlaylistId] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();
  const [data, setData] = useState<PlaylistPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Edit Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    visibility: 'public' as 'public' | 'private' | 'unlisted',
  });
  const [isEditing, setIsEditing] = useState(false);

  // Delete Modal States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Resolve params on mount
  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await Promise.resolve(params);
      setPlaylistId(resolvedParams.id);
    };
    resolveParams();
  }, [params]);

  // Fetch playlist data
  const fetchPlaylist = useCallback(async () => {
    if (!playlistId) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/playlists/${playlistId}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        setData(result.data);
        setEditForm({
          title: result.data.playlist.title || '',
          description: result.data.playlist.description || '',
          visibility: result.data.playlist.visibility || 'public',
        });
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Failed to fetch playlist:', error);
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  }, [playlistId, router]);

  useEffect(() => {
    if (playlistId) {
      fetchPlaylist();
    }
  }, [playlistId, fetchPlaylist]);

  // Handle edit playlist
  const handleEditPlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playlistId) return;

    try {
      setIsEditing(true);

      const response = await fetch(`/api/playlists/${playlistId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
        credentials: 'include',
      });

      if (response.ok) {
        setShowEditModal(false);
        fetchPlaylist();
        alert('Playlist updated successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update playlist');
      }
    } catch (error) {
      console.error('Failed to update playlist:', error);
      alert('Failed to update playlist');
    } finally {
      setIsEditing(false);
    }
  };

  // Handle delete playlist
  const handleDeletePlaylist = async () => {
    if (!playlistId) return;

    try {
      setIsDeleting(true);

      const response = await fetch(`/api/playlists/${playlistId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setShowDeleteModal(false);
        router.push(`/channel/${data?.playlist.channelId._id}`);
        alert('Playlist deleted successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete playlist');
      }
    } catch (error) {
      console.error('Failed to delete playlist:', error);
      alert('Failed to delete playlist');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle remove video from playlist
  const handleRemoveVideo = async (videoId: string) => {
    if (!playlistId) return;

    try {
      const response = await fetch(`/api/playlists/${playlistId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ removeVideoId: videoId }),
        credentials: 'include',
      });

      if (response.ok) {
        fetchPlaylist();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to remove video');
      }
    } catch (error) {
      console.error('Failed to remove video:', error);
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

  // Calculate total duration
  const getTotalDuration = (videos: VideoWithChannel[]): string => {
    const totalSeconds = videos.reduce((acc, video) => acc + (video.duration || 0), 0);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours} hr ${minutes} min`;
    }
    return `${minutes} min`;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-96">
          <div className="aspect-video bg-yt-gray rounded-lg skeleton mb-4" />
          <div className="h-6 w-48 bg-yt-gray rounded skeleton mb-2" />
          <div className="h-4 w-32 bg-yt-gray rounded skeleton" />
        </div>
        <div className="flex-1">
          <VideoListSkeleton count={5} />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-xl font-semibold mb-2">Playlist not found</h2>
        <p className="text-yt-text">The playlist you&apos;re looking for doesn&apos;t exist.</p>
      </div>
    );
  }

  const { playlist, isOwner } = data;

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
      {/* Playlist Info Sidebar */}
      <div className="w-full lg:w-80 xl:w-96 lg:sticky lg:top-0 lg:self-start lg:flex-shrink-0">
        <div className="bg-gradient-to-b from-yt-gray to-yt-black rounded-lg p-4">
          {/* Thumbnail */}
          <div className="relative aspect-video rounded-lg overflow-hidden bg-yt-light-gray">
            {playlist.thumbnailUrl ? (
              <Image
                src={playlist.thumbnailUrl}
                alt={playlist.title}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg className="w-20 h-20 text-yt-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            )}
            {playlist.visibility !== 'public' && (
              <div className="absolute top-2 left-2 bg-black/80 px-2 py-1 text-xs rounded">
                {playlist.visibility === 'private' ? 'Private' : 'Unlisted'}
              </div>
            )}
          </div>

          {/* Title and Description */}
          <h1 className="text-xl font-bold mt-4">{playlist.title}</h1>
          
          {/* Channel Info */}
          <Link
            href={`/channel/${playlist.channelId._id}`}
            className="flex items-center gap-2 mt-3 hover:opacity-80"
          >
            <Avatar
              src={playlist.channelId.avatar || '/default-avatar.png'}
              alt={playlist.channelId.name}
              size="sm"
            />
            <span className="font-medium">{playlist.channelId.name}</span>
          </Link>

          {/* Stats */}
          <div className="text-sm text-yt-text mt-3 space-y-1">
            <p>{playlist.videoCount} videos • {getTotalDuration(playlist.videos as VideoWithChannel[])}</p>
            <p>Updated {formatDate(playlist.updatedAt)}</p>
          </div>

          {/* Description */}
          {playlist.description && (
            <p className="text-sm text-yt-text mt-3 whitespace-pre-wrap line-clamp-3">
              {playlist.description}
            </p>
          )}

          {/* Owner Actions */}
          {isOwner && (
            <div className="flex gap-2 mt-4">
              <Button
                variant="secondary"
                className="flex-1 text-sm sm:text-base"
                onClick={() => setShowEditModal(true)}
              >
                <svg className="w-4 h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </Button>
              <Button
                variant="secondary"
                className="!bg-red-600 hover:!bg-red-700 px-3"
                onClick={() => setShowDeleteModal(true)}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </Button>
            </div>
          )}

          {/* Play All Button */}
          {playlist.videos.length > 0 && (
            <Link href={`/watch/${(playlist.videos[0] as VideoWithChannel)._id}?list=${playlist._id}`}>
              <Button className="w-full mt-4">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Play All
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Videos List */}
      <div className="flex-1 min-w-0">
        {playlist.videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <svg className="w-24 h-24 text-yt-text mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <h2 className="text-xl font-semibold mb-2">No videos in this playlist</h2>
            <p className="text-yt-text">Add videos to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(playlist.videos as VideoWithChannel[]).map((video, index) => (
              <div key={video._id} className="flex items-start gap-2 sm:gap-4 group p-2 rounded-lg hover:bg-yt-gray">
                <span className="text-yt-text mt-4 w-4 sm:w-6 text-center shrink-0 text-sm">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <VideoCard
                    video={video}
                    layout="list"
                  />
                </div>
                {isOwner && (
                  <button
                    onClick={() => handleRemoveVideo(video._id)}
                    className="p-2 text-yt-text hover:text-red-500 sm:opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    title="Remove from playlist"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Playlist Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Playlist"
        size="md"
      >
        <form onSubmit={handleEditPlaylist} className="space-y-4">
          <Input
            label="Title"
            value={editForm.title}
            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
            placeholder="Enter playlist title"
            required
          />

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              placeholder="Add a description"
              rows={3}
              className="w-full px-4 py-2 bg-yt-gray border border-yt-light-gray rounded-lg focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Visibility</label>
            <select
              value={editForm.visibility}
              onChange={(e) => setEditForm({ ...editForm, visibility: e.target.value as 'public' | 'private' | 'unlisted' })}
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

      {/* Delete Playlist Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Playlist"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-yt-text">
            Are you sure you want to delete this playlist? This action cannot be undone.
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
              onClick={handleDeletePlaylist}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Playlist'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
