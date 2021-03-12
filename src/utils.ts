import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import anymatch from 'anymatch';

import { MochaRC } from './index';

function resolveRcPath(rcPath?: string, ext = ''): string {
  return path.resolve(process.cwd(), rcPath === undefined ? `./.mocharc${ext}` : rcPath);
}

function isExtensions(p: string, extensions: string | string[]): boolean {
  const ext = Array.isArray(extensions) ? extensions : [extensions];

  return ext.some((extension) => path.extname(p) === extension);
}

function loadJsOptions(rcPath?: string): MochaRC | undefined {
  if (rcPath === undefined || isExtensions(rcPath, '.js')) {
    try {
      return require(resolveRcPath(rcPath));
    } catch (err) {
      if (err.code !== 'MODULE_NOT_FOUND') {
        throw err;
      }
    }
  }
}

async function loadYamlOptions(rcPath?: string, ext = '.yaml'): Promise<MochaRC | undefined> {
  if (rcPath === undefined || isExtensions(rcPath, ['.yaml', '.yml'])) {
    try {
      const contents = await fs.readFile(resolveRcPath(rcPath, ext), 'utf-8');
      return yaml.load(contents) as MochaRC;
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }

    if (rcPath === undefined && ext !== '.yml') {
      return await loadYamlOptions(undefined, '.yml');
    }
  }
}

async function loadJsonOptions(rcPath?: string): Promise<MochaRC | undefined> {
  if (rcPath === undefined || isExtensions(rcPath, ['.json'])) {
    try {
      const contents = await fs.readFile(resolveRcPath(rcPath), 'utf-8');
      return JSON.parse(contents) as MochaRC;
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }
  }
}

async function loadPackageOptions(): Promise<MochaRC | undefined> {
  try {
    const contents = await fs.readFile(path.resolve(process.cwd(), 'package.json'), 'utf-8');
    return JSON.parse(contents).mocha as MochaRC | undefined;
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }
}

export async function loadOptions(rcPath?: string): Promise<MochaRC | undefined> {
  let options: MochaRC | undefined;

  options = loadJsOptions(rcPath);
  if (options !== undefined) return options;

  options = await loadYamlOptions(rcPath);
  if (options !== undefined) return options;

  options = await loadJsonOptions(rcPath);
  if (options !== undefined) return options;

  options = await loadPackageOptions();
  if (options !== undefined) return options;
}

export function filterPaths(
  filePaths: string[],
  spec: string[] = ['**/*.spec.js'],
  extensions?: string[],
): [Set<string>, Set<string>] {
  const fileExtensions = extensions === undefined ? '' : `{${extensions?.join(',')}}`;

  const includeGlobList = spec.map((specPath) =>
    path.extname(specPath) === '' ? `${specPath}${fileExtensions}` : specPath,
  );

  const isIncludedPath = anymatch(includeGlobList);

  return filePaths.reduce<[Set<string>, Set<string>]>(
    ([includedPaths, excludedPaths], filePath) => {
      isIncludedPath(filePath) ? includedPaths.add(filePath) : excludedPaths.add(filePath);
      return [includedPaths, excludedPaths];
    },
    [new Set(), new Set()],
  );
}
