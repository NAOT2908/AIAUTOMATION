export const money = (n: number) => (n < 0 ? '-' : '') + Math.round(Math.abs(n)).toLocaleString('vi-VN') + ' $'

export const clock = (t: number) => {
  const m = Math.floor(((t % 1440) + 1440) % 1440)
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

export const dayOf = (t: number) => Math.floor(t / 1440) + 1

export const rnd = (a: number, b: number) => a + Math.random() * (b - a)
export const randInt = (a: number, b: number) => Math.floor(rnd(a, b + 1))
export const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)]
