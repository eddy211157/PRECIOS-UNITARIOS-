import { useEffect, useState } from 'react'
import { supabase, guardar, borrar } from '../supabase'
import { Texto, Lista } from '../ui.jsx'

const DEPARTAMENTOS = ['', 'La Paz', 'Cochabamba', 'Santa Cruz', 'Oruro', 'Potosí', 'Chuquisaca', 'Tarija', 'Beni', 'Pando']
const CAMPOS = [
  ['codigo', 'Código del proyecto'], ['nombre', 'Nombre del proyecto', 2], ['entidad', 'Entidad contratante'],
  ['propietario', 'Propietario'], ['tipo_obra', 'Tipo de obra'], ['departamento', 'Departamento'],
  ['municipio', 'Municipio'], ['localidad', 'Comunidad / localidad'], ['ubicacion', 'Ubicación', 2],
  ['superficie', 'Superficie construida (m²)', 'number'], ['plantas', 'Número de plantas', 'number'],
  ['plazo_dias', 'Plazo de ejecución (días)', 'number'], ['modalidad', 'Modalidad de contratación'],
  ['financiamiento', 'Fuente de financiamiento'], ['responsable', 'Responsable del presupuesto'],
  ['version', 'Versión del presupuesto'], ['fecha_elaboracion', 'Fecha de elaboración', 'date'],
  ['fecha_actualizacion', 'Fecha de actualización de precios', 'date'],
]

export default function Proyectos({ ctx }) {
  const [f, setF] = useState(ctx.proyecto || null)
  useEffect(() => { setF(ctx.proyecto ? { ...ctx.proyecto } : null) }, [ctx.proyecto?.id])

  async function nuevo() {
    const { data, error } = await supabase.from('proyectos').insert({ nombre: 'Nuevo proyecto' }).select().single()
    if (error) return alert('No se pudo crear el proyecto: ' + error.message)
    await ctx.recargar(); ctx.setPid(data.id)
  }
  async function salvar() {
    const { id, created_at, creado_por, ...fila } = f
    if (await guardar('proyectos', { id, ...fila })) { await ctx.recargar(); alert('Proyecto guardado.') }
  }
  async function eliminar() {
    if (await borrar('proyectos', f.id, 'Se eliminará el proyecto con todos sus ítems y APU. ¿Continuar?')) {
      ctx.setPid(''); await ctx.recargar()
    }
  }

  return (
    <>
      <div className="fila"><h1>Datos del proyecto</h1><span className="espacio" />
        <button className="btn" onClick={nuevo}>+ Nuevo proyecto</button></div>
      {!f ? <div className="panel">Todavía no hay proyectos. Pulsa “Nuevo proyecto” para empezar.</div> : (
        <div className="panel">
          <div className="grid">
            {CAMPOS.map(([k, t, x]) => {
              const tipo = typeof x === 'string' ? x : 'text'
              const ancho = typeof x === 'number' ? x : undefined
              if (k === 'departamento') return <Lista key={k} label={t} v={f[k]} set={(v) => setF({ ...f, [k]: v })} opciones={DEPARTAMENTOS} />
              return <Texto key={k} label={t} tipo={tipo} ancho={ancho} v={f[k]} set={(v) => setF({ ...f, [k]: v })} />
            })}
          </div>
          <div className="fila" style={{ marginTop: 16 }}>
            <button className="btn" onClick={salvar}>Guardar cambios</button>
            <button className="btn rojo" onClick={eliminar}>Eliminar proyecto</button>
          </div>
        </div>
      )}
    </>
  )
}
