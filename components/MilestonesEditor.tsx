'use client';

import { Milestone } from '@/lib/types';

interface MilestonesEditorProps {
  milestones: Milestone[];
  onChange: (milestones: Milestone[]) => void;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function MilestonesEditor({ milestones, onChange }: MilestonesEditorProps) {
  const update = (id: string, patch: Partial<Milestone>) =>
    onChange(milestones.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  const remove = (id: string) => onChange(milestones.filter((m) => m.id !== id));
  const add = () =>
    onChange([
      ...milestones,
      { id: `ms-${Date.now()}`, start: todayISO(), end: null, ongoing: false, color: '#88C0D0' },
    ]);

  const lbl = 'text-[10px] uppercase tracking-widest text-neutral-500';
  const input = 'w-full px-2 py-1.5 bg-neutral-900 border border-neutral-700 text-white text-sm focus:border-white outline-none';

  return (
    <div className="space-y-3">
      {milestones.map((m) => (
        <div key={m.id} className="p-3 bg-neutral-800 border border-neutral-700 rounded space-y-2">
          <div className="flex items-start gap-2">
            <input
              type="color"
              value={m.color}
              onChange={(e) => update(m.id, { color: e.target.value })}
              className="h-8 w-10 mt-4 bg-neutral-900 border border-neutral-700 shrink-0"
              title="Fill color"
            />
            <div className="flex-1 grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className={lbl}>Start</label>
                <input type="date" value={m.start} onChange={(e) => update(m.id, { start: e.target.value })} className={input} />
              </div>
              <div className="space-y-1">
                <label className={lbl}>End</label>
                <input
                  type="date"
                  value={m.end || ''}
                  disabled={m.ongoing}
                  onChange={(e) => update(m.id, { end: e.target.value || null })}
                  className={`${input} disabled:opacity-40`}
                />
              </div>
            </div>
            <button
              onClick={() => remove(m.id)}
              className="mt-4 text-xs text-red-500 hover:text-red-400 transition-colors uppercase tracking-widest shrink-0"
            >
              Del
            </button>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={m.ongoing} onChange={(e) => update(m.id, { ongoing: e.target.checked })} className="w-4 h-4" />
            <span className={lbl}>Ongoing (fill until now)</span>
          </label>
        </div>
      ))}

      <button
        onClick={add}
        className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 transition-colors text-xs uppercase tracking-widest border border-neutral-700"
      >
        + Add milestone
      </button>
    </div>
  );
}
