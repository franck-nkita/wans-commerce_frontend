import type { ReactNode } from 'react'

export type IconName =
  | 'home' | 'sales' | 'box' | 'users' | 'stock' | 'warehouse' | 'wallet'
  | 'chart' | 'report' | 'sparkles' | 'forecast' | 'alert' | 'bulb' | 'chat'
  | 'settings' | 'help' | 'search' | 'bell' | 'chevron' | 'arrow' | 'trend'
  | 'check' | 'clock' | 'send' | 'filter' | 'more' | 'menu' | 'close'
  | 'sun' | 'moon' | 'monitor' | 'plus' | 'download' | 'edit' | 'eye' | 'back'
  | 'trash' | 'refresh' | 'logout' | 'user'

// Tracés repris à l'identique du fichier Figma ; les derniers (monitor → user) complètent le jeu dans le même style.
const paths: Record<IconName, ReactNode> = {
  home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></>,
  sales: <><path d="M4 19V9" /><path d="M10 19V5" /><path d="M16 19v-7" /><path d="M22 19H2" /></>,
  box: <><path d="m4 7 8-4 8 4-8 4Z" /><path d="m4 7 8 4 8-4v10l-8 4-8-4Z" /><path d="M12 11v10" /></>,
  users: <><circle cx="9" cy="8" r="4" /><path d="M2 21c0-4 3-7 7-7s7 3 7 7" /><path d="M16 4c3 0 5 2 5 5s-2 5-5 5" /><path d="M18 15c2 1 4 3 4 6" /></>,
  stock: <><path d="M4 5h16v14H4z" /><path d="M4 10h16" /><path d="M9 5v5" /><path d="M15 5v5" /></>,
  warehouse: <><path d="m3 9 9-5 9 5v11H3Z" /><path d="M7 13h10v7" /><path d="M7 16h10" /></>,
  wallet: <><path d="M3 6h16v13H3z" /><path d="M3 9h18v7h-5a3 3 0 0 1 0-6h5" /><circle cx="16" cy="13" r=".5" /></>,
  chart: <><path d="M4 19V5" /><path d="M4 19h16" /><path d="m7 15 4-4 3 2 5-6" /></>,
  report: <><path d="M6 3h9l3 3v15H6z" /><path d="M14 3v4h4" /><path d="M9 12h6M9 16h6" /></>,
  sparkles: <><path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5Z" /><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7Z" /></>,
  forecast: <><path d="M3 17 9 11l4 4 8-9" /><path d="M15 6h6v6" /></>,
  alert: <><path d="M12 3 2 21h20Z" /><path d="M12 9v5" /><path d="M12 18h.01" /></>,
  bulb: <><path d="M9 18h6" /><path d="M10 22h4" /><path d="M8 14a7 7 0 1 1 8 0c-1 1-1 2-1 4H9c0-2 0-3-1-4Z" /></>,
  chat: <><path d="M4 4h16v13H8l-4 4Z" /><path d="M8 9h8M8 13h5" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19 13.5v-3l-2-.7-.8-1.8.9-2-2.1-2-2 .9-1.8-.8L10.5 2h-3l-.7 2.1-1.8.8-2-.9L1 6l.9 2-.8 1.8-2.1.7v3l2.1.7.8 1.8-.9 2 2 2 2-.9 1.8.8.7 2.1h3l.7-2.1 1.8-.8 2 .9 2.1-2-.9-2 .8-1.8Z" transform="translate(2) scale(.83)" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.8 9a2.4 2.4 0 1 1 3.2 2.3c-1 .4-1 1.2-1 2.2" /><path d="M12 17h.01" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
  bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
  chevron: <path d="m9 18 6-6-6-6" />,
  arrow: <><path d="M5 12h14" /><path d="m15 8 4 4-4 4" /></>,
  trend: <><path d="m3 17 6-6 4 4 8-9" /><path d="M15 6h6v6" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  send: <><path d="m3 3 18 9-18 9 4-9Z" /><path d="M7 12h14" /></>,
  filter: <path d="M3 5h18l-7 8v6l-4 2v-8Z" />,
  more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  moon: <path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5a8.5 8.5 0 1 0 12 12Z" />,
  monitor: <><path d="M3 4h18v12H3z" /><path d="M8 20h8M12 16v4" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  download: <><path d="M12 4v11" /><path d="m7 10 5 5 5-5" /><path d="M5 20h14" /></>,
  edit: <><path d="M4 20h4L19 9l-4-4L4 16Z" /><path d="m13 7 4 4" /></>,
  eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  back: <><path d="M19 12H5" /><path d="m9 8-4 4 4 4" /></>,
  trash: <><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="M6 7l1 13h10l1-13" /><path d="M9 7V4h6v3" /></>,
  refresh: <><path d="M20 11a8 8 0 0 0-14.6-4.5L4 8" /><path d="M4 4v4h4" /><path d="M4 13a8 8 0 0 0 14.6 4.5L20 16" /><path d="M20 20v-4h-4" /></>,
  logout: <><path d="M15 4h4v16h-4" /><path d="M10 8l-4 4 4 4" /><path d="M6 12h10" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" /></>,
}

export function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" focusable="false">
      {paths[name]}
    </svg>
  )
}
