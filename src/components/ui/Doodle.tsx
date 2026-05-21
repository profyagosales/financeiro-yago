export function DoodleWave({ color = '#C4553B', opacity = 0.07 }: { color?: string; opacity?: number }) {
  return (
    <svg style={{ position: 'absolute', bottom: 0, right: 0, pointerEvents: 'none' }} width="160" height="80" viewBox="0 0 160 80" fill="none">
      <path d="M0 60 C30 40 50 70 80 50 C110 30 130 60 160 40 L160 80 L0 80 Z" fill={color} opacity={opacity} />
      <path d="M0 70 C40 50 70 80 110 60 C130 50 145 65 160 55 L160 80 L0 80 Z" fill={color} opacity={opacity * 0.7} />
    </svg>
  )
}

export function DoodleCircles({ color = '#C4553B', opacity = 0.06 }: { color?: string; opacity?: number }) {
  return (
    <svg style={{ position: 'absolute', top: 0, right: 0, pointerEvents: 'none' }} width="100" height="100" viewBox="0 0 100 100" fill="none">
      <circle cx="80" cy="20" r="30" stroke={color} strokeWidth="1.5" opacity={opacity} fill="none" />
      <circle cx="90" cy="10" r="18" stroke={color} strokeWidth="1" opacity={opacity * 0.7} fill="none" />
      <circle cx="70" cy="30" r="8" fill={color} opacity={opacity * 0.5} />
    </svg>
  )
}

export function DoodleDots({ color = '#2C1A0F', opacity = 0.05 }: { color?: string; opacity?: number }) {
  const dots = []
  for (let x = 0; x < 5; x++) for (let y = 0; y < 3; y++) dots.push({ x: x * 14 + 4, y: y * 14 + 4 })
  return (
    <svg style={{ position: 'absolute', bottom: 8, left: 8, pointerEvents: 'none' }} width="74" height="46" viewBox="0 0 74 46" fill="none">
      {dots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r="2" fill={color} opacity={opacity} />)}
    </svg>
  )
}

export function DoodleStar({ color = '#D4A017', size = 20, opacity = 0.5 }: { color?: string; size?: number; opacity?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={{ display: 'inline-block' }}>
      <path d="M10 1L11.8 7.2L18 7.2L13 11.2L14.8 17.4L10 13.4L5.2 17.4L7 11.2L2 7.2L8.2 7.2Z" fill={color} opacity={opacity} />
    </svg>
  )
}

export function DoodleCurve({ color = '#3A8580', opacity = 0.12 }: { color?: string; opacity?: number }) {
  return (
    <svg style={{ position: 'absolute', top: -10, left: -10, pointerEvents: 'none' }} width="120" height="80" viewBox="0 0 120 80" fill="none">
      <path d="M0 60 C20 20 60 10 120 30" stroke={color} strokeWidth="2" opacity={opacity} fill="none" strokeLinecap="round" />
      <path d="M0 70 C30 40 70 25 120 45" stroke={color} strokeWidth="1.5" opacity={opacity * 0.6} fill="none" strokeLinecap="round" />
    </svg>
  )
}
