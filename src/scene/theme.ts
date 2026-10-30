import { useEffect, useState } from 'react'

export interface SceneTheme {
  dark: boolean
  bg: string
  ground: string
  slab: string
  road: string
  line: string
  wall: string
  walk: string
}

function read(): SceneTheme {
  const cs = getComputedStyle(document.documentElement)
  const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback
  return {
    dark: v('--scene-mode', 'light') === 'dark',
    bg: v('--scene-bg', '#E8EEF7'),
    ground: v('--scene-ground', '#E2E9F3'),
    slab: v('--scene-slab', '#F7F9FC'),
    road: v('--scene-road', '#CAD4E2'),
    line: v('--scene-line', '#FFFFFF'),
    wall: v('--scene-wall', '#FFFFFF'),
    walk: v('--scene-walk', '#D8D2C6'),
  }
}

/** scene colours come from CSS tokens so the 3D world follows the light/dark theme */
export function useSceneTheme() {
  const [theme, setTheme] = useState(read)
  useEffect(() => {
    const update = () => setTheme(read())
    const mq = matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', update)
    const mo = new MutationObserver(update)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      mq.removeEventListener('change', update)
      mo.disconnect()
    }
  }, [])
  return theme
}
