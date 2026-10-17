// Todos los cálculos del sistema. Los porcentajes NUNCA están escritos aquí:
// siempre vienen de la pantalla "Parámetros" (tabla parametros).

export const CAPITULOS = [
  'Obras preliminares', 'Movimiento de tierras', 'Fundaciones', 'Estructuras', 'Mampostería',
  'Cubierta', 'Revoques', 'Pisos', 'Carpintería', 'Instalaciones eléctricas',
  'Instalaciones sanitarias', 'Pintura', 'Obras exteriores', 'Otros',
]

export const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0 }
export const r2 = (v) => Math.round((num(v) + Number.EPSILON) * 100) / 100
export const definido = (v) => v !== null && v !== undefined && v !== ''

export const mapaParametros = (parametros) =>
  Object.fromEntries((parametros || []).map((p) => [p.clave, p.valor]))

// Parcial de una línea del APU. Mano de obra y equipo se dividen por el rendimiento.
export function parcialLinea(l, r) {
  if (!r) return 0
  const base = num(l.cantidad) * num(r.precio)
  if (r.tipo === 'mano_obra' || r.tipo === 'equipo') return base / (num(l.rendimiento) || 1)
  return base
}

export function calcApu(lineas, recMap, P, impuestos, modoHerr) {
  let mat = 0, mo = 0, eq = 0, hi = 0
  for (const l of lineas) {
    const r = recMap[l.recurso_id]
    if (!r) continue
    const p = parcialLinea(l, r)
    if (r.tipo === 'material') mat += p
    else if (r.tipo === 'mano_obra') mo += p
    else if (r.tipo === 'equipo') eq += p
    else if (r.tipo === 'herramienta') hi += p
  }
  const pc = (k) => num(P[k]) / 100
  const cs = mo * pc('cargas_sociales')
  const iva = (mo + cs) * pc('iva_mo')
  const herr = modoHerr === 'individual' ? hi : mo * pc('herramientas_menores')
  const directo = mat + mo + cs + iva + eq + herr
  const gg = directo * pc('gastos_generales')
  const ut = (directo + gg) * pc('utilidad')
  const sub = directo + gg + ut
  const imps = (impuestos || []).filter((i) => i.activo).map((i) => ({
    nombre: i.nombre, pct: num(i.porcentaje),
    valor: (i.base === 'directo' ? directo : sub) * num(i.porcentaje) / 100,
  }))
  const imp = imps.reduce((s, i) => s + i.valor, 0)
  return { mat, mo, cs, iva, eq, herr, directo, gg, ut, sub, imps, imp, pu: sub + imp }
}

export function calcPresupuesto({ items, lineas, recursos, parametros, impuestos, proyecto }) {
  const recMap = Object.fromEntries(recursos.map((r) => [r.id, r]))
  const P = mapaParametros(parametros)
  const porItem = {}
  lineas.forEach((l) => { (porItem[l.item_id] = porItem[l.item_id] || []).push(l) })
  const filas = items.map((it) => {
    const ls = porItem[it.id] || []
    const c = calcApu(ls, recMap, P, impuestos, proyecto?.modo_herramientas)
    const pu = r2(c.pu), cant = num(it.cantidad)
    return { item: it, lineas: ls, c, pu, cant, importe: r2(cant * pu) }
  })
  const tot = { mat: 0, mo: 0, cs: 0, iva: 0, eq: 0, herr: 0, directo: 0, gg: 0, ut: 0, imp: 0, total: 0 }
  filas.forEach((f) => {
    for (const k of ['mat', 'mo', 'cs', 'iva', 'eq', 'herr', 'directo', 'gg', 'ut', 'imp']) tot[k] += f.c[k] * f.cant
    tot.total += f.importe
  })
  const g = {}
  filas.forEach((f) => {
    const k = f.item.capitulo || 'Otros'
    g[k] = g[k] || { capitulo: k, filas: [], total: 0 }
    g[k].filas.push(f); g[k].total += f.importe
  })
  const ord = (k) => { const i = CAPITULOS.indexOf(k); return i < 0 ? 999 : i }
  const grupos = Object.values(g).sort((a, b) => ord(a.capitulo) - ord(b.capitulo))
  const sup = num(proyecto?.superficie)
  return { filas, grupos, tot, recMap, P, m2: sup > 0 ? tot.total / sup : null }
}

export function diasDesde(fecha) {
  if (!fecha) return null
  return Math.floor((Date.now() - new Date(fecha + 'T00:00:00').getTime()) / 86400000)
}

export function estadoPrecio(fecha, limite) {
  const d = diasDesde(fecha)
  if (d === null) return 'REVISAR'
  if (d <= limite * 0.8) return 'ACTUALIZADO'
  if (d <= limite) return 'POR ACTUALIZAR'
  return 'PRECIO ANTIGUO'
}

const RANGO = { 'ACTUALIZADO': 0, 'POR ACTUALIZAR': 1, 'REVISAR': 2, 'PRECIO ANTIGUO': 3 }
export const peorEstado = (lista) =>
  lista.reduce((a, b) => (RANGO[b] > RANGO[a] ? b : a), 'ACTUALIZADO')

export const recursosUsados = (lineas, recMap) =>
  [...new Set(lineas.map((l) => l.recurso_id))].map((id) => recMap[id]).filter(Boolean)

export const limiteDias = (P) => num(P.dias_antiguedad) || 90
