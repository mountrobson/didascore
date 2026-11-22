export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="skeleton-wrap" aria-busy="true" aria-label={label}>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="skeleton" style={{ animationDelay: `${i * 80}ms` }} />
      ))}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-title">{title}</div>
      {children && <div className="empty-body">{children}</div>}
    </div>
  );
}

export function ErrorBox({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div className="empty">
      <div className="empty-title">Couldn't load scores</div>
      <div className="empty-body">{navigator.onLine ? error.message : 'You are offline. Showing saved data when available.'}</div>
      {onRetry && <button className="btn" onClick={onRetry}>Try again</button>}
    </div>
  );
}
