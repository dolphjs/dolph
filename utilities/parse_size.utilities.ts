const SIZE_UNITS: Record<string, number> = { b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3 };

/** Turns a size like `'5mb'` into bytes. A number is already bytes. */
export const parseSize = (size: string | number): number => {
    if (typeof size === 'number') return size;

    const match = /^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/i.exec(size.trim());

    if (!match) throw new Error(`Invalid size '${size}'. Use a size like '5mb'.`);

    return Math.floor(Number(match[1]) * SIZE_UNITS[(match[2] ?? 'b').toLowerCase()]);
};
