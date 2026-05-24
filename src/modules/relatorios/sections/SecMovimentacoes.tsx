// ─── Movimentações Relevantes: tabela com busca + sort ─────────────
import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  IconArrowsSort, IconSearch, IconArrowUpRight, IconArrowDownRight,
  IconTable, IconChevronUp, IconChevronDown,
} from '@tabler/icons-react'
import { SectionShell } from '../components/SectionShell'
import { fmt, fmtDate } from '@/lib/format'
import type { RelatoriosData } from '../lib/useRelatoriosData'

interface Props { d: RelatoriosData }

type SortKey = 'data' | 'valor' | 'descricao' | 'categoria'
type SortDir = 'asc' | 'desc'

export function SecMovimentacoes({ d }: Props) {
  const [busca, setBusca] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('valor')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [pagina, setPagina] = useState(1)
  const POR_PAGINA = 15

  const categoriasMap = useMemo(
    () => new Map(d.categorias.map(c => [c.id, c])),
    [d.categorias],
  )
  const contasMap = useMemo(
    () => new Map(d.contas.map(c => [c.id, c])),
    [d.contas],
  )

  // Filtra + ordena
  const lista = useMemo(() => {
    let arr = d.txsPeriodo
    if (busca.trim()) {
      const q = busca.trim().toLowerCase()
      arr = arr.filter(t => {
        const cat = categoriasMap.get(t.categoriaId)
        const conta = contasMap.get(t.contaId)
        return t.descricao.toLowerCase().includes(q)
          || cat?.nome.toLowerCase().includes(q)
          || conta?.nome.toLowerCase().includes(q)
      })
    }
    arr = [...arr].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'data':       cmp = a.data.localeCompare(b.data); break
        case 'valor':      cmp = a.valor - b.valor; break
        case 'descricao':  cmp = a.descricao.localeCompare(b.descricao); break
        case 'categoria': {
          const ca = categoriasMap.get(a.categoriaId)?.nome ?? ''
          const cb = categoriasMap.get(b.categoriaId)?.nome ?? ''
          cmp = ca.localeCompare(cb)
          break
        }
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [d.txsPeriodo, busca, sortKey, sortDir, categoriasMap, contasMap])

  const totalPaginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const paginadas = lista.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA)

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
    setPagina(1)
  }

  return (
    <SectionShell
      id="movimentacoes"
      eyebrow="Movimentações"
      title="Detalhamento completo"
      description={`${lista.length} ${lista.length === 1 ? 'transação' : 'transações'} no período. Busque, ordene, explore.`}
      icon={<IconTable size={18} stroke={2} color="#7A5C4F" />}
      accent="#7A5C4F"
    >
      {/* Search bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px',
        background: '#FBF8F3',
        border: '1px solid #EDE6DC',
        borderRadius: 12,
        marginBottom: 12,
      }}>
        <IconSearch size={15} stroke={2.2} color="#9B7B6A" />
        <input
          value={busca}
          onChange={e => { setBusca(e.target.value); setPagina(1) }}
          placeholder="Buscar por descrição, categoria ou conta..."
          style={{
            flex: 1, border: 'none', background: 'transparent', outline: 'none',
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 13, color: '#2C1A0F',
          }}
        />
        {busca && (
          <button onClick={() => setBusca('')}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11,
              fontWeight: 600, color: '#7A5C4F',
            }}>Limpar</button>
        )}
      </div>

      {/* Tabela */}
      {lista.length === 0 ? (
        <div style={{
          padding: '32px 20px', textAlign: 'center',
          background: '#FBF8F3', borderRadius: 12,
        }}>
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#9B7B6A',
            margin: 0, fontWeight: 500,
          }}>Nenhuma transação encontrada.</p>
        </div>
      ) : (
        <div style={{
          border: '1px solid #EDE6DC', borderRadius: 12, overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '90px 1fr 160px 110px 130px',
            gap: 10,
            padding: '10px 14px',
            background: '#FBF8F3',
            borderBottom: '1px solid #EDE6DC',
          }} className="mov-row mov-header">
            <SortHeader label="Data" active={sortKey === 'data'} dir={sortDir} onClick={() => handleSort('data')} />
            <SortHeader label="Descrição" active={sortKey === 'descricao'} dir={sortDir} onClick={() => handleSort('descricao')} />
            <SortHeader label="Categoria" active={sortKey === 'categoria'} dir={sortDir} onClick={() => handleSort('categoria')} />
            <span className="hide-mobile" style={HEADER_STYLE}>Conta</span>
            <SortHeader label="Valor" active={sortKey === 'valor'} dir={sortDir} onClick={() => handleSort('valor')} alignRight />
          </div>

          {/* Linhas */}
          {paginadas.map((t, i) => {
            const cat = categoriasMap.get(t.categoriaId)
            const conta = contasMap.get(t.contaId)
            const isRec = t.tipo === 'receita'
            return (
              <motion.div
                key={t.id ?? i}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                className="mov-row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '90px 1fr 160px 110px 130px',
                  gap: 10, alignItems: 'center',
                  padding: '10px 14px',
                  borderBottom: i < paginadas.length - 1 ? '1px solid #F5EEE3' : 'none',
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  transition: 'background .12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#FBF8F3')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ fontSize: 11.5, color: '#7A5C4F', fontWeight: 600 }}>
                  {fmtDate(t.data)}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                  {isRec
                    ? <IconArrowUpRight size={13} stroke={2.4} color="#1E7D5A" style={{ flexShrink: 0 }} />
                    : <IconArrowDownRight size={13} stroke={2.4} color="#A8442B" style={{ flexShrink: 0 }} />}
                  <span style={{
                    fontSize: 13, fontWeight: 600, color: '#2C1A0F',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{t.descricao || cat?.nome || 'Transação'}</span>
                </div>
                {cat ? (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '3px 8px', borderRadius: 7,
                    background: `${cat.cor}1c`, color: cat.cor,
                    fontSize: 11, fontWeight: 700,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    width: 'fit-content', maxWidth: '100%',
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: 2, background: cat.cor, flexShrink: 0 }} />
                    {cat.nome}
                  </span>
                ) : <span style={{ fontSize: 11, color: '#9B7B6A' }}>—</span>}
                <span className="hide-mobile" style={{
                  fontSize: 11.5, color: '#7A5C4F', fontWeight: 500,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{conta?.nome ?? '—'}</span>
                <span style={{
                  fontSize: 14, fontWeight: 700,
                  color: isRec ? '#1E7D5A' : '#A8442B',
                  letterSpacing: '-0.3px', textAlign: 'right',
                }}>{isRec ? '+' : '−'}{fmt(t.valor).replace('-', '').replace('+', '')}</span>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPaginas > 1 && (
        <div style={{
          marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
        }}>
          <span style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 11.5, color: '#7A5C4F', fontWeight: 500,
          }}>
            Mostrando {(paginaAtual - 1) * POR_PAGINA + 1}–{Math.min(paginaAtual * POR_PAGINA, lista.length)} de {lista.length}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <PaginBtn disabled={paginaAtual === 1} onClick={() => setPagina(p => p - 1)}>Anterior</PaginBtn>
            <span style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '6px 10px', borderRadius: 8,
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700, color: '#2C1A0F',
            }}>
              {paginaAtual} de {totalPaginas}
            </span>
            <PaginBtn disabled={paginaAtual === totalPaginas} onClick={() => setPagina(p => p + 1)}>Próximo</PaginBtn>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 640px) {
          .mov-row {
            grid-template-columns: 76px 1fr 100px !important;
          }
          .hide-mobile { display: none !important; }
        }
      `}</style>
    </SectionShell>
  )
}

const HEADER_STYLE: React.CSSProperties = {
  fontFamily: "'Plus Jakarta Sans',sans-serif",
  fontSize: 10, fontWeight: 700, color: '#7A5C4F',
  letterSpacing: '.12em', textTransform: 'uppercase',
}

function SortHeader({ label, active, dir, onClick, alignRight }: {
  label: string; active: boolean; dir: SortDir; onClick: () => void; alignRight?: boolean
}) {
  return (
    <button onClick={onClick}
      style={{
        ...HEADER_STYLE, background: 'transparent', border: 'none', cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 4,
        textAlign: alignRight ? 'right' : 'left',
        justifyContent: alignRight ? 'flex-end' : 'flex-start',
        color: active ? '#2C1A0F' : '#7A5C4F',
      }}>
      {label}
      {active
        ? (dir === 'asc' ? <IconChevronUp size={11} stroke={2.4} /> : <IconChevronDown size={11} stroke={2.4} />)
        : <IconArrowsSort size={10} stroke={2.2} style={{ opacity: 0.45 }} />}
    </button>
  )
}

function PaginBtn({ disabled, onClick, children }: { disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button disabled={disabled} onClick={onClick}
      style={{
        padding: '6px 12px', borderRadius: 8,
        background: disabled ? '#F5EEE3' : '#FFFFFF',
        border: '1px solid #EDE6DC',
        cursor: disabled ? 'default' : 'pointer',
        fontFamily: "'Plus Jakarta Sans',sans-serif",
        fontSize: 11.5, fontWeight: 700,
        color: disabled ? '#C5B8A8' : '#2C1A0F',
        transition: 'all .12s',
      }}>{children}</button>
  )
}
