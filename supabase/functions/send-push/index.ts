// Edge Function send-push: envía notificaciones Web Push a los demás miembros
// del hogar cuando alguien escribe en el chat, crea una tarea, añade algo a la
// compra o apunta un gasto. La llaman los triggers de la base de datos (pg_net)
// con la cabecera x-push-secret; no la llama la app.
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

type Kind = 'chat' | 'tasks' | 'shopping' | 'expenses';
type Payload = { title: string; body: string; url: string; tag: string };
type Row = Record<string, unknown>;

const KIND_BY_TABLE: Record<string, Kind> = {
  house_messages: 'chat',
  tasks: 'tasks',
  shopping_items: 'shopping',
  expenses: 'expenses',
};

// Quién lo ha hecho, según la tabla.
const ACTOR_COLUMN: Record<Kind, string> = {
  chat: 'user_id',
  tasks: 'created_by',
  shopping: 'added_by',
  expenses: 'created_by',
};

const serviceKey =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
  JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}').default;

const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey, {
  auth: { persistSession: false },
});

type PushConfig = {
  vapid_public_key: string;
  vapid_private_key: string;
  vapid_subject: string;
  webhook_secret: string;
};

let config: PushConfig | null = null;
async function getConfig(): Promise<PushConfig> {
  if (config) return config;
  const { data, error } = await admin.rpc('get_push_config');
  if (error) throw error;
  config = data as PushConfig;
  webpush.setVapidDetails(config.vapid_subject, config.vapid_public_key, config.vapid_private_key);
  return config;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const short = (text: string, max = 140) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

const euros = (n: unknown) =>
  `${Number(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

function displayName(u: { username: string | null; email: string } | null): string {
  return u?.username?.trim() || u?.email?.split('@')[0] || 'Alguien';
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  const cfg = await getConfig();
  if (req.headers.get('x-push-secret') !== cfg.webhook_secret) return json({ error: 'unauthorized' }, 401);

  const { table, record } = (await req.json()) as { table: string; record: Row };
  const kind = KIND_BY_TABLE[table];
  if (!kind) return json({ skipped: 'table' });

  const houseId = record.house_id as string;
  const actorId = (record[ACTOR_COLUMN[kind]] as string | null) ?? null;

  const [houseRes, actorRes, membersRes] = await Promise.all([
    admin.from('houses').select('name').eq('id', houseId).maybeSingle(),
    actorId
      ? admin.from('users').select('username, email').eq('id', actorId).maybeSingle()
      : Promise.resolve({ data: null }),
    admin.from('house_members').select('user_id').eq('house_id', houseId),
  ]);
  if (!houseRes.data) return json({ skipped: 'house' });
  const houseName = houseRes.data.name as string;
  const actorName = displayName(actorRes.data as { username: string | null; email: string } | null);

  // Destinatarios: los demás miembros (en un gasto, solo quien participa en él).
  let recipients = (membersRes.data ?? []).map((m) => m.user_id as string).filter((id) => id !== actorId);
  const owedByUser = new Map<string, number>();
  if (kind === 'expenses') {
    const { data: splits } = await admin
      .from('expense_splits')
      .select('user_id, amount_owed')
      .eq('expense_id', record.id as string);
    for (const s of splits ?? []) owedByUser.set(s.user_id as string, Number(s.amount_owed));
    recipients = recipients.filter((id) => owedByUser.has(id));
  }

  // Quien haya apagado este tipo de aviso en Ajustes, fuera.
  if (recipients.length > 0) {
    const { data: prefs } = await admin
      .from('notification_prefs')
      .select('user_id, chat, tasks, shopping, expenses')
      .in('user_id', recipients);
    const optedOut = new Set((prefs ?? []).filter((p) => p[kind] === false).map((p) => p.user_id as string));
    recipients = recipients.filter((id) => !optedOut.has(id));
  }
  if (recipients.length === 0) return json({ sent: 0 });

  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
    .in('user_id', recipients);
  if (!subs || subs.length === 0) return json({ sent: 0 });

  function payloadFor(userId: string): Payload {
    switch (kind) {
      case 'chat':
        return {
          title: `💬 ${actorName} · ${houseName}`,
          body: short(String(record.content ?? '')),
          url: `/house/${houseId}/chat`,
          tag: `chat-${houseId}`, // un solo aviso por chat: el nuevo sustituye al anterior
        };
      case 'tasks':
        return record.assigned_to === userId
          ? {
              title: `📝 ${actorName} te ha asignado una tarea`,
              body: `${record.title} · ${houseName}`,
              url: `/house/${houseId}/tareas`,
              tag: `task-${record.id}`,
            }
          : {
              title: `📝 Nueva tarea en ${houseName}`,
              body: `${actorName}: ${record.title}`,
              url: `/house/${houseId}/tareas`,
              tag: `task-${record.id}`,
            };
      case 'shopping':
        return {
          title: `🛒 ${actorName} está añadiendo cosas a la compra`,
          body: `${record.title} · ${houseName}`,
          url: `/house/${houseId}/compra`,
          tag: `shopping-${houseId}`,
        };
      case 'expenses': {
        const owed = owedByUser.get(userId);
        return {
          title: `💰 Nuevo gasto en ${houseName}`,
          body: `${actorName} ha apuntado «${record.title}» (${euros(record.amount)})${owed ? `. Te toca ${euros(owed)}` : ''}`,
          url: `/house/${houseId}/hucha`,
          tag: `expense-${record.id}`,
        };
      }
    }
  }

  const results = await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification(
        { endpoint: s.endpoint as string, keys: { p256dh: s.p256dh as string, auth: s.auth as string } },
        JSON.stringify(payloadFor(s.user_id as string)),
        { TTL: 24 * 60 * 60, urgency: kind === 'chat' ? 'high' : 'normal' },
      ),
    ),
  );

  // Navegadores que ya no existen (desinstalada, permiso retirado…): se borran.
  const gone = subs
    .filter((_, i) => {
      const r = results[i];
      return r.status === 'rejected' && [404, 410].includes((r.reason as { statusCode?: number }).statusCode ?? 0);
    })
    .map((s) => s.id as string);
  if (gone.length > 0) await admin.from('push_subscriptions').delete().in('id', gone);

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map((r) => String((r.reason as { statusCode?: number; body?: string }).statusCode ?? r.reason));
  return json({ sent, removed: gone.length, failed });
});
