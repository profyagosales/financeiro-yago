let _ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!_ctx) {
      _ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return _ctx
  } catch {
    return null
  }
}

function playTone(freq: number, type: OscillatorType, duration: number, vol = 0.15) {
  if (!isSoundEnabled()) return
  const ctx = getCtx()
  if (!ctx) return
  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(vol * getVolume(), ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration)
  } catch {}
}

export const sounds = {
  receita: () => {
    playTone(523, 'sine', 0.15, 0.12)
    setTimeout(() => playTone(659, 'sine', 0.2, 0.1), 80)
  },
  despesa: () => playTone(330, 'sine', 0.25, 0.1),
  save: () => playTone(440, 'sine', 0.08, 0.06),
  navigate: () => playTone(440, 'sine', 0.08, 0.06),
  modal_open: () => playTone(600, 'sine', 0.12, 0.08),
  modal_close: () => playTone(400, 'sine', 0.12, 0.06),
  delete: () => { playTone(200, 'sawtooth', 0.15, 0.08) },
  success: () => {
    ;[523, 659, 784].forEach((f, i) => setTimeout(() => playTone(f, 'sine', 0.3, 0.15), i * 100))
  },
  error: () => playTone(180, 'square', 0.2, 0.1),
  meta: () => {
    ;[523, 659, 784].forEach((f, i) => setTimeout(() => playTone(f, 'sine', 0.2, 0.12), i * 100))
  },
  goal_complete: () => {
    ;[523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playTone(f, 'sine', 0.4, 0.2), i * 80))
  },
  pin_digit: () => playTone(800, 'sine', 0.06, 0.05),
  hover: () => playTone(600, 'sine', 0.04, 0.04),
}

export function haptic(style: 'light' | 'medium' | 'heavy' = 'light') {
  try { navigator.vibrate?.(style === 'light' ? 8 : style === 'medium' ? 20 : 40) } catch {}
}

export function isSoundEnabled(): boolean {
  try { return localStorage.getItem('fy-sound') !== 'off' } catch { return true }
}

export function toggleSound(): void {
  try { localStorage.setItem('fy-sound', isSoundEnabled() ? 'off' : 'on') } catch {}
}

export function getVolume(): number {
  try {
    const v = parseFloat(localStorage.getItem('fy-volume') ?? '1')
    return isNaN(v) ? 1 : Math.max(0, Math.min(1, v))
  } catch { return 1 }
}

export function setVolume(v: number): void {
  try { localStorage.setItem('fy-volume', String(Math.max(0, Math.min(1, v)))) } catch {}
}
