// ─── SyncIndicator: status do sync (sidebar footer / mobile menu) ───
import { motion, AnimatePresence } from 'framer-motion'
import { IconCloudCheck, IconCloudUpload, IconCloudOff, IconAlertTriangle, IconRefresh } from '@tabler/icons-react'
import { useSyncStore } from '@/store/sync'
import { syncNow } from '@/lib/sync'

interface SyncIndicatorProps {
  collapsed?: boolean
  variant?: 'sidebar' | 'inline'
}

function timeAgo(ts: number | null): string {
  if (!ts) return 'nunca'
  const diff = Date.now() - ts
  const s = Math.floor(diff / 1000)
  if (s < 5) return 'agora'
  if (s < 60) return `${s}s atrás`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min atrás`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h atrás`
  const d = Math.floor(h / 24)
  return `${d}d atrás`
}

export function SyncIndicator({ collapsed = false, variant = 'sidebar' }: SyncIndicatorProps) {
  const { status, lastSyncAt, errorMessage } = useSyncStore()

  const config = (() => {
    switch (status) {
      case 'syncing':
        return { icon: IconCloudUpload, color: '#F1C40F', label: 'Sincronizando…', spin: true }
      case 'error':
        return { icon: IconAlertTriangle, color: '#E55E3C', label: 'Erro', spin: false }
      case 'offline':
        return { icon: IconCloudOff, color: 'rgba(255,255,255,0.4)', label: 'Offline', spin: false }
      default:
        return { icon: IconCloudCheck, color: '#3AA876', label: 'Sincronizado', spin: false }
    }
  })()

  const Icon = config.icon
  const subtitle = status === 'error' ? (errorMessage ?? 'falha no sync') : timeAgo(lastSyncAt)

  const isInline = variant === 'inline'
  const textColor = isInline ? '#3C2D24' : 'rgba(255,255,255,0.85)'
  const subColor = isInline ? '#9B8A7A' : 'rgba(255,255,255,0.45)'

  return (
    <motion.button
      onClick={() => void syncNow()}
      whileHover={{ background: isInline ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.07)' }}
      whileTap={{ scale: 0.97 }}
      title={collapsed ? `${config.label} — ${subtitle}` : 'Sincronizar agora'}
      style={{
        width: '100%',
        padding: collapsed ? '10px 0' : '9px 10px',
        borderRadius: 11,
        border: 'none',
        cursor: 'pointer',
        background: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: collapsed ? 0 : 10,
        transition: 'background .12s',
      }}
    >
      <motion.div
        animate={config.spin ? { rotate: 360 } : { rotate: 0 }}
        transition={config.spin ? { duration: 1.4, repeat: Infinity, ease: 'linear' } : { duration: 0.2 }}
        style={{ display: 'flex' }}
      >
        <Icon size={17} stroke={1.8} color={config.color} />
      </motion.div>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0, flex: 1 }}
          >
            <span style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 13,
              fontWeight: 500,
              color: textColor,
              lineHeight: 1.2,
            }}>
              {config.label}
            </span>
            <span style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 10.5,
              color: subColor,
              lineHeight: 1.3,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
            }}>
              {subtitle}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      {!collapsed && status === 'idle' && (
        <IconRefresh size={13} stroke={1.6} color={subColor} />
      )}
    </motion.button>
  )
}
