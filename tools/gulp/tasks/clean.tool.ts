import { task, src, series } from 'gulp';
import { source } from '../config.tools';
import * as clean from 'gulp-clean';
import * as deleteEmpty from 'delete-empty';

/**
 * Cleans the build output assets from the package folders
 */

function cleanOutput() {
  // `${source}/**/*.d.ts`;
  return src([`${source}/**/*.js`, `${source}/**/*.js.map`, `${source}/**/*.d.ts.map`], {
    read: false,
  }).pipe(clean());
}

/**
 * Cleans empty directories
 */

function cleanDirs(done: () => void) {
  deleteEmpty.sync(`${source}/`);
  done();
}

task('clean:output', cleanOutput);
task('clean:dirs', cleanDirs);
task('clean:bundle', series('clean:output', 'clean:dirs'));
