import { Icon } from './Icon';

export function Star({ on, onClick, label, size = 20 }: { on: boolean; onClick: () => void; label: string; size?: number }) {
  return (
    <button
      type="button"
      className={`star ${on ? 'on' : ''}`}
      aria-pressed={on}
      aria-label={on ? `Unfollow ${label}` : `Follow ${label}`}
      title={on ? 'Following' : 'Follow'}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
    >
      <Icon name="star" size={size} filled={on} />
    </button>
  );
}
