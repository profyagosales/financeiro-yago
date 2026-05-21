import { ReactNode } from 'react'

export function PageWrapper({ children }: { children: ReactNode }) {
  return (
    <div style={{ padding: '24px 28px', width: '100%' }}>
      {children}
    </div>
  )
}
