import { useMemo, useState } from 'react'
import { bs, fecha, Estado } from '../ui.jsx'
import { num, mapaParametros, limiteDias, estadoPrecio, diasDesde } from '../calc.js'

export default function Precios({ ctx }) {
  const P = mapaParametros(ctx.parametros)
  const limite = limiteDias(P)
  const umbral = num(P.umbral_variacion) || 10
  const [q, setQ] = useState('')
  const hist = useMemo(() => ctx.historial.filter((h) => ((h.recursos?.codigo || '') + ' ' + (h.recursos?.descripcion || '')).toLowerCase().includes(q.toLowerCase())), [ctx.historial, q])

  return (
    <>
      <h1>Precios y respaldo</h1>
      <p className="suave">Cada vez que cambias un precio en las bases queda registrado aquí. Se marca una alerta cuando la variación supera {umbral} % (puedes cambiarlo en Parámetros).</p>
      <div className="fila"><h2>Historial de actualización</h2><span className="espacio" />
        <input placeholder="Buscar recurso…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 240 }} /></div>
      <div className="panel scroll">
        <table>
          <thead><tr><th>Recurso</th><th className="d">Precio anterior</th><th className="d">Precio actual</th><th className="d">Variación Bs</th><th className="d">Variación %</th><th>Fecha anterior</th><th>Fecha actual</th><th>Proveedor / fuente</th><th>Observaciones</th></tr></thead>
          <tbody>
            {hist.map((h) => {
              const ant = num(h.precio_anterior), act = num(h.precio_actual)
              const pct = ant ? ((act - ant) / ant) * 100 : null
              const alerta = pct !== null && Math.abs(pct) > umbral
              return (
                <tr key={h.id}>
                  <td>{h.recursos?.codigo} · {h.recursos?.descripcion}</td>
                  <td className="d">{h.precio_anterior != null ? bs(ant) : '—'}</td><td className="d">{bs(act)}</td>
                  <td className="d">{bs(act - ant)}</td>
                  <td className="d">{pct === null ? '—' : <span className={'chip ' + (alerta ? 'err' : 'ok')}>{bs(pct)} %</span>}</td>
                  <td>{fecha(h.fecha_anterior)}</td><td>{fecha(h.fecha_actual)}</td>
                  <td>{[h.proveedor, h.fuente].filter(Boolean).join(' · ') || '—'}</td><td>{h.observaciones || '—'}</td>
                </tr>
              )
            })}
            {hist.length === 0 && <tr><td colSpan={9} className="suave">Aún no hay cambios de precio registrados.</td></tr>}
          </tbody>
        </table>
      </div>

      <h2>Respaldo del precio referencial</h2>
      <p className="suave">Origen de cada precio usado: cotización, proveedor, fecha, fuente y documento. Se completa al editar cada recurso.</p>
      <div className="panel scroll">
        <table>
          <thead><tr><th>Recurso</th><th>Tipo</th><th className="d">Precio</th><th>Proveedor</th><th>Fuente</th><th>N.º documento</th><th>Fecha</th><th className="d">Antigüedad</th><th>Estado</th></tr></thead>
          <tbody>
            {ctx.recursos.map((r) => (
              <tr key={r.id}>
                <td>{r.codigo} · {r.descripcion}</td><td>{r.tipo.replace('_', ' ')}</td>
                <td className="d">{r.precio != null ? bs(r.precio) : '—'}</td>
                <td>{r.proveedor || '—'}</td><td>{r.fuente || '—'}</td><td>{r.nro_documento || '—'}</td>
                <td>{fecha(r.fecha_precio)}</td><td className="d">{diasDesde(r.fecha_precio) ?? '—'} días</td>
                <td><Estado e={r.precio == null ? 'REVISAR' : estadoPrecio(r.fecha_precio, limite)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
