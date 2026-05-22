import { Variants } from 'framer-motion'

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 24, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 260, damping: 26, mass: 0.8 } },
  exit: { opacity: 0, y: -12, filter: 'blur(2px)', transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } },
}

export const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 280, damping: 26 } },
}

export const listVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12, x: -4 },
  show: { opacity: 1, y: 0, x: 0, transition: { type: 'spring', stiffness: 300, damping: 28 } },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.22 } },
}

export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.88 },
  show: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 380, damping: 28 } },
  exit: { opacity: 0, scale: 0.92, transition: { duration: 0.14 } },
}

export const slideUp: Variants = {
  hidden: { y: '100%' },
  show: { y: 0, transition: { type: 'spring', stiffness: 320, damping: 32 } },
  exit: { y: '100%', transition: { type: 'spring', stiffness: 320, damping: 32 } },
}

export const CARD_HOVER = {
  y: -4,
  boxShadow: '0 12px 36px rgba(44,26,15,0.12), 0 4px 10px rgba(44,26,15,0.06)',
}

export const CARD_TAP = { scale: 0.98 }
export const BTN_TAP = { scale: 0.97 }
