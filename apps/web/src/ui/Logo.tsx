// The mark: a goal splitting into two branches on a dark tile, one still open (orange), one
// proved (green, with a check). public/favicon.svg is the same drawing.

export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect x="0.5" y="0.5" width="31" height="31" rx="7.5" fill="#1b2330" stroke="#ffffff" strokeOpacity="0.08" />
      <path d="M16 12v2.6a3 3 0 0 1-3 3h-0.6a3 3 0 0 0-3 3V21M16 14.6a3 3 0 0 0 3 3h0.6a3 3 0 0 1 3 3V21.4" fill="none" stroke="#f26b2e" strokeWidth="1.9" strokeLinecap="round" />
      <circle cx="16" cy="8.6" r="3.6" fill="#fdf6ee" />
      <circle cx="9.4" cy="23.2" r="4.4" fill="#f26b2e" />
      <circle cx="22.6" cy="23.4" r="4.1" fill="#7cc49a" />
      <path d="M20.7 23.5l1.3 1.3 2.5-2.7" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** "replean" in two tones, like the logo: "rep" in the text colour, "lean" in brand orange. */
export function Wordmark() {
  return (
    <span className="wordmark" aria-label="Replean">
      <span aria-hidden="true">rep</span>
      <span className="wordmark-lean" aria-hidden="true">
        lean
      </span>
    </span>
  );
}
