import type { BackgroundRequest, OperationResult } from '../../types/domain';

export async function sendBackgroundRequest(request: BackgroundRequest): Promise<OperationResult> {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
    return { ok: false, message: 'Tab operations are available when Browser Home is loaded as a Chrome extension.' };
  }
  try {
    const result = await chrome.runtime.sendMessage<BackgroundRequest, OperationResult>(request);
    return result ?? { ok: false, message: 'The Browser Home background service did not respond.' };
  } catch (error) {
    console.error('Browser Home background request failed.', error);
    return { ok: false, message: 'The Browser Home background service could not be reached. Reload the extension and try again.' };
  }
}
