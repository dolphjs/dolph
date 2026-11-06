export type DetectedFileType =
    | 'jpeg'
    | 'png'
    | 'gif'
    | 'webp'
    | 'bmp'
    | 'avif'
    | 'heic'
    | 'pdf'
    | 'zip'
    | 'ole'
    | 'mp3'
    | 'mp4'
    | 'mov'
    | 'matroska'
    | 'avi'
    | 'wav'
    | 'flv'
    | 'wmv'
    | 'mpeg';

/** Enough of the start of a file to recognise every type below. */
export const SIGNATURE_BYTES = 64;

const startsWith = (bytes: Buffer, signature: number[], offset = 0) =>
    bytes.length >= offset + signature.length && signature.every((byte, index) => bytes[offset + index] === byte);

const ascii = (bytes: Buffer, start: number, end: number) => bytes.toString('latin1', start, end);

const HEIC_BRANDS = ['heic', 'heix', 'heim', 'heis', 'hevc', 'hevx', 'mif1', 'msf1'];

// The brand boxes of the ISO media format, which HEIC, AVIF, MP4 and MOV all share.
const detectIsoMedia = (bytes: Buffer): DetectedFileType | null => {
    const box = ascii(bytes, 4, 8);

    // QuickTime files from older cameras can open straight on a data box.
    if (['moov', 'mdat', 'wide', 'free', 'skip'].includes(box)) return 'mov';
    if (box !== 'ftyp') return null;

    const declaredLength = bytes.readUInt32BE(0);
    const end = Math.min(Math.max(declaredLength, 16), bytes.length);
    const brands = [ascii(bytes, 8, 12)];

    for (let offset = 16; offset + 4 <= end; offset += 4) brands.push(ascii(bytes, offset, offset + 4));

    if (brands.some((brand) => brand === 'avif' || brand === 'avis')) return 'avif';
    if (brands.some((brand) => HEIC_BRANDS.includes(brand))) return 'heic';
    if (brands[0] === 'qt  ') return 'mov';

    return 'mp4';
};

/**
 * Works out what a file is from its first bytes, which a client can't fake by
 * renaming it. `null` means the type isn't one this recognises.
 */
export const detectFileType = (bytes: Buffer): DetectedFileType | null => {
    if (bytes.length < 4) return null;

    if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'jpeg';
    if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
    if (['GIF87a', 'GIF89a'].includes(ascii(bytes, 0, 6))) return 'gif';
    if (startsWith(bytes, [0x42, 0x4d])) return 'bmp';
    if (ascii(bytes, 0, 5) === '%PDF-') return 'pdf';
    if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) return 'zip';
    if (startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return 'ole';
    if (startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3])) return 'matroska';
    if (ascii(bytes, 0, 3) === 'FLV') return 'flv';
    if (startsWith(bytes, [0x30, 0x26, 0xb2, 0x75])) return 'wmv';
    if (startsWith(bytes, [0x00, 0x00, 0x01, 0xba]) || startsWith(bytes, [0x00, 0x00, 0x01, 0xb3])) return 'mpeg';
    if (ascii(bytes, 0, 3) === 'ID3') return 'mp3';

    // MPEG audio frames start with eleven set bits.
    if (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) return 'mp3';

    if (ascii(bytes, 0, 4) === 'RIFF') {
        const format = ascii(bytes, 8, 12);

        if (format === 'WEBP') return 'webp';
        if (format === 'AVI ') return 'avi';
        if (format === 'WAVE') return 'wav';

        return null;
    }

    return bytes.length >= 12 ? detectIsoMedia(bytes) : null;
};

/**
 * Which detected types each extension may hold. An extension that isn't listed,
 * like `.txt`, has no signature to check, so it's let through on its name.
 */
export const EXTENSION_TYPES: Record<string, DetectedFileType[]> = {
    '.jpg': ['jpeg'],
    '.jpeg': ['jpeg'],
    '.png': ['png'],
    '.gif': ['gif'],
    '.webp': ['webp'],
    '.bmp': ['bmp'],
    '.avif': ['avif'],
    '.heic': ['heic'],
    '.heif': ['heic'],
    '.pdf': ['pdf'],
    '.docx': ['zip'],
    '.xlsx': ['zip'],
    '.pptx': ['zip'],
    '.doc': ['ole'],
    '.xls': ['ole'],
    '.ppt': ['ole'],
    '.mp3': ['mp3'],
    '.mp4': ['mp4'],
    '.m4v': ['mp4'],
    '.mov': ['mov', 'mp4'],
    '.mkv': ['matroska'],
    '.webm': ['matroska'],
    '.avi': ['avi'],
    '.wav': ['wav'],
    '.flv': ['flv'],
    '.wmv': ['wmv'],
    '.mpeg': ['mpeg'],
    '.mpg': ['mpeg'],
};

export const IMAGE_MIME_TYPES: Partial<Record<DetectedFileType, string>> = {
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
    avif: 'image/avif',
    heic: 'image/heic',
};
