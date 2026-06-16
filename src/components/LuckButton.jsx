// Botón "🍀 Dar suerte" a un participante. Lanza lluvia de tréboles local,
// lo registra en el servidor (dura 15 min) y emite evento para la oficina.
import { useState } from 'react';
import { postLuck } from '../services/sharedEvents';
import { celebrateLuck } from '../services/celebrations';

export default function LuckButton({ targetName, count = 0, compact = false, onSent }) {
  const [sending, setSending] = useState(false);
  const [localCount, setLocalCount] = useState(count);

  const send = async (event) => {
    event?.stopPropagation?.();
    if (sending) return;
    setSending(true);
    setLocalCount(c => c + 1); // optimista
    celebrateLuck();
    const res = await postLuck(targetName);
    if (res?.count != null) setLocalCount(res.count);
    onSent?.(res);
    setTimeout(() => setSending(false), 700);
  };

  return (
    <button
      type="button"
      className={`luck-btn ${compact ? 'compact' : ''}`}
      onClick={send}
      disabled={sending}
      title={`Mandar suerte a ${targetName}`}
      aria-label={`Dar suerte a ${targetName}`}
    >
      <span className="luck-emoji" aria-hidden="true">🍀</span>
      {!compact && <span>Dar suerte</span>}
      {localCount > 0 && <span className="luck-count">{localCount}</span>}
    </button>
  );
}
