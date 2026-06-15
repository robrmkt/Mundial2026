import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, MessageCircle, Send, Clock, Radio } from 'lucide-react';
import { fetchMatchSummary } from '../services/liveData';

// Porras que cualquiera puede lanzar; en Fase 2 se compartirán en vivo con todos.
const REACTIONS = [
  { key: 'confetti', emoji: '🎉', label: 'Confeti' },
  { key: 'balls', emoji: '⚽', label: 'Balones' },
  { key: 'fire', emoji: '🔥', label: 'Fuego' },
  { key: 'mexico', emoji: '🇲🇽', label: 'México' },
  { key: 'clap', emoji: '👏', label: 'Aplausos' }
];

function useCountdown(targetIso) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!targetIso) return null;
  const diff = new Date(targetIso).getTime() - now;
  if (Number.isNaN(diff) || diff <= 0) return null;
  const totalSec = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60
  };
}

function NextMatch({ match }) {
  const cd = useCountdown(match?.kickoff);
  if (!match) {
    return <div className="pulse-empty">No hay más partidos programados por ahora.</div>;
  }
  return (
    <div className="next-match">
      <span className="next-match-label"><Clock size={13} /> Próximo partido</span>
      <div className="next-match-teams">
        <span>{match.homeFlag} {match.homeTeam}</span>
        <span className="next-match-vs">vs</span>
        <span>{match.awayTeam} {match.awayFlag}</span>
      </div>
      {cd ? (
        <div className="countdown">
          {cd.days > 0 && <span className="cd-unit"><strong>{cd.days}</strong>d</span>}
          <span className="cd-unit"><strong>{String(cd.hours).padStart(2, '0')}</strong>h</span>
          <span className="cd-unit"><strong>{String(cd.minutes).padStart(2, '0')}</strong>m</span>
          <span className="cd-unit"><strong>{String(cd.seconds).padStart(2, '0')}</strong>s</span>
        </div>
      ) : (
        <div className="next-match-soon">¡Está por comenzar!</div>
      )}
      <span className="next-match-date">{match.date}</span>
    </div>
  );
}

function LiveTimeline({ liveMatch }) {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  const espnId = liveMatch?.espnId;
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!espnId) {
        if (active) setLoading(false);
        return;
      }
      try {
        const summary = await fetchMatchSummary(espnId);
        if (active) setTimeline(summary.timeline.slice(0, 10));
      } catch {
        if (active) setTimeline([]);
      } finally {
        if (active) setLoading(false);
      }
    };
    const initial = setTimeout(load, 0);
    const id = espnId ? setInterval(load, 30000) : null;
    return () => {
      active = false;
      clearTimeout(initial);
      if (id) clearInterval(id);
    };
  }, [espnId]);

  return (
    <div className="pulse-live">
      <div className="pulse-live-score">
        <span className="pulse-live-team">{liveMatch.homeFlag} {liveMatch.homeTeam}</span>
        <strong>{liveMatch.homeScore} - {liveMatch.awayScore}</strong>
        <span className="pulse-live-team">{liveMatch.awayTeam} {liveMatch.awayFlag}</span>
        <span className="pulse-live-min">
          <span className="live-dot" />
          {liveMatch.isHalftime ? 'MT' : (liveMatch.displayClock || `${liveMatch.minute}'`)}
        </span>
      </div>
      {loading ? (
        <div className="pulse-empty">Cargando cronología…</div>
      ) : timeline.length === 0 ? (
        <div className="pulse-empty">Aún sin eventos. En cuanto pase algo, aparece aquí.</div>
      ) : (
        <ul className="pulse-timeline">
          {timeline.map(ev => (
            <li key={ev.id} className={`pulse-event ${ev.isGoal ? 'is-goal' : ''}`}>
              <span className="pulse-event-min">{ev.minute || '—'}</span>
              <span className="pulse-event-icon">{ev.icon}</span>
              <span className="pulse-event-text">{ev.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Wall({ chatMessages, onSendMessage }) {
  const [text, setText] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!text.trim()) return;
    onSendMessage(text);
    setText('');
  };

  return (
    <div className="pulse-wall">
      <div className="pulse-wall-messages">
        {chatMessages.map(msg => {
          const isSystem = msg.user === 'Sistema';
          const isUser = msg.user.startsWith('Tú');
          return (
            <div
              key={msg.id}
              className={`wall-msg ${isSystem ? 'wall-sys' : isUser ? 'wall-me' : 'wall-other'} ${msg.highlight ? 'wall-highlight' : ''}`}
            >
              {!isSystem && <span className="wall-msg-user">{msg.user}</span>}
              <span className="wall-msg-text">{msg.text}</span>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form onSubmit={handleSubmit} className="pulse-wall-compose">
        <input
          type="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Escribe a la oficina…"
        />
        <button type="submit" title="Enviar"><Send size={15} /></button>
      </form>
    </div>
  );
}

export default function LivePulse({ matches, chatMessages, onSendMessage, onReaction }) {
  const liveMatches = useMemo(() => matches.filter(m => m.status === 'LIVE'), [matches]);
  // El próximo partido = el SCHEDULED más cercano por hora de inicio.
  // (ESPN marca LIVE/FINISHED en cuanto arranca, así que SCHEDULED ya implica futuro.)
  const nextMatch = useMemo(() => {
    return matches
      .filter(m => m.status === 'SCHEDULED' && m.kickoff)
      .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())[0] || null;
  }, [matches]);

  const hasLive = liveMatches.length > 0;
  const [tab, setTab] = useState(hasLive ? 'vivo' : 'muro');

  return (
    <div className="pulse-panel">
      <div className="pulse-header">
        <span className="pulse-title">
          <Activity size={15} />
          Pulso en vivo
        </span>
        <div className="pulse-tabs">
          <button
            className={`pulse-tab ${tab === 'vivo' ? 'active' : ''}`}
            onClick={() => setTab('vivo')}
          >
            {hasLive && <span className="live-dot" />}
            En vivo
          </button>
          <button
            className={`pulse-tab ${tab === 'muro' ? 'active' : ''}`}
            onClick={() => setTab('muro')}
          >
            <MessageCircle size={12} /> Muro
          </button>
        </div>
      </div>

      <div className="pulse-body">
        {tab === 'vivo' ? (
          hasLive ? <LiveTimeline liveMatch={liveMatches[0]} /> : <NextMatch match={nextMatch} />
        ) : (
          <Wall chatMessages={chatMessages} onSendMessage={onSendMessage} />
        )}
      </div>

      <div className="pulse-reactions">
        <span className="pulse-reactions-hint"><Radio size={12} /> Lanza una porra</span>
        <div className="pulse-reactions-row">
          {REACTIONS.map(r => (
            <button
              key={r.key}
              className="reaction-btn"
              title={r.label}
              aria-label={r.label}
              onClick={() => onReaction(r.key)}
            >
              {r.emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
