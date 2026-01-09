import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  format: string;
  resource_type: string;
  duration?: number;
  width?: number;
  height?: number;
  bytes: number;
}

export interface CloudinaryDeleteResult {
  result: string;
}

/**
 * Upload a video to Cloudinary
 */
export async function uploadVideo(
  fileBuffer: Buffer,
  folder: string = 'youtube-clone/videos'
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'video',
        folder,
        chunk_size: 6000000, // 6MB chunks for large files
        eager: [
          { format: 'mp4', transformation: [{ quality: 'auto' }] },
        ],
        eager_async: true,
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve(result as CloudinaryUploadResult);
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
}

/**
 * Upload an image (thumbnail, avatar, banner) to Cloudinary
 */
export async function uploadImage(
  fileBuffer: Buffer,
  folder: string = 'youtube-clone/images'
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        folder,
        transformation: [
          { width: 1280, height: 720, crop: 'limit' },
          { quality: 'auto' },
          { format: 'auto' },
        ],
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve(result as CloudinaryUploadResult);
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
}

/**
 * Generate a thumbnail from a video
 */
export function generateVideoThumbnail(
  videoPublicId: string,
  startOffset: string = '0'
): string {
  return cloudinary.url(videoPublicId, {
    resource_type: 'video',
    transformation: [
      { width: 1280, height: 720, crop: 'fill', gravity: 'auto' },
      { start_offset: startOffset },
    ],
    format: 'jpg',
  });
}

/**
 * Delete a resource from Cloudinary
 */
export async function deleteResource(
  publicId: string,
  resourceType: 'video' | 'image' = 'video'
): Promise<CloudinaryDeleteResult> {
  return cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
  });
}

/**
 * Get optimized video URL for streaming
 */
export function getOptimizedVideoUrl(publicId: string): string {
  return cloudinary.url(publicId, {
    resource_type: 'video',
    transformation: [
      { quality: 'auto' },
      { fetch_format: 'auto' },
    ],
  });
}

/**
 * Get video URL with adaptive streaming
 */
export function getAdaptiveStreamingUrl(publicId: string): string {
  return cloudinary.url(publicId, {
    resource_type: 'video',
    format: 'm3u8',
    transformation: [{ streaming_profile: 'auto' }],
  });
}

/**
 * Extract public ID from Cloudinary URL
 */
export function extractPublicId(url: string): string | null {
  try {
    const regex = /\/v\d+\/(.+?)(?:\.[^.]+)?$/;
    const match = url.match(regex);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export default cloudinary;
