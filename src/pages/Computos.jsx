import { useMemo, useState } from 'react'
import { guardar, borrar } from '../supabase'
import { Modal, Texto, Lista, bs } from '../ui.jsx'
import { CAPITULOS, calcApu, calcPresupuesto, mapaParametros, parcialLinea, num, definido } from '../calc.js'

const TIPOS = [['material', 'Materiales'], ['mano_obra', 'Mano de obra'], ['equipo', 'Equipos y maquinaria'], ['herramienta', 'Herramientas']]

export default function Computos({ ctx }) {
  const [ed, setEd] = useState(null)
  const [apuId, setApuId] = useState(null)
  const pr = useMemo(() => calcPresupuesto(ctx), [ctx.items, ctx.lineas, ctx.recursos, ctx.parametros, ctx.impuestos, ctx.proyecto])
  const set = (k) => (v) => setEd({ ...ed, [k]: v })

  function nuevo() {
    const orden = ctx.items.reduce((m, i) => Math.max(m, i.orden || 0), 0) + 1
    setEd({ proyecto_id: ctx.pid, orden, capitulo: CAPITULOS[0], codigo: '', descripcion: '', unidad: '', cantidad: '' })
  }
  async function salvar() {
    if (!ed.descripcion) return alert('Escribe la descripción del ítem.')
    if (await guardar('items', ed)) { setEd(null); ctx.recargar() }
  }

  return (
    <>
      <div className="fila"><h1>Cómputos métricos y APU</h1><span className="espacio" /><button className="btn" onClick={nuevo}>+ Agregar ítem</button></div>
      <p className="suave">Registra cada ítem con su cantidad y arma su análisis de precio unitario (APU). El presupuesto se llena solo.</p>
      <div className="panel scroll">
        <table>
          <thead><tr><th>Nº</th><th>Capítulo</th><th>Código</th><th>Descripción</th><th>Unidad</th><th className="d">Cantidad</th><th>Ubicación</th><th className="d">P. unitario</th><th /></tr></thead>
          <tbody>
            {pr.filas.map((f) => (
              <tr key={f.item.id}>
                <td>{f.item.orden}</td><td>{f.item.capitulo}</td><td>{f.item.codigo || '—'}</td><td>{f.item.descripcion}</td>
                <td>{f.item.unidad || '—'}</td><td className="d">{bs(f.item.cantidad)}</td><td>{f.item.ubicacion || '—'}</td>
                <td className="d">{f.lineas.length ? bs(f.pu) : <span className="chip err">Sin APU</span>}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn chico" onClick={() => setApuId(f.item.id)}>APU</button>{' '}
                  <button className="btn sec chico" onClick={() => setEd({ ...f.item })}>Editar</button>{' '}
                  <button className="btn rojo chico" onClick={async () => (await borrar('items', f.item.id, 'Se eliminará el ítem y su APU. ¿Continuar?')) && ctx.recargar()}>✕</button>
                </td>
              </tr>
            ))}
            {pr.filas.length === 0 && <tr><td colSpan={9} className="suave">Todavía no hay ítems.</td></tr>}
          </tbody>
        </table>
      </div>

      {ed && (
        <Modal titulo={ed.id ? 'Editar ítem' : 'Agregar ítem'} onClose={() => setEd(null)}>
          <div className="grid">
            <Texto label="Nº de ítem" tipo="number" v={ed.orden} set={set('orden')} />
            <Lista label="Capítulo" v={ed.capitulo} set={set('capitulo')} opciones={CAPITULOS} />
            <Texto label="Código" v={ed.codigo} set={set('codigo')} />
            <Texto label="Descripción" ancho={2} v={ed.descripcion} set={set('descripcion')} />
            <Texto label="Unidad (m², m³, kg…)" v={ed.unidad} set={set('unidad')} />
            <Texto label="Cantidad" tipo="number" v={ed.cantidad} set={set('cantidad')} />
            <Texto label="Ubicación" v={ed.ubicacion} set={set('ubicacion')} />
            <Texto label="Observaciones" ancho={2} v={ed.observaciones} set={set('observaciones')} />
          </div>
          <div className="fila" style={{ marginTop: 16 }}>
            <button className="btn" onClick={salvar}>Guardar</button><button className="btn sec" onClick={() => setEd(null)}>Cancelar</button>
          </div>
        </Modal>
      )}
      {apuId && <EditorApu itemId={apuId} ctx={ctx} onClose={() => setApuId(null)} />}
    </>
  )
}

