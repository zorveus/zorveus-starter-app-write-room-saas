import type { CSSProperties, ReactNode } from 'react';
export type IconName = 'pen' | 'activity' | 'chevron' | 'arrow' | 'check' | 'copy' | 'refresh' | 'focus' | 'collapse' | 'close' | 'info' | 'logout' | 'spark' | 'file' | 'shield' | 'undo';
const paths: Record<IconName, ReactNode> = {
  pen: <><path d="m14 4 6 6M4 20l4.5-1L20 7.5a2.1 2.1 0 0 0-3-3L5.5 16Z"/><path d="M13 20h7"/></>,
  activity: <><path d="M4 4v16h16M8 14l4-5 4 3 4-7"/></>,
  chevron: <path d="m9 5 7 7-7 7"/>,
  arrow: <><path d="M4 12h15m-6-6 6 6-6 6"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M15 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/></>,
  refresh: <><path d="M20 5v5h-5M4 19v-5h5"/><path d="M5.4 8a7.5 7.5 0 0 1 12.4-3L20 10M4 14l2.2 5A7.5 7.5 0 0 0 18.6 16"/></>,
  focus: <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>,
  collapse: <path d="M3 8h5V3m8 0v5h5M8 21v-5H3m18 0h-5v5"/>,
  close: <path d="m6 6 12 12M6 18 18 6"/>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/></>,
  logout: <><path d="M10 4H5v16h5m-1-8h12m-4-4 4 4-4 4"/></>,
  spark: <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/><path d="m20 2 .5 1.5L22 4l-1.5.5L20 6l-.5-1.5L18 4l1.5-.5Z"/></>,
  file: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6M8 13h8m-8 4h6"/></>,
  shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/></>,
  undo: <><path d="M4 5v6h6"/><path d="m4 11 3-4a7 7 0 1 1-1 11"/></>,
};
export function Icon({ name, size = 18, className = '', style }: { name: IconName; size?: number; className?: string; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} style={style}>{paths[name]}</svg>;
}
