import { migrateData } from '../lib/storage/migrations';

describe('storage migrations', () => {
  it('migrates a legacy unversioned places export to schema version 2', () => {
    const migrated = migrateData({
      categories: [{ id: 'old-cat', name: 'Study' }],
      shortcuts: [{ id: 'old-place', name: 'Example', url: 'https://example.com/', categoryId: 'old-cat' }],
    });
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.categories[0]).toMatchObject({ id: 'old-cat', name: 'Study', order: 0, collapsed: false });
    expect(migrated.shortcuts[0]).toMatchObject({ id: 'old-place', categoryId: 'old-cat', order: 0 });
  });

  it('migrates schema version 1 data to the new photo background default', () => {
    const current = migrateData({
      schemaVersion: 1,
      settings: { background: 'midnight', searchEngine: 'google' },
      categories: [],
      shortcuts: [],
      workspaces: [],
    });
    expect(current.schemaVersion).toBe(2);
    expect(current.settings.background).toEqual({ selected: 'alpine-blue-hour' });
  });

  it('drops malformed legacy rows but preserves valid ones', () => {
    const migrated = migrateData({
      schemaVersion: 0,
      categories: [{ id: 'cat', name: 'Keep' }, { no: 'name' }],
      shortcuts: [{ name: 'Keep', url: 'https://example.com', categoryId: 'cat' }, { name: 7 }],
    });
    expect(migrated.categories).toHaveLength(1);
    expect(migrated.shortcuts).toHaveLength(1);
  });
});
