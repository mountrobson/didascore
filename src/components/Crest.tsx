import { useState } from 'react';

/** Team or league logo with an initials fallback, lazy-loaded. */
export function Crest({ src, name, size = 22, color }: { src?: string; name: string; size?: number; color?: string }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    const initials = name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
    return (
      <span className="crest crest-fallback" style={{ width: size, height: size, fontSize: size * 0.4, background: color }} aria-hidden>
        {initials}
      </span>
    );
  }
  // ESPN's image combiner serves small, resized crests instead of 500px PNGs.
  const m = src.match(/^https?:\/\/a\.espncdn\.com(\/i\/.+\.png)$/);
  const px = Math.ceil(size * 2);
  const sized = m ? `https://a.espncdn.com/combiner/i?img=${m[1]}&w=${px}&h=${px}` : src;
  return <img className="crest" src={sized} width={size} height={size} alt="" loading="lazy" decoding="async" onError={() => setBroken(true)} />;
}
