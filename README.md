# Browser Home

Browser Home is a local-first Chrome extension that turns the New Tab page into a calm visual operating layer for the browser.

It separates two ideas that normal bookmark pages tend to mix together:

- **Places** are websites you repeatedly go to. They remain visible as favicon-forward shortcuts arranged into personal sections.
- **Workspaces** are activities you consciously put away. Each one preserves a selected collection of tabs so it can be restored later.

There are no accounts, cloud services, analytics, telemetry, or remote background images. Browser Home stores its data in `chrome.storage.local` in the current Chrome profile.

## Technology

- WXT 0.21 and Chrome Manifest V3
- React 19 and strict TypeScript 6
- Tailwind CSS 4 plus a small product-specific design system
- dnd-kit for pointer and keyboard drag-and-drop
- Radix UI dialogs, menus, selects, and tooltips
- Lucide React icons
- Zod for persisted-data and import validation
- Vitest for domain and migration tests

## Project structure

```text
entrypoints/
  background.ts            Capture/restore service worker
  newtab/                  Chrome New Tab replacement
  popup/                   Toolbar capture interface
components/
  common/                  Accessible shared UI
  places/                  Sections, shortcuts, and drag/drop
  workspaces/              Workspace cards and management
  settings/                Import/export and local-data controls
features/
  backgrounds/              Presets and local upload processing
  places/operations.ts     Pure place/category operations
  workspaces/              Pure workspace logic and Chrome orchestration
lib/
  chrome/                  Chrome messaging, favicons, and page state
  storage/                 Defaults, schema, migrations, repository, hook
  utils/                   IDs, URLs, and date presentation
types/domain.ts            Persisted and Chrome-facing domain types
styles/globals.css         Visual foundation and responsive design
tests/                     Nontrivial domain, validation, and migration tests
public/icon/               Extension and toolbar icons
public/backgrounds/        Original built-in photo backgrounds
```

React components do not call `chrome.storage.local` throughout the tree. They use a storage repository and domain operations; capture and restoration run through the background service worker.

## Install dependencies

Requirements: Node.js 20 or newer and a current Chrome installation.

```bash
npm install
```

The committed `package-lock.json` keeps installs reproducible.

## Development mode

```bash
npm run dev
```

WXT watches the source and generates a development extension in:

```text
.output/chrome-mv3-dev
```

Keep the command running. If WXT can launch its own development profile, it will do so; otherwise load that development folder manually using the instructions below. Source edits rebuild automatically, though Chrome may still require an extension reload for service-worker or manifest changes.

## Production build

```bash
npm run build
```

Load this exact generated folder in Chrome:

```text
.output/chrome-mv3
```

From this repository, its absolute path is:

```text
/Users/arushhanda/dev/projects/browser-home-page/.output/chrome-mv3
```

Do not select `.output` itself, and do not select the source directory.

## Load Browser Home as an unpacked extension

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode** in the upper-right corner.
3. Click **Load unpacked**.
4. Choose `.output/chrome-mv3` for the production build, or `.output/chrome-mv3-dev` while `npm run dev` is running.
5. Open a new tab. Chrome now uses Browser Home instead of its default New Tab page.
6. Open Chrome’s Extensions menu (the puzzle-piece icon), find **Browser Home**, and click its pin icon. The pinned toolbar icon is the workspace capture entry point.

If Browser Home was already loaded and you rebuild it, return to `chrome://extensions` and click the reload icon on its card. Existing Browser Home data remains in Chrome local extension storage.

## Places

Places are persistent website shortcuts.

- On a fresh install, click **Add your first website**. The first place and first section are created together.
- Use **Add place** inside a section to create more shortcuts.
- A place accepts a name and an `http://` or `https://` address. Missing schemes are normalized to `https://`.
- Chrome’s built-in extension favicon endpoint supplies the site image. No third-party favicon service is contacted. If Chrome cannot obtain an icon, Browser Home shows a clean initial fallback.
- Hover or keyboard-focus a place to reveal its menu for editing, opening in a new tab, or removal.
- Drag a place to reorder it or move it into another section. dnd-kit also supplies keyboard dragging through the drag handle.

Sections can be created, renamed, reordered, collapsed, and deleted. Deleting a non-empty section always opens a dialog: move its places to another section, explicitly delete the contents too, or cancel. No browser `alert()` or silent cascade deletion is used.

The launcher uses responsive, auto-filling grids. Sections keep larger collections navigable rather than forcing every shortcut into one giant surface.

