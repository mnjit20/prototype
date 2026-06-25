import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { enrichFacets } from '../src/normalize';

describe('enrichFacets', () => {
  it('maps subject aliases and grades', () => {
    const facets = enrichFacets(['reli', 'ethik', 'KLASSE 5', '9', 'geschicte']);
    assert.ok(facets.includes('religion'));
    assert.ok(facets.includes('geschichte'));
    assert.ok(facets.includes('klasse-5'));
    assert.ok(facets.includes('klasse-9'));
  });

  it('canonicalizes the largest subject clusters and their misspellings', () => {
    assert.ok(enrichFacets(['de']).includes('deutsch'));
    assert.ok(enrichFacets(['deutsh']).includes('deutsch'));
    assert.ok(enrichFacets(['pädagogig']).includes('paedagogik'));
    assert.ok(enrichFacets(['erziehungswissenschaft']).includes('paedagogik'));
    assert.ok(enrichFacets(['phil']).includes('philosophie'));
    assert.ok(enrichFacets(['matematik']).includes('mathematik'));
    assert.ok(enrichFacets(['nawi']).includes('naturwissenschaften'));
  });
});
