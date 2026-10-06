import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateCatalog, type CatalogSeed } from '../../src/database/seed.js';

const original: CatalogSeed = JSON.parse(await readFile(new URL('../../seeds/catalog.json', import.meta.url), 'utf8'));
test('curated catalog has one owner per skill, unique names in all locales and no empty groups', () => {
  assert.doesNotThrow(() => validateCatalog(original));
  assert.equal(original.categories.filter(c => !c.parent_code).length, 10);
  assert.equal(original.categories.length, 49);
  assert.equal(original.skills.length, 128);
  const codes = new Set(original.skills.map(s => s.code));
  for (const retired of ['nail_care', 'makeup', 'house_cleaning', 'office_chair_cleaning', 'upholstered_chair_cleaning', 'sneaker_cleaning', 'leather_shoe_cleaning', 'camera_installation', 'moving_loading', 'pet_spa_pickup', 'pet_spa_dropoff']) assert.ok(!codes.has(retired), retired);
  assert.equal(original.skills.find(s => s.code === 'camera_mounting')!.category_codes[0], 'installation_it_camera_systems');
});
test('catalog validation rejects malformed or ambiguous ownership before any DB mutation', () => {
  const mutations: ((data: CatalogSeed) => void)[] = [
    d => { d.categories = []; },
    d => { d.skills = []; },
    d => { d.categories.push(d.categories[0]); },
    d => { d.categories[10].parent_code = 'missing'; },
    d => { d.categories[10].scope_vi = ''; },
    d => { d.categories[11].parent_code = d.categories[10].code; },
    d => { d.skills.push(d.skills[0]); },
    d => { d.skills[0].code = 'invalid code'; },
    d => { d.skills[0].translations.en = ' '; },
    d => { d.skills[1].translations.ja = d.skills[0].translations.ja; },
    d => { d.skills[0].category_codes = []; },
    d => { d.skills[0].category_codes.push(d.categories[11].code); },
    d => { d.skills[0].category_codes = ['missing']; },
    d => { d.skills[0].category_codes = [d.categories[0].code]; },
    d => { d.skills = d.skills.filter(s => !s.category_codes.includes(d.categories[10].code)); },
    d => { d.categories.push({code:'empty',name_vi:'Trống',parent_code:null,translations:{en:'Empty',ja:'空'}}); },
  ];
  for (const mutate of mutations) {
    const data = structuredClone(original); mutate(data); assert.throws(() => validateCatalog(data));
  }
});
