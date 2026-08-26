import { browserHomeDataSchema } from '../lib/storage/schema';
import { validateImport } from '../lib/storage/migrations';
import { validData } from './fixtures';

describe('Browser Home schema', () => {
  it('accepts valid exported data', () => {
    expect(browserHomeDataSchema.safeParse(validData()).success).toBe(true);
  });

  it('rejects shortcuts that point to a missing category', () => {
    const data = validData();
    data.shortcuts[0]!.categoryId = 'missing';
    expect(browserHomeDataSchema.safeParse(data).success).toBe(false);
  });

  it('rejects an active tab reference that is not in the workspace', () => {
    const data = validData();
    data.workspaces[0]!.activeSavedTabId = 'missing';
    expect(() => validateImport(data)).toThrow(/supported|migrated/i);
  });

  it('rejects malformed imports without changing them into empty data', () => {
    expect(() => validateImport({ schemaVersion: 99, shortcuts: 'nope' })).toThrow(/supported/i);
  });

  it('requires embedded image data when the custom background is selected', () => {
    const data = validData();
    data.settings.background = { selected: 'custom' };
    expect(browserHomeDataSchema.safeParse(data).success).toBe(false);
  });
});