## Search

The central field submits normal text to Google Search in the current tab. Press `/` while focus is not already in a form field to focus Browser Home search. Browser-native shortcuts such as Cmd/Ctrl+L are not intercepted.

## Backgrounds

Open **Customize Browser Home** from the settings icon in the upper-right corner of the New Tab page. Background changes apply immediately and persist in `chrome.storage.local`.

Browser Home includes four local choices:

- **Alpine blue hour** — the default photographic scene;
- **Night coast**;
- **Misty evergreens**;
- **Midnight atmosphere** — the original abstract gradient.

The three photographs are original, extension-bundled WebP assets under `public/backgrounds`; the page never fetches them from a remote image host. They use a fixed full-viewport `background-size: cover` layer with controlled saturation, a readability scrim, a darker lower-page fade, vignette, and subtle texture.

Choose **Upload photo** to use a PNG, JPEG, or WebP from the computer. Browser Home requires at least 800 × 450 pixels, accepts source files up to 30 MB, scales the longest edge to at most 2560 pixels, and converts the result to a high-quality WebP in the New Tab page. The processed image—not the source file—is embedded in Browser Home settings and stored locally. If the storage write fails, the prior background remains selected.

## Capture a workspace

Click the pinned Browser Home toolbar icon. The popup lists tabs in the current Chrome window with a checkbox, favicon, title, domain, and pinned state.

1. Select tabs individually, use **Select all**, or start with one tab and use the same-domain helper.
2. Choose **New workspace** and enter a name, or choose **Add to existing**.
3. Select one of the two intentionally separate actions:

   - **Save workspace — Leave tabs open** writes the workspace and does not close anything.
   - **Save & close tabs — Close only after save** writes and verifies the data first, then asks Chrome to close the selected tabs.

The close operation lives in the background service worker. If capture, schema validation, the storage write, or the verification read fails, Browser Home returns an error and does not issue any tab-close request. Tabs that disappear during capture are skipped without invalidating the remaining selection.

When adding to an existing workspace, canonical exact duplicate URLs are skipped. The result explains how many tabs were added and whether duplicates or best-effort page positions were skipped.

## Resume and manage workspaces

Saved workspaces appear below Places as activity cards. Each card shows its tab count, representative favicons, a short structural preview, recency, and a prominent **Resume** action.

- **Resume** opens the workspace in a new window by default.
- The workspace menu can instead open it in the current window.
- **Inspect contents** shows every saved tab in restoration order.
- In the contents dialog, individual tabs can be opened, removed, or moved earlier/later with keyboard-accessible buttons.
- **Add open tabs** opens the capture popup where Chrome supports `chrome.action.openPopup`; otherwise Browser Home tells you to use the pinned toolbar icon.
- Rename and delete are secondary menu actions. Workspace deletion always requires confirmation.

Restoration creates tabs in saved order, restores pinned state, rebuilds native Chrome tab groups and their title/color/collapsed metadata where Chrome permits it, and activates the tab that was active when the workspace was captured. A malformed or Chrome-refused URL is skipped without stopping the rest of the workspace. Concurrent duplicate restore requests for the same workspace are rejected while the first is in progress.

The versioned model already has a workspace status field and last-opened timestamp so future active/recent workspace awareness can be added without replacing the storage format. This version deliberately does not claim that a workspace is currently open after Chrome or the extension restarts, because that cannot be tracked reliably without a broader session model.

## Best-effort page state

For accessible `http://` and `https://` top-level pages, Browser Home attempts to save:

- horizontal and vertical scroll position;
- every top-level HTML5 audio/video element’s index, kind, source hint, and current time.

On restore it waits for the tab to complete loading, restores scroll position, and seeks media after metadata is available. It never calls `play()`, so media is not forced to autoplay.

This is intentionally best effort. Chrome internal pages, restricted URLs, cross-origin frames, inaccessible players, extension pages, discarded pages, pages that replace their own scroll state, authentication flows, and custom media players may block inspection or restoration. CSP/site restrictions and timing can also interfere. Those failures are logged for debugging but never prevent the URL itself from being saved or reopened.

## Import and export

Open the settings button at the top-right of the New Tab page.

- **Export JSON** downloads the complete versioned Browser Home data document.
- **Import JSON** reads at most 10 MB, parses it safely, runs schema/migration validation, checks IDs and cross-references, and rejects malformed content with a useful error.
- A valid import is not applied immediately. Browser Home previews the number of places, sections, workspaces, and tabs, then requires explicit confirmation before replacing current data.

