import { memoryStorage } from 'multer';
import { extname } from 'path';
import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'crypto';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

let storage: Storage | undefined;

export function imageUploadOptions(): MulterOptions {
  return {
    storage: memoryStorage(),
    fileFilter: (_req, file, callback) => {
      if (!file.mimetype.startsWith('image/')) {
        callback(new Error('Sólo se permiten imágenes'), false);
        return;
      }
      callback(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 },
  };
}

export async function uploadedImageUrl(
  subfolder: string,
  file?: Express.Multer.File,
): Promise<string | undefined> {
  if (!file) return undefined;

  storage ??= new Storage();
  const object = storage
    .bucket(process.env.GCS_IMAGES_BUCKET || 'linaje-images')
    .file(`${subfolder}/${randomUUID()}${extname(file.originalname)}`);

  await object.save(file.buffer, {
    resumable: false,
    metadata: {
      contentType: file.mimetype,
      cacheControl: 'public, max-age=31536000, immutable',
    },
    preconditionOpts: { ifGenerationMatch: 0 },
  });

  return object.publicUrl();
}
