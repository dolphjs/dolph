import { DetectedFileType } from './file_signature';

export type ImageSize = { width: number; height: number };

const readJpegSize = (bytes: Buffer): ImageSize | null => {
    let offset = 2;

    while (offset + 9 <= bytes.length) {
        if (bytes[offset] !== 0xff) return null;

        const marker = bytes[offset + 1];

        // A marker can be padded with extra 0xff bytes.
        if (marker === 0xff) {
            offset += 1;
            continue;
        }

        const isFrameHeader = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);

        if (isFrameHeader) {
            return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
        }

        offset += 2 + bytes.readUInt16BE(offset + 2);
    }

    return null;
};

const readWebpSize = (bytes: Buffer): ImageSize | null => {
    const chunk = bytes.toString('latin1', 12, 16);

    if (chunk === 'VP8X' && bytes.length >= 30) {
        return { width: bytes.readUIntLE(24, 3) + 1, height: bytes.readUIntLE(27, 3) + 1 };
    }

    if (chunk === 'VP8 ' && bytes.length >= 30) {
        return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
    }

    if (chunk === 'VP8L' && bytes.length >= 25) {
        const bits = bytes.readUInt32LE(21);

        return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
    }

    return null;
};

// HEIC and AVIF list their sizes in `ispe` boxes. A file can have several for its
// thumbnails, and the largest is the one a decoder has to allocate for.
const readIsoImageSize = (bytes: Buffer): ImageSize | null => {
    let largest: ImageSize | null = null;
    let offset = bytes.indexOf('ispe', 0, 'latin1');

    while (offset !== -1 && offset + 16 <= bytes.length) {
        const size = { width: bytes.readUInt32BE(offset + 8), height: bytes.readUInt32BE(offset + 12) };

        if (!largest || size.width * size.height > largest.width * largest.height) largest = size;

        offset = bytes.indexOf('ispe', offset + 4, 'latin1');
    }

    return largest;
};

/**
 * Reads an image's dimensions from its header, without decoding it. That's the point:
 * a small file can decode to gigabytes, so the size has to be known before anything
 * tries. `null` means the header doesn't say, or isn't within `bytes`.
 */
export const readImageSize = (type: DetectedFileType, bytes: Buffer): ImageSize | null => {
    switch (type) {
        case 'jpeg':
            return readJpegSize(bytes);
        case 'png':
            return bytes.length >= 24 ? { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) } : null;
        case 'gif':
            return bytes.length >= 10 ? { width: bytes.readUInt16LE(6), height: bytes.readUInt16LE(8) } : null;
        case 'webp':
            return readWebpSize(bytes);
        case 'bmp':
            return bytes.length >= 26
                ? { width: Math.abs(bytes.readInt32LE(18)), height: Math.abs(bytes.readInt32LE(22)) }
                : null;
        case 'avif':
        case 'heic':
            return readIsoImageSize(bytes);
        default:
            return null;
    }
};
