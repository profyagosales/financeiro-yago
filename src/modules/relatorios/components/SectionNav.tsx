// ─── SectionNav: chip nav que rola até a seção quando clicada ──────
// Sticky no topo (abaixo do FiltrosBar).
import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'

export interface NavSection {
  id: string
  label: string
}

interface SectionNavProps {
  sections: NavSection[]
}

export function SectionNav({ sections }: SectionNavProps) {
  const [active, setActive] = useState(sections[0]?.id ?? '')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActive(visible.target.id)
      },
      { rootMargin: '-130px 0px -60% 0px', threshold: [0.1, 0.3, 0.6] },
    )
    sections.forEach(s => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [sections])

  const handleClick = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActive(id)
    }
  }

  return (
    <div style={{
      position: 'sticky',
      top: 78,                  // abaixo do FiltrosBar
      zIndex: 40,
      marginBottom: 18,
    }}>
      <motion.div
        ref={scrollRef}
        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: '1px solid rgba(237,230,220,0.7)',
          borderRadius: 999,
          padding: '6px 8px',
          boxShadow: '0 6px 22px rgba(44,26,15,0.06)',
          display: 'flex', gap: 4,
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
        className="section-nav"
      >
        {sections.map(s => {
          const isActive = active === s.id
          return (
            <button key={s.id}
              onClick={() => handleClick(s.id)}
              style={{
                padding: '6px 14px', borderRadius: 999, border: 'none',
                background: isActive ? '#2C1A0F' : 'transparent',
                color: isActive ? '#FFFFFF' : '#7A5C4F',
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 12, fontWeight: 700, letterSpacing: '.01em',
                cursor: 'pointer', whiteSpace: 'nowrap',
                transition: 'all .15s',
              }}>
              {s.label}
            </button>
          )
        })}
      </motion.div>
      <style>{`.section-nav::-webkit-scrollbar { display: none; }`}</style>
    </div>
  )
}
