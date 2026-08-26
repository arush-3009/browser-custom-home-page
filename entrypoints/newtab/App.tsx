import { ArrowRight, Search, Settings2 } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ToastProvider } from '../../components/common/Toast';
import { Tooltip, TooltipProvider } from '../../components/common/Tooltip';
import { PlacesSection } from '../../components/places/PlacesSection';
import { SettingsDialog } from '../../components/settings/SettingsDialog';
import { WorkspacesSection } from '../../components/workspaces/WorkspacesSection';
import { useBrowserHomeData } from '../../lib/storage/use-data';
import { writeData } from '../../lib/storage/repository';
import { selectedBackgroundImage } from '../../features/backgrounds/presets';

function BrowserHomeApp() {
  const { data, error, mutate, refresh } = useBrowserHomeData();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditing = target?.matches('input, textarea, select, [contenteditable="true"]');
      if (event.key === '/' && !isEditing && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const search = (event: FormEvent) => {
    event.preventDefault();
    const value = query.trim();
    if (!value) return searchRef.current?.focus();
    window.location.assign(`https://www.google.com/search?q=${encodeURIComponent(value)}`);
  };

  if (!data) {
    return <div className="app-loading"><span className="brand__mark"><Search size={18} /></span><span>{error ?? 'Opening Browser Home…'}</span>{error && <button className="button button--quiet" onClick={refresh}>Try again</button>}</div>;
  }
  const backgroundImage = selectedBackgroundImage(data.settings.background);
  const isPhotoBackground = Boolean(backgroundImage);

  return (
    <div className={`newtab-shell min-h-screen ${isPhotoBackground ? 'newtab-shell--photo' : 'newtab-shell--midnight'}`} data-background={data.settings.background.selected}>
      <div
        key={`${data.settings.background.selected}:${data.settings.background.customImage?.updatedAt ?? ''}`}
        className={`background-layer ${isPhotoBackground ? 'background-layer--photo' : 'background-layer--midnight'}`}
        style={backgroundImage ? { backgroundImage: `url(${JSON.stringify(backgroundImage)})` } : undefined}
        aria-hidden="true"
      />
      <div className="background-scrim" aria-hidden="true" />
      <div className="background-texture" aria-hidden="true" />
      <header className="topbar">
        <Tooltip label="Customize Browser Home">
          <button type="button" className="icon-button topbar__settings" onClick={() => setSettingsOpen(true)} aria-label="Customize Browser Home"><Settings2 size={18} /></button>
        </Tooltip>
      </header>

      <main>
        <section className="hero hero--search-only" aria-label="Web search">
          <form className="search-box" role="search" onSubmit={search}>
            <Search size={21} aria-hidden="true" />
            <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the web" aria-label="Search Google" aria-keyshortcuts="/" autoComplete="off" />
            <kbd>/</kbd>
            <button type="submit" aria-label="Search"><ArrowRight size={19} /></button>
          </form>
        </section>

        <div className="home-content">
          <PlacesSection data={data} mutate={mutate} />
          <div className="concept-divider"><span>Visit often</span><i /><span>Put away & resume</span></div>
          <WorkspacesSection data={data} mutate={mutate} />
        </div>
      </main>
      <footer className="page-footer"><span>Browser Home</span><span>Private by default · stored locally in Chrome</span></footer>
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        data={data}
        updateBackground={async (background) => {
          await mutate((current) => ({ ...current, settings: { ...current.settings, background } }));
        }}
        replaceData={async (next) => { await writeData(next); refresh(); }}
      />
    </div>
  );
}

export default function App() {
  return <TooltipProvider><ToastProvider><BrowserHomeApp /></ToastProvider></TooltipProvider>;
}
