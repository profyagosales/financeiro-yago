interface CategoryIconProps {
  nome: string
  cor: string
  size?: number
  radius?: number
}

export function CategoryIcon({ nome, cor, size = 48, radius = 16 }: CategoryIconProps) {
  const s = size * 0.75
  return (
    <div style={{ width: size, height: size, borderRadius: radius, background: cor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        {getIconPaths(nome)}
      </svg>
    </div>
  )
}

function getIconPaths(nome: string) {
  const n = nome.toLowerCase()

  if (n.includes('aliment') || n.includes('comida') || n.includes('restaur')) return (
    <>
      <path d="M7 26 Q7 34 20 34 Q33 34 33 26" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
      <ellipse cx="20" cy="26" rx="13" ry="3.5" fill="white" opacity=".2"/>
      <path d="M13 23 C11 18 13 13 12 7" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M20 21 C18 16 20 11 19 5" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M27 23 C25 18 27 13 26 7" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="35" y1="6" x2="35" y2="34" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M33 6 L33 14 Q35 17 37 14 L37 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    </>
  )

  if (n.includes('morad') || n.includes('aluguel') || n.includes('casa') || n.includes('imóv')) return (
    <>
      <path d="M4 22 L20 6 L36 22" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="9" y="21" width="22" height="15" rx="2.5" stroke="white" strokeWidth="2"/>
      <path d="M16 29 Q20 25 24 29 Q27 32.5 20 37 Q13 32.5 16 29Z" fill="white" opacity=".8"/>
      <rect x="28" y="13" width="5" height="9" rx="1.5" fill="white" opacity=".5"/>
      <path d="M28 12 C30 8 32 8 33 12" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity=".6"/>
    </>
  )

  if (n.includes('transp') || n.includes('carro') || n.includes('combustív') || n.includes('uber')) return (
    <>
      <rect x="3" y="16" width="28" height="13" rx="5" stroke="white" strokeWidth="2"/>
      <path d="M31 23 L37 23 L37 20 L31 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 16 L11 10 L25 10 L29 16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="13" y="12" width="8" height="5" rx="1.5" fill="white" opacity=".4"/>
      <circle cx="10" cy="29" r="4.5" stroke="white" strokeWidth="2"/>
      <circle cx="10" cy="29" r="1.8" fill="white"/>
      <circle cx="26" cy="29" r="4.5" stroke="white" strokeWidth="2"/>
      <circle cx="26" cy="29" r="1.8" fill="white"/>
      <line x1="3" y1="19" x2="0" y2="21" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity=".5"/>
      <line x1="3" y1="23" x2="0" y2="25" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity=".5"/>
    </>
  )

  if (n.includes('saúde') || n.includes('saude') || n.includes('médic') || n.includes('medic') || n.includes('farmác')) return (
    <>
      <path d="M20 35 C20 35 5 26 5 15 C5 9.5 9.5 6 14 6 C17 6 20 8.5 20 8.5 C20 8.5 23 6 26 6 C30.5 6 35 9.5 35 15 C35 26 20 35 20 35Z" fill="white" opacity=".25" stroke="white" strokeWidth="2"/>
      <path d="M7 21 L12 21 L15 14 L20 28 L25 18 L28 21 L33 21" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </>
  )

  if (n.includes('lazer') || n.includes('entret') || n.includes('hobby') || n.includes('jogo')) return (
    <>
      <path d="M20 3 L22.5 13.5 L33 11 L26 19 L33 27 L22.5 24.5 L20 34 L17.5 24.5 L7 27 L14 19 L7 11 L17.5 13.5Z" fill="white" opacity=".3" stroke="white" strokeWidth="1.8" strokeLinejoin="round"/>
      <circle cx="33" cy="33" r="3" fill="white" opacity=".8"/>
      <circle cx="8" cy="32" r="2" fill="white" opacity=".6"/>
      <circle cx="34" cy="9" r="2" fill="white" opacity=".5"/>
    </>
  )

  if (n.includes('educ') || n.includes('escola') || n.includes('curso') || n.includes('facul')) return (
    <>
      <path d="M20 7 L4 16 L20 25 L36 16Z" fill="white" opacity=".3" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M10 20 L10 31 Q10 35 20 35 Q30 35 30 31 L30 20" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <path d="M36 16 L36 28" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="36" cy="30" r="2.5" fill="white"/>
      <path d="M16 9 L16 5 L20 3 L24 5 L24 9" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity=".5"/>
    </>
  )

  if (n.includes('vestu') || n.includes('roupa') || n.includes('moda') || n.includes('calç')) return (
    <>
      <path d="M14 5 L8 10 L12 19 L16 15 L16 35 L24 35 L24 15 L28 19 L32 10 L26 5 C25 8 22 11 20 11 C18 11 15 8 14 5Z" fill="white" opacity=".3" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
      <line x1="34" y1="7" x2="34" y2="9" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity=".8"/>
      <line x1="34" y1="11" x2="34" y2="13" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity=".8"/>
      <line x1="31" y1="10" x2="33" y2="10" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity=".8"/>
      <line x1="35" y1="10" x2="37" y2="10" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity=".8"/>
      <circle cx="34" cy="10" r="1.2" fill="white"/>
    </>
  )

  if (n.includes('assin') || n.includes('stream') || n.includes('netflix') || n.includes('spotify')) return (
    <>
      <rect x="5" y="8" width="30" height="20" rx="5" stroke="white" strokeWidth="2"/>
      <path d="M16 14 L28 18 L16 22Z" fill="white" opacity=".85"/>
      <line x1="13" y1="33" x2="27" y2="33" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="20" y1="28" x2="20" y2="33" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M8 6 C12 3 16 2 20 2 C24 2 28 3 32 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity=".45"/>
    </>
  )

  if (n.includes('invest') || n.includes('rend') || n.includes('poupan') || n.includes('bolsa')) return (
    <>
      <rect x="4" y="24" width="8" height="12" rx="2" fill="white" opacity=".45"/>
      <rect x="16" y="17" width="8" height="19" rx="2" fill="white" opacity=".65"/>
      <rect x="28" y="9" width="8" height="27" rx="2" fill="white" opacity=".9"/>
      <path d="M8 22 L20 15 L32 7" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
      <path d="M27 7 L32 7 L32 12" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="8" cy="22" r="2.5" fill="white"/>
      <circle cx="20" cy="15" r="2.5" fill="white"/>
    </>
  )

  if (n.includes('salár') || n.includes('salar') || n.includes('receita') || n.includes('renda') || n.includes('freela')) return (
    <>
      <circle cx="20" cy="18" r="11" stroke="white" strokeWidth="2" fill="white" opacity=".2"/>
      <path d="M20 10 L20 14 M20 22 L20 26" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <path d="M16 14 Q16 12 20 12 Q24 12 24 15 Q24 18 20 18 Q16 18 16 21 Q16 24 20 24 Q24 24 24 22" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <path d="M6 32 Q13 27 20 28 Q27 27 34 32" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" opacity=".6"/>
    </>
  )

  // Outros / fallback
  return (
    <>
      <circle cx="20" cy="20" r="12" stroke="white" strokeWidth="2" fill="white" opacity=".2"/>
      <circle cx="20" cy="20" r="3" fill="white"/>
      <circle cx="20" cy="11" r="2" fill="white" opacity=".7"/>
      <circle cx="20" cy="29" r="2" fill="white" opacity=".7"/>
      <circle cx="11" cy="20" r="2" fill="white" opacity=".7"/>
      <circle cx="29" cy="20" r="2" fill="white" opacity=".7"/>
    </>
  )
}
