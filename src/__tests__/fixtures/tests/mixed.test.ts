import { expect } from 'chai';

describe('Mixed tests', function () {
  it('Failing test 1', function () {
    expect(true).to.be.false;
  });

  it('Passing test 1', function () {});

  it('Failing test 2', function () {
    expect(true).to.be.false;
  });

  it('Passing test 3', function () {});

  it('Failing test 3', function () {
    expect(true).to.be.false;
  });
});
