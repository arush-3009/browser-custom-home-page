import { Download, FileJson, HardDrive, Upload } from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';
import type { BrowserHomeData } from '../../types/domain';
import { validateImport } from '../../lib/storage/migrations';
import { AppDialog } from '../common/Dialog';
import { useToast } from '../common/Toast';
import type { BackgroundSettings } from '../../types/domain';
import { BackgroundPicker } from './BackgroundPicker';

export function SettingsDialog({ open, onOpenChange, data, replaceData, updateBackground }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: BrowserHomeData;
  replaceData: (data: BrowserHomeData) => Promise<void>;
  updateBackground: (background: BackgroundSettings) => Promise<void>;
}) {
  const { show } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<BrowserHomeData | null>(null);
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `browser-home-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
    show('Browser Home data exported');
  };

  const readImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setImportError('');
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('That file is larger than 10 MB and is unlikely to be a Browser Home export.');
      const parsed: unknown = JSON.parse(await file.text());
      setPreview(validateImport(parsed));
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'The selected file is not valid Browser Home JSON.';
      setImportError(message);
      show('Import rejected', { detail: message, tone: 'error' });
    }
  };

  const confirmImport = async () => {
    if (!preview) return;
    setImporting(true);
    try {
      await replaceData(preview);
      setPreview(null);
      onOpenChange(false);
      show('Browser Home data imported');
    } catch (reason) {
      show('Import failed', { detail: reason instanceof Error ? reason.message : 'The data was not replaced.', tone: 'error' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <AppDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Browser Home settings"
        description="Your data stays in Chrome’s local extension storage unless you export it."
        size="large"
        footer={<button type="button" className="button button--primary" onClick={() => onOpenChange(false)}>Done</button>}
      >
        <div className="settings-stack">
          <BackgroundPicker value={data.settings.background} onChange={updateBackground} />
          <div className="settings-summary">
            <HardDrive size={19} />
            <div><strong>Local-first by design</strong><span>{data.shortcuts.length} places · {data.categories.length} sections · {data.workspaces.length} workspaces</span></div>
          </div>
          <section className="settings-block">
            <div><h3>Your data</h3><p>Keep a portable JSON backup, or move Browser Home to another Chrome profile.</p></div>
            <div className="settings-actions">
              <button type="button" className="button button--quiet" onClick={exportData}><Download size={16} />Export JSON</button>
              <button type="button" className="button button--quiet" onClick={() => inputRef.current?.click()}><Upload size={16} />Import JSON</button>
              <input ref={inputRef} type="file" accept="application/json,.json" hidden onChange={(event) => void readImport(event)} />
            </div>
            {importError && <p className="form-error" role="alert">{importError}</p>}
          </section>
        </div>
      </AppDialog>

      <AppDialog
        open={Boolean(preview)}
        onOpenChange={(nextOpen) => { if (!nextOpen) setPreview(null); }}
        title="Replace your Browser Home data?"
        description="The import is valid. Review its contents before replacing what is currently stored."
        size="small"
        footer={<>
          <button type="button" className="button button--ghost" onClick={() => setPreview(null)}>Cancel</button>
          <button type="button" className="button button--danger" onClick={() => void confirmImport()} disabled={importing}>{importing ? 'Replacing…' : 'Replace existing data'}</button>
        </>}
      >
        {preview && <div className="import-preview"><FileJson size={22} /><div><strong>{preview.shortcuts.length} places</strong><span>in {preview.categories.length} sections</span></div><div><strong>{preview.workspaces.length} workspaces</strong><span>with {preview.workspaces.reduce((sum, workspace) => sum + workspace.tabs.length, 0)} saved tabs</span></div></div>}
        <p className="notice notice--danger">This replaces your current places and workspaces. Export first if you may want to restore them.</p>
      </AppDialog>
    </>
  );
}