function EditorApu({ itemId, ctx, onClose }) {
  const item = ctx.items.find((i) => i.id === itemId)
  const [n, setN] = useState({ tipo: 'material', recurso_id: '', cantidad: '', rendimiento: '1' })
  if (!item) return null
  const lineas = ctx.lineas.filter((l) => l.item_id === itemId)
  const recMap = Object.fromEntries(ctx.recursos.map((r) => [r.id, r]))
  const P = mapaParametros(ctx.parametros)
  const c = calcApu(lineas, recMap, P, ctx.impuestos, ctx.proyecto.modo_herramientas)
  const opciones = ctx.recursos.filter((r) => r.tipo === n.tipo)

  async function agregar() {
    if (!n.recurso_id || !n.cantidad) return alert('Elige un recurso e indica la cantidad.')
    if (await guardar('apu_lineas', { item_id: itemId, recurso_id: n.recurso_id, cantidad: n.cantidad, rendimiento: n.rendimiento || 1 })) {
      setN({ ...n, recurso_id: '', cantidad: '' }); ctx.recargar()
    }
  }
  async function cambiar(l, campo, v) {
    if (String(l[campo] ?? '') === v) return
    if (await guardar('apu_lineas', { id: l.id, [campo]: v })) ctx.recargar()
  }
  const pct = (k) => (definido(P[k]) ? num(P[k]) + ' %' : 'sin definir')
  const fila = (t, v, fuerte) => <tr className={fuerte ? 'tot' : ''}><td>{t}</td><td className="d">{bs(v)}</td></tr>

  return (
    <Modal titulo={'APU · ' + item.descripcion} onClose={onClose} ancho={900}>
      <p className="suave">Cantidades por 1 {item.unidad || 'unidad de obra'}. En mano de obra y equipo, el parcial es cantidad × precio ÷ rendimiento.</p>
      {TIPOS.map(([t, titulo]) => {
        const ls = lineas.filter((l) => recMap[l.recurso_id]?.tipo === t)
        if (!ls.length) return null
        return (
          <div key={t} className="scroll" style={{ marginBottom: 12 }}>
            <table>
              <thead><tr><th>{titulo}</th><th>Unidad</th><th className="d">Cantidad</th>
                {(t === 'mano_obra' || t === 'equipo') && <th className="d">Rendimiento</th>}
                <th className="d">Precio</th><th className="d">Parcial</th><th /></tr></thead>
              <tbody>
                {ls.map((l) => { const r = recMap[l.recurso_id]; return (
                  <tr key={l.id + l.cantidad + l.rendimiento}>
                    <td>{r.codigo} · {r.descripcion}</td><td>{r.unidad}</td>
                    <td className="d" style={{ width: 100 }}><input type="number" step="any" defaultValue={l.cantidad} onBlur={(e) => cambiar(l, 'cantidad', e.target.value)} /></td>
                    {(t === 'mano_obra' || t === 'equipo') && <td className="d" style={{ width: 100 }}><input type="number" step="any" defaultValue={l.rendimiento} onBlur={(e) => cambiar(l, 'rendimiento', e.target.value)} /></td>}
                    <td className="d">{r.precio != null ? bs(r.precio) : <span className="chip rev">Sin precio</span>}</td>
                    <td className="d">{bs(parcialLinea(l, r))}</td>
                    <td><button className="btn rojo chico" onClick={async () => (await borrar('apu_lineas', l.id)) && ctx.recargar()}>✕</button></td>
                  </tr>) })}
              </tbody>
            </table>
          </div>
        )
      })}
      {lineas.length === 0 && <div className="aviso">Este ítem aún no tiene recursos. Agrega materiales, mano de obra y equipos abajo.</div>}

      <div className="panel" style={{ background: '#f3f6f8' }}>
        <h3>Agregar recurso</h3>
        <div className="grid">
          <Lista label="Tipo" v={n.tipo} set={(v) => setN({ ...n, tipo: v, recurso_id: '' })} opciones={TIPOS} />
          <Lista label="Recurso" ancho={2} v={n.recurso_id} set={(v) => setN({ ...n, recurso_id: v })}
            opciones={[['', 'Elegir…'], ...opciones.map((r) => [r.id, r.codigo + ' · ' + r.descripcion + (r.unidad ? ' (' + r.unidad + ')' : '')])]} />
          <Texto label="Cantidad por unidad de obra" tipo="number" v={n.cantidad} set={(v) => setN({ ...n, cantidad: v })} />
          {(n.tipo === 'mano_obra' || n.tipo === 'equipo') && <Texto label="Rendimiento" tipo="number" v={n.rendimiento} set={(v) => setN({ ...n, rendimiento: v })} />}
          <div className="campo"><span>&nbsp;</span><button className="btn" onClick={agregar}>Agregar al APU</button></div>
        </div>
      </div>

      <div className="scroll"><table style={{ maxWidth: 560 }}>
        <thead><tr><th>Resumen del precio unitario</th><th className="d">Bs</th></tr></thead>
        <tbody>
          {fila('Materiales', c.mat)}{fila('Mano de obra', c.mo)}
          {fila('Beneficios / cargas sociales (' + pct('cargas_sociales') + ')', c.cs)}
          {fila('IVA sobre mano de obra (' + pct('iva_mo') + ')', c.iva)}
          {fila('Equipo y maquinaria', c.eq)}
          {fila('Herramientas menores' + (ctx.proyecto.modo_herramientas === 'individual' ? '' : ' (' + pct('herramientas_menores') + ')'), c.herr)}
          {fila('COSTO DIRECTO', c.directo, true)}
          {fila('Gastos generales (' + pct('gastos_generales') + ')', c.gg)}
          {fila('Utilidad (' + pct('utilidad') + ')', c.ut)}
          {c.imps.map((i) => fila(i.nombre + ' (' + i.pct + ' %)', i.valor))}
          {fila('PRECIO UNITARIO FINAL (Bs)', c.pu, true)}
        </tbody></table></div>
    </Modal>
  )
}
