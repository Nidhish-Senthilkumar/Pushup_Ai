import { APP_NAME } from "../config";

/** The mark: a figure mid push-up inside a volt tile. */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#d4ff3a" />
      <circle cx="47" cy="22" r="5.5" fill="#0b0e05" />
      <path d="M41 29 L14 38" stroke="#0b0e05" strokeWidth="6" strokeLinecap="round" />
      <path d="M38 30 L40 44" stroke="#0b0e05" strokeWidth="5" strokeLinecap="round" />
      <path d="M10 46 H54" stroke="#0b0e05" strokeWidth="3" strokeLinecap="round" opacity="0.35" />
    </svg>
  );
}

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className="display text-2xl tracking-tight">{APP_NAME.toUpperCase()}</span>
    </span>
  );
}
