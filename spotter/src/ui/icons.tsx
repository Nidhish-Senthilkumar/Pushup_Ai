/**
 * Inline SVG icons (Lucide-style strokes), so nothing is fetched at runtime.
 */
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 22, ...rest }: P, children: React.ReactNode) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {children}
    </svg>
  );
}

export const Icon = {
  home: (p: P) => base(p, <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9.5 21v-6h5v6" /></>),
  dumbbell: (p: P) => base(p, <><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" /></>),
  list: (p: P) => base(p, <><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="4" cy="6" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="18" r="1" /></>),
  chart: (p: P) => base(p, <><path d="M3 3v18h18" /><path d="M7 15l4-4 3 3 5-6" /></>),
  more: (p: P) => base(p, <><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></>),
  play: (p: P) => base(p, <path d="M7 4.5v15l12-7.5z" fill="currentColor" />),
  pause: (p: P) => base(p, <><path d="M8 5v14M16 5v14" /></>),
  stop: (p: P) => base(p, <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />),
  x: (p: P) => base(p, <><path d="M18 6 6 18M6 6l12 12" /></>),
  back: (p: P) => base(p, <path d="M15 18l-6-6 6-6" />),
  next: (p: P) => base(p, <path d="M9 18l6-6-6-6" />),
  check: (p: P) => base(p, <path d="M20 6 9 17l-5-5" />),
  flame: (p: P) => base(p, <path d="M12 22c4 0 7-3 7-7 0-4-3-6-4-10-1 3-3 4-4 4 0-2-1-4-2-5-1 4-4 6-4 11 0 4 3 7 7 7z" />),
  bolt: (p: P) => base(p, <path d="M13 2 4 14h7l-1 8 9-12h-7z" />),
  trophy: (p: P) => base(p, <><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4" /></>),
  camera: (p: P) => base(p, <><path d="M4 7h3l2-3h6l2 3h3v12H4z" /><circle cx="12" cy="13" r="3.5" /></>),
  flip: (p: P) => base(p, <><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" /></>),
  volume: (p: P) => base(p, <><path d="M11 5 6 9H3v6h3l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></>),
  mute: (p: P) => base(p, <><path d="M11 5 6 9H3v6h3l5 4z" /><path d="m22 9-6 6M16 9l6 6" /></>),
  timer: (p: P) => base(p, <><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2.5M9 2h6" /></>),
  target: (p: P) => base(p, <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>),
  shield: (p: P) => base(p, <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />),
  lock: (p: P) => base(p, <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>),
  wifiOff: (p: P) => base(p, <><path d="M2 2l20 20M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5.2-2.8M19 13a10 10 0 0 0-2.5-1.9M2 8.8a15 15 0 0 1 4.2-2.6M22 8.8A15 15 0 0 0 11 5" /><circle cx="12" cy="20" r="0.5" /></>),
  joystick: (p: P) => base(p, <><circle cx="12" cy="6" r="3" /><path d="M12 9v6M5 15h14l1 5H4z" /></>),
  settings: (p: P) => base(p, <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>),
  info: (p: P) => base(p, <><circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" /></>),
  flask: (p: P) => base(p, <><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3" /><path d="M7.5 15h9" /></>),
  download: (p: P) => base(p, <><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></>),
  share: (p: P) => base(p, <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></>),
  star: (p: P) => base(p, <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />),
  spark: (p: P) => base(p, <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />),
  diamond: (p: P) => base(p, <path d="M6 3h12l3 6-9 12L3 9z M3 9h18" />),
  hundred: (p: P) => base(p, <><path d="M4 8l2-1v10" /><rect x="9" y="7" width="5" height="10" rx="2.5" /><rect x="16" y="7" width="5" height="10" rx="2.5" /></>),
  crown: (p: P) => base(p, <path d="M3 18h18M4 18l-1-11 5 4 4-7 4 7 5-4-1 11" />),
  compass: (p: P) => base(p, <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></>),
  medal: (p: P) => base(p, <><circle cx="12" cy="15" r="6" /><path d="M8.5 10 6 3h4l2 4 2-4h4l-2.5 7" /></>),
  sun: (p: P) => base(p, <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>),
  moon: (p: P) => base(p, <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />),
  user: (p: P) => base(p, <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>),
  qr: (p: P) => base(p, <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 17h4v4h-4" /></>),
  eye: (p: P) => base(p, <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>),
  brain: (p: P) => base(p, <><path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a2 2 0 0 0-3-1z" /><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1" /></>),
  refresh: (p: P) => base(p, <><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></>),
};

export type IconName = keyof typeof Icon;
