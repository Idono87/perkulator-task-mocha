import { expect } from 'chai';
import * as path from 'path';

import { filterSpecPaths, loadOptions } from '../utils';

describe('Utilities', function () {
  describe('filterTests', function () {
    it('Expect paths with defined extensions', function () {
      const extensions = ['.ts', '.js', '.test.ejs'];
      const specs = ['**/*'];
      const paths = [
        '/allow/path.ts',
        '/allow/path.js',
        '/allow/path.test.ejs',
        '/allow/path.cpp',
        '/allow/path.test.mjs',
      ];

      expect(filterSpecPaths(paths, specs, extensions)).to.have.members(paths.slice(0, 3));
    });

    it('Expect paths without defined extensions', function () {
      const extensions = ['.ts', '.js', '.test.ejs'];
      const specs = ['**/*.cpp'];
      const paths = [
        '/allow/path.ts',
        '/allow/path.js',
        '/allow/path.test.ejs',
        '/allow/path.cpp',
        '/allow/path.test.mjs',
      ];

      expect(filterSpecPaths(paths, specs, extensions)).to.have.members(paths.slice(3, 4));
    });

    it('Expect all paths', function () {
      const paths = [
        '/allow/path.ts',
        '/allow/path.js',
        '/allow/path.test.ejs',
        '/allow/path.cpp',
        '/allow/path.test.mjs',
      ];

      expect(filterSpecPaths(paths)).to.have.members(paths);
    });
  });

  describe('loadOptions', function () {
    it('Expect to load js rc', async function () {
      expect(await loadOptions(path.resolve(__dirname, 'fixtures', 'configs', '.mocharc.js'))).to.be.an('object');
    });

    it('Expect to load yaml rc', async function () {
      expect(await loadOptions(path.resolve(__dirname, 'fixtures', 'configs', '.mocharc.yaml'))).to.be.an('object');
    });

    it('Expect to load yml rc', async function () {
      expect(await loadOptions(path.resolve(__dirname, 'fixtures', 'configs', '.mocharc.yml'))).to.be.an('object');
    });

    it('Expect to load json rc', async function () {
      expect(await loadOptions(path.resolve(__dirname, 'fixtures', 'configs', '.mocharc.json'))).to.be.an('object');
    });

    it('Expect to load package rc', async function () {
      const cwd = process.cwd();
      process.chdir(path.resolve(__dirname, 'fixtures', 'package_with_rc'));

      expect(await loadOptions()).to.be.an('object');

      process.chdir(cwd);
    });

    it('Expect to not find a js rc', async function () {
      expect(await loadOptions(path.resolve(__dirname, '.mocharc.js'))).to.be.undefined;
    });

    it('Expect to not find a yaml rc', async function () {
      expect(await loadOptions(path.resolve(__dirname, '.mocharc.yaml'))).to.be.undefined;
    });

    it('Expect to not find a yml rc', async function () {
      expect(await loadOptions(path.resolve(__dirname, '.mocharc.yml'))).to.be.undefined;
    });

    it('Expect to not find a json rc', async function () {
      expect(await loadOptions(path.resolve(__dirname, '.mocharc.json'))).to.be.undefined;
    });

    it('Expect to not find find rc in package', async function () {
      const cwd = process.cwd();
      process.chdir(path.resolve(__dirname, 'fixtures', 'package_without_rc'));

      expect(await loadOptions()).to.be.undefined;

      process.chdir(cwd);
    });
  });
});
