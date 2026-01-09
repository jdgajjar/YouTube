'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import { INotification } from '@/types';

export default function NotificationsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotifications();

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    }
  }, [isAuthenticated, fetchNotifications]);

  // Format time ago
  const formatTimeAgo = (date: Date | string): string => {
    const now = new Date();
    const notifDate = new Date(date);
    const diffMs = now.getTime() - notifDate.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMinutes > 0) return `${diffMinutes}m ago`;
    return 'Just now';
  };

  // Get notification icon based on type
  const getNotificationIcon = (type: INotification['type']) => {
    switch (type) {
      case 'new_video':
        return (
          <svg className="w-5 h-5 text-yt-red" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        );
      case 'video_like':
      case 'comment_like':
        return (
          <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
          </svg>
        );
      case 'comment':
      case 'comment_reply':
        return (
          <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        );
      case 'subscription':
        return (
          <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-yt-text" fill="currentColor" viewBox="0 0 24 24">
            <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        );
    }
  };

  // Get notification link
  const getNotificationLink = (notification: INotification): string => {
    if (notification.videoId) {
      return `/watch/${notification.videoId}`;
    }
    return '#';
  };

  // Handle notification click
  const handleNotificationClick = async (notification: INotification) => {
    if (!notification.read) {
      await markAsRead([notification._id]);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Notifications</h1>
        <div className="space-y-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex gap-4 p-4 bg-yt-gray rounded-lg">
              <Skeleton variant="circular" width={48} height={48} />
              <div className="flex-1 space-y-2">
                <Skeleton height={16} className="w-3/4" />
                <Skeleton height={14} className="w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <svg className="w-24 h-24 text-yt-text mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <h2 className="text-xl font-semibold mb-2">Your notifications live here</h2>
        <p className="text-yt-text mb-4">Sign in to see notifications</p>
        <Link href="/login">
          <Button>Sign In</Button>
        </Link>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <svg className="w-24 h-24 text-yt-text mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <h2 className="text-xl font-semibold mb-2">No notifications yet</h2>
        <p className="text-yt-text">Your notifications will appear here</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-yt-text">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
          )}
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="ghost" onClick={markAllAsRead}>
              Mark All as Read
            </Button>
          )}
          <Button variant="ghost" onClick={clearAll}>
            Clear All
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        {notifications.map((notification) => {
          const video = notification.videoId as unknown as { _id: string; title: string; thumbnailUrl: string } | undefined;
          const actor = notification.actorId as unknown as { _id: string; username: string } | undefined;

          return (
            <Link
              key={notification._id}
              href={getNotificationLink(notification)}
              onClick={() => handleNotificationClick(notification)}
              className={`notification-item ${!notification.read ? 'unread' : ''}`}
            >
              {/* Notification icon */}
              <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-yt-gray rounded-full">
                {getNotificationIcon(notification.type)}
              </div>

              {/* Notification content */}
              <div className="flex-1 min-w-0">
                <p className={`${!notification.read ? 'font-medium' : ''}`}>
                  {notification.message}
                </p>
                <p className="text-sm text-yt-text mt-1">
                  {formatTimeAgo(notification.createdAt)}
                </p>
              </div>

              {/* Video thumbnail */}
              {video && video.thumbnailUrl && (
                <div className="flex-shrink-0 w-24 h-14 relative rounded overflow-hidden">
                  <Image
                    src={video.thumbnailUrl}
                    alt={video.title || 'Video thumbnail'}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  deleteNotification(notification._id);
                }}
                className="flex-shrink-0 p-2 hover:bg-yt-light-gray rounded-full"
              >
                <svg className="w-5 h-5 text-yt-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
