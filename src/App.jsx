import { useCallback, useEffect, useState } from 'react'
import { supabase, configurado } from './supabase'
import { Vacio } from './ui.jsx'
import Proyectos from './pages/Proyectos.jsx'
import Parametros from './pages/Parametros.jsx'
import Recursos from './pages/Recursos.jsx'
import Computos from './pages/Computos.jsx'
import Presupuesto from './pages/Presupuesto.jsx'
import Precios from './pages/Precios.jsx'
import Resumen from './pages/Resumen.jsx'
import Control from './pages/Control.jsx'
import Usuarios from './pages/Usuarios.jsx'

const MENU = [
  ['resumen', 'Resumen ejecutivo'], ['proyectos', 'Datos del proyecto'], ['parametros', 'Parámetros'],
  ['material', 'Materiales'], ['mano_obra', 'Mano de obra'], ['equipo', 'Equipos y maquinaria'],
  ['herramienta', 'Herramientas'], ['computos', 'Cómputos y APU'], ['presupuesto', 'Presupuesto general'],
  ['precios', 'Precios y respaldo'], ['control', 'Control y validación'], ['usuarios', 'Usuarios'],
]
const NECESITAN_PROYECTO = ['resumen', 'parametros', 'computos', 'presupuesto', 'control']

export default function App() {
  const [sesion, setSesion] = useState(undefined)
  const [perfil, setPerfil] = useState(null)

  useEffect(() => {
    if (!configurado) return
    supabase.auth.getSession().then(({ data }) => setSesion(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSesion(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!sesion) { setPerfil(null); return }
    supabase.from('profiles').select('*').eq('id', sesion.user.id).single().then(({ data }) => setPerfil(data))
  }, [sesion])

  if (!configurado) {
    return (
      <div className="login"><div className="panel">
        <h2>Falta conectar Supabase</h2>
        <p>Abre el archivo <b>.env</b> y reemplaza los dos valores por la URL y la clave pública de tu proyecto de Supabase. Luego vuelve a publicar la aplicación.</p>
      </div></div>
    )
  }
  if (sesion === undefined) return <Vacio>Cargando…</Vacio>
  if (!sesion) return <Login />
  return <Panel sesion={sesion} perfil={perfil} />
}

function Login() {
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const [espera, setEspera] = useState(false)

  async function entrar(e) {
    e.preventDefault(); setEspera(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email: correo.trim(), password: clave })
    if (error) setError('Correo o contraseña incorrectos.')
    setEspera(false)
  }
  return (
    <div className="login">
      <form className="panel" onSubmit={entrar}>
        <h1>APU Bolivia</h1>
        <p className="suave">Costos, análisis de precios unitarios y presupuestos de obra.</p>
        <label className="campo"><span>Correo</span><input type="email" required value={correo} onChange={(e) => setCorreo(e.target.value)} autoComplete="username" /></label>
        <label className="campo"><span>Contraseña</span><input type="password" required value={clave} onChange={(e) => setClave(e.target.value)} autoComplete="current-password" /></label>
        {error && <div className="aviso">{error}</div>}
        <button className="btn" disabled={espera} style={{ width: '100%' }}>{espera ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </div>
  )
}

const VACIO = { recursos: [], items: [], lineas: [], parametros: [], impuestos: [], historial: [] }

function Panel({ sesion, perfil }) {
  const [pagina, setPagina] = useState('resumen')
  const [abierto, setAbierto] = useState(false)
  const [proyectos, setProyectos] = useState([])
  const [pid, setPid] = useState(localStorage.getItem('pid') || '')
  const [d, setD] = useState(VACIO)

  const cargarProyectos = useCallback(async () => {
    const { data } = await supabase.from('proyectos').select('*').order('created_at', { ascending: false })
    setProyectos(data || [])
    setPid((prev) => ((data || []).some((p) => p.id === prev) ? prev : data?.[0]?.id || ''))
  }, [])

  const cargarDatos = useCallback(async () => {
    const rec = supabase.from('recursos').select('*').order('codigo').range(0, 4999)
    const his = supabase.from('historial_precios').select('*, recursos(codigo,descripcion,unidad)').order('created_at', { ascending: false }).limit(500)
    if (!pid) {
      const [r, h] = await Promise.all([rec, his])
      setD({ ...VACIO, recursos: r.data || [], historial: h.data || [] })
      return
    }
    const [r, i, l, p, t, h] = await Promise.all([
      rec,
      supabase.from('items').select('*').eq('proyecto_id', pid).order('orden').range(0, 4999),
      supabase.from('apu_lineas').select('*, items!inner(proyecto_id)').eq('items.proyecto_id', pid).range(0, 9999),
      supabase.from('parametros').select('*').eq('proyecto_id', pid),
      supabase.from('impuestos').select('*').eq('proyecto_id', pid).order('nombre'),
      his,
    ])
    setD({ recursos: r.data || [], items: i.data || [], lineas: l.data || [], parametros: p.data || [], impuestos: t.data || [], historial: h.data || [] })
  }, [pid])

  useEffect(() => { cargarProyectos() }, [cargarProyectos])
  useEffect(() => { cargarDatos() }, [cargarDatos])
  useEffect(() => { localStorage.setItem('pid', pid) }, [pid])

  const ctx = {
    ...d, proyectos, pid, setPid, perfil,
    proyecto: proyectos.find((p) => p.id === pid),
    esAdmin: perfil?.rol === 'admin',
    recargar: () => Promise.all([cargarProyectos(), cargarDatos()]),
  }

  function ir(p) { setPagina(p); setAbierto(false); window.scrollTo(0, 0) }

  let vista
  if (NECESITAN_PROYECTO.includes(pagina) && !ctx.proyecto) {
    vista = <Vacio>Primero crea o elige un proyecto en <b>Datos del proyecto</b>.</Vacio>
  } else if (pagina === 'resumen') vista = <Resumen ctx={ctx} />
  else if (pagina === 'proyectos') vista = <Proyectos ctx={ctx} />
  else if (pagina === 'parametros') vista = <Parametros ctx={ctx} />
  else if (['material', 'mano_obra', 'equipo', 'herramienta'].includes(pagina)) vista = <Recursos key={pagina} tipo={pagina} ctx={ctx} />
  else if (pagina === 'computos') vista = <Computos ctx={ctx} />
  else if (pagina === 'presupuesto') vista = <Presupuesto ctx={ctx} />
  else if (pagina === 'precios') vista = <Precios ctx={ctx} />
  else if (pagina === 'control') vista = <Control ctx={ctx} />
  else vista = <Usuarios ctx={ctx} />

  return (
    <div className="app">
      <div className="barra-movil">
        <button onClick={() => setAbierto(!abierto)} aria-label="Menú">☰</button>
        <b>{MENU.find((m) => m[0] === pagina)?.[1]}</b>
      </div>
      <aside className={'lateral' + (abierto ? ' abierto' : '')}>
        <div className="marca">APU Bolivia<small>Presupuestos de obra</small></div>
        <select value={pid} onChange={(e) => setPid(e.target.value)} aria-label="Proyecto activo">
          {proyectos.length === 0 && <option value="">Sin proyectos</option>}
          {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre || 'Sin nombre'}</option>)}
        </select>
        {MENU.filter((m) => m[0] !== 'usuarios' || ctx.esAdmin).map(([k, t]) => (
          <button key={k} className={'nav' + (pagina === k ? ' on' : '')} onClick={() => ir(k)}>{t}</button>
        ))}
        <div className="pie">
          {perfil?.nombre || sesion.user.email}
          <br /><button className="btn sec chico" style={{ marginTop: 6 }} onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
        </div>
      </aside>
      <main className="contenido">{vista}</main>
    </div>
  )
}
