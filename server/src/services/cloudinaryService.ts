import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

/**
 * Cloudinary is configured lazily — credentials come from .env
 * Add to .env:
 *   CLOUDINARY_CLOUD_NAME=your_cloud_name
 *   CLOUDINARY_API_KEY=your_api_key
 *   CLOUDINARY_API_SECRET=your_api_secret
 */
const getCloudinary = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName || cloudName === 'your_cloud_name_here') {
    throw new Error('[Cloudinary] CLOUDINARY_CLOUD_NAME not configured in .env. Please add your Cloudinary credentials.');
  }
  cloudinary.config({
    cloud_name: cloudName,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  return cloudinary;
};

export type CloudinaryFolder =
  | 'docin/credentials'
  | 'docin/avatars'
  | 'docin/posts'
  | 'docin/banners';

/**
 * Upload a file buffer to Cloudinary
 */
export const uploadToCloudinary = (
  fileBuffer: Buffer,
  folder: CloudinaryFolder,
  options?: {
    resource_type?: 'image' | 'raw' | 'auto';
    public_id?: string;
    transformation?: object[];
  }
): Promise<{ url: string; publicId: string; format: string }> => {
  return new Promise((resolve, reject) => {
    const cloud = getCloudinary();
    const uploadStream = cloud.uploader.upload_stream(
      {
        folder,
        resource_type: options?.resource_type || 'auto',
        public_id: options?.public_id,
        transformation: options?.transformation,
        // Auto-quality + format optimization
        quality: 'auto',
        fetch_format: 'auto',
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error('Cloudinary upload failed'));
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
        });
      }
    );

    const readable = new Readable();
    readable.push(fileBuffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
};

/**
 * Delete a file from Cloudinary by publicId
 */
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  const cloud = getCloudinary();
  await cloud.uploader.destroy(publicId);
};

/**
 * Generate a Cloudinary URL with transformations
 */
export const getOptimizedUrl = (
  publicId: string,
  options?: { width?: number; height?: number; crop?: string }
): string => {
  const cloud = getCloudinary();
  return cloud.url(publicId, {
    secure: true,
    quality: 'auto',
    fetch_format: 'auto',
    width: options?.width,
    height: options?.height,
    crop: options?.crop || 'fill',
  });
};
