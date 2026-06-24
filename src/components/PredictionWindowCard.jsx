import { useEffect, useState } from 'react';
import { fetchPredictionWindows, getWindowStatus } from '../services/predictionWindows';

function useCountdown(targetIso) {
  const [diff, setDiff] = useState(() => targetIso ? Math.max(0, Date.parse(targetIso) - Date.now()) : 0);
  useEffect(() => {
    if (!targetIso) return;
    const id = setInterval(() => setDiff(Math.max(0, Date.parse(targetIso) - Date.now())), 1000);
    return () => clearInterval(id);
  }, [targetIso]);
  const s = Math.floor(diff / 1000);
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60, done: diff <= 0 };
}

function pad(n) { return String(n).padStart(2, '0'); }

export default function PredictionWindowCard() {
  const [windows, setWindows] = useState([]);

  useEffect(() => {
    fetchPredictionWindows().then(d => setWindows(d.windows || [])).catch(() => {});
  }, []);

  // Find the most relevant window to display publicly
  const active = windows.find(w => ['scheduled', 'open'].includes(getWindowStatus(w)));
  const closed = !active && windows.find(w => getWindowStatus(w) === 'closed');

  if (windows.length === 0) return null;
  if (!active && !closed) return null;

  const status = active ? getWindowStatus(active) : 'closed';
  const win = active || closed;

  return (
    <div className="prediction-window-card">
      <div className="pwc-icon">⚽</div>
      <div className="pwc-content">
        <span className="pwc-label">Siguiente fase de la quiniela</span>
        {status === 'scheduled' && <ScheduledCountdown win={win} />}
        {status === 'open' && <div className="pwc-open-msg">Próximamente podrás completar tus pronósticos para la siguiente ronda.</div>}
        {status === 'closed' && <div className="pwc-closed-msg">La ventana de pronósticos ya cerró.</div>}
      </div>
    </div>
  );
}

function ScheduledCountdown({ win }) {
  const cd = useCountdown(win.openAt);
  if (!win.openAt) return <div className="pwc-soon">Pronto podrás completar tus pronósticos para la siguiente ronda.</div>;
  if (cd.done) return <div className="pwc-open-msg">La siguiente fase ya está disponible.</div>;
  return (
    <div>
      <div className="pwc-soon">Se habilita en:</div>
      <div className="pwc-countdown">
        <div className="pwc-unit"><strong>{cd.days}</strong><i>días</i></div>
        <div className="pwc-sep">·</div>
        <div className="pwc-unit"><strong>{pad(cd.hours)}</strong><i>h</i></div>
        <div className="pwc-sep">·</div>
        <div className="pwc-unit"><strong>{pad(cd.minutes)}</strong><i>min</i></div>
      </div>
    </div>
  );
}
