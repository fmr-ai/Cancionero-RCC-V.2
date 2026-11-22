import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SYSTEM_MAIN_IDS,
  addMainCategoryToData,
  addSubcategoryToData,
  createDefaultData,
  deleteMainCategoryFromData,
  deleteSubcategoryFromData,
  filterSongs,
  getSongDisplayCategories,
  getVisibleRepertoires,
  migrateData,
  moveRepertoireInData,
  moveSubcategoryInData,
  renameMainCategoryInData,
  renameSubcategoryInData,
  setRepertoirePinnedInData,
} from './categories';

test('createDefaultData produces valid seeded songbook with 4 system main categories', () => {
  const data = createDefaultData();
  assert.ok(data.songs.length >= 3);
  assert.equal(data.mainCategories.length, 4);
  assert.ok(data.categories.includes('Alabanza'));
  assert.ok(data.categories.includes('Entrada'));
});

test('migrateData upgrades legacy array/flat-category backups cleanly', () => {
  const legacy = {
    songs: [
      {
        id: '1',
        title: 'Canto Antiguo',
        key: 'Do',
        categories: ['Alabanza', 'Cierre de oración', 'MiSubNueva'],
        favorite: true,
        eucaristica: true,
        content: 'C  G\nLetra',
      },
    ],
    categories: ['Alabanza', 'MiSubNueva'],
    repertoires: [{ id: 'r1', name: 'Misa', songIds: ['1'] }],
  };
  const migrated = migrateData(legacy);
  assert.equal(migrated.songs.length, 1);
  assert.ok(migrated.songs[0].categories.includes('Cierre oración'));
  assert.ok(migrated.songs[0].categories.includes('MiSubNueva'));
  assert.ok(migrated.songs[0].mainCategories.includes(SYSTEM_MAIN_IDS.EUCARISTIA));
  assert.ok(migrated.songs[0].mainCategories.includes(SYSTEM_MAIN_IDS.FAVORITAS));
  assert.equal(migrated.repertoires[0].songs[0].id, '1');
});

test('filterSongs filters by main category, subcategory, pending state, and search', () => {
  const data = createDefaultData();
  const favs = filterSongs(data, { activeMainCategoryId: SYSTEM_MAIN_IDS.FAVORITAS });
  assert.ok(favs.every((s) => s.favorite));
  const entrada = filterSongs(data, { activeSubcategories: ['Entrada'] });
  assert.equal(entrada.length, 1);
  assert.equal(entrada[0].title, 'Juntos como hermanos');
  const searched = filterSongs(data, { search: 'hosanna' });
  assert.equal(searched.length, 1);
  assert.equal(searched[0].title, 'Santo es el Señor');
});

test('category CRUD operations prevent duplicates and keep songs synced', () => {
  const data = createDefaultData();
  const addMc = addMainCategoryToData(data, 'Jóvenes', '🔥');
  assert.equal(addMc.ok, true);
  if (!addMc.ok) return;

  const dupMc = addMainCategoryToData(data, 'jovenes');
  assert.equal(dupMc.ok, false);

  const addSub = addSubcategoryToData(data, addMc.mainCategory.id, 'Retiro');
  assert.equal(addSub.ok, true);

  data.songs[0].categories.push('Retiro');
  const renamedSub = renameSubcategoryInData(data, addMc.mainCategory.id, 'Retiro', 'Vigilia');
  assert.equal(renamedSub.ok, true);
  assert.ok(data.songs[0].categories.includes('Vigilia'));

  const movedSub = moveSubcategoryInData(data, addMc.mainCategory.id, SYSTEM_MAIN_IDS.GRUPO, 'Vigilia');
  assert.equal(movedSub.ok, true);
  assert.ok(
    data.mainCategories.find((m) => m.id === SYSTEM_MAIN_IDS.GRUPO)?.subcategories.includes('Vigilia')
  );

  deleteSubcategoryFromData(data, SYSTEM_MAIN_IDS.GRUPO, 'Vigilia');
  assert.equal(data.songs[0].categories.includes('Vigilia'), false);

  const renamedMc = renameMainCategoryInData(data, addMc.mainCategory.id, 'Pastoral Juvenil');
  assert.equal(renamedMc.ok, true);

  const delSys = deleteMainCategoryFromData(data, SYSTEM_MAIN_IDS.GRUPO);
  assert.equal(delSys.ok, false);

  const delCustom = deleteMainCategoryFromData(data, addMc.mainCategory.id);
  assert.equal(delCustom.ok, true);
});

test('repertoire ordering and visibility pin operations work', () => {
  const data = createDefaultData();
  data.repertoires = [
    { id: 'a', name: 'Misa Domingo', songs: [], mode: 'original', uniformKey: 'C', pinnedInBar: true },
    { id: 'b', name: 'Grupo Martes', songs: [], mode: 'original', uniformKey: 'G', pinnedInBar: true },
  ];
  moveRepertoireInData(data, 'b', -1);
  assert.equal(data.repertoires[0].id, 'b');

  setRepertoirePinnedInData(data, 'a', false);
  const vis = getVisibleRepertoires(data);
  assert.equal(vis.length, 1);
  assert.equal(vis[0].id, 'b');
});

test('getSongDisplayCategories hides redundant main category when subcategory is present', () => {
  const data = createDefaultData();
  const s = data.songs.find((x) => x.title === 'Juntos como hermanos')!;
  const labels = getSongDisplayCategories(s, data.mainCategories);
  assert.deepEqual(labels, ['Entrada']);
});
