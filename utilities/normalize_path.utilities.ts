export const normalizePath = (path: string) => {
    // Replace all backslashes with forward slashes for windows machines
    const normalized = path.replace(/\\/g, '/');
    return normalized.startsWith('/') ? normalized : `/${normalized}`;
};
