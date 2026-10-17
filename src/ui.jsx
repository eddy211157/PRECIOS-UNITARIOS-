import { useEffect } from 'react'

export const bs = (n) =>
  new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0)
export const hoy = () => new Date().toISOString().slice(0, 10)
export const fecha = (f) => (f ? f.split('-').reverse().join('/') : '—')

export function Modal({ titulo, onClose, children, ancho = 600 }) {
  useEffect(() => {
    const t = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', t)
    return () => window.removeEventListener('keydown', t)
  }, [onClose])
  return (
    <div className="velo" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: ancho }}>
        <div className="modal-cab">
          <h3>{titulo}</h3>
          <button className="btn plano" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        <div className="modal-cuerpo">{children}</div>
      </div>
    </div>
  )
}

export function Campo({ label, children, ancho }) {
  return (
    <label className="campo" style={ancho ? { gridColumn: 'span ' + ancho } : null}>
      <span>{label}</span>
      {children}
    </label>
  )
}

export function Texto({ label, v, set, tipo = 'text', ancho, ...resto }) {
  return (
    <Campo label={label} ancho={ancho}>
      <input type={tipo} step={tipo === 'number' ? 'any' : undefined} value={v ?? ''} onChange={(e) => set(e.target.value)} {...resto} />
    </Campo>
  )
}

export function Lista({ label, v, set, opciones, ancho }) {
  return (
    <Campo label={label} ancho={ancho}>
      <select value={v ?? ''} onChange={(e) => set(e.target.value)}>
        {opciones.map((o) => {
          const [a, b] = Array.isArray(o) ? o : [o, o]
          return <option key={a} value={a}>{b}</option>
        })}
      </select>
    </Campo>
  )
}

export function Luz({ e }) {
  const m = { ok: ['Correcto', 'ok'], rev: ['Revisar', 'rev'], err: ['Error', 'err'] }[e]
  return <span className={'luz ' + m[1]}><i />{m[0]}</span>
}

export function Estado({ e }) {
  const c = { 'ACTUALIZADO': 'ok', 'POR ACTUALIZAR': 'rev', 'REVISAR': 'rev', 'PRECIO ANTIGUO': 'err' }[e]
  return <span className={'chip ' + c}>{e}</span>
}

export const Vacio = ({ children }) => <div className="vacio">{children}</div>
