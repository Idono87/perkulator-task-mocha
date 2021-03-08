import { expect } from 'chai';

import { filterSpecPaths } from '../utils';

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
});
