import { useEffect, useRef } from 'react';
import { addDays, fmtDayLabel, isoDay, sameDay, startOfDay } from '../lib/dates';

export function DateStrip({ value, onChange, span = 10 }: { value: Date; onChange: (d: Date) => void; span?: number }) {
  const today = startOfDay(new Date());
  const days = Array.from({ length: span * 2 + 1 }, (_, i) => addDays(today, i - span));
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[aria-current="date"]')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [value]);
  return (
    <div className="datestrip" ref={ref} role="tablist" aria-label="Choose a day">
      {days.map((d) => {
        const sel = sameDay(d, value);
        const isToday = sameDay(d, today);
        const label = fmtDayLabel(d, today);
        return (
          <button
            key={isoDay(d)}
            role="tab"
            aria-selected={sel}
            aria-current={sel ? 'date' : undefined}
            className={`day ${sel ? 'sel' : ''} ${isToday ? 'today' : ''}`}
            onClick={() => onChange(d)}
          >
            <span className="day-w">{isToday || label === 'Yesterday' || label === 'Tomorrow' ? label : d.toLocaleDateString([], { weekday: 'short' })}</span>
            <span className="day-d">{d.toLocaleDateString([], { day: 'numeric', month: 'short' })}</span>
          </button>
        );
      })}
    </div>
  );
}
