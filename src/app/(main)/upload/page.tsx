'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function UploadPage() {
  const router = useRouter();
  const { isAuthenticated, channel, isLoading: authLoading } = useAuth();

  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Handle video file selection
  const handleVideoSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
      setErrors({ video: 'Invalid video format. Supported: MP4, WebM, OGG, MOV' });
      return;
    }

    // Validate file size (max 500MB for this demo)
    if (file.size > 500 * 1024 * 1024) {
      setErrors({ video: 'Video file size must be less than 500MB' });
      return;
    }

    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    setErrors((prev) => ({ ...prev, video: '' }));

    // Use video filename as default title
    if (!title) {
      const fileName = file.name.replace(/\.[^/.]+$/, '');
      setTitle(fileName);
    }
  }, [title]);

  // Handle thumbnail file selection
  const handleThumbnailSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setErrors({ thumbnail: 'Invalid image format. Supported: JPEG, PNG, WebP, GIF' });
      return;
    }

    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
    setErrors((prev) => ({ ...prev, thumbnail: '' }));
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const newErrors: Record<string, string> = {};

    if (!videoFile) {
      newErrors.video = 'Please select a video file';
    }

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    } else if (title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    } else if (title.length > 100) {
      newErrors.title = 'Title cannot exceed 100 characters';
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required';
    } else if (description.length > 5000) {
      newErrors.description = 'Description cannot exceed 5000 characters';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('video', videoFile!);
      formData.append('title', title);
      formData.append('description', description);

      if (thumbnailFile) {
        formData.append('thumbnail', thumbnailFile);
      }

      // Simulating progress (actual progress would require XHR)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 500);

      const response = await fetch('/api/videos', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      // Redirect to the uploaded video
      router.push(`/watch/${data.data._id}`);
    } catch (error) {
      console.error('Upload error:', error);
      setErrors({
        submit: error instanceof Error ? error.message : 'Upload failed. Please try again.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setVideoFile(null);
    setVideoPreview(null);
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setTitle('');
    setDescription('');
    setErrors({});
    setUploadProgress(0);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-yt-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <svg className="w-24 h-24 text-yt-text mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <h2 className="text-xl font-semibold mb-2">Sign in to upload videos</h2>
        <p className="text-yt-text mb-4">You need to sign in to upload videos</p>
        <Button onClick={() => router.push('/login')}>Sign In</Button>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <svg className="w-24 h-24 text-yt-text mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <h2 className="text-xl font-semibold mb-2">Create a channel first</h2>
        <p className="text-yt-text mb-4">You need to create a channel before uploading videos</p>
        <Button onClick={() => router.push('/')}>Go to Home</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Upload Video</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Video upload area */}
        {!videoFile ? (
          <div
            onClick={() => videoInputRef.current?.click()}
            className="border-2 border-dashed border-yt-light-gray rounded-lg p-12 text-center cursor-pointer hover:border-yt-text transition-colors"
          >
            <svg className="w-16 h-16 mx-auto text-yt-text mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-lg font-medium mb-2">Drag and drop video files to upload</p>
            <p className="text-yt-text mb-4">Your videos will be private until you publish them.</p>
            <Button type="button" variant="secondary">
              Select Files
            </Button>
            {errors.video && <p className="text-red-500 mt-2">{errors.video}</p>}
          </div>
        ) : (
          <div className="bg-yt-gray rounded-lg p-4">
            <div className="flex items-start gap-4">
              {/* Video preview */}
              <div className="relative w-48 aspect-video bg-black rounded overflow-hidden">
                <video
                  src={videoPreview!}
                  className="w-full h-full object-contain"
                  controls
                />
              </div>

              <div className="flex-1">
                <p className="font-medium">{videoFile.name}</p>
                <p className="text-sm text-yt-text">
                  {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-sm text-blue-400 hover:underline mt-2"
                >
                  Change video
                </button>
              </div>
            </div>

            {/* Upload progress */}
            {isUploading && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">Uploading...</span>
                  <span className="text-sm">{uploadProgress}%</span>
                </div>
                <div className="h-2 bg-yt-light-gray rounded overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/webm,video/ogg,video/quicktime"
          onChange={handleVideoSelect}
          className="hidden"
        />

        {/* Video details */}
        {videoFile && (
          <>
            {/* Title */}
            <Input
              label="Title (required)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add a title that describes your video"
              error={errors.title}
              maxLength={100}
            />
            <p className="text-sm text-yt-text -mt-4">{title.length}/100</p>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-yt-white mb-1">
                Description (required)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell viewers about your video"
                className={`w-full bg-yt-dark border rounded px-4 py-2 text-white placeholder-yt-text focus:outline-none focus:ring-2 min-h-[150px] ${
                  errors.description ? 'border-red-500 focus:ring-red-500' : 'border-yt-light-gray focus:ring-blue-500'
                }`}
                maxLength={5000}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-500">{errors.description}</p>
              )}
              <p className="text-sm text-yt-text mt-1">{description.length}/5000</p>
            </div>

            {/* Thumbnail */}
            <div>
              <label className="block text-sm font-medium text-yt-white mb-2">
                Thumbnail
              </label>
              <div className="flex gap-4">
                {/* Auto-generated notice */}
                <div className="flex-1">
                  <p className="text-sm text-yt-text mb-2">
                    {thumbnailFile
                      ? 'Custom thumbnail selected'
                      : 'A thumbnail will be auto-generated from your video'}
                  </p>
                  <button
                    type="button"
                    onClick={() => thumbnailInputRef.current?.click()}
                    className="text-sm text-blue-400 hover:underline"
                  >
                    {thumbnailFile ? 'Change thumbnail' : 'Upload custom thumbnail'}
                  </button>
                </div>

                {/* Thumbnail preview */}
                {thumbnailPreview && (
                  <div className="relative w-32 aspect-video bg-yt-gray rounded overflow-hidden">
                    <Image
                      src={thumbnailPreview}
                      alt="Thumbnail preview"
                      fill
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setThumbnailFile(null);
                        setThumbnailPreview(null);
                      }}
                      className="absolute top-1 right-1 p-1 bg-black/70 rounded-full hover:bg-black"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              {errors.thumbnail && (
                <p className="mt-1 text-sm text-red-500">{errors.thumbnail}</p>
              )}
            </div>

            <input
              ref={thumbnailInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleThumbnailSelect}
              className="hidden"
            />

            {/* Submit error */}
            {errors.submit && (
              <div className="bg-red-500/20 border border-red-500 rounded p-4">
                <p className="text-red-500">{errors.submit}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="ghost"
                onClick={handleReset}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={isUploading}
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : 'Upload Video'}
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
