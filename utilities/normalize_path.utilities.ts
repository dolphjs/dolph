export const normalizePath = (path: string) => (path.startsWith('/') ? path : `/${path}`);
