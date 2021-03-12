import { expect } from 'chai';
import { child } from './child';

it('parent', function () {
  expect(child).to.equal('grandchild');
});
