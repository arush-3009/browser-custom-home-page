export const CURRENT_SCHEMA_VERSION = 2 as const;

export type WorkspaceStatus = 'saved' | 'restoring' | 'open';
export type WorkspaceColor = 'violet' | 'blue' | 'cyan' | 'emerald' | 'amber' | 'rose';
export type TabGroupColor = 'grey' | 'blue' | 'red' | 'yellow' | 'green' | 'pink' | 'purple' | 'cyan' | 'orange';

export type BackgroundId = 'alpine-blue-hour' | 'night-coast' | 'misty-evergreens' | 'midnight' | 'custom';

export interface CustomBackgroundImage {
  dataUrl: string;
  fileName: string;
  width: number;
  height: number;
  size: number;
  updatedAt: string;
}

export interface BackgroundSettings {
  selected: BackgroundId;
  customImage?: CustomBackgroundImage;
}

export interface BrowserHomeSettings {
  background: BackgroundSettings;
  searchEngine: 'google';
}

export interface Category {
  id: string;
  name: string;
  order: number;
  collapsed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Shortcut {
  id: string;
  name: string;
  url: string;
  faviconUrl?: string;
  categoryId: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface SavedMediaState {
  kind: 'audio' | 'video';
  index: number;
  currentTime: number;
  source?: string;
}

export interface SavedPageState {
  scrollX?: number;
  scrollY?: number;
  media?: SavedMediaState[];
}

export interface SavedTab {
  id: string;
  url: string;
  title: string;
  faviconUrl?: string;
  order: number;
  pinned: boolean;
  groupId?: string;
  pageState?: SavedPageState;
}

export interface SavedTabGroup {
  id: string;
  title?: string;
  color: TabGroupColor;
  collapsed: boolean;
  order: number;
}

export interface Workspace {
  id: string;
  name: string;
  icon?: string;
  color: WorkspaceColor;
  status: WorkspaceStatus;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt?: string;
  tabs: SavedTab[];
  groups: SavedTabGroup[];
  activeSavedTabId?: string;
}

export interface BrowserHomeData {
  schemaVersion: typeof CURRENT_SCHEMA_VERSION;
  settings: BrowserHomeSettings;
  categories: Category[];
  shortcuts: Shortcut[];
  workspaces: Workspace[];
}

export type CaptureTarget =
  | { kind: 'new'; name: string; color?: WorkspaceColor }
  | { kind: 'existing'; workspaceId: string };

export interface CaptureWorkspaceRequest {
  type: 'capture-workspace';
  tabIds: number[];
  target: CaptureTarget;
  closeAfterSave: boolean;
}

export interface RestoreWorkspaceRequest {
  type: 'restore-workspace';
  workspaceId: string;
  destination: 'current-window' | 'new-window';
}

export type BackgroundRequest = CaptureWorkspaceRequest | RestoreWorkspaceRequest;

export interface OperationResult {
  ok: boolean;
  message: string;
  warning?: string;
  workspaceId?: string;
  savedCount?: number;
  duplicateCount?: number;
}
