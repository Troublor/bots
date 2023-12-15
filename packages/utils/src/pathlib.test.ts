import { describe, test } from 'node:test';
import assert from 'node:assert';
import { Path } from './pathlib.js';

describe('pathlib', () => {
  test('relative path calculation', () => {
    const src = '/a/b/c/d';
    const dest = '/a/b/e/f';
    const srcPath = new Path(src);
    const destPath = new Path(dest);
    const relativePath = srcPath.relativeTo(destPath);
    assert.equal(relativePath.toString(), '../../e/f');
  });
});
