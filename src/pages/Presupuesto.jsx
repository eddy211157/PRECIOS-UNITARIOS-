import { Fragment, useMemo } from 'react'
import { bs } from '../ui.jsx'
import { calcPresupuesto } from '../calc.js'

export default function Presupuesto({ ctx }) {
  const pr = useMemo(() => calcPresupuesto(ctx), [ctx.items, ctx.lineas, ctx.recursos, ctx.parametros, ctx.impuestos, ctx.proyecto])
  const t = pr.tot
  const lin = (n, v) => <tr key={n}><td>{n}</td><td className="d">{bs(v)}</td></tr>
  return (
    <>
      <div className="fila"><h1>Presupuesto general</h1><span className="espacio" />
        <button className="btn no-imprimir" onClick={() => window.print()}>Imprimir / guardar PDF</button></div>
      <p className="suave">{ctx.proyecto.nombre}</p>
      <div className="panel scroll">
        <table>
          <thead><tr><th>Nº</th><th>Ítem</th><th>Descripción</th><th>Unidad</th><th className="d">Cantidad</th><th className="d">P. unitario</th><th className="d">Importe</th></tr></thead>
          <tbody>
            {pr.grupos.map((g) => (
              <Fragment key={g.capitulo}>
                <tr className="cab"><td colSpan={6}>{g.capitulo}</td><td className="d">{bs(g.total)}</td></tr>
                {g.filas.map((f) => (
                  <tr key={f.item.id}><td>{f.item.orden}</td><td>{f.item.codigo || '—'}</td><td>{f.item.descripcion}</td><td>{f.item.unidad}</td>
                    <td className="d">{bs(f.cant)}</td><td className="d">{bs(f.pu)}</td><td className="d">{bs(f.importe)}</td></tr>
                ))}
              </Fragment>
            ))}
            {pr.filas.length === 0 && <tr><td colSpan={7} className="suave">Agrega ítems en “Cómputos y APU”.</td></tr>}
            <tr className="tot"><td colSpan={6}>TOTAL GENERAL (Bs)</td><td className="d">{bs(t.total)}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))' }}>
        <div className="panel"><h2>Resumen por capítulos</h2>
          <table><thead><tr><th>Capítulo</th><th className="d">Importe Bs</th><th className="d">%</th></tr></thead><tbody>
            {pr.grupos.map((g) => (
              <tr key={g.capitulo}><td>{g.capitulo}</td><td className="d">{bs(g.total)}</td>
                <td className="d">{t.total ? bs((g.total / t.total) * 100) : '0,00'}</td></tr>
            ))}
          </tbody></table></div>
        <div className="panel"><h2>Totales por componente</h2>
          <table><tbody>
            {lin('Total materiales', t.mat)}{lin('Total mano de obra', t.mo)}
            {lin('Beneficios / cargas sociales', t.cs)}{lin('IVA mano de obra', t.iva)}
            {lin('Total equipos', t.eq)}{lin('Total herramientas', t.herr)}
            {lin('Costo directo', t.directo)}{lin('Total gastos generales', t.gg)}
            {lin('Total utilidad', t.ut)}{lin('Total impuestos', t.imp)}
          </tbody></table>
          <p className="suave" style={{ fontSize: '.8rem' }}>Los componentes se calculan sin redondear; el total general suma los importes ya redondeados a 2 decimales, por lo que puede diferir por centavos.</p>
          <hr />
          <p><b>Superficie:</b> {bs(ctx.proyecto.superficie)} m²<br /><b>Costo total:</b> Bs {bs(t.total)}<br />
            <b>Costo por m²:</b> {pr.m2 ? 'Bs ' + bs(pr.m2) : 'Indica la superficie en Datos del proyecto'}</p>
        </div>
      </div>
    </>
  )
}
