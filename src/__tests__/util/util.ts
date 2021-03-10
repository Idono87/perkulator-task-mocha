import * as path from 'path';

export function createTestFilePaths(): string[] {
  const pathList: string[] = [];
  for (let i = 1; i <= 10; i++) {
    pathList.push(path.resolve(__dirname, `testFile${i}.test.js`));
  }

  return pathList;
}

export function createFilePaths(): string[] {
  const pathList: string[] = [];
  for (let i = 1; i <= 10; i++) {
    pathList.push(path.resolve(__dirname, `file${i}.js`));
  }

  return pathList;
}

export function createMixedFilePaths(): string[] {
  const testFileList = createTestFilePaths();
  const fileList = createFilePaths();

  const mixedFileList: string[] = [];

  while (testFileList.length + fileList.length > 0) {
    const file = testFileList.length >= fileList.length ? testFileList.pop() : fileList.pop();
    mixedFileList.push(file ?? '');
  }

  return mixedFileList;
}
