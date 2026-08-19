import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

export function imageUploadOptions(subfolder: string): MulterOptions {
  return {
    storage: diskStorage({
      destination: join(__dirname, '..', 'public', 'uploads', subfolder),
      filename: (_req, file, callback) => {
        callback(null, `${randomUUID()}${extname(file.originalname)}`);
      },
    }),
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

export function uploadedImageUrl(
  subfolder: string,
  file?: Express.Multer.File,
): string | undefined {
  return file ? `/uploads/${subfolder}/${file.filename}` : undefined;
}