Unversioned/schema-version-0 place exports and schema-version-1 Browser Home data are migrated to the current schema where possible. Version 1 installs move to the new Alpine default while retaining the original Midnight treatment as a selectable preset. Unknown future versions are rejected rather than guessed at.

## Data storage

The root record is stored under one namespaced key in `chrome.storage.local` and follows this versioned shape:

```text
BrowserHomeData
  schemaVersion
  settings
    background selection
    optional embedded custom image
  categories[]
  shortcuts[]
  workspaces[]
    tabs[]
    groups[]
```

Stable UUID-based IDs are used for persisted identity. Temporary Chrome `tabId` and native group IDs are used only while a capture/restore operation is running and are never treated as durable identity.

IndexedDB is not used. Uploaded backgrounds are resized and compressed before being stored as an embedded WebP data URL in the versioned settings record, which also keeps JSON export/import complete.

## Chrome permissions

The production manifest requests only the capabilities used by the implemented features:

- **`storage`** — stores versioned Browser Home settings, selected/custom background, places, sections, and workspaces locally in the current Chrome profile.
- **`tabs`** — reads the current window’s tab titles, URLs, ordering, pinned/active state, and favicons; closes selected tabs only after a verified save; and recreates saved tabs/windows.
- **`tabGroups`** — reads native group title/color/collapsed state and rebuilds those groups during restore.
- **`scripting`** — injects the small best-effort scroll/media capture and restoration functions into eligible pages.
- **`favicon`** — uses Chrome’s documented `_favicon` extension endpoint to render crisp website icons without a third-party favicon API.
- **Host access for `http://*/*` and `https://*/*`** — allows the scripting permission to inspect and restore state on normal web pages. Browser Home checks the URL first and catches denied injections. It does not inject into `chrome://` or other restricted schemes.

Browser Home does not request history, bookmarks, downloads, identity, geolocation, notifications, or remote-code permissions.

## Quality checks

```bash
npm run check
```

This runs strict TypeScript compilation, ESLint with zero warnings allowed, and the Vitest suite. The tests focus on persisted schema validation, legacy migration, malformed import rejection, workspace URL deduplication/merging, saved-tab order, group cleanup, and place movement.

Build separately with:

```bash
npm run build
```

To create a distributable WXT zip:

```bash
npm run zip
```

## Debugging

### New Tab page

Open a Browser Home new tab, right-click the page, and choose **Inspect**. Use the Console for React/storage errors and the Elements panel for layout or focus-state inspection.

### Toolbar popup

Open the Browser Home toolbar popup, right-click inside it, and choose **Inspect**. The popup closes when it loses focus, so keep the popup DevTools window open while testing.

### Background service worker

Open `chrome://extensions`, find Browser Home, and click the **service worker** link under **Inspect views**. This console includes capture, page-state, tab-group, restore, and storage failures.

After changing the manifest or background entrypoint, rebuild/reload the extension before retesting. After changing UI source during `npm run dev`, WXT normally refreshes the extension page; if state looks stale, reload Browser Home from `chrome://extensions` and open a fresh New Tab.

## Known limitations

- Arbitrary webpages cannot be frozen. Browser Home restores URLs and best-effort top-level scroll/media state, not form contents, JavaScript memory, iframe state, login sessions, or custom player state.
- Saved page state is captured only when the page and Chrome permit script injection. Restricted pages still remain in the saved workspace when they have a URL.
- Chrome controls final pinned-tab placement and may adjust impossible saved ordering, such as an unpinned tab before a pinned one.
- Native tab-group restoration is best effort. Chrome can reject grouping for pinned tabs or URLs it refuses to open.
- Workspaces are snapshots, not live synchronization. Adding tabs later appends new, nonduplicate URLs; it does not continuously mirror an open window.
- Browser Home is intentionally profile-local. Use JSON export/import to move or back up data; there is no account or cloud sync.
- Custom backgrounds are optimized to a maximum 2560-pixel edge and 5 MB encoded image size to remain within Chrome local-storage limits. Extremely detailed images may need a smaller source if they cannot be compressed safely.

## Development-only fixture

`lib/storage/demo-data.ts` contains generic visual-QA content. It is reachable only in a development, non-extension preview with a `?demo` query and is never written to Chrome storage or shown to production users. Fresh installs always receive the intentional empty states.
