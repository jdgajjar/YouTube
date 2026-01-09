'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import Avatar from '@/components/ui/Avatar';
import Dropdown from '@/components/ui/Dropdown';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function Navbar() {
  const router = useRouter();
  const { user, channel, isAuthenticated, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [channelDescription, setChannelDescription] = useState('');
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [channelError, setChannelError] = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when mobile search opens
  useEffect(() => {
    if (showMobileSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showMobileSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleCreateChannel = async () => {
    if (!channelName.trim()) {
      setChannelError('Channel name is required');
      return;
    }

    setIsCreatingChannel(true);
    setChannelError('');

    try {
      const response = await fetch('/api/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: channelName,
          description: channelDescription,
        }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create channel');
      }

      setShowCreateChannel(false);
      setChannelName('');
      setChannelDescription('');
      router.refresh();
    } catch (error) {
      setChannelError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsCreatingChannel(false);
    }
  };

  const userDropdownItems = [
    {
      label: 'Your Channel',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      onClick: () => {
        if (channel) {
          router.push(`/channel/${channel._id}`);
        } else {
          setShowCreateChannel(true);
        }
      },
    },
    {
      label: 'Watch Later',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      onClick: () => router.push('/watch-later'),
    },
    {
      label: 'History',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      onClick: () => router.push('/history'),
    },
    {
      label: 'Sign Out',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      ),
      onClick: async () => {
        await logout();
        router.push('/');
      },
      danger: true,
    },
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 h-14 bg-yt-black border-b border-yt-gray z-50">
        <div className="h-full px-2 sm:px-4 flex items-center justify-between gap-1 sm:gap-2">
          {/* Logo - Hide when mobile search is open */}
          <Link 
            href="/" 
            className={`flex items-center gap-1 flex-shrink-0 ${showMobileSearch ? 'hidden' : 'flex'}`}
          >
            <svg className="w-7 h-7 sm:w-8 sm:h-8 text-yt-red" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            <span className="text-lg sm:text-xl font-semibold hidden md:block">YouTube</span>
          </Link>

          {/* Desktop Search bar - Hidden on mobile */}
          <form onSubmit={handleSearch} className="hidden sm:flex flex-1 max-w-xl mx-2 md:mx-4">
            <div className="flex w-full">
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 min-w-0 bg-yt-dark border border-yt-light-gray rounded-l-full px-4 py-2 text-sm text-white placeholder-yt-text focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="bg-yt-gray px-4 md:px-6 rounded-r-full border border-l-0 border-yt-light-gray hover:bg-yt-light-gray flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </form>

          {/* Mobile Search bar - Expandable */}
          {showMobileSearch && (
            <form onSubmit={handleSearch} className="flex sm:hidden flex-1 items-center gap-2">
              <button
                type="button"
                onClick={() => setShowMobileSearch(false)}
                className="p-2 hover:bg-yt-gray rounded-full flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 min-w-0 bg-yt-dark border border-yt-light-gray rounded-full px-4 py-2 text-sm text-white placeholder-yt-text focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="p-2 hover:bg-yt-gray rounded-full flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </form>
          )}

          {/* Right side */}
          <div className={`flex items-center gap-1 sm:gap-2 flex-shrink-0 ${showMobileSearch ? 'hidden' : 'flex'}`}>
            {/* Mobile Search Toggle */}
            <button
              onClick={() => setShowMobileSearch(true)}
              className="sm:hidden p-2 hover:bg-yt-gray rounded-full"
              title="Search"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            {isAuthenticated ? (
              <>
                {/* Upload button */}
                {channel && (
                  <Link
                    href="/upload"
                    className="p-2 hover:bg-yt-gray rounded-full"
                    title="Upload video"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </Link>
                )}

                {/* Notifications */}
                <Link
                  href="/notifications"
                  className="relative p-2 hover:bg-yt-gray rounded-full"
                  title="Notifications"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="notification-badge text-xs">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>

                {/* User menu */}
                <Dropdown
                  trigger={
                    <button className="flex items-center">
                      <Avatar
                        src={channel?.avatar}
                        alt={user?.username || 'User'}
                        size="sm"
                      />
                    </button>
                  }
                  items={userDropdownItems}
                />
              </>
            ) : (
              <Link href="/login">
                <Button variant="secondary" size="sm" className="text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="hidden sm:inline">Sign In</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Create Channel Modal */}
      <Modal
        isOpen={showCreateChannel}
        onClose={() => setShowCreateChannel(false)}
        title="Create Your Channel"
      >
        <div className="space-y-4">
          <Input
            label="Channel Name"
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            placeholder="Enter channel name"
            error={channelError}
          />
          <div>
            <label className="block text-sm font-medium text-yt-white mb-1">
              Description (optional)
            </label>
            <textarea
              value={channelDescription}
              onChange={(e) => setChannelDescription(e.target.value)}
              placeholder="Tell viewers about your channel"
              className="w-full bg-yt-dark border border-yt-light-gray rounded px-4 py-2 text-white placeholder-yt-text focus:outline-none focus:border-blue-500 min-h-[100px]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setShowCreateChannel(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateChannel}
              isLoading={isCreatingChannel}
            >
              Create Channel
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
