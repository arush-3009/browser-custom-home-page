import type { BackgroundRequest, OperationResult } from '../types/domain';
import { captureWorkspace, restoreWorkspace } from '../features/workspaces/chrome-service';
import { initializeData } from '../lib/storage/repository';

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(() => {
    void initializeData().catch((error: unknown) => console.error('Browser Home could not initialize storage.', error));
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
