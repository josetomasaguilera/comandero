import { Storage } from '@google-cloud/storage';
import { imageUploadOptions, uploadedImageUrl } from './upload.util';

jest.mock('@google-cloud/storage', () => ({ Storage: jest.fn() }));

describe('image uploads', () => {
  const save = jest.fn();
  const publicUrl = jest.fn(
    () => 'https://storage.googleapis.com/linaje-images/products/image.png',
  );
  const file = jest.fn(() => ({ save, publicUrl }));
  const bucket = jest.fn(() => ({ file }));
  const originalBucket = process.env.GCS_IMAGES_BUCKET;
  const image = {
    buffer: Buffer.from('image contents'),
    originalname: 'image.png',
    mimetype: 'image/png',
  } as Express.Multer.File;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.GCS_IMAGES_BUCKET;
    (Storage as unknown as jest.Mock).mockImplementation(() => ({ bucket }));
    save.mockResolvedValue(undefined);
  });

  afterAll(() => {
    if (originalBucket === undefined) delete process.env.GCS_IMAGES_BUCKET;
    else process.env.GCS_IMAGES_BUCKET = originalBucket;
  });

  it('does not upload when no image is supplied', async () => {
    await expect(uploadedImageUrl('products')).resolves.toBeUndefined();
    expect(bucket).not.toHaveBeenCalled();
  });

  it('uploads the buffer with its content type before returning a permanent URL', async () => {
    await expect(uploadedImageUrl('products', image)).resolves.toBe(
      publicUrl(),
    );
    expect(bucket).toHaveBeenCalledWith('linaje-images');
    expect(file).toHaveBeenCalledWith(
      expect.stringMatching(/^products\/[\da-f-]+\.png$/),
    );
    expect(save).toHaveBeenCalledWith(
      image.buffer,
      expect.objectContaining({
        metadata: expect.objectContaining({ contentType: 'image/png' }),
        preconditionOpts: { ifGenerationMatch: 0 },
      }),
    );
  });

  it('supports a configured bucket and category images', async () => {
    process.env.GCS_IMAGES_BUCKET = 'another-bucket';
    await uploadedImageUrl('categories', image);
    expect(bucket).toHaveBeenCalledWith('another-bucket');
    expect(file).toHaveBeenCalledWith(expect.stringMatching(/^categories\//));
  });

  it('propagates upload failures without returning a URL', async () => {
    save.mockRejectedValueOnce(new Error('Permission denied'));
    await expect(uploadedImageUrl('products', image)).rejects.toThrow(
      'Permission denied',
    );
    expect(publicUrl).not.toHaveBeenCalled();
  });

  it('keeps the 5 MB upload limit', () => {
    expect(imageUploadOptions().limits?.fileSize).toBe(5 * 1024 * 1024);
  });
});
