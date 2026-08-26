import { Check, ImagePlus, LoaderCircle, Upload } from 'lucide-react';
import { useRef, useState, type ChangeEvent, type CSSProperties } from 'react';
import type { BackgroundId, BackgroundSettings } from '../../types/domain';
import { backgroundPresets, backgroundPreviewImage } from '../../features/backgrounds/presets';
import { processCustomBackground } from '../../features/backgrounds/process-image';
import { useToast } from '../common/Toast';

export function BackgroundPicker({ value, onChange }: {
  value: BackgroundSettings;
  onChange: (value: BackgroundSettings) => Promise<void>;
}) {
  const { show } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const select = async (selected: BackgroundId) => {
    if (selected === 'custom' && !value.customImage) return inputRef.current?.click();
    try {
      await onChange({
        selected,
        ...(value.customImage ? { customImage: value.customImage } : {}),
      });
    } catch (reason) {
      show('Background could not be saved', { detail: reason instanceof Error ? reason.message : 'Chrome storage was unavailable.', tone: 'error' });
    }
  };

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const customImage = await processCustomBackground(file);
      await onChange({ selected: 'custom', customImage });
      show('Custom background saved', { detail: `${customImage.width} × ${customImage.height} · stored locally` });
    } catch (reason) {
      show('Image could not be used', { detail: reason instanceof Error ? reason.message : 'Choose another image.', tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const choices: Array<{ id: BackgroundId; name: string; description: string }> = [
    ...backgroundPresets,
    {
      id: 'custom',
      name: value.customImage ? 'Your photo' : 'Custom photo',
      description: value.customImage ? value.customImage.fileName : 'Upload from this computer',
    },
  ];

  return (
    <section className="background-settings" aria-labelledby="background-settings-heading">
      <div className="background-settings__heading">
        <div><h3 id="background-settings-heading">Background</h3><p>Choose a built-in scene or use a photo of your own. Everything stays on this device.</p></div>
        <button type="button" className="button button--quiet button--small" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? <LoaderCircle size={15} className="spin" /> : <Upload size={15} />}
          {busy ? 'Processing…' : value.customImage ? 'Replace photo' : 'Upload photo'}
        </button>
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => void upload(event)} />
      </div>
      <div className="background-grid" role="radiogroup" aria-label="New Tab background">
        {choices.map((choice) => {
          const preview = backgroundPreviewImage(choice.id, value);
          const active = value.selected === choice.id;
          const previewStyle: CSSProperties | undefined = preview ? { backgroundImage: `url(${JSON.stringify(preview)})` } : undefined;
          return (
            <button
              type="button"
              role="radio"
              aria-checked={active}
              key={choice.id}
              className={`background-choice background-choice--${choice.id} ${active ? 'is-selected' : ''}`}
              onClick={() => void select(choice.id)}
              disabled={busy}
            >
              <span className="background-choice__preview" style={previewStyle}>
                {choice.id === 'custom' && !preview && <ImagePlus size={24} />}
                <span className="background-choice__shade" />
                {active && <span className="background-choice__check"><Check size={14} /></span>}
              </span>
              <span className="background-choice__copy"><strong>{choice.name}</strong><small>{choice.description}</small></span>
            </button>
          );
        })}
      </div>
      <p className="background-settings__note">Custom photos are resized to a high-quality local WebP so they stay crisp without overwhelming Chrome storage.</p>
    </section>
  );
}
