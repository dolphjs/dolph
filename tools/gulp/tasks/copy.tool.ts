import { dest, series, src, task } from 'gulp';

function copyPackageJson(): NodeJS.ReadWriteStream {
  return src('package.json').pipe(dest('dist'));
}

function copyReadme(): NodeJS.ReadWriteStream {
  return src('README.md').pipe(dest('dist'));
}

function copyLicense(): NodeJS.ReadWriteStream {
  return src('LICENSE').pipe(dest('dist'));
}

function copyNpmIgnore(): NodeJS.ReadWriteStream {
  return src('.npmignore').pipe(dest('dist'));
}

task('copy:package-json', copyPackageJson);
task('copy:readme', copyReadme);
task('copy:license', copyLicense);
task('copy:npm-ignore', copyNpmIgnore);
task('copy', series('copy:package-json', 'copy:readme', 'copy:license', 'copy:npm-ignore'));
