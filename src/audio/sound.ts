// Procedural sound effects and lofi ambient music using Web Audio API
// No external assets required, 100% offline and low latency.

class SoundManager {
  private ctx: AudioContext | null = null
  private sfxGain: GainNode | null = null
  private bgmGain: GainNode | null = null
  private bgmPlaying = false
  private bgmTimer: number | null = null
  private sfxMuted = false
  private bgmMuted = true

  constructor() {
    // AudioContext will be initialized on first user interaction
    const savedSfx = localStorage.getItem('robocorp_sfx_muted')
    const savedBgm = localStorage.getItem('robocorp_bgm_muted')
    if (savedSfx !== null) this.sfxMuted = savedSfx === 'true'
    if (savedBgm !== null) this.bgmMuted = savedBgm === 'true'
  }

  private init() {
    if (this.ctx) return
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    this.ctx = new AudioCtx()
    this.sfxGain = this.ctx.createGain()
    this.sfxGain.gain.value = this.sfxMuted ? 0 : 0.35
    this.sfxGain.connect(this.ctx.destination)

    this.bgmGain = this.ctx.createGain()
    this.bgmGain.gain.value = this.bgmMuted ? 0 : 0.12
    this.bgmGain.connect(this.ctx.destination)
  }

  public resume() {
    this.init()
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  public isSfxMuted() { return this.sfxMuted }
  public isBgmMuted() { return this.bgmMuted }

  public toggleSfx(): boolean {
    this.sfxMuted = !this.sfxMuted
    localStorage.setItem('robocorp_sfx_muted', String(this.sfxMuted))
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.sfxMuted ? 0 : 0.35, this.ctx.currentTime)
    }
    return this.sfxMuted
  }

  public toggleBgm(): boolean {
    this.bgmMuted = !this.bgmMuted
    localStorage.setItem('robocorp_bgm_muted', String(this.bgmMuted))
    this.resume()
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setValueAtTime(this.bgmMuted ? 0 : 0.12, this.ctx.currentTime)
    }
    if (this.bgmMuted) {
      this.bgmPlaying = false
      if (this.bgmTimer) {
        clearTimeout(this.bgmTimer)
        this.bgmTimer = null
      }
    } else if (!this.bgmPlaying) {
      this.startLofiBgm()
    }
    return this.bgmMuted
  }

  // --- Sound Effects ---

  public playCash() {
    if (this.sfxMuted) return
    this.resume()
    if (!this.ctx || !this.sfxGain) return
    const now = this.ctx.currentTime

    const osc1 = this.ctx.createOscillator()
    const osc2 = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc1.type = 'triangle'
    osc2.type = 'sine'

    osc1.frequency.setValueAtTime(1318.51, now) // E6
    osc1.frequency.setValueAtTime(1760.00, now + 0.08) // A6
    osc2.frequency.setValueAtTime(2093.00, now + 0.08) // C7

    gain.gain.setValueAtTime(0.4, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)

    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(this.sfxGain)

    osc1.start(now)
    osc2.start(now)
    osc1.stop(now + 0.36)
    osc2.stop(now + 0.36)
  }

  public playBeep(pitch = 600, duration = 0.08) {
    if (this.sfxMuted) return
    this.resume()
    if (!this.ctx || !this.sfxGain) return
    const now = this.ctx.currentTime

    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(pitch, now)
    osc.frequency.exponentialRampToValueAtTime(pitch * 1.3, now + duration)

    gain.gain.setValueAtTime(0.2, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

    osc.connect(gain)
    gain.connect(this.sfxGain)

    osc.start(now)
    osc.stop(now + duration + 0.01)
  }

  public playWarning() {
    if (this.sfxMuted) return
    this.resume()
    if (!this.ctx || !this.sfxGain) return
    const now = this.ctx.currentTime

    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(320, now)
    osc.frequency.linearRampToValueAtTime(180, now + 0.25)

    gain.gain.setValueAtTime(0.3, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25)

    osc.connect(gain)
    gain.connect(this.sfxGain)

    osc.start(now)
    osc.stop(now + 0.26)
  }

  public playTruck() {
    if (this.sfxMuted) return
    this.resume()
    if (!this.ctx || !this.sfxGain) return
    const now = this.ctx.currentTime

    // Low horn
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(180, now)
    osc.frequency.setValueAtTime(220, now + 0.08)

    gain.gain.setValueAtTime(0.25, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)

    osc.connect(gain)
    gain.connect(this.sfxGain)

    osc.start(now)
    osc.stop(now + 0.42)
  }

  /** temple bell: a low fundamental plus the inharmonic partials of a bronze bell, long decay */
  public playBell(volume = 1) {
    if (this.sfxMuted) return
    this.resume()
    if (!this.ctx || !this.sfxGain) return
    const now = this.ctx.currentTime
    const base = 98
    const partials: [number, number, number][] = [[1, 0.5, 5.5], [2.0, 0.22, 4], [2.76, 0.18, 3.2], [5.4, 0.08, 2], [8.9, 0.04, 1.2]]
    for (const [mult, amp, decay] of partials) {
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(base * mult, now)
      // slow beating between the two halves of the bell
      osc.detune.setValueAtTime(mult === 1 ? 4 : 0, now)
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(amp * volume, now + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + decay)
      osc.connect(gain)
      gain.connect(this.sfxGain)
      osc.start(now)
      osc.stop(now + decay + 0.05)
    }
  }

  /** wooden fish (mõ): a short hollow knock */
  public playWoodfish(volume = 1) {
    if (this.sfxMuted) return
    this.resume()
    if (!this.ctx || !this.sfxGain) return
    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    const filter = this.ctx.createBiquadFilter()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(760, now)
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.07)
    filter.type = 'bandpass'
    filter.frequency.value = 650
    filter.Q.value = 6
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.5 * volume, now + 0.004)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11)
    osc.connect(filter)
    filter.connect(gain)
    gain.connect(this.sfxGain)
    osc.start(now)
    osc.stop(now + 0.13)
  }

  public playParty() {
    if (this.sfxMuted) return
    this.resume()
    if (!this.ctx || !this.sfxGain) return
    const notes = [523.25, 659.25, 783.99, 1046.50] // C E G C
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return
      const now = this.ctx.currentTime + idx * 0.1
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now)
      gain.gain.setValueAtTime(0.3, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
      osc.connect(gain)
      gain.connect(this.sfxGain)
      osc.start(now)
      osc.stop(now + 0.26)
    })
  }

  // --- Procedural Lo-Fi Ambient Background Music ---

  private startLofiBgm() {
    this.bgmPlaying = true
    // Chill chords: Dm9, G13, Cmaj9, Am7
    const chords = [
      [293.66, 349.23, 440.0, 523.25], // D F A C
      [246.94, 329.63, 392.0, 493.88], // B E G B
      [261.63, 329.63, 392.0, 493.88], // C E G B
      [220.00, 261.63, 329.63, 392.0], // A C E G
    ]
    let step = 0

    const playChord = () => {
      if (!this.bgmPlaying || this.bgmMuted || !this.ctx || !this.bgmGain) return
      const now = this.ctx.currentTime
      const chord = chords[step % chords.length]
      step++

      chord.forEach((freq, i) => {
        if (!this.ctx || !this.bgmGain) return
        const osc = this.ctx.createOscillator()
        const filter = this.ctx.createBiquadFilter()
        const gain = this.ctx.createGain()

        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, now + i * 0.05)

        filter.type = 'lowpass'
        filter.frequency.setValueAtTime(650, now)

        gain.gain.setValueAtTime(0.001, now)
        gain.gain.linearRampToValueAtTime(0.08, now + 0.4)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.8)

        osc.connect(filter)
        filter.connect(gain)
        gain.connect(this.bgmGain)

        osc.start(now + i * 0.05)
        osc.stop(now + 3.0)
      })

      this.bgmTimer = window.setTimeout(playChord, 3200)
    }

    playChord()
  }
}

export const sound = new SoundManager()
