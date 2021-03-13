import { expect, use } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { ChangedPaths } from 'perkulator';
import { createSandbox } from 'sinon';
import * as Mocha from 'mocha';
import { MochaRC, run } from '../../index';

use(chaiAsPromised);

describe('Perkulator Task Mocha', function () {
  const Sinon = createSandbox();

  afterEach(function () {
    Sinon.restore();
  });

  describe('run', function () {
    it('Expect to finish with results', function () {
      const changedPaths: ChangedPaths = {
        add: [require.resolve('../fixtures/tests/passing.test.ts')],
        remove: [],
        change: [],
      };

      const mocharc: MochaRC = {
        extension: '.test.ts',
        spec: './**/*',
      };

      return expect(run(changedPaths, () => {}, mocharc))
        .to.eventually.have.nested.property('results[0]')
        .match(/passed/);
    });

    it('Expect to finish with failed tests', function () {
      const changedPaths: ChangedPaths = {
        add: [require.resolve('../fixtures/tests/failing.test.ts')],
        remove: [],
        change: [],
      };

      const mocharc: MochaRC = {
        extension: '.test.ts',
        spec: './**/*',
      };

      return expect(run(changedPaths, () => {}, mocharc)).to.eventually.have.keys('errors', 'results');
    });

    it('Expect child module to trigger root test modules', async function () {
      const changedTestPaths: ChangedPaths = {
        add: [
          require.resolve('../fixtures/cache/parent.test.ts'),
          require.resolve('../fixtures/cache/parent2.test.ts'),
        ],
        remove: [],
        change: [],
      };
      const changedChildPaths: ChangedPaths = {
        add: [require.resolve('../fixtures/cache/grandchild.ts')],
        remove: [],
        change: [],
      };
      const mocharc: MochaRC = {
        extension: '.test.ts',
        spec: './**/*',
      };
      const mochaAddFileSpy = Sinon.spy(Mocha.prototype, 'addFile');

      await run(changedTestPaths, () => {}, mocharc);
      mochaAddFileSpy.resetHistory();
      await run(changedChildPaths, () => {}, mocharc);

      expect(mochaAddFileSpy).to.be.calledWith(changedTestPaths.add[0]).and.calledWith(changedTestPaths.add[1]);
    });

    it('Expect removed test module to not be triggered by child module', async function () {
      const changedTestPaths: ChangedPaths = {
        add: [require.resolve('../fixtures/cache/parent.test.ts')],
        remove: [],
        change: [],
      };
      const changedChildPaths: ChangedPaths = {
        add: [require.resolve('../fixtures/cache/grandchild.ts')],
        remove: [require.resolve('../fixtures/cache/parent.test.ts')],
        change: [],
      };
      const mocharc: MochaRC = {
        extension: '.test.ts',
        spec: './**/*',
      };

      await run(changedTestPaths, () => {}, mocharc);
      return expect(run(changedChildPaths, () => {}, mocharc))
        .to.eventually.have.nested.property('results[0]')
        .and.match(/Skipped. No changes to test files detected./);
    });
  });
});
