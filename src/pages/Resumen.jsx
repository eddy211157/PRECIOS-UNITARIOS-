import { useMemo } from 'react'
import { bs, fecha, Estado } from '../ui.jsx'
import { calcPresupuesto, recursosUsados, estadoPrecio, peorEstado, limiteDias, num } from '../calc.js'

export default function Resumen({ ctx }) {
  const pr = useMemo(() => calcPresupuesto(ctx), [ctx.items, ctx.lineas, ctx.recursos, ctx.parametros, ctx.impuestos, ctx.proyecto])
  const p = ctx.proyecto, t = pr.tot
  const limite = limiteDias(pr.P)
  const usados = recursosUsados(ctx.lineas, pr.recMap)
  const estado = usados.length ? peorEstado(usados.map((r) => (r.precio == null ? 'REVISAR' : estadoPrecio(r.fecha_precio, limite)))) : 'REVISAR'
  const fila = (a, b) => <tr><td>{a}</td><td>{b || '—'}</td></tr>
  const kpi = (a, v) => <div><small>{a}</small><b>{v}</b></div>

  return (
    <>
      <div className="fila no-imprimir"><h1>Resumen ejecutivo</h1><span className="espacio" />
        <button className="btn" onClick={() => window.print()}>Imprimir / guardar PDF</button></div>
      <div className="panel">
        <h1 style={{ fontSize: '1.7rem' }}>{p.nombre || 'Proyecto sin nombre'}</h1>
        <p className="suave">{[p.tipo_obra, p.codigo && 'Código ' + p.codigo, 'Versión ' + (p.version || '1.0')].filter(Boolean).join(' · ')}</p>
        <div className="scroll"><table style={{ maxWidth: 640 }}><tbody>
          {fila('Entidad contratante', p.entidad)}{fila('Propietario', p.propietario)}
          {fila('Ubicación', [p.ubicacion, p.localidad, p.municipio, p.departamento].filter(Boolean).join(', '))}
          {fila('Fecha de elaboración', fecha(p.fecha_elaboracion))}{fila('Superficie', p.superficie ? bs(p.superficie) + ' m²' : '')}
          {fila('Plazo de ejecución', p.plazo_dias ? p.plazo_dias + ' días' : '')}{fila('Responsable', p.responsable)}
          {fila('Fecha de actualización de precios', fecha(p.fecha_actualizacion))}
          <tr><td>Estado del presupuesto</td><td><Estado e={estado} /></td></tr>
        </tbody></table></div>
      </div>

      <div className="panel">
        <h2>Resumen económico (Bs)</h2>
        <div className="kpi">
          {kpi('Costo directo', bs(t.directo))}{kpi('Gastos generales', bs(t.gg))}{kpi('Utilidad', bs(t.ut))}
          {kpi('Impuestos', bs(t.imp))}{kpi('TOTAL PRESUPUESTO', bs(t.total))}{kpi('Costo por m²', pr.m2 ? bs(pr.m2) : '—')}
        </div>
        <h3 style={{ marginTop: 16 }}>Composición</h3>
        <div className="kpi">
          {kpi('Total materiales', bs(t.mat))}{kpi('Total mano de obra', bs(t.mo))}{kpi('Total equipos', bs(t.eq))}
          {kpi('Total herramientas', bs(t.herr))}{kpi('% gastos generales', num(pr.P.gastos_generales) + ' %')}{kpi('% utilidad', num(pr.P.utilidad) + ' %')}
        </div>
      </div>

      <div className="panel scroll">
        <h2>Por capítulos</h2>
        <table style={{ maxWidth: 640 }}>
          <thead><tr><th>Capítulo</th><th className="d">Importe Bs</th><th className="d">% del total</th><th /></tr></thead>
          <tbody>
            {pr.grupos.map((g) => { const x = t.total ? (g.total / t.total) * 100 : 0; return (
              <tr key={g.capitulo}><td>{g.capitulo}</td><td className="d">{bs(g.total)}</td><td className="d">{bs(x)}</td>
                <td style={{ width: 90 }}><div className="barra"><i style={{ width: x + '%' }} /></div></td></tr>) })}
          </tbody>
        </table>
      </div>
    </>
  )
}
