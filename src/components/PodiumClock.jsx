import { useEffect, useState } from 'react';
import { formatPodiumTime } from '../services/podiumTime';

// Reloj de "tiempo en podio". Si la persona está acumulando AHORA (en el top-3 visible),
// corre el minutero/segundero en vivo; si no, muestra el tiempo fijo.
// El padre debe pasar key={Math.round(ms/1000)} para reiniciar el conteo en cada recálculo.
export default function PodiumClock({ ms = 0, accruing = false }) {
  const [extra, setExtra] = useState(0);

  useEffect(() => {
    if (!accruing) return undefined;
    const start = Date.now();
    const id = setInterval(() => setExtra(Date.now() - start), 1000);
    return () => clearInterval(id);
  }, [accruing]);

  return formatPodiumTime(ms + (accruing ? extra : 0), accruing);
}
