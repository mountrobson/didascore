import { settings } from '../lib/store';

export function Settings() {
  const s = settings.use();
  const notifSupported = 'Notification' in window;
  const enableAlerts = async (on: boolean) => {
    if (on && notifSupported && Notification.permission !== 'granted') {
      const p = await Notification.requestPermission();
      if (p !== 'granted') return settings.set({ ...s, goalAlerts: false });
    }
    settings.set({ ...s, goalAlerts: on });
  };
  return (
    <div>
      <h2 className="section-title">Appearance</h2>
      <div className="list-card">
        <div className="list-row">
          <span>Theme</span>
          <div className="seg">
            {(['system', 'dark', 'light'] as const).map((t) => (
              <button key={t} className={s.theme === t ? 'sel' : ''} onClick={() => settings.set({ ...s, theme: t })}>{t[0].toUpperCase() + t.slice(1)}</button>
            ))}
          </div>
        </div>
        <label className="list-row">
          <span>24-hour clock</span>
          <input type="checkbox" className="switch" checked={s.h24} onChange={(e) => settings.set({ ...s, h24: e.target.checked })} />
        </label>
      </div>
      <h2 className="section-title">Alerts</h2>
      <div className="list-card">
        <label className="list-row">
          <span>
            Goal notifications for teams you follow
            <small className="muted block">{notifSupported ? 'Shown while DiDa Score is open in a tab or installed app.' : 'Not supported in this browser.'}</small>
          </span>
          <input type="checkbox" className="switch" disabled={!notifSupported} checked={s.goalAlerts} onChange={(e) => enableAlerts(e.target.checked)} />
        </label>
      </div>
      <h2 className="section-title">About</h2>
      <div className="list-card prose">
        <p><strong>DiDa Score</strong> is ad-free and tracker-free. Your follows and settings stay on this device.</p>
        <p className="muted">Scores and stats come from ESPN's public data feeds. They are unofficial, so a competition can occasionally be missing or late.</p>
      </div>
    </div>
  );
}
