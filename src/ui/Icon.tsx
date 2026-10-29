const PATHS = {
  cash: 'M3 7h18v10H3zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM6 7v10M18 7v10',
  trend: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  box: 'M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM4 7.5l8 4.5 8-4.5M12 12v9',
  smile: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8.5 14.5s1.3 2 3.5 2 3.5-2 3.5-2M9 9.5h.01M15 9.5h.01',
  battery: 'M3 8h15v8H3zM21 11v2M6 11v2M9 11v2M12 11v2',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7l1-8z',
  pin: 'M12 21s-6-5.7-6-11a6 6 0 1 1 12 0c0 5.3-6 11-6 11zM12 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
}

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  )
}
