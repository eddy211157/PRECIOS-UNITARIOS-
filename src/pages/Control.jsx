import { Fragment, useMemo, useState } from 'react'
import { Luz } from '../ui.jsx'
import { calcPresupuesto, recursosUsados, estadoPrecio, limiteDias, num, definido } from '../calc.js'

export default function Control({ ctx }) {
  const [abierto, setAbierto] = useState(null)
  const checks = useMemo(() => {
    const pr = calcPresupuesto(ctx)
    const limite = limiteDias(pr.P)
    const usados = recursosUsados(ctx.lineas, pr.recMap)
    const nom = (r) => r.codigo + ' · ' + r.descripcion
    const it = (f) => f.item.orden + '. ' + f.item.descripcion
    const tipoUsado = (t) => usados.filter((r) => r.tipo === t && (r.precio == null || num(r.precio) === 0))
    const cods = {}
    ctx.items.forEach((i) => { if (i.codigo) cods[i.codigo] = (cods[i.codigo] || 0) + 1 })
    const clavesPct = ['cargas_sociales', 'iva_mo', 'herramientas_menores', 'gastos_generales', 'utilidad']
    return [
      ['Material sin precio (usado en APU)', 'err', tipoUsado('material').map(nom)],
      ['Mano de obra sin precio (usada en APU)', 'err', tipoUsado('mano_obra').map(nom)],
      ['Equipo sin precio (usado en APU)', 'err', tipoUsado('equipo').map(nom)],
      ['Herramienta sin precio (usada en APU)', 'err', tipoUsado('herramienta').map(nom)],
      ['Ítem sin APU', 'err', pr.filas.filter((f) => f.lineas.length === 0).map(it)],
      ['Cantidad igual a cero', 'rev', pr.filas.filter((f) => f.cant === 0).map(it)],
      ['Precio unitario igual a cero (con APU)', 'err', pr.filas.filter((f) => f.lineas.length && f.pu === 0).map(it)],
      ['Porcentaje sin definir', 'rev', ctx.parametros.filter((p) => clavesPct.includes(p.clave) && !definido(p.valor)).map((p) => p.nombre)],
      ['Impuesto activo sin porcentaje', 'err', ctx.impuestos.filter((i) => i.activo && !definido(i.porcentaje)).map((i) => i.nombre)],
      ['Precio antiguo o sin fecha', 'rev', usados.filter((r) => r.precio != null && estadoPrecio(r.fecha_precio, limite) !== 'ACTUALIZADO').map(nom)],
      ['Código de ítem duplicado', 'err', Object.keys(cods).filter((k) => cods[k] > 1)],
      ['Unidad no definida', 'rev', [...pr.filas.filter((f) => !f.item.unidad).map(it), ...usados.filter((r) => !r.unidad).map(nom)]],
      ['Superficie construida sin definir (costo por m²)', 'rev', num(ctx.proyecto.superficie) > 0 ? [] : ['Datos del proyecto']],
      ['Fórmula con error', 'err', pr.filas.filter((f) => !Number.isFinite(f.importe)).map(it)],
    ].map(([titulo, gravedad, lista]) => ({ titulo, lista, e: lista.length ? gravedad : 'ok' }))
  }, [ctx.items, ctx.lineas, ctx.recursos, ctx.parametros, ctx.impuestos, ctx.proyecto])

  const global = checks.some((c) => c.e === 'err') ? 'err' : checks.some((c) => c.e === 'rev') ? 'rev' : 'ok'
  return (
    <>
      <div className="fila"><h1>Control y validación</h1><span className="espacio" /><Luz e={global} /></div>
      <p className="suave">Revisión automática del presupuesto del proyecto activo.</p>
      <div className="panel">
        <table><tbody>
          {checks.map((c) => (
            <Fragment key={c.titulo}>
              <tr onClick={() => c.lista.length && setAbierto(abierto === c.titulo ? null : c.titulo)} style={{ cursor: c.lista.length ? 'pointer' : 'default' }}>
                <td style={{ width: 130 }}><Luz e={c.e} /></td><td>{c.titulo}</td>
                <td className="d suave">{c.lista.length ? c.lista.length + ' caso(s)' : ''}</td>
              </tr>
              {abierto === c.titulo && <tr><td /><td colSpan={2} className="suave">{c.lista.slice(0, 40).join(' — ')}{c.lista.length > 40 ? ' …' : ''}</td></tr>}
            </Fragment>
          ))}
        </tbody></table>
      </div>
    </>
  )
}
