const BASE = '';

export async function triggerNotification({ type, recipientEmail, participantName, dedupeKey, data = {} }) {
  try {
    await fetch(`${BASE}/api/notifications/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, recipientEmail, participantName, dedupeKey, data })
    });
  } catch (e) {
    console.warn('[notifications] trigger failed silently', e);
  }
}

export async function fetchNotificationSettings() {
  const res = await fetch('/api/notification-settings');
  if (!res.ok) throw new Error('Could not fetch notification settings');
  return res.json();
}

export async function saveNotificationSettings(settings, actionToken) {
  const res = await fetch('/api/notification-settings', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-action-token': actionToken || ''
    },
    body: JSON.stringify(settings)
  });
  if (!res.ok) throw new Error('No autorizado o error al guardar');
  return res.json();
}

export async function fetchNotificationLog() {
  const res = await fetch('/api/notification-log');
  if (!res.ok) throw new Error('Could not fetch log');
  return res.json();
}

export async function sendTestNotification({ templateKey, testRecipient, sampleData, actionToken }) {
  const res = await fetch('/api/notifications/test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-action-token': actionToken || ''
    },
    body: JSON.stringify({ templateKey, testRecipient, sampleData })
  });
  if (!res.ok) throw new Error('Falló el envío de prueba');
  return res.json();
}
