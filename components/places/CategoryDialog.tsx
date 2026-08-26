import { useEffect, useState } from 'react';
import { AppDialog } from '../common/Dialog';

export function CategoryDialog({ open, onOpenChange, initialName, onSave }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName?: string | undefined;
  onSave: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (open) {
      setName(initialName ?? '');
      setError('');
    }
  }, [open, initialName]);

  const submit = async () => {
    if (!name.trim()) return setError('Enter a section name.');
    setSaving(true);
    try {
      await onSave(name.trim());
      onOpenChange(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The section could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={initialName ? 'Rename section' : 'New section'}
      description="Sections keep related places together without turning your home into a filing cabinet."
      size="small"
      footer={<>
        <button type="button" className="button button--ghost" onClick={() => onOpenChange(false)}>Cancel</button>
        <button type="button" className="button button--primary" onClick={() => void submit()} disabled={saving}>{saving ? 'Saving…' : initialName ? 'Rename' : 'Create section'}</button>
      </>}
    >
      <label className="field-label">Section name<input className="text-field" value={name} onChange={(event) => setName(event.target.value)} autoFocus maxLength={80} placeholder="Research" onKeyDown={(event) => { if (event.key === 'Enter') void submit(); }} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
    </AppDialog>
  );
}
