import { PassThrough, Readable } from 'stream';
import type { Sharp, SharpOptions } from 'sharp';
import { UnSupportedMediaException } from '../../common';
import { FileInfo, ImageOutputFormat, ImageUploadOptions } from '../../common/types/dolph_uploader.type';
import { inAppLogger } from '../../utilities';
import { loadOptionalDriver } from '../../utilities/load_optional_driver.utilities';
import { parseSize } from '../../utilities/parse_size.utilities';
import { DolphFIleUploaderError } from './errors/error_messages';
import { detectFileType, IMAGE_MIME_TYPES } from './file_signature';
import { fileUploader, memoryStorage } from './file_uploader';
import { HeaderGuard, pipeInto } from './header_guard';
import { readImageSize } from './image_size';

type SharpFactory = (options?: SharpOptions) => Sharp;

const DEFAULT_TYPES: NonNullable<ImageUploadOptions['types']> = ['jpeg', 'png', 'webp', 'gif'];
const DEFAULT_MAX_PIXELS = 40_000_000;
const DEFAULT_MAX_FIELDS = 100;

// JPEG keeps its size after the metadata, and EXIF thumbnails can push it far in.
const IMAGE_HEADER_BYTES = 256 * 1024;

const loadSharp = () => {
    const loaded = loadOptionalDriver('sharp', () => require('sharp'));

    return (loaded.default ?? loaded) as SharpFactory;
};

const inspectImage =
    (file: FileInfo, types: Set<string>, maxPixels: number) =>
    (header: Buffer): void => {
        const type = detectFileType(header);

        if (!type || !types.has(type)) {
            throw new UnSupportedMediaException('Unsupported image type');
        }

        const size = readImageSize(type, header);

        // Without a size there's no way to tell how much memory this would decode to.
        if (!size || !size.width || !size.height) {
            throw new UnSupportedMediaException('Could not read the image dimensions');
        }

        if (size.width * size.height > maxPixels) {
            throw new DolphFIleUploaderError('LIMIT_IMAGE_PIXELS', file.fieldname);
        }

        file.mimetype = IMAGE_MIME_TYPES[type] ?? file.mimetype;
        file.width = size.width;
        file.height = size.height;
    };

const applyOutputOptions = (image: Sharp, { format, quality, resize, keepMetadata }: ImageUploadOptions) => {
    if (resize) image.resize({ fit: 'inside', withoutEnlargement: true, ...resize });

    if (format) {
        image.toFormat(format, quality === undefined ? {} : { quality });
    } else if (quality !== undefined) {
        // `force: false` only sets the quality for a format the image already is.
        image.jpeg({ quality, force: false }).webp({ quality, force: false }).avif({ quality, force: false });
    }

    // Sharp drops metadata by default, so orientation has to be applied to the pixels.
    return keepMetadata ? image.keepMetadata() : image.autoOrient();
};

const processImage = (
    sharp: SharpFactory,
    file: FileInfo,
    source: Readable,
    maxPixels: number,
    options: ImageUploadOptions,
): Readable => {
    const image = applyOutputOptions(sharp({ animated: true, limitInputPixels: maxPixels }), options);
    const output = new PassThrough();

    image.on('info', (info) => {
        file.width = info.width;
        file.height = info.pageHeight ?? info.height;
        file.mimetype = IMAGE_MIME_TYPES[info.format as ImageOutputFormat] ?? file.mimetype;
    });

    // Registered first, so a file the header check refused keeps that reason.
    source.on('error', (error) => output.destroy(error));

    // Sharp's messages describe its internals. The client only needs to know the file failed.
    image.on('error', () => output.destroy(new UnSupportedMediaException('Image could not be processed')));

    pipeInto(source, image);

    return image.pipe(output);
};

const prepareProcessing = (options: ImageUploadOptions): SharpFactory | null => {
    const needsSharp = options.resize || options.format || options.quality !== undefined;

    if (needsSharp) return loadSharp();
    if (options.keepMetadata) return null;

    try {
        return loadSharp();
    } catch {
        inAppLogger.warn(
            'imageUpload() is keeping image metadata, which can include GPS locations. Install `sharp` to strip it, or set `keepMetadata: true`.',
        );

        return null;
    }
};

/**
 * Middleware for image uploads. Files are recognised from their contents, so a renamed
 * file doesn't get through. Dimensions are checked before anything decodes the image,
 * and with `sharp` installed, metadata such as GPS location is removed.
 *
 * The result is on `req.file`, or `req.files` when `maxCount` is above 1. Read them with
 * `@DFile()` and `@DFiles()`.
 */
export const imageUpload = (options: ImageUploadOptions = {}) => {
    const { field = 'image', maxSize = '5mb', maxCount = 1, maxFields = DEFAULT_MAX_FIELDS } = options;
    const { maxPixels = DEFAULT_MAX_PIXELS, types = DEFAULT_TYPES, storage = memoryStorage(), timeout } = options;

    const sharp = prepareProcessing(options);
    const allowedTypes = new Set<string>(types);

    return fileUploader({
        fieldname: field,
        type: maxCount > 1 ? 'array' : 'single',
        maxCount,
        storage,
        timeout,
        limits: { fileSize: parseSize(maxSize), fields: maxFields },
        transformFile: (file, source) => {
            const checked = pipeInto(
                source,
                new HeaderGuard(IMAGE_HEADER_BYTES, inspectImage(file, allowedTypes, maxPixels)),
            );

            return sharp ? processImage(sharp, file, checked, maxPixels, options) : checked;
        },
    });
};
