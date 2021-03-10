import { expect } from 'chai';

describe('Fail tests', function () {
  describe('Nested failing test', function () {
    it('Failing test 1', function () {
      expect(true).to.be.false;
    });

    it('Failing test 2', function () {
      expect(true).to.be.false;
    });

    it('Failing test 3', function () {
      expect(true).to.be.false;
    });

    it('Failing test 4', function () {
      expect(true).to.be.false;
    });

    it('Failing test 5', function () {
      expect(true).to.be.false;
    });
  });

  it('Failing test 6', function () {
    expect(true).to.be.false;
  });

  it('Failing test 7', function () {
    expect(true).to.be.false;
  });

  it('Failing test 8', function () {
    expect(true).to.be.false;
  });
});
