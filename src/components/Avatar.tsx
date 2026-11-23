import { useEffect, useRef, useState } from 'react';
import { getPlayerPhoto } from '../api/players';

/** Small copy of an ESPN logo via their image combiner (the originals are 500px). */
export const smallLogo = (src: string | undefined, px: number) => {
  const m = src?.match(/^https?:\/\/a\.espncdn\.com(\/i\/.+\.png)$/);
  return m ? `https://a.espncdn.com/combiner/i?img=${m[1]}&w=${px}&h=${px}` : src;
};

const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

/** Player photo (Wikipedia, when one exists) with an initials fallback and a small club crest badge. Loads when visible. */
export function Avatar({ id, name, birthYear, crest, size = 40, color, wait }: { id: string; name: string; birthYear?: number; crest?: string; size?: number; color?: string; wait?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [src, setSrc] = useState<string>();
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    if (wait) return; // wait until the birth year is known, so namesakes are filtered out
    const el = ref.current;
    if (!el) return;
    let alive = true;
    const load = () => getPlayerPhoto(id, name, birthYear).then((u) => alive && setSrc(u)).catch(() => undefined);
    if (!('IntersectionObserver' in window)) { load(); return () => { alive = false; }; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); load(); } }, { rootMargin: '200px' });
    io.observe(el);
    return () => { alive = false; io.disconnect(); };
  }, [id, name, birthYear, wait]);
  const badge = Math.round(size * 0.42);
  return (
    <span ref={ref} className="avatar" style={{ width: size, height: size, ['--team' as string]: color }}>
      {src && !broken ? (
        <img src={src} alt="" loading="lazy" decoding="async" onError={() => setBroken(true)} />
      ) : (
        <span className="avatar-init" style={{ fontSize: size * 0.36 }}>{initials(name)}</span>
      )}
      {crest && <img className="avatar-crest" src={smallLogo(crest, badge * 2)} alt="" style={{ width: badge, height: badge }} loading="lazy" />}
    </span>
  );
}
