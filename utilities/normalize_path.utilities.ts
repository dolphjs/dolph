export const normalizePath = (path: string) => {
    // Replace all backslashes with forward slashes for windows machines
    let normalized = path.replace(/\\/g, '/');
    return normalized.startsWith('/') ? normalized : `/${normalized}`;
};
