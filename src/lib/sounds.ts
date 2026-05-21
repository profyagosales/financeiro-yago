const ctx = typeof window !== 'undefined' ? new (window.AudioContext || (window as any).webkitAudioContext)() : null

function playTone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.15) {
  if (!ctx) return
  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = freq
    osc.type = type
    gain.gain.setValueAtTime(vol, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur)
    osc.start()
    osc.stop(ctx.currentTime + dur)
  } catch {}
}

export const sounds = {
  receita: () => { playTone(523, 0.1); setTimeout(() => playTone(659, 0.15), 80) },
  despesa: () => playTone(350, 0.12, 'sine', 0.1),
  save: () => playTone(440, 0.06, 'sine', 0.08),
  meta: () => { playTone(523, 0.1); setTimeout(() => playTone(659, 0.1), 100); setTimeout(() => playTone(784, 0.2), 200) },
  error: () => playTone(220, 0.15, 'sawtooth', 0.08),
}

export function haptic(type: 'light' | 'medium' | 'heavy' = 'light') {
  if ('vibrate' in navigator) {
    navigator.vibrate(type === 'light' ? 10 : type === 'medium' ? 25 : 50)
  }
}
