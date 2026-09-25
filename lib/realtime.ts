import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

/** Tablas que publican sus cambios con Broadcast (tienen el trigger broadcast_house_change). */
export type HouseBroadcastTable =
  | 'shopping_items'
  | 'tasks'
  | 'task_completions'
  | 'house_messages'
  | 'chat_messages'
  | 'house_chat_reads';

// supabase.channel(topic) devuelve el MISMO canal si ya existe uno con ese nombre,
// y no se puede suscribir dos veces ni cerrarlo sin cortárselo a los demás. Por eso
// cada canal se comparte: uno por topic, con varios oyentes, y se cierra cuando se
// va el último (con un margen por si otra pantalla lo vuelve a pedir enseguida).
type SharedChannel = {
  channel: RealtimeChannel;
  listeners: Set<() => void>;
  releaseTimer: ReturnType<typeof setTimeout> | null;
};

const RELEASE_DELAY_MS = 1000;
const sharedChannels = new Map<string, SharedChannel>();

function acquire(topic: string, listener: () => void): () => void {
  let shared = sharedChannels.get(topic);
  if (shared?.releaseTimer) {
    clearTimeout(shared.releaseTimer);
    shared.releaseTimer = null;
  }
  if (!shared) {
    const listeners = new Set<() => void>();
    const channel = supabase
      .channel(topic, { config: { private: true } })
      .on('broadcast', { event: '*' }, () => {
        for (const notify of listeners) notify();
      })
      .subscribe();
    shared = { channel, listeners, releaseTimer: null };
    sharedChannels.set(topic, shared);
  }

  const entry = shared;
  entry.listeners.add(listener);

  return () => {
    entry.listeners.delete(listener);
    if (entry.listeners.size > 0 || entry.releaseTimer) return;
    entry.releaseTimer = setTimeout(() => {
      sharedChannels.delete(topic);
      void supabase.removeChannel(entry.channel);
    }, RELEASE_DELAY_MS);
  };
}

/**
 * Escucha los cambios (INSERT, UPDATE y DELETE) de una o varias tablas de un hogar
 * por los canales privados `house:<id>:<tabla>` que publica la base de datos. Solo
 * los reciben los miembros del hogar. Varias pantallas pueden escuchar la misma
 * tabla a la vez. Devuelve la función para dejar de escuchar.
 */
export function subscribeToHouseTables(
  houseId: string,
  tables: HouseBroadcastTable[],
  onChange: () => void,
): () => void {
  let releases: (() => void)[] = [];
  let cancelled = false;
  // Cada suscripción tiene su propio oyente, aunque el callback sea el mismo.
  const listener = () => onChange();

  // Los canales privados necesitan el token de la sesión antes de unirse.
  void supabase.realtime.setAuth().then(() => {
    if (cancelled) return;
    releases = tables.map((table) => acquire(`house:${houseId}:${table}`, listener));
  });

  return () => {
    cancelled = true;
    for (const release of releases) release();
  };
}
