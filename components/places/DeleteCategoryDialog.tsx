import { useEffect, useMemo, useState } from 'react';
import type { Category } from '../../types/domain';
import { AppDialog } from '../common/Dialog';
import { SelectField } from '../common/SelectField';

export function DeleteCategoryDialog({ open, onOpenChange, category, shortcutCount, categories, onConfirm }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  shortcutCount: number;
  categories: Category[];
  onConfirm: (strategy: { kind: 'delete-contents' } | { kind: 'move'; targetCategoryId: string }) => Promise<void>;
}) {
  const targets = useMemo(() => categories.filter((item) => item.id !== category?.id), [categories, category?.id]);
  const [strategy, setStrategy] = useState<'move' | 'delete'>('move');
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setStrategy(targets.length > 0 ? 'move' : 'delete');
      setTarget(targets[0]?.id ?? '');
    }
  }, [open, targets]);

  if (!category) return null;
  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm(strategy === 'move' && target ? { kind: 'move', targetCategoryId: target } : { kind: 'delete-contents' });
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete “${category.name}”?`}
      description={shortcutCount > 0 ? `This section contains ${shortcutCount} ${shortcutCount === 1 ? 'place' : 'places'}. Choose what happens to them.` : 'This empty section will be removed.'}
      size="small"
      footer={<>
        <button type="button" className="button button--ghost" onClick={() => onOpenChange(false)}>Cancel</button>
        <button type="button" className="button button--danger" onClick={() => void confirm()} disabled={busy}>{busy ? 'Deleting…' : 'Delete section'}</button>
      </>}
    >
      {shortcutCount > 0 && targets.length > 0 && (
        <div className="choice-stack">
          <label className="choice-row"><input type="radio" checked={strategy === 'move'} onChange={() => setStrategy('move')} /><span><strong>Move the places</strong><small>Keep them safely in another section.</small></span></label>
          {strategy === 'move' && <div className="choice-indent"><SelectField label="Move places to" value={target} onValueChange={setTarget} options={targets.map((item) => ({ value: item.id, label: item.name }))} /></div>}
          <label className="choice-row choice-row--danger"><input type="radio" checked={strategy === 'delete'} onChange={() => setStrategy('delete')} /><span><strong>Delete the places too</strong><small>Permanently remove all {shortcutCount} from Browser Home.</small></span></label>
        </div>
      )}
      {shortcutCount > 0 && targets.length === 0 && <p className="notice notice--danger">Because this is your only section, deleting it will also delete its places.</p>}
    </AppDialog>
  );
}
