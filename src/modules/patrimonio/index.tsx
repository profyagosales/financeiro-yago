import { Dobrao } from '@/components/mascot/Dobrao'
export function Page() {
  return (
    <div style={{ minHeight: '70dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
      <Dobrao mood="sleeping" size={100} />
      <h2 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F' }}>Em construção</h2>
      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#9B7B6A', textAlign: 'center', maxWidth: 280 }}>Chegando na próxima fase!</p>
    </div>
  )
}
