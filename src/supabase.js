import { createClient } from '@supabase/supabase-js'

// Las dos variables se escriben en el archivo ".env" (en la raíz del proyecto).
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const configurado =
  !!url && !!key && !url.includes('TU-PROYECTO') && !key.includes('PEGA-AQUI')

export const supabase = createClient(
  configurado ? url : 'https://placeholder.supabase.co',
  configurado ? key : 'placeholder'
)

// Crea o actualiza un registro (si trae "id" actualiza, si no, crea).
export async function guardar(tabla, fila) {
  const { id, ...resto } = fila
  Object.keys(resto).forEach((k) => { if (resto[k] === '') resto[k] = null })
  const q = id ? supabase.from(tabla).update(resto).eq('id', id) : supabase.from(tabla).insert(resto)
  const { error } = await q
  if (error) { alert('No se pudo guardar: ' + error.message); return false }
  return true
}

export async function borrar(tabla, id, aviso = '¿Eliminar este registro?') {
  if (!confirm(aviso)) return false
  const { error } = await supabase.from(tabla).delete().eq('id', id)
  if (error) { alert('No se pudo eliminar: ' + error.message); return false }
  return true
}
