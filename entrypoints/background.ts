import type { BackgroundRequest, OperationResult } from '../types/domain';
import { captureWorkspace, restoreWorkspace } from '../features/workspaces/chrome-service';
import { STORAGE_KEY } from '../lib/storage/repository';
import { createDefaultData } from '../lib/storage/defaults';

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(() => {
    void chrome.storage.local.get(STORAGE_KEY).then((stored) => {
      if (stored[STORAGE_KEY] === undefined) {
        return chrome.storage.local.set({ [STORAGE_KEY]: createDefaultData() });
      }
    }).catch((error) => console.error('Browser Home could not initialize storage.', error));
  });

  chrome.runtime.onMessage.addListener((request: BackgroundRequest, _sender, sendResponse: (result: OperationResult) => void) => {
    if (request.type === 'capture-workspace') {
      void captureWorkspace(request.tabIds, request.target, request.closeAfterSave).then(sendResponse);
      return true;
    }
    if (request.type === 'restore-workspace') {
      void restoreWorkspace(request.workspaceId, request.destination).then(sendResponse);
      return true;
    }
    return false;
  });
});
