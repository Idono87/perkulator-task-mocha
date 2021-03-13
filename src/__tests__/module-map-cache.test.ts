import { expect, use } from 'chai';
import { createSandbox, SinonStub } from 'sinon';
import * as fs from 'fs';
import * as sinonChai from 'sinon-chai';
import * as path from 'path';

import { ModuleMapCache } from '../module-map-cache';
import { before } from 'mocha';

use(sinonChai);

interface CacheObject {
  cacheId: number;
  moduleMap: { [key: string]: string[] };
}

describe('Cache', function () {
  const Sinon = createSandbox();

  let readFileSyncStub: SinonStub;
  let writeFileSyncStub: SinonStub;

  function throwEnoentWithReadFileStub(): void {
    const err: any = new Error('Test');
    err.code = 'ENOENT';
    readFileSyncStub.throws(err);
  }

  beforeEach(function () {
    readFileSyncStub = Sinon.stub(fs, 'readFileSync');
    writeFileSyncStub = Sinon.stub(fs, 'writeFileSync');
  });

  afterEach(function () {
    Sinon.restore();
  });

  describe('loadCache/saveCache', function () {
    it('Expect to load the cache', function () {
      const expectedCacheObject: CacheObject = {
        cacheId: process.pid,
        moduleMap: {
          './test/path1': ['./test/path2', './test/path3'],
          './test/path2': ['./test/path1', './test/path3'],
        },
      };
      readFileSyncStub.returns(JSON.stringify(expectedCacheObject));

      const cache = ModuleMapCache.loadCache();
      cache.saveCache();

      const cachedObject = JSON.parse(writeFileSyncStub.firstCall.args[1]);
      expect(cachedObject).to.deep.equal(expectedCacheObject);
    });

    it(`Expect a new cache to be created when cached file doesn't exist`, function () {
      throwEnoentWithReadFileStub();

      const cache = ModuleMapCache.loadCache();
      cache.saveCache();

      const cachedObject = JSON.parse(writeFileSyncStub.firstCall.args[1]);
      expect(cachedObject).to.deep.equal({
        cacheId: process.pid,
        moduleMap: {},
      });
    });

    it(`Expect cache to be invalidated when the cache id doesn't match`, function () {
      const invalidCacheObject: CacheObject = {
        cacheId: 12345,
        moduleMap: {
          './test/path1': ['./test/path2', './test/path3'],
          './test/path2': ['./test/path1', './test/path3'],
        },
      };
      readFileSyncStub.returns(JSON.stringify(invalidCacheObject));

      const cache = ModuleMapCache.loadCache();
      cache.saveCache();

      const cachedObject = JSON.parse(writeFileSyncStub.firstCall.args[1]);
      expect(cachedObject).to.deep.equal({
        cacheId: process.pid,
        moduleMap: {},
      });
    });

    it(`Expect to save the cache in node_modules`, function () {
      writeFileSyncStub.restore();
      readFileSyncStub.restore();
      const readFileSpy = Sinon.spy(fs, 'readFileSync');

      const cache = ModuleMapCache.loadCache();
      cache.saveCache();
      ModuleMapCache.loadCache();

      expect(readFileSpy).to.have.returned(
        JSON.stringify({
          cacheId: process.pid,
          moduleMap: {},
        }),
      );
    });
  });

  describe('mapModule', function () {
    before(function () {
      require('./fixtures/cache/parent.test');
    });

    it('Expect all nested children in the test file to be mapped', function () {
      const PARENT = path.resolve(__dirname, './fixtures/cache/parent.test.ts');
      const CHILD = path.resolve(__dirname, './fixtures/cache/child.ts');
      const GRANDCHILD = path.resolve(__dirname, './fixtures/cache/grandchild.ts');
      throwEnoentWithReadFileStub();

      const cache = ModuleMapCache.loadCache();
      cache.mapModule(PARENT);
      cache.saveCache();

      const cachedObject: CacheObject = JSON.parse(writeFileSyncStub.firstCall.args[1]);
      expect(cachedObject.moduleMap).to.deep.equal({
        [PARENT]: [CHILD, GRANDCHILD],
        [GRANDCHILD]: [PARENT],
        [CHILD]: [PARENT],
      });
    });
  });

  describe('clearModule', function () {
    before(function () {
      require('./fixtures/cache/parent.test');
      require('./fixtures/cache/parent2.test');
    });

    it(`Expect the mapped module including it's nested children to be removed from the map`, function () {
      const PARENT = path.resolve(__dirname, './fixtures/cache/parent.test.ts');
      throwEnoentWithReadFileStub();

      const cache = ModuleMapCache.loadCache();
      cache.mapModule(PARENT);
      cache.clearModule(PARENT);
      cache.saveCache();

      const cachedObject: CacheObject = JSON.parse(writeFileSyncStub.firstCall.args[1]);
      expect(cachedObject.moduleMap).to.be.empty;
    });

    it(`Expect to remove parent module and children with no remaining references`, function () {
      const PARENT = path.resolve(__dirname, './fixtures/cache/parent.test.ts');
      const PARENT2 = path.resolve(__dirname, './fixtures/cache/parent2.test.ts');
      const GRANDCHILD = path.resolve(__dirname, './fixtures/cache/grandchild.ts');
      throwEnoentWithReadFileStub();

      const cache = ModuleMapCache.loadCache();
      cache.mapModule(PARENT);
      cache.mapModule(PARENT2);
      cache.clearModule(PARENT);
      cache.saveCache();

      const cachedObject: CacheObject = JSON.parse(writeFileSyncStub.firstCall.args[1]);
      expect(cachedObject.moduleMap).to.deep.equal({
        [PARENT2]: [GRANDCHILD],
        [GRANDCHILD]: [PARENT2],
      });
    });
  });

  describe('getRootModules', function () {
    before(function () {
      require('./fixtures/cache/parent.test');
      require('./fixtures/cache/parent2.test');
    });

    it('Expect to get root modules', function () {
      throwEnoentWithReadFileStub();

      const PARENT = path.resolve(__dirname, './fixtures/cache/parent.test.ts');
      const PARENT2 = path.resolve(__dirname, './fixtures/cache/parent2.test.ts');
      const GRANDCHILD = path.resolve(__dirname, './fixtures/cache/grandchild.ts');

      const cache = ModuleMapCache.loadCache();
      cache.mapModule(PARENT);
      cache.mapModule(PARENT2);

      expect(cache.getRootModules(GRANDCHILD)).to.have.members([PARENT, PARENT2]);
    });
  });
});
