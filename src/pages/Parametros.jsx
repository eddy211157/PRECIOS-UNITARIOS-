import { guardar, borrar } from '../supabase'
import { hoy, fecha, Lista } from '../ui.jsx'
import { definido } from '../calc.js'

const ORDEN = ['cargas_sociales', 'iva_mo', 'herramientas_menores', 'gastos_generales', 'utilidad', 'umbral_variacion', 'dias_antiguedad']

export default function Parametros({ ctx }) {
  const params = [...ctx.parametros].sort((a, b) => ORDEN.indexOf(a.clave) - ORDEN.indexOf(b.clave))

  async function cambiar(p, campo, v) {
    if (String(p[campo] ?? '') === v) return
    if (await guardar('parametros', { id: p.id, [campo]: v, fecha_actualizacion: hoy() })) ctx.recargar()
  }
  async function cambiarImp(i, campo, v) {
    if (String(i[campo] ?? '') === String(v)) return
    if (await guardar('impuestos', { id: i.id, [campo]: v })) ctx.recargar()
  }
  async function agregarImp() {
    if (await guardar('impuestos', { proyecto_id: ctx.pid, nombre: 'Nuevo impuesto', base: 'subtotal', activo: false })) ctx.recargar()
  }
  async function modo(v) {
    if (await guardar('proyectos', { id: ctx.pid, modo_herramientas: v })) ctx.recargar()
  }
  const sinDefinir = params.filter((p) => !definido(p.valor))

  return (
    <>
      <h1>Parámetros</h1>
      <p className="suave">Todos los porcentajes del sistema se definen aquí. Ninguno viene escrito dentro de las fórmulas ni se asume por defecto: verifícalos según la normativa vigente, los DBC y las condiciones del proyecto.</p>
      {sinDefinir.length > 0 && <div className="aviso">Hay {sinDefinir.length} parámetro(s) sin definir: {sinDefinir.map((p) => p.nombre).join(', ')}. Mientras no los definas, se calculan como 0.</div>}
      <div className="panel scroll">
        <table>
          <thead><tr><th>Parámetro</th><th>Valor</th><th>Unidad</th><th>Base de cálculo</th><th>Fundamento / observación</th><th>Actualizado</th></tr></thead>
          <tbody>
            {params.map((p) => (
              <tr key={p.id + (p.valor ?? '')}>
                <td>{p.nombre} {!definido(p.valor) && <span className="chip rev">Sin definir</span>}</td>
                <td style={{ width: 110 }}><input type="number" step="any" defaultValue={p.valor ?? ''} onBlur={(e) => cambiar(p, 'valor', e.target.value)} /></td>
                <td>{p.unidad}</td>
                <td><input defaultValue={p.base ?? ''} onBlur={(e) => cambiar(p, 'base', e.target.value)} /></td>
                <td><input defaultValue={p.observacion ?? ''} onBlur={(e) => cambiar(p, 'observacion', e.target.value)} /></td>
                <td>{fecha(p.fecha_actualizacion)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel" style={{ maxWidth: 520 }}>
        <Lista label="Herramientas menores en los APU" v={ctx.proyecto.modo_herramientas}
          set={modo} opciones={[['porcentaje', 'Calcular como % de la mano de obra'], ['individual', 'Introducir herramientas una por una']]} />
      </div>

      <div className="fila"><h2>Impuestos y componentes tributarios</h2><span className="espacio" />
        <button className="btn" onClick={agregarImp}>+ Agregar impuesto</button></div>
      <div className="panel scroll">
        <table>
          <thead><tr><th>Activo</th><th>Nombre</th><th>Porcentaje</th><th>Se calcula sobre</th><th>Fundamento / observación</th><th /></tr></thead>
          <tbody>
            {ctx.impuestos.map((i) => (
              <tr key={i.id + String(i.activo) + (i.porcentaje ?? '')}>
                <td><input type="checkbox" checked={!!i.activo} onChange={(e) => cambiarImp(i, 'activo', e.target.checked)} style={{ width: 'auto' }} /></td>
                <td><input defaultValue={i.nombre} onBlur={(e) => cambiarImp(i, 'nombre', e.target.value)} /></td>
                <td style={{ width: 110 }}><input type="number" step="any" defaultValue={i.porcentaje ?? ''} onBlur={(e) => cambiarImp(i, 'porcentaje', e.target.value)} /></td>
                <td><select value={i.base} onChange={(e) => cambiarImp(i, 'base', e.target.value)}>
                  <option value="subtotal">Costo directo + gastos generales + utilidad</option>
                  <option value="directo">Costo directo</option></select></td>
                <td><input defaultValue={i.observacion ?? ''} onBlur={(e) => cambiarImp(i, 'observacion', e.target.value)} /></td>
                <td><button className="btn rojo chico" onClick={async () => (await borrar('impuestos', i.id)) && ctx.recargar()}>Quitar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
