import { expect } from 'chai';

describe('Test test', function () {
  it('Pass the test', function () {
    expect(true).to.be.true;
  });

  it('Fail the test', function () {
    expect(true).to.be.false;
  });
});
