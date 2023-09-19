import { readdirSync, statSync } from 'fs';
import { join } from 'path';

function isDirectory(path: string): boolean {
  return statSync(path).isDirectory();
}

export function getFolders(dir: string): string[] {
  return readdirSync(dir).filter((file) => isDirectory(join(dir, file)));
}

export function getDirs(base: string[]): string[] {
  const allDirs: string[] = [];

  base.forEach((baseDir) => {
    const folders = getFolders(baseDir);
    const baseDirsFullPath = folders.map((folder) => join(baseDir, folder));
    // return getFolders(base).map((path) => `${base}/${path}`);
    allDirs.push(...baseDirsFullPath);
  });

  return allDirs;
}

/**
 * Checks if the directory contains a package.json file
 * @param dir Path to the directory
 * @returns True if the directory contains a package.json
 */
export function containsPackageJson(dir: string) {
  return readdirSync(dir).some((file) => file === 'package.json');
}
