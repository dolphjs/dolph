import sharp from 'sharp';
import { detectFileType } from '../../packages/uploader/file_signature';
import { readImageSize } from '../../packages/uploader/image_size';

const iso = (brand: string, ...compatible: string[]) => {
    const brands = Buffer.from([brand, '\0\0\0\0', ...compatible].join(''), 'latin1');
    const header = Buffer.alloc(8);

    header.writeUInt32BE(8 + brands.length);
    header.write('ftyp', 4, 'latin1');

    return Buffer.concat([header, brands]);
};

const riff = (format: string) => Buffer.from(`RIFF\0\0\0\0${format}`, 'latin1');
const bytes = (...values: number[]) => Buffer.from([...values, 0, 0, 0, 0, 0, 0, 0, 0]);

describe('detectFileType', () => {
    it.each([
        ['jpeg', bytes(0xff, 0xd8, 0xff, 0xe0)],
        ['png', bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)],
        ['gif', Buffer.from('GIF89a......')],
        ['bmp', Buffer.from('BM..........')],
        ['webp', riff('WEBP')],
        ['avi', riff('AVI ')],
        ['wav', riff('WAVE')],
        ['pdf', Buffer.from('%PDF-1.7')],
        ['zip', bytes(0x50, 0x4b, 0x03, 0x04)],
        ['ole', bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1)],
        ['mp3', Buffer.from('ID3\x03......')],
        ['mp3', bytes(0xff, 0xfb, 0x90, 0x00)],
        ['matroska', bytes(0x1a, 0x45, 0xdf, 0xa3)],
        ['flv', Buffer.from('FLV\x01....')],
        ['wmv', bytes(0x30, 0x26, 0xb2, 0x75)],
        ['mpeg', bytes(0x00, 0x00, 0x01, 0xba)],
        ['avif', iso('avif')],
        ['avif', iso('mif1', 'avif')],
        ['heic', iso('heic')],
        ['heic', iso('mif1', 'heic')],
        ['mp4', iso('isom', 'mp42')],
        ['mov', iso('qt  ')],
        ['mov', Buffer.from('\0\0\0\x08moov....')],
    ])('should recognise %s', (type, content) => {
        expect(detectFileType(content)).toBe(type);
    });

    it.each([
        ['a Windows executable', Buffer.from('MZ\x90\0\x03\0\0\0\x04\0\0\0')],
        ['a script', Buffer.from('#!/bin/sh\nrm -rf /\n')],
        ['html', Buffer.from('<!doctype html><script>alert(1)</script>')],
        ['svg', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')],
        ['an empty file', Buffer.alloc(0)],
        ['an unknown RIFF format', riff('XXXX')],
    ])('should not recognise %s', (_name, content) => {
        expect(detectFileType(content)).toBeNull();
    });
});

describe('readImageSize', () => {
    const image = () => sharp({ create: { width: 321, height: 123, channels: 3, background: 'teal' } });

    it.each([
        ['jpeg', () => image().jpeg().toBuffer()],
        ['png', () => image().png().toBuffer()],
        ['webp', () => image().webp().toBuffer()],
        ['webp', () => image().webp({ lossless: true }).toBuffer()],
        ['gif', () => image().gif().toBuffer()],
        ['avif', () => image().avif().toBuffer()],
    ] as const)('should read a real %s', async (type, encode) => {
        expect(readImageSize(type, await encode())).toEqual({ width: 321, height: 123 });
    });

    it('should read a bmp header, including a negative height', () => {
        const header = Buffer.alloc(26);
        header.writeInt32LE(100, 18);
        header.writeInt32LE(-50, 22);

        expect(readImageSize('bmp', header)).toEqual({ width: 100, height: 50 });
    });

    it('should use the largest size in a file with thumbnails', () => {
        const box = (width: number, height: number) => {
            const ispe = Buffer.alloc(16);
            ispe.write('ispe', 0, 'latin1');
            ispe.writeUInt32BE(width, 8);
            ispe.writeUInt32BE(height, 12);
            return ispe;
        };

        expect(readImageSize('heic', Buffer.concat([box(64, 64), box(4000, 3000)]))).toEqual({
            width: 4000,
            height: 3000,
        });
    });

    it('should find a jpeg size past a large metadata segment', async () => {
        const metadata = Buffer.alloc(60_000 + 4);
        metadata.writeUInt16BE(0xffe1, 0);
        metadata.writeUInt16BE(60_002, 2);

        const jpeg = await image().jpeg().toBuffer();

        expect(readImageSize('jpeg', Buffer.concat([jpeg.subarray(0, 2), metadata, jpeg.subarray(2)]))).toEqual({
            width: 321,
            height: 123,
        });
    });

    it('should give null for a truncated header', async () => {
        expect(readImageSize('png', Buffer.alloc(10))).toBeNull();
        expect(readImageSize('jpeg', (await image().jpeg().toBuffer()).subarray(0, 6))).toBeNull();
    });
});
