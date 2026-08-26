import { CURRENT_SCHEMA_VERSION, type BrowserHomeData } from '../../types/domain';

export function createDefaultData(): BrowserHomeData {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    settings: {
      background: { selected: 'alpine-blue-hour' },
      searchEngine: 'google',
    },
    categories: [],
    shortcuts: [],
    workspaces: [],
  };
}
