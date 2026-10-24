// Small line icons, drawn on a 16px grid with the current text color.

import type { ReactNode } from 'react';

function Icon({ children, size = 16 }: { children: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

export const SidebarIcon = () => (
  <Icon>
    <rect x="1.75" y="2.75" width="12.5" height="10.5" rx="2" />
    <path d="M6 3v10" />
  </Icon>
);
export const FirstIcon = () => (
  <Icon>
    <path d="M4 3v10M12.5 3 6.5 8l6 5z" fill="currentColor" />
  </Icon>
);
export const PrevIcon = () => (
  <Icon>
    <path d="M10 3 5 8l5 5" />
  </Icon>
);
export const NextIcon = () => (
  <Icon>
    <path d="M6 3l5 5-5 5" />
  </Icon>
);
export const PlayIcon = () => (
  <Icon>
    <path d="M4.5 2.75v10.5L13 8z" fill="currentColor" />
  </Icon>
);
export const PauseIcon = () => (
  <Icon>
    <path d="M5 3v10M11 3v10" strokeWidth="2.2" />
  </Icon>
);
export const SunIcon = () => (
  <Icon>
    <circle cx="8" cy="8" r="3" />
    <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3 3l1 1M12 12l1 1M3 13l1-1M12 4l1-1" />
  </Icon>
);
export const MoonIcon = () => (
  <Icon>
    <path d="M13.5 9.5A5.5 5.5 0 1 1 6.5 2.5a4.5 4.5 0 0 0 7 7z" />
  </Icon>
);
export const HelpIcon = () => (
  <Icon>
    <circle cx="8" cy="8" r="6.25" />
    <path d="M6.2 6.2a1.9 1.9 0 1 1 2.6 1.75c-.5.2-.8.6-.8 1.15V9.5" />
    <circle cx="8" cy="11.6" r=".4" fill="currentColor" />
  </Icon>
);
export const PlusIcon = () => (
  <Icon>
    <path d="M8 3v10M3 8h10" />
  </Icon>
);
export const UploadIcon = () => (
  <Icon>
    <path d="M8 10.5V2.5M4.75 5.5 8 2.25l3.25 3.25M2.5 10.5v2a1.25 1.25 0 0 0 1.25 1.25h8.5a1.25 1.25 0 0 0 1.25-1.25v-2" />
  </Icon>
);
export const SearchIcon = () => (
  <Icon>
    <circle cx="7" cy="7" r="4.25" />
    <path d="m10.25 10.25 3.25 3.25" />
  </Icon>
);
export const ChevronIcon = ({ open }: { open: boolean }) => (
  <Icon size={12}>
    <path d={open ? 'M4 6l4 4 4-4' : 'M6 4l4 4-4 4'} />
  </Icon>
);
export const FolderIcon = ({ open }: { open: boolean }) => (
  <Icon>
    {open ? (
      <path d="M1.75 4.25A1.25 1.25 0 0 1 3 3h3l1.5 1.5H13a1.25 1.25 0 0 1 1.25 1.25V6.5H4.6a1 1 0 0 0-.95.68L1.75 12.5zM1.75 12.5l1.9-5.32a1 1 0 0 1 .95-.68h10.15l-1.95 5.6a1 1 0 0 1-.95.65H2.25" />
    ) : (
      <path d="M1.75 4.25A1.25 1.25 0 0 1 3 3h3l1.5 1.5H13a1.25 1.25 0 0 1 1.25 1.25v6A1.25 1.25 0 0 1 13 13H3a1.25 1.25 0 0 1-1.25-1.25z" />
    )}
  </Icon>
);
export const FileIcon = () => (
  <Icon>
    <path d="M4 1.75h5L12.25 5v8.25A1 1 0 0 1 11.25 14.25h-7.25a1 1 0 0 1-1-1V2.75a1 1 0 0 1 1-1zM9 1.75V5h3.25" />
  </Icon>
);
export const PencilIcon = () => (
  <Icon size={14}>
    <path d="M10.5 2.5l3 3L6 13H3v-3z" />
  </Icon>
);
export const TrashIcon = () => (
  <Icon size={14}>
    <path d="M2.5 4.5h11M6 4.5V3h4v1.5M4 4.5l.7 8.5a1 1 0 0 0 1 .9h4.6a1 1 0 0 0 1-.9l.7-8.5" />
  </Icon>
);
export const CloseIcon = () => (
  <Icon size={12}>
    <path d="M4 4l8 8M12 4l-8 8" />
  </Icon>
);
export const ExpandIcon = ({ on }: { on: boolean }) => (
  <Icon size={14}>
    <path d={on ? 'M6 2v4H2M10 2v4h4M6 14v-4H2M10 14v-4h4' : 'M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4'} />
  </Icon>
);
export const CopyIcon = () => (
  <Icon size={14}>
    <rect x="5.25" y="5.25" width="8" height="8" rx="1.5" />
    <path d="M10.75 5.25v-1.5a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h1.5" />
  </Icon>
);
