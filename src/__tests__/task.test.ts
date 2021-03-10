import { expect, use } from 'chai';
import { createSandbox, SinonStub } from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as Mocha from 'mocha';
import * as chalk from 'chalk';

import { run, MochaRC } from '../index';
import * as utils from '../utils';
import { createFilePaths, createMixedFilePaths, createTestFilePaths } from './util/util';

use(sinonChai);

describe('Task', function () {
  const Sinon = createSandbox();

  let loadOptionsStub: SinonStub;

  beforeEach(function () {
    loadOptionsStub = Sinon.stub(utils, 'loadOptions');
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

    it('Expect to get a result object with failures', async function () {
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
});
