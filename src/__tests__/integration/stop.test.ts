import { expect, use } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { ChangedPaths } from 'perkulator';
import { MochaRC, run, stop } from '../../index';

use(chaiAsPromised);

describe('Perkulator Task Mocha', function () {
  describe('stop', function () {
    it('Expect run to be aborted', function () {
      const changedPaths: ChangedPaths = {
        add: [require.resolve('../fixtures/tests/lengthy.test.ts')],
        remove: [],
        change: [],
      };
      const mocharc: MochaRC = {
        extension: '.test.ts',
        spec: './**/*',
      };

      const results = run(changedPaths, () => {}, mocharc);
      setImmediate(stop);

      return expect(results)
        .to.eventually.have.nested.property('results[0]')
        .and.match(/10 skipped/);
    });
  });
});
