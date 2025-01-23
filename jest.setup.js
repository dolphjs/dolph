jest.setTimeout(10000);

jest.mock('fs-temp', () => ({
  mkdir: () => Promise.resolve('/tmp/test-dir')
}));

jest.mock('rimraf', () => ({
  rimraf: () => Promise.resolve()
}));