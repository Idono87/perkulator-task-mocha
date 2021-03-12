import { expect } from 'chai';
import { grandchild } from './grandchild';

it('parent', function () {
  expect(grandchild).to.equal('grandchild');
});
