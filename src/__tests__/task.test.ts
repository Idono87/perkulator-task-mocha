import { expect, use } from 'chai';
import { createSandbox, SinonStub, SinonStubbedInstance } from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as Mocha from 'mocha';
import * as chalk from 'chalk';

import { run, stop, MochaRC } from '../index';
import { ModuleMapCache } from '../module-map-cache';
import * as utils from '../utils';
import { createFilePaths, createMixedFilePaths, createTestFilePaths } from './util/util';

use(sinonChai);

describe('Task', function () {
  const Sinon = createSandbox();

  let loadOptionsStub: SinonStub;
  let moduleMapCacheStub: SinonStubbedInstance<ModuleMapCache>;

  beforeEach(function () {
    loadOptionsStub = Sinon.stub(utils, 'loadOptions');
    moduleMapCacheStub = Sinon.createStubInstance(ModuleMapCache);
    moduleMapCacheStub.getRootModules.returns([]);
    Sinon.stub(ModuleMapCache, 'loadCache').returns(moduleMapCacheStub as any);
  });

  afterEach(function () {
    Sinon.restore();
  });

  describe('run', function () {
    it('Expect no test files to be found', async function () {
      const mochaRc: MochaRC = {
        spec: './**/*.test.js',
      };

      loadOptionsStub.returns(mochaRc);

      expect(await run({ add: createFilePaths(), change: [], remove: [] }, () => {}, undefined)).to.deep.equal({
        results: [chalk.yellow('Skipped. No changes to test files detected.')],
      });
    });

    it('Expect to add only test files', async function () {
      const mochaRc: MochaRC = {
        spec: './**/*.test.js',
      };
      loadOptionsStub.returns(mochaRc);
      const addFileSpy = Sinon.spy(Mocha.prototype, 'addFile');

      // Will error out. Files do not exist
      try {
        await run({ add: createMixedFilePaths(), change: [], remove: [] }, () => {}, undefined);
      } catch (err) {}

      createTestFilePaths().forEach((filePath) => {
        expect(addFileSpy).to.be.calledWith(filePath);
      });
    });

    it('Expect to add mapped test files', async function () {
      const cachedFiles = ['./cached/testFile.js'];
      const mochaRc: MochaRC = {
        spec: './**/*.test.js',
      };
      loadOptionsStub.returns(mochaRc);
      const addFileSpy = Sinon.spy(Mocha.prototype, 'addFile');
      moduleMapCacheStub.getRootModules.returns(cachedFiles);

      // Will error out. Files do not exist
      try {
        await run({ add: createMixedFilePaths(), change: [], remove: [] }, () => {}, undefined);
      } catch (err) {}

      createTestFilePaths().forEach((filePath) => {
        expect(addFileSpy).to.be.calledWith(filePath);
      });
    });

    it('Expect to get a result object with no failures', async function () {
      const mochaRc: MochaRC = {
        spec: './**/*.test.ts',
      };
      loadOptionsStub.returns(mochaRc);

      const resultsObject = await run(
        { add: [require.resolve('./fixtures/tests/passing.test')], change: [], remove: [] },
        () => {},
        undefined,
      );

      expect(resultsObject)
        .to.have.property('results')
        .and.be.an('array')
        .and.not.have.members(['\x1B[33mSkipped. No changes to test files detected.\x1B[39m']);
      expect(resultsObject).to.not.have.property('errors');
    });

    it('Expect a successful run to map and cache every test file', async function () {
      const mochaRc: MochaRC = {
        spec: './**/*.test.ts',
      };
      const addedFiles = [
        require.resolve('./fixtures/tests/passing.test'),
        require.resolve('./fixtures/cache/parent.test'),
      ];
      loadOptionsStub.returns(mochaRc);

      await run(
        {
          add: addedFiles,
          change: [],
          remove: [],
        },
        () => {},
        undefined,
      );

      expect(moduleMapCacheStub.saveCache).to.be.calledOnce;
      addedFiles.forEach((path) => {
        expect(moduleMapCacheStub.mapModule).to.be.calledWith(path);
      });
    });

    it('Expect test to be removed from cache', async function () {
      const mochaRc: MochaRC = {
        spec: './**/*.test.ts',
      };
      const removedFiles = [require.resolve('./fixtures/tests/passing.test')];
      const addedFiles = [require.resolve('./fixtures/cache/parent.test')];
      loadOptionsStub.returns(mochaRc);

      await run(
        {
          add: addedFiles,
          change: [],
          remove: removedFiles,
        },
        () => {},
        undefined,
      );

      expect(moduleMapCacheStub.saveCache).to.be.calledOnce;
      expect(moduleMapCacheStub.mapModule).to.be.calledOnceWith(addedFiles[0]);
      expect(moduleMapCacheStub.clearModule).to.be.calledWith(removedFiles[0]);
    });

    it('Expect removed file to get cached test modules', async function () {
      const mochaRc: MochaRC = {
        spec: './**/*.test.ts',
      };
      const addedFiles = [require.resolve('./fixtures/cache/parent.test')];
      const removedFiles = [require.resolve('./fixtures/cache/child')];
      loadOptionsStub.returns(mochaRc);

      await run(
        {
          add: addedFiles,
          change: [],
          remove: removedFiles,
        },
        () => {},
        undefined,
      );

      expect(moduleMapCacheStub.saveCache).to.be.calledOnce;
      expect(moduleMapCacheStub.mapModule).to.be.calledOnceWith(addedFiles[0]);
      expect(moduleMapCacheStub.getRootModules).to.be.calledWith(removedFiles[0]);
    });

    it('Expect to get a result object with failures', async function () {
      const mochaRc: MochaRC = {
        spec: './**/*.test.ts',
      };
      loadOptionsStub.returns(mochaRc);

      const resultsObject = await run(
        { add: [require.resolve('./fixtures/tests/failing.test')], change: [], remove: [] },
        () => {},
        undefined,
      );

      expect(resultsObject)
        .to.have.property('results')
        .and.be.an('array')
        .and.not.have.members(['\x1B[33mSkipped. No changes to test files detected.\x1B[39m']);
      expect(resultsObject).to.have.property('errors').and.be.an('array').and.be.length(8);
    });

    it('Expect failed run to keep old cache', async function () {
      const mochaRc: MochaRC = {
        spec: './**/*.test.ts',
      };
      loadOptionsStub.returns(mochaRc);

      await run(
        { add: [require.resolve('./fixtures/tests/failing.test')], change: [], remove: [] },
        () => {},
        undefined,
      );

      expect(moduleMapCacheStub.saveCache).to.not.be.called;
      expect(moduleMapCacheStub.mapModule).to.not.be.called;
    });

    it('Expect to get a result object with mixed results', async function () {
      const mochaRc: MochaRC = {
        spec: './**/*.test.ts',
      };
      loadOptionsStub.returns(mochaRc);

      const resultsObject = await run(
        { add: [require.resolve('./fixtures/tests/mixed.test')], change: [], remove: [] },
        () => {},
        undefined,
      );

      expect(resultsObject)
        .to.have.property('results')
        .and.be.an('array')
        .and.not.have.members(['\x1B[33mSkipped. No changes to test files detected.\x1B[39m']);
      expect(resultsObject).to.have.property('errors').and.be.an('array').and.be.length(3);
    });
  });

  describe('stop', function () {
    it('Expect test run to be stopped', async function () {
      const mochaRc: MochaRC = {
        spec: './**/*.test.ts',
      };
      loadOptionsStub.returns(mochaRc);

      setImmediate(stop);

      await run(
        { add: [require.resolve('./fixtures/tests/lengthy.test')], change: [], remove: [] },
        () => {},
        undefined,
      );
    });
  });
});
