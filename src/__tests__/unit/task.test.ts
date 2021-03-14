import { expect, use } from 'chai';
import { createSandbox, SinonSpy, SinonStub, SinonStubbedInstance } from 'sinon';
import * as chaiAsPromised from 'chai-as-promised';
import * as sinonChai from 'sinon-chai';
import * as Mocha from 'mocha';
import * as chalk from 'chalk';

import { run, stop, MochaRC } from '../../index';
import { ModuleMapCache } from '../../module-map-cache';
import * as utils from '../../utils';
import { createFilePaths, createMixedFilePaths, createTestFilePaths } from '../util/util';

use(sinonChai);
use(chaiAsPromised);

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
        { add: [require.resolve('../fixtures/tests/passing.test')], change: [], remove: [] },
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
        require.resolve('../fixtures/tests/passing.test'),
        require.resolve('../fixtures/cache/parent.test'),
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

      expect(moduleMapCacheStub.saveCache).to.be.calledOnce.and.calledOn(moduleMapCacheStub);
      addedFiles.forEach((path) => {
        expect(moduleMapCacheStub.mapModule).to.be.calledWith(path).and.calledOn(moduleMapCacheStub);
      });
    });

    it('Expect test to be removed from cache', async function () {
      const mochaRc: MochaRC = {
        spec: './**/*.test.ts',
      };
      const removedFiles = [require.resolve('../fixtures/tests/passing.test')];
      const addedFiles = [require.resolve('../fixtures/cache/parent.test')];
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

      expect(moduleMapCacheStub.saveCache).to.be.calledOnce.and.calledOn(moduleMapCacheStub);
      expect(moduleMapCacheStub.mapModule).to.be.calledOnceWith(addedFiles[0]).and.calledOn(moduleMapCacheStub);
      expect(moduleMapCacheStub.clearModule).to.be.calledWith(removedFiles[0]).and.calledOn(moduleMapCacheStub);
    });

    it('Expect removed file to get cached test modules', async function () {
      const mochaRc: MochaRC = {
        spec: './**/*.test.ts',
      };
      const addedFiles = [require.resolve('../fixtures/cache/parent.test')];
      const removedFiles = [require.resolve('../fixtures/cache/child')];
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

      expect(moduleMapCacheStub.saveCache).to.be.calledOnce.and.calledOn(moduleMapCacheStub);
      expect(moduleMapCacheStub.mapModule).to.be.calledOnceWith(addedFiles[0]).and.calledOn(moduleMapCacheStub);
      expect(moduleMapCacheStub.getRootModules).to.be.calledWith(removedFiles[0]).and.calledOn(moduleMapCacheStub);
    });

    it('Expect to get a result object with failures', async function () {
      const mochaRc: MochaRC = {
        spec: './**/*.test.ts',
      };
      loadOptionsStub.returns(mochaRc);

      const resultsObject = await run(
        { add: [require.resolve('../fixtures/tests/failing.test')], change: [], remove: [] },
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
        { add: [require.resolve('../fixtures/tests/failing.test')], change: [], remove: [] },
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
        { add: [require.resolve('../fixtures/tests/mixed.test')], change: [], remove: [] },
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
        { add: [require.resolve('../fixtures/tests/lengthy.test')], change: [], remove: [] },
        () => {},
        undefined,
      );
    });
  });

  describe('options', function () {
    describe('require', function () {
      const modulePath1 = require.resolve('../fixtures/options/require_1');
      const modulePath2 = require.resolve('../fixtures/options/require_2');

      const modulePathId1 = require.resolve('../fixtures/options/require_1').replace(/\\/g, '\\');
      const modulePathId2 = require.resolve('../fixtures/options/require_2').replace(/\\/g, '\\');

      afterEach(function () {
        /* eslint-disable */
        delete require.cache[modulePathId1];
        delete require.cache[modulePathId2];
        /* eslint-enable */
      });

      it('Expect required module to be imported', async function () {
        const mochaRc: MochaRC = {
          spec: './**/*.test.ts',
          require: modulePath1,
        };

        await run(
          { add: [require.resolve('../fixtures/tests/passing.test')], change: [], remove: [] },
          () => {},
          mochaRc,
        );
        expect(require.cache).to.have.any.keys(modulePath1.replace(/\\/g, '\\'));
      });

      it('Expect required modules to be imported', async function () {
        const mochaRc: MochaRC = {
          spec: './**/*.test.ts',
          require: [modulePath1, modulePath2],
        };

        await run(
          { add: [require.resolve('../fixtures/tests/passing.test')], change: [], remove: [] },
          () => {},
          mochaRc,
        );
        expect(require.cache).to.have.any.keys(modulePathId1);
        expect(require.cache).to.have.any.keys(modulePathId2);
      });

      it(`Expect to throw if modules doesn't exist`, function () {
        const mochaRc: MochaRC = {
          spec: './**/*.test.ts',
          require: ['./not/a/real/module'],
        };

        return expect(
          run({ add: [require.resolve('../fixtures/tests/passing.test')], change: [], remove: [] }, () => {}, mochaRc),
        ).to.be.rejected;
      });
    });

    describe('file', function () {
      let mochaAddFileSpy: SinonSpy;

      beforeEach(function () {
        mochaAddFileSpy = Sinon.spy(Mocha.prototype, 'addFile');
      });

      it('Expect a file to be added before test files are added', async function () {
        const testModule = require.resolve('../fixtures/tests/passing.test');
        const file = require.resolve('../fixtures/modules/module2.ts');

        const mochaRc: MochaRC = {
          spec: './**/*.test.ts',
          file,
        };

        await run({ add: [testModule], change: [], remove: [] }, () => {}, mochaRc);

        expect(mochaAddFileSpy.firstCall).to.be.calledWith(file);
        expect(mochaAddFileSpy.secondCall).to.be.calledWith(testModule);
      });

      it('Expect files to be added before test files are added', async function () {
        const testModule = require.resolve('../fixtures/tests/passing.test');
        const file = [
          require.resolve('../fixtures/modules/module1.ts'),
          require.resolve('../fixtures/modules/module2.ts'),
        ];

        const mochaRc: MochaRC = {
          spec: './**/*.test.ts',
          file,
        };

        await run({ add: [testModule], change: [], remove: [] }, () => {}, mochaRc);

        expect(mochaAddFileSpy.firstCall).to.be.calledWith(file[0]);
        expect(mochaAddFileSpy.secondCall).to.be.calledWith(file[1]);
        expect(mochaAddFileSpy.thirdCall).to.be.calledWith(testModule);
      });
    });
  });
});
