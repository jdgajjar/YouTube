'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  requiresAuth?: boolean;
}

export default function Sidebar() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);

  const mainItems: SidebarItem[] = [
    {
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </svg>
      ),
      label: 'Home',
      href: '/',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      label: 'Subscriptions',
      href: '/subscriptions',
      requiresAuth: true,
    },
  ];

  const libraryItems: SidebarItem[] = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      label: 'History',
      href: '/history',
      requiresAuth: true,
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      label: 'Watch Later',
      href: '/watch-later',
      requiresAuth: true,
    },
  ];

  const renderNavItem = (item: SidebarItem) => {
    if (item.requiresAuth && !isAuthenticated) return null;

    const isActive = pathname === item.href;

    return (
      <Link
        key={item.href}
        href={item.href}
        className={`
          flex items-center gap-6 px-3 py-2 rounded-lg transition-colors
          ${isActive ? 'bg-yt-gray' : 'hover:bg-yt-gray/50'}
          ${isExpanded ? '' : 'justify-center'}
        `}
      >
        <span className={isActive ? 'text-white' : 'text-yt-text'}>{item.icon}</span>
        {isExpanded && (
          <span className={`text-sm ${isActive ? 'text-white font-medium' : 'text-yt-text'}`}>
            {item.label}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`
          fixed left-0 top-14 h-[calc(100vh-56px)] bg-yt-black z-40
          transition-all duration-300 overflow-y-auto overflow-x-hidden
          hidden md:block
          ${isExpanded ? 'w-64' : 'w-20'}
        `}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        <div className="py-3 px-3">
          {/* Main navigation */}
          <div className="space-y-1">
            {mainItems.map(renderNavItem)}
          </div>

          {/* Library section */}
          {isAuthenticated && (
            <>
              <div className={`border-t border-yt-gray my-3 ${isExpanded ? 'mx-0' : 'mx-2'}`} />
              {isExpanded && (
                <h3 className="text-yt-text text-sm font-medium px-3 py-2">Library</h3>
              )}
              <div className="space-y-1">
                {libraryItems.map(renderNavItem)}
              </div>
            </>
          )}

          {/* Sign in prompt */}
          {!isAuthenticated && isExpanded && (
            <>
              <div className="border-t border-yt-gray my-3" />
              <div className="px-3 py-4">
                <p className="text-sm text-yt-text mb-3">
                  Sign in to like videos, comment, and subscribe.
                </p>
                <Link
                  href="/login"
                  className="flex items-center gap-2 text-blue-400 border border-blue-400 rounded-full px-4 py-1.5 hover:bg-blue-400/10"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-yt-black border-t border-yt-gray z-40 md:hidden">
        <div className="flex justify-around py-2">
          {mainItems.map((item) => {
            if (item.requiresAuth && !isAuthenticated) return null;

            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex flex-col items-center gap-1 p-2
                  ${isActive ? 'text-white' : 'text-yt-text'}
                `}
              >
                {item.icon}
                <span className="text-xs">{item.label}</span>
              </Link>
            );
          })}
          {isAuthenticated && (
            <Link
              href="/history"
              className={`
                flex flex-col items-center gap-1 p-2
                ${pathname === '/history' ? 'text-white' : 'text-yt-text'}
              `}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs">Library</span>
            </Link>
          )}
        </div>
      </nav>
    </>
  );
}
