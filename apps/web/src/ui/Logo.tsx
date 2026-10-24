// The mark: a lens with a goal splitting into two, one still open (orange), one proved (gold).

export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <circle cx="16" cy="16" r="13.5" fill="none" stroke="#ff4f00" strokeWidth="2.2" />
      <path d="M16 9.5v5.5M16 15l-5.5 6M16 15l5.5 6" stroke="#ececec" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <circle cx="16" cy="9" r="2.6" fill="#ececec" />
      <circle cx="10.2" cy="21.6" r="2.6" fill="#ff4f00" />
      <circle cx="21.8" cy="21.6" r="2.6" fill="#f4b740" />
    </svg>
  );
}
