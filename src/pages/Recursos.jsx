import { useState } from 'react'
import { guardar, borrar } from '../supabase'
import { Modal, Texto, bs, hoy, fecha, Estado } from '../ui.jsx'
import { num, estadoPrecio, mapaParametros, limiteDias } from '../calc.js'

const T = {
  material: { titulo: 'Materiales', pre: 'MAT', precio: 'Precio unitario (Bs)' },
  mano_obra: { titulo: 'Mano de obra', pre: 'MO', precio: 'Costo por hora (Bs)' },
  equipo: { titulo: 'Equipos y maquinaria', pre: 'EQ', precio: 'Costo horario (Bs)' },
  herramienta: { titulo: 'Herramientas', pre: 'HER', precio: 'Precio unitario (Bs)' },
}

export default function Recursos({ tipo, ctx }) {
  const cfg = T[tipo]
  const lista = ctx.recursos.filter((r) => r.tipo === tipo)
  const limite = limiteDias(mapaParametros(ctx.parametros))
  const [q, setQ] = useState('')
  const [ed, setEd] = useState(null)
  const filtrada = lista.filter((r) => (r.codigo + ' ' + r.descripcion + ' ' + (r.familia || '')).toLowerCase().includes(q.toLowerCase()))

  function nuevo() {
    let n = lista.length + 1
    while (ctx.recursos.some((r) => r.codigo === cfg.pre + '-' + String(n).padStart(3, '0'))) n++
    setEd({ tipo, codigo: cfg.pre + '-' + String(n).padStart(3, '0'), descripcion: '', unidad: tipo === 'mano_obra' ? 'hr' : tipo === 'equipo' ? 'hr' : '', horas_jornada: 8, fecha_precio: hoy() })
  }
  async function salvar() {
    const { updated_at, created_at, ...f } = ed
    if (!f.codigo || !f.descripcion) return alert('Completa el código y la descripción.')
    if (tipo === 'mano_obra') f.precio = num(f.horas_jornada) > 0 && f.jornal !== '' && f.jornal != null ? Math.round((num(f.jornal) / num(f.horas_jornada)) * 10000) / 10000 : null
    if (tipo === 'equipo') {
      const s = num(f.combustible) + num(f.operador) + num(f.mantenimiento) + num(f.depreciacion)
      if (s > 0) f.precio = s
    }
    if (f.id) {
      const o = lista.find((r) => r.id === f.id)
      if (num(f.precio) !== num(o.precio) && f.fecha_precio === o.fecha_precio) f.fecha_precio = hoy()
    }
    if (await guardar('recursos', f)) { setEd(null); ctx.recargar() }
  }
  const set = (k) => (v) => setEd({ ...ed, [k]: v })

  return (
    <>
      <div className="fila"><h1>{cfg.titulo}</h1><span className="espacio" />
        <input placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 220 }} />
        <button className="btn" onClick={nuevo}>+ Agregar</button></div>
      <p className="suave">Al cambiar un precio aquí se actualizan solos los APU, el presupuesto, el resumen y el costo por m².</p>
      <div className="panel scroll">
        <table>
          <thead><tr><th>Código</th><th>Descripción</th><th>Unidad</th>
            {tipo === 'mano_obra' && <><th className="d">Jornal</th><th className="d">Horas</th></>}
            <th className="d">{cfg.precio}</th><th>Proveedor / fuente</th><th>Fecha</th><th>Estado</th><th /></tr></thead>
          <tbody>
            {filtrada.map((r) => (
              <tr key={r.id}>
                <td>{r.codigo}</td><td>{r.descripcion}</td><td>{r.unidad || '—'}</td>
                {tipo === 'mano_obra' && <><td className="d">{r.jornal != null ? bs(r.jornal) : '—'}</td><td className="d">{r.horas_jornada}</td></>}
                <td className="d">{r.precio != null ? bs(r.precio) : <span className="chip rev">Sin precio</span>}</td>
                <td>{[r.proveedor, r.fuente].filter(Boolean).join(' · ') || '—'}</td>
                <td>{fecha(r.fecha_precio)}</td>
                <td><Estado e={r.precio == null ? 'REVISAR' : estadoPrecio(r.fecha_precio, limite)} /></td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn sec chico" onClick={() => setEd({ ...r })}>Editar</button>{' '}
                  <button className="btn rojo chico" onClick={async () => (await borrar('recursos', r.id, 'Si este recurso está en algún APU no se podrá eliminar. ¿Continuar?')) && ctx.recargar()}>✕</button>
                </td>
              </tr>
            ))}
            {filtrada.length === 0 && <tr><td colSpan={10} className="suave">No hay registros.</td></tr>}
          </tbody>
        </table>
      </div>

      {ed && (
        <Modal titulo={(ed.id ? 'Editar ' : 'Agregar ') + cfg.titulo.toLowerCase()} onClose={() => setEd(null)}>
          <div className="grid">
            <Texto label="Código" v={ed.codigo} set={set('codigo')} />
            <Texto label="Familia" v={ed.familia} set={set('familia')} />
            <Texto label="Descripción" ancho={2} v={ed.descripcion} set={set('descripcion')} />
            <Texto label="Unidad" v={ed.unidad} set={set('unidad')} />
            {tipo === 'mano_obra' && <>
              <Texto label="Jornal (Bs)" tipo="number" v={ed.jornal} set={set('jornal')} />
              <Texto label="Horas por jornada" tipo="number" v={ed.horas_jornada} set={set('horas_jornada')} />
              <div className="campo"><span>Costo por hora (automático)</span><b className="grande">{num(ed.horas_jornada) > 0 && ed.jornal ? bs(num(ed.jornal) / num(ed.horas_jornada)) : '—'}</b></div>
            </>}
            {tipo === 'equipo' && <>
              <Texto label="Combustible (Bs/hr)" tipo="number" v={ed.combustible} set={set('combustible')} />
              <Texto label="Operador (Bs/hr)" tipo="number" v={ed.operador} set={set('operador')} />
              <Texto label="Mantenimiento (Bs/hr)" tipo="number" v={ed.mantenimiento} set={set('mantenimiento')} />
              <Texto label="Depreciación (Bs/hr)" tipo="number" v={ed.depreciacion} set={set('depreciacion')} />
            </>}
            {tipo !== 'mano_obra' && <Texto label={cfg.precio + (tipo === 'equipo' ? ' (se suma solo si llenas los de arriba)' : '')} tipo="number" v={ed.precio} set={set('precio')} />}
            <Texto label="Proveedor" v={ed.proveedor} set={set('proveedor')} />
            <Texto label="Fuente del precio" v={ed.fuente} set={set('fuente')} />
            <Texto label="N.º de documento / cotización" v={ed.nro_documento} set={set('nro_documento')} />
            <Texto label="Fecha del precio" tipo="date" v={ed.fecha_precio} set={set('fecha_precio')} />
            <Texto label="Observaciones" ancho={2} v={ed.observaciones} set={set('observaciones')} />
          </div>
          <div className="fila" style={{ marginTop: 16 }}>
            <button className="btn" onClick={salvar}>Guardar</button>
            <button className="btn sec" onClick={() => setEd(null)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </>
  )
}
