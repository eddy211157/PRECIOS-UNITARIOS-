import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { Modal, Texto, Lista, fecha } from '../ui.jsx'

export default function Usuarios({ ctx }) {
  const [lista, setLista] = useState([])
  const [nuevo, setNuevo] = useState(null)
  const [espera, setEspera] = useState(false)

  const cargar = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at')
    setLista(data || [])
  }
  useEffect(() => { cargar() }, [])

  if (!ctx.esAdmin) return <div className="vacio">Solo el administrador puede gestionar usuarios.</div>

  async function crear() {
    setEspera(true)
    const { error } = await supabase.rpc('crear_usuario', { p_email: nuevo.email, p_password: nuevo.clave, p_nombre: nuevo.nombre, p_rol: nuevo.rol })
    setEspera(false)
    if (error) return alert(error.message)
    setNuevo(null); cargar()
  }
  async function quitar(u) {
    if (!confirm('¿Eliminar a ' + u.email + '? Ya no podrá ingresar.')) return
    const { error } = await supabase.rpc('eliminar_usuario', { p_id: u.id })
    if (error) alert(error.message); else cargar()
  }
  async function clave(u) {
    const c = prompt('Nueva contraseña para ' + u.email + ' (mínimo 6 caracteres):')
    if (!c) return
    const { error } = await supabase.rpc('cambiar_password', { p_id: u.id, p_password: c })
    alert(error ? error.message : 'Contraseña cambiada.')
  }

  return (
    <>
      <div className="fila"><h1>Usuarios</h1><span className="espacio" />
        <button className="btn" onClick={() => setNuevo({ nombre: '', email: '', clave: '', rol: 'usuario' })}>+ Crear usuario</button></div>
      <p className="suave">Crea aquí a tus empleados o vendedores. No necesitas volver a Supabase.</p>
      <div className="panel scroll">
        <table>
          <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Creado</th><th /></tr></thead>
          <tbody>
            {lista.map((u) => (
              <tr key={u.id}><td>{u.nombre}</td><td>{u.email}</td><td>{u.rol === 'admin' ? 'Administrador' : 'Usuario'}</td>
                <td>{fecha(u.created_at?.slice(0, 10))}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn sec chico" onClick={() => clave(u)}>Cambiar contraseña</button>{' '}
                  {u.id !== ctx.perfil.id && <button className="btn rojo chico" onClick={() => quitar(u)}>Eliminar</button>}
                </td></tr>
            ))}
          </tbody>
        </table>
      </div>
      {nuevo && (
        <Modal titulo="Crear usuario" onClose={() => setNuevo(null)} ancho={460}>
          <div className="grid" style={{ gridTemplateColumns: '1fr' }}>
            <Texto label="Nombre completo" v={nuevo.nombre} set={(v) => setNuevo({ ...nuevo, nombre: v })} />
            <Texto label="Correo" tipo="email" v={nuevo.email} set={(v) => setNuevo({ ...nuevo, email: v })} />
            <Texto label="Contraseña (mínimo 6 caracteres)" v={nuevo.clave} set={(v) => setNuevo({ ...nuevo, clave: v })} />
            <Lista label="Rol" v={nuevo.rol} set={(v) => setNuevo({ ...nuevo, rol: v })} opciones={[['usuario', 'Usuario (trabaja con proyectos)'], ['admin', 'Administrador (también gestiona usuarios)']]} />
          </div>
          <div className="fila" style={{ marginTop: 16 }}>
            <button className="btn" disabled={espera} onClick={crear}>{espera ? 'Creando…' : 'Crear usuario'}</button>
            <button className="btn sec" onClick={() => setNuevo(null)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </>
  )
}
