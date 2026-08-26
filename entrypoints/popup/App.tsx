import { Archive, Check, LoaderCircle, Plus, Save, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Brand } from '../../components/common/Brand';
import { Favicon } from '../../components/common/Favicon';
import { SelectField } from '../../components/common/SelectField';
import { displayDomain } from '../../lib/utils/url';
import { sendBackgroundRequest } from '../../lib/chrome/messages';
import { useBrowserHomeData } from '../../lib/storage/use-data';

type CaptureMode = 'new' | 'existing';

export default function App() {
  const { data } = useBrowserHomeData();
  const [tabs, setTabs] = useState<chrome.tabs.Tab[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [mode, setMode] = useState<CaptureMode>('new');
  const [name, setName] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<'save' | 'close' | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string; detail?: string } | null>(null);

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
      if (import.meta.env.DEV && new URLSearchParams(location.search).has('demo')) {
        const urls: Array<[string, string]> = [
          ['Camera shots and framing — StudioBinder', 'https://www.studiobinder.com/blog/camera-shots/'],
          ['Blocking a scene — StudioBinder', 'https://www.studiobinder.com/blog/blocking-and-staging/'],
          ['Shot sizes explained', 'https://www.studiobinder.com/blog/types-of-camera-shots-sizes-in-film/'],
          ['Cinematography fundamentals', 'https://youtube.com/watch?v=example'],
          ['Browser Home — project', 'https://github.com/example/browser-home'],
          ['Course notes', 'https://notion.so/example'],
        ];
        setTabs(urls.map(([title, url], index) => ({
          id: index + 1,
          index,
          windowId: 1,
          groupId: -1,
          title,
          url,
          active: index === 0,
          pinned: false,
          highlighted: index === 0,
          selected: index === 0,
          incognito: false,
          discarded: false,
          frozen: false,
          autoDiscardable: true,
          audible: false,
          lastAccessed: Date.now(),
        })));
      }
      setLoading(false);
      return;
    }
    void chrome.tabs.query({ currentWindow: true }).then((currentTabs) => {
      setTabs(currentTabs.sort((a, b) => a.index - b.index));
      setLoading(false);
    }).catch((error: unknown) => {
      console.error('Browser Home could not list tabs.', error);
      setResult({ ok: false, message: 'Could not read tabs in this window.' });
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!workspaceId && data?.workspaces[0]) setWorkspaceId(data.workspaces[0].id);
    if (mode === 'existing' && data?.workspaces.length === 0) setMode('new');
  }, [data, mode, workspaceId]);

  const selectedIds = useMemo(() => [...selected], [selected]);
  const selectedTabs = tabs.filter((tab) => tab.id !== undefined && selected.has(tab.id));
  const firstSelectedDomain = selectedTabs[0]?.url ? displayDomain(selectedTabs[0].url) : null;

  const toggle = (tabId: number) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(tabId)) next.delete(tabId);
    else next.add(tabId);
    return next;
  });

  const selectSameDomain = () => {
    if (!firstSelectedDomain) return;
    setSelected((current) => {
      const next = new Set(current);
      tabs.forEach((tab) => {
        if (tab.id !== undefined && tab.url && displayDomain(tab.url) === firstSelectedDomain) next.add(tab.id);
      });
      return next;
    });
  };

  const save = async (closeAfterSave: boolean) => {
    if (selectedIds.length === 0) return;
    if (mode === 'new' && !name.trim()) {
      setResult({ ok: false, message: 'Give this workspace a name.' });
      return;
    }
    if (mode === 'existing' && !workspaceId) {
      setResult({ ok: false, message: 'Choose a workspace.' });
      return;
    }
    setSaving(closeAfterSave ? 'close' : 'save');
    setResult(null);
    const response = await sendBackgroundRequest({
      type: 'capture-workspace',
      tabIds: selectedIds,
      target: mode === 'new' ? { kind: 'new', name: name.trim() } : { kind: 'existing', workspaceId },
      closeAfterSave,
    });
    setSaving(null);
    setResult({ ok: response.ok, message: response.message, ...(response.warning ? { detail: response.warning } : {}) });
    if (response.ok) {
      setSelected(new Set());
      if (mode === 'new') setName('');
    }
  };

  return (
    <div className="popup-shell">
      <header className="popup-header">
        <Brand compact />
        <span className="popup-header__context">Capture</span>
      </header>

      <main className="popup-main">
        <section className="popup-tabs" aria-labelledby="current-tabs-title">
          <div className="popup-section-heading">
            <div><h1 id="current-tabs-title">Current window</h1><span>{tabs.length} open {tabs.length === 1 ? 'tab' : 'tabs'}</span></div>
            <div className="text-actions">
              <button type="button" onClick={() => setSelected(new Set(tabs.flatMap((tab) => tab.id === undefined ? [] : [tab.id])))}>Select all</button>
              <button type="button" onClick={() => setSelected(new Set())}>None</button>
            </div>
          </div>

          {firstSelectedDomain && <button type="button" className="domain-helper" onClick={selectSameDomain}><Plus size={13} />Select all from {firstSelectedDomain}</button>}
          <div className="tab-picker" aria-busy={loading}>
            {loading && <div className="popup-loading"><LoaderCircle size={18} className="spin" />Reading this window…</div>}
            {!loading && tabs.length === 0 && <div className="popup-loading">No tabs are available in this window.</div>}
            {tabs.map((tab) => {
              const id = tab.id;
              if (id === undefined) return null;
              const checked = selected.has(id);
              const url = tab.url ?? tab.pendingUrl ?? '';
              return (
                <label key={id} className={`tab-option ${checked ? 'is-selected' : ''}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggle(id)} />
                  <span className="custom-checkbox" aria-hidden="true">{checked && <Check size={13} />}</span>
                  <Favicon url={url} name={tab.title} source={tab.favIconUrl} size="small" />
                  <span className="tab-option__copy"><strong>{tab.title || 'Untitled tab'}</strong><small>{displayDomain(url)}</small></span>
                  {tab.pinned && <span className="tab-badge">Pinned</span>}
                </label>
              );
            })}
          </div>
        </section>

        <section className="capture-panel" aria-labelledby="save-heading">
          <div className="capture-panel__heading"><span><Archive size={17} /></span><div><h2 id="save-heading">Put these tabs away</h2><p>Save their structure so you can resume later.</p></div></div>
          {data && data.workspaces.length > 0 && (
            <div className="capture-mode" role="tablist" aria-label="Save destination">
              <button type="button" role="tab" aria-selected={mode === 'new'} className={mode === 'new' ? 'is-active' : ''} onClick={() => setMode('new')}>New workspace</button>
              <button type="button" role="tab" aria-selected={mode === 'existing'} className={mode === 'existing' ? 'is-active' : ''} onClick={() => setMode('existing')}>Add to existing</button>
            </div>
          )}
          {mode === 'new' ? (
            <label className="field-label">Workspace name<input className="text-field" value={name} onChange={(event) => setName(event.target.value)} placeholder="Filmmaking" maxLength={120} /></label>
          ) : data && (
            <label className="field-label">Workspace<SelectField label="Choose a workspace" value={workspaceId} onValueChange={setWorkspaceId} options={data.workspaces.map((workspace) => ({ value: workspace.id, label: `${workspace.name} · ${workspace.tabs.length} tabs` }))} /></label>
          )}
          <div className="capture-count"><span>{selected.size} selected</span>{mode === 'existing' && <small>Exact duplicate URLs will be skipped.</small>}</div>

          {result && <div className={`capture-result ${result.ok ? 'capture-result--success' : 'capture-result--error'}`} role={result.ok ? 'status' : 'alert'}>{result.ok ? <Check size={16} /> : <X size={16} />}<span><strong>{result.message}</strong>{result.detail && <small>{result.detail}</small>}</span></div>}

          <div className="capture-actions">
            <button type="button" className="button button--secondary popup-save" onClick={() => void save(false)} disabled={saving !== null || selected.size === 0}><Save size={16} />{saving === 'save' ? 'Saving…' : 'Save workspace'}<small>Leave tabs open</small></button>
            <button type="button" className="button button--primary popup-save" onClick={() => void save(true)} disabled={saving !== null || selected.size === 0}><Archive size={16} />{saving === 'close' ? 'Saving first…' : 'Save & close tabs'}<small>Close only after save</small></button>
          </div>
        </section>
      </main>
    </div>
  );
}
