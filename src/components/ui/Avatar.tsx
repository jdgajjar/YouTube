'use client';

import React from 'react';
import Image from 'next/image';

interface AvatarProps {
  src?: string;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function Avatar({
  src,
  alt,
  size = 'md',
  className = '',
}: AvatarProps) {
  const sizeStyles = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  if (!src || src === '/default-avatar.png') {
    return (
      <div
        className={`${sizeStyles[size]} rounded-full bg-yt-red flex items-center justify-center text-white font-semibold ${className}`}
      >
        {getInitial(alt)}
      </div>
    );
  }

  return (
    <div className={`${sizeStyles[size]} rounded-full overflow-hidden relative ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        sizes={size === 'xl' ? '64px' : size === 'lg' ? '48px' : size === 'md' ? '40px' : size === 'sm' ? '32px' : '24px'}
      />
    </div>
  );
}
