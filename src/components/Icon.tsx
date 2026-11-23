const paths: Record<string, string> = {
  ball: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 3.2 2.9 2.1-1.1 3.4h-3.6L9.1 7.3 12 5.2Zm-6.2 4 2.3.7 1.1 3.5-2 2.9-2.3-.2a7.9 7.9 0 0 1 .9-6.9Zm12.4 0a7.9 7.9 0 0 1 .9 6.9l-2.3.2-2-2.9 1.1-3.5 2.3-.7ZM10.3 16h3.4l1.4 2.6a8 8 0 0 1-6.2 0l1.4-2.6Z',
  trophy: 'M7 3h10v2h3v3a4 4 0 0 1-4 4h-.3A5 5 0 0 1 13 14.9V18h3v3H8v-3h3v-3.1A5 5 0 0 1 8.3 12H8a4 4 0 0 1-4-4V5h3V3Zm0 4H6v1a2 2 0 0 0 1 1.7V7Zm10 0v2.7A2 2 0 0 0 18 8V7h-1Z',
  star: 'M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.1l-5.7 3.2 1.2-6.4L2.8 9.5l6.4-.8L12 2.8Z',
  search: 'M10.5 3a7.5 7.5 0 0 1 6 12l4.3 4.3-1.4 1.4-4.3-4.3A7.5 7.5 0 1 1 10.5 3Zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Z',
  gear: 'M10.3 2h3.4l.5 2.6 1.7.8 2.2-1.5 2.4 2.4-1.5 2.2.8 1.7 2.6.5v3.4l-2.6.5-.8 1.7 1.5 2.2-2.4 2.4-2.2-1.5-1.7.8-.5 2.6h-3.4l-.5-2.6-1.7-.8-2.2 1.5-2.4-2.4 1.5-2.2-.8-1.7L2 13.7v-3.4l2.6-.5.8-1.7-1.5-2.2 2.4-2.4 2.2 1.5 1.7-.8.5-2.6ZM12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z',
  back: 'M15.4 4.6 8 12l7.4 7.4-1.4 1.4L5.2 12 14 3.2l1.4 1.4Z',
  chev: 'M9 6l6 6-6 6',
  cal: 'M7 2h2v2h6V2h2v2h3v17H4V4h3V2Zm11 7H6v10h12V9Z',
  bell: 'M12 2a6 6 0 0 1 6 6v4.6l2 3.4H4l2-3.4V8a6 6 0 0 1 6-6Zm-2.5 16h5a2.5 2.5 0 0 1-5 0Z',
  boot: 'M4 5h7l1 6 7.2 2.1A2.5 2.5 0 0 1 21 15.5V18H3l1-13Zm-1 15h18v2H3v-2Z',
  flame: 'M12 2c1 3.5 5 5.6 5 10.5A5.5 5.5 0 0 1 12 18a5.5 5.5 0 0 1-5-7.8c.6 1.4 1.6 2.3 2.7 2.6C9 9.2 10.6 5.6 12 2Zm0 20a7.5 7.5 0 0 0 7.5-7.5c0-.8-.1-1.5-.3-2.2.1 3.6-2.6 6.2-7.2 6.2s-7.3-2.6-7.2-6.2c-.2.7-.3 1.4-.3 2.2A7.5 7.5 0 0 0 12 22Z',
  shield: 'M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Z',
  close: 'M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4L12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5Z',
};

export function Icon({ name, size = 20, filled = true, className }: { name: keyof typeof paths | string; size?: number; filled?: boolean; className?: string }) {
  const d = paths[name] ?? '';
  const stroke = name === 'chev' || !filled;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={className}
      fill={stroke ? 'none' : 'currentColor'} stroke={stroke ? 'currentColor' : 'none'} strokeWidth={stroke ? 2 : 0} strokeLinejoin="round" strokeLinecap="round">
      <path d={d} />
    </svg>
  );
}
