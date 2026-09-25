// Checks de los mensajes del chat del hogar, calculados con las "marcas de agua"
// de house_chat_reads (hasta dónde le ha llegado / ha leído cada miembro).

export type MessageStatus = 'sent' | 'delivered' | 'read';

export type ChatMember = { user_id: string; joined_at: string };
export type ChatReceipt = { user_id: string; delivered_at: string | null; read_at: string | null };

/** Postgres da microsegundos; se recortan a milisegundos para que Date los lea siempre. */
function toMillis(iso: string): number {
  return Date.parse(iso.replace(/(\.\d{3})\d+/, '$1'));
}

/**
 * Estado de un mensaje para quien lo envió:
 *   · read      → todos los demás miembros lo han leído
 *   · delivered → a todos los demás les ha llegado
 *   · sent      → guardado en el servidor
 * Solo cuentan quienes ya eran miembros cuando se envió.
 */
export function messageStatus(
  message: { user_id: string; created_at: string },
  members: ChatMember[],
  receipts: ChatReceipt[],
): MessageStatus {
  const sentAt = toMillis(message.created_at);
  const recipients = members.filter(
    (m) => m.user_id !== message.user_id && toMillis(m.joined_at) <= sentAt,
  );
  if (recipients.length === 0) return 'sent';

  const byUser = new Map(receipts.map((r) => [r.user_id, r]));
  const reached = (at: string | null | undefined) => at != null && toMillis(at) >= sentAt;

  if (recipients.every((m) => reached(byUser.get(m.user_id)?.read_at))) return 'read';
  if (recipients.every((m) => reached(byUser.get(m.user_id)?.delivered_at))) return 'delivered';
  return 'sent';
}
