'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';

interface VideoPlayerProps {
  videoUrl: string;
  thumbnailUrl: string;
  title: string;
  autoPlay?: boolean;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const QUALITY_OPTIONS = ['Auto', '1080p', '720p', '480p', '360p'];

export default function VideoPlayer({
  videoUrl,
  thumbnailUrl,
  title,
  autoPlay = false,
  onEnded,
  onTimeUpdate,
  onNext,
  onPrevious,
  hasNext = false,
  hasPrevious = false,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState('Auto');
  const [buffered, setBuffered] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // Format time helper
  const formatTime = (time: number): string => {
    if (!isFinite(time) || isNaN(time)) return '0:00';
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds
        .toString()
        .padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Play/Pause toggle
  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(console.error);
      }
    }
  }, [isPlaying]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  // Set volume
  const handleVolumeChange = useCallback((newVolume: number) => {
    if (videoRef.current) {
      const clampedVolume = Math.max(0, Math.min(1, newVolume));
      videoRef.current.volume = clampedVolume;
      setVolume(clampedVolume);
      setIsMuted(clampedVolume === 0);
    }
  }, []);

  // Handle volume slider click
  const handleVolumeClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (volumeRef.current) {
      const rect = volumeRef.current.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      handleVolumeChange(pos);
    }
  }, [handleVolumeChange]);

  // Seek
  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (progressRef.current && videoRef.current && duration > 0) {
      const rect = progressRef.current.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      videoRef.current.currentTime = pos * duration;
    }
  }, [duration]);

  // Handle progress bar hover
  const handleProgressHover = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (progressRef.current && duration > 0) {
      const rect = progressRef.current.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      setHoverTime(pos * duration);
      setHoverPosition(e.clientX - rect.left);
    }
  }, [duration]);

  // Set playback speed
  const handleSpeedChange = useCallback((speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackSpeed(speed);
      setShowSpeedMenu(false);
    }
  }, []);

  // Set quality (placeholder - actual implementation depends on video source)
  const handleQualityChange = useCallback((quality: string) => {
    setSelectedQuality(quality);
    setShowQualityMenu(false);
    // Quality switching would be implemented based on your video service
    // For HLS/DASH streams, this would switch the quality level
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  }, []);

  // Skip forward/backward
  const skip = useCallback((seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    }
  }, [duration]);

  // Event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      onTimeUpdate?.(video.currentTime, video.duration);
    };
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoaded(true);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      onEnded?.();
    };
    const handleProgress = () => {
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };
    const handleWaiting = () => setIsBuffering(true);
    const handleCanPlay = () => setIsBuffering(false);
    const handleLoadStart = () => setIsBuffering(true);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('loadstart', handleLoadStart);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('loadstart', handleLoadStart);
    };
  }, [onEnded, onTimeUpdate]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if video player is focused or body is focused
      if (!containerRef.current?.contains(document.activeElement) && 
          document.activeElement?.tagName !== 'BODY') return;

      // Don't handle if typing in an input
      if (document.activeElement?.tagName === 'INPUT' || 
          document.activeElement?.tagName === 'TEXTAREA') return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'arrowleft':
        case 'j':
          e.preventDefault();
          skip(-10);
          break;
        case 'arrowright':
        case 'l':
          e.preventDefault();
          skip(10);
          break;
        case 'arrowup':
          e.preventDefault();
          handleVolumeChange(volume + 0.1);
          break;
        case 'arrowdown':
          e.preventDefault();
          handleVolumeChange(volume - 0.1);
          break;
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          e.preventDefault();
          if (videoRef.current && duration > 0) {
            videoRef.current.currentTime = (parseInt(e.key) / 10) * duration;
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, toggleFullscreen, toggleMute, skip, volume, handleVolumeChange, duration]);

  // Auto-hide controls
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const showControlsTemporarily = () => {
      setShowControls(true);
      clearTimeout(timeout);
      if (isPlaying) {
        timeout = setTimeout(() => setShowControls(false), 3000);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', showControlsTemporarily);
      container.addEventListener('touchstart', showControlsTemporarily);
      container.addEventListener('mouseenter', showControlsTemporarily);
    }

    return () => {
      clearTimeout(timeout);
      if (container) {
        container.removeEventListener('mousemove', showControlsTemporarily);
        container.removeEventListener('touchstart', showControlsTemporarily);
        container.removeEventListener('mouseenter', showControlsTemporarily);
      }
    };
  }, [isPlaying]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Only close menus if click is outside the container
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSpeedMenu(false);
        setShowQualityMenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Calculate progress percentage
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={`video-player-wrapper relative bg-black rounded-lg overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'aspect-video'}`}
      tabIndex={0}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={videoUrl}
        poster={thumbnailUrl}
        className="w-full h-full object-contain"
        autoPlay={autoPlay}
        playsInline
        preload="metadata"
        onClick={togglePlay}
      />

      {/* Loading/Buffering Spinner */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
      )}

      {/* Gradient overlay for controls */}
      <div 
        className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background: 'linear-gradient(transparent 60%, rgba(0,0,0,0.7) 100%)'
        }}
      />

      {/* Controls overlay */}
      <div
        className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Progress bar container */}
        <div className="px-2 sm:px-4 pb-1">
          <div
            ref={progressRef}
            className="progress-container relative h-1 group cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleSeek(e);
            }}
            onMouseMove={handleProgressHover}
            onMouseLeave={() => setHoverTime(null)}
          >
            {/* Background track */}
            <div className="absolute inset-0 bg-white/30 rounded-full group-hover:h-1.5 transition-all" />
            
            {/* Buffered progress */}
            <div
              className="absolute h-full bg-white/50 rounded-full group-hover:h-1.5 transition-all"
              style={{ width: `${bufferedPercent}%` }}
            />
            
            {/* Played progress */}
            <div
              className="absolute h-full bg-yt-red rounded-full group-hover:h-1.5 transition-all"
              style={{ width: `${progressPercent}%` }}
            >
              {/* Scrubber dot */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-yt-red rounded-full opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-1/2" />
            </div>

            {/* Hover preview time */}
            {hoverTime !== null && (
              <div 
                className="absolute -top-8 bg-black/90 text-white text-xs px-2 py-1 rounded transform -translate-x-1/2 pointer-events-none"
                style={{ left: hoverPosition }}
              >
                {formatTime(hoverTime)}
              </div>
            )}
          </div>
        </div>

        {/* Control buttons row */}
        <div className="flex items-center justify-between px-2 sm:px-4 pb-2 sm:pb-3 gap-1 sm:gap-2">
          {/* Left controls */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            {/* Previous */}
            {hasPrevious && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onPrevious?.();
                }}
                className="p-1.5 sm:p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                title="Previous"
                type="button"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z" />
                </svg>
              </button>
            )}

            {/* Play/Pause */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                togglePlay();
              }}
              className="p-1.5 sm:p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              title={isPlaying ? 'Pause (k)' : 'Play (k)'}
              type="button"
            >
              {isPlaying ? (
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Next */}
            {hasNext && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onNext?.();
                }}
                className="p-1.5 sm:p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                title="Next"
                type="button"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18l8.5-6L6 6v12zm2 0V6l6.5 6L8 18zm8-12v12h2V6h-2z" />
                </svg>
              </button>
            )}

            {/* Volume control */}
            <div 
              className="flex items-center group relative"
              onMouseEnter={() => setShowVolumeSlider(true)}
              onMouseLeave={() => setShowVolumeSlider(false)}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  toggleMute();
                }}
                className="p-1.5 sm:p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                title={isMuted ? 'Unmute (m)' : 'Mute (m)'}
                type="button"
              >
                {isMuted || volume === 0 ? (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                  </svg>
                ) : volume < 0.5 ? (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  </svg>
                )}
              </button>
              
              {/* Volume slider */}
              <div 
                className={`hidden sm:flex items-center overflow-hidden transition-all duration-200 ${
                  showVolumeSlider ? 'w-20 opacity-100 ml-1' : 'w-0 opacity-0'
                }`}
              >
                <div
                  ref={volumeRef}
                  className="relative h-1 w-full bg-white/30 rounded-full cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleVolumeClick(e);
                  }}
                >
                  <div
                    className="absolute h-full bg-white rounded-full"
                    style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full transform translate-x-1/2" />
                  </div>
                </div>
              </div>
            </div>

            {/* Time display - Current / Total */}
            <div className="text-xs sm:text-sm text-white whitespace-nowrap ml-1 sm:ml-2 font-medium">
              <span className="text-white">{formatTime(currentTime)}</span>
              <span className="text-white/70 mx-1">/</span>
              <span className="text-white/70">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            {/* Speed selector */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setShowSpeedMenu(!showSpeedMenu);
                  setShowQualityMenu(false);
                }}
                className="p-1.5 sm:p-2 hover:bg-white/10 rounded-full text-xs sm:text-sm font-medium transition-colors cursor-pointer"
                title="Playback speed"
                type="button"
              >
                {playbackSpeed === 1 ? (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M10 8v8l6-4-6-4zm1.66 4L14 10.38v3.24L11.66 12z" opacity=".3"/>
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-12v8l6-4-6-4z"/>
                  </svg>
                ) : (
                  <span>{playbackSpeed}x</span>
                )}
              </button>
              {showSpeedMenu && (
                <div 
                  className="absolute bottom-full right-0 mb-2 bg-yt-gray/95 backdrop-blur rounded-lg overflow-hidden shadow-lg z-10 min-w-[100px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-3 py-2 text-xs text-yt-text border-b border-yt-light-gray">
                    Playback Speed
                  </div>
                  {SPEED_OPTIONS.map((speed) => (
                    <button
                      key={speed}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleSpeedChange(speed);
                      }}
                      className={`w-full px-3 py-2 text-sm text-left hover:bg-yt-light-gray transition-colors flex items-center justify-between cursor-pointer ${
                        speed === playbackSpeed ? 'text-yt-red' : 'text-white'
                      }`}
                      type="button"
                    >
                      <span>{speed === 1 ? 'Normal' : `${speed}x`}</span>
                      {speed === playbackSpeed && (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quality selector */}
            <div className="relative hidden sm:block">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setShowQualityMenu(!showQualityMenu);
                  setShowSpeedMenu(false);
                }}
                className="p-1.5 sm:p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                title="Quality"
                type="button"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
                </svg>
              </button>
              {showQualityMenu && (
                <div 
                  className="absolute bottom-full right-0 mb-2 bg-yt-gray/95 backdrop-blur rounded-lg overflow-hidden shadow-lg z-10 min-w-[100px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-3 py-2 text-xs text-yt-text border-b border-yt-light-gray">
                    Quality
                  </div>
                  {QUALITY_OPTIONS.map((quality) => (
                    <button
                      key={quality}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleQualityChange(quality);
                      }}
                      className={`w-full px-3 py-2 text-sm text-left hover:bg-yt-light-gray transition-colors flex items-center justify-between cursor-pointer ${
                        quality === selectedQuality ? 'text-yt-red' : 'text-white'
                      }`}
                      type="button"
                    >
                      <span>{quality}</span>
                      {quality === selectedQuality && (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Picture in Picture (desktop only) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (videoRef.current && document.pictureInPictureEnabled) {
                  if (document.pictureInPictureElement) {
                    document.exitPictureInPicture();
                  } else {
                    videoRef.current.requestPictureInPicture();
                  }
                }
              }}
              className="hidden sm:block p-1.5 sm:p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              title="Picture in Picture"
              type="button"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14z"/>
              </svg>
            </button>

            {/* Fullscreen */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                toggleFullscreen();
              }}
              className="p-1.5 sm:p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              title="Fullscreen (f)"
              type="button"
            >
              {isFullscreen ? (
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Center play button - shown when paused */}
      {!isPlaying && showControls && !isBuffering && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            togglePlay();
          }}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 rounded-full p-3 sm:p-4 transition-all hover:scale-110 cursor-pointer z-10"
          type="button"
        >
          <svg className="w-8 h-8 sm:w-12 sm:h-12" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      )}

      {/* Skip buttons overlay (touch on mobile) 
      <div className="absolute inset-0 flex pointer-events-none">
        <div 
          className="flex-1 flex items-center justify-center pointer-events-auto"
          onDoubleClick={() => skip(-10)}
        />
        <div 
          className="flex-1 flex items-center justify-center pointer-events-auto"
          onDoubleClick={() => skip(10)}
        />
      </div> */}
    </div>
  );
}
