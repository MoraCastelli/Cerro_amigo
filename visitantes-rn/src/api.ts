import { supabase } from './lib/supabase';
import type { Visitante } from './lib/types';

export async function listar(desde?: string, hasta?: string) {
  let q = supabase.from('visitantes')
    .select('id, fecha, nombre, localidad, adultos, menores, jubi_pens, total')
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false });

  if (desde) q = q.gte('fecha', desde);
  if (hasta) q = q.lte('fecha', hasta);

  const { data, error } = await q;
  if (error) throw error;
  return data!;
}

export async function crear(v: Visitante) {
  const { error } = await supabase.from('visitantes').insert(v);
  if (error) throw error;
}

export async function eliminar(id: string) {
  const { error } = await supabase.from('visitantes').delete().eq('id', id);
  if (error) throw error;
}
