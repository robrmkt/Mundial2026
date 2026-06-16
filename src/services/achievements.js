// Catálogo de insignias (V4) + evaluador. ~99 insignias con rareza.
// La lógica usa estadísticas reales del jugador. Las insignias que dependen de
// datos de fases posteriores (interacción, snapshots de líder, tiempo en podio)
// se activan vía `ctx` y por defecto quedan apagadas hasta que esos datos existan.

export const RARITY_ORDER = ['legendary', 'epic', 'rare', 'common', 'meme'];
export const RARITY_RANK = { legendary: 0, epic: 1, rare: 2, common: 3, meme: 4 };

// id | título (con emoji) | rareza | descripción
export const BADGES = [
  // --- Podio y leyenda ---
  { id: 'leyenda_del_podio', title: 'Leyenda del Podio 🏛️', rarity: 'legendary', desc: 'Mayor tiempo acumulado en top 3.' },
  { id: 'vive_en_el_podio', title: 'Vive en el Podio 🏠', rarity: 'epic', desc: 'Más de 24 h acumuladas en top 3.' },
  { id: 'toco_metal', title: 'Tocó Metal 🥉', rarity: 'rare', desc: 'Entró al top 3.' },
  { id: 'volvio_al_podio', title: 'Volvió al Podio 🔁', rarity: 'rare', desc: 'Salió y volvió al top 3.' },
  { id: 'no_me_bajen', title: 'No me bajen 😤', rarity: 'epic', desc: 'Podio en varios cortes seguidos.' },
  { id: 'tercero_peligroso', title: 'Tercero peligroso 🥉', rarity: 'rare', desc: '3er lugar cerca del líder.' },
  { id: 'foto_del_podio', title: 'Salió en la foto 📸', rarity: 'common', desc: 'Apareció en el podio.' },
  { id: 'rento_arriba', title: 'Rentó arriba 🏢', rarity: 'epic', desc: '3 entradas al podio.' },
  { id: 'sombra_del_lider', title: 'Sombra del líder 👀', rarity: 'rare', desc: '2º a poca distancia del líder.' },
  { id: 'bronce_con_orgullo', title: 'Bronce con orgullo 🥉', rarity: 'common', desc: 'Está en 3er lugar.' },
  { id: 'medalla_prestada', title: 'Medalla prestada 😬', rarity: 'meme', desc: 'En el podio por mínima ventaja.' },
  { id: 'no_suelta_el_metal', title: 'No suelta el metal ✊', rarity: 'epic', desc: 'Podio durante varios snapshots.' },

  // --- Liderato ---
  { id: 'dueno_del_balon', title: 'Dueño del balón ⚽', rarity: 'epic', desc: 'Rank 1 actual.' },
  { id: 'salio_dorada', title: 'Salió dorada ✨', rarity: 'epic', desc: 'Nuevo líder.' },
  { id: 'la_silla_grande', title: 'La silla grande 👑', rarity: 'legendary', desc: 'Más snapshots como líder.' },
  { id: 'me_estan_persiguiendo', title: 'Me persiguen 👀', rarity: 'rare', desc: 'Líder con poca ventaja.' },
  { id: 'lider_silencioso', title: 'Líder silencioso 🤫', rarity: 'rare', desc: 'Arriba sin muchos exactos.' },
  { id: 'amanecio_lider', title: 'Amaneció líder 🌅', rarity: 'rare', desc: 'Subió a 1º desde el último corte.' },
  { id: 'no_pidio_permiso', title: 'No pidió permiso 🚀', rarity: 'epic', desc: 'Saltó a 1º desde fuera del top 3.' },
  { id: 'trono_caliente', title: 'Trono caliente 🔥', rarity: 'rare', desc: 'Líder con varios pisándole los talones.' },
  { id: 'carta_dorada', title: 'Carta dorada 🃏', rarity: 'epic', desc: 'Activó la animación de líder.' },
  { id: 'todos_contra_el', title: 'Todos contra él 😮‍💨', rarity: 'rare', desc: 'Líder bajo presión.' },

  // --- México ---
  { id: 'tengo_fe', title: 'Tengo Fe 🙏', rarity: 'epic', desc: 'Exacto en el primer partido de México.' },
  { id: 'modo_tricolor', title: 'Modo Tricolor 🇲🇽', rarity: 'rare', desc: 'Acertó el resultado de México.' },
  { id: 'mexico_me_sostiene', title: 'México me sostiene 🇲🇽', rarity: 'rare', desc: 'Buena parte de sus puntos vienen de México.' },
  { id: 'grupo_mexico', title: 'Conoce al Tri 📋', rarity: 'epic', desc: 'Acertó el resultado de los 3 partidos de México.' },
  { id: 'trilogia_tricolor', title: 'Trilogía Tricolor 🎬', rarity: 'legendary', desc: 'Exacto en los 3 partidos de México.' },
  { id: 'corazon_verde', title: 'Corazón verde 💚', rarity: 'common', desc: 'Apostó a favor de México en todos.' },
  { id: 'sin_miedo_al_tri', title: 'Sin miedo al Tri 😬', rarity: 'meme', desc: 'Apostó contra México.' },
  { id: 'traicion_deportiva', title: 'Traición deportiva 😭', rarity: 'meme', desc: 'Apostó contra México… y acertó.' },
  { id: 'grito_en_la_oficina', title: 'Grito en la oficina 📣', rarity: 'rare', desc: 'Sumó con un partido clave de México.' },
  { id: 'mexico_si_cumplio', title: 'México sí cumplió 😮‍💨', rarity: 'rare', desc: 'México le dio un exacto.' },
  { id: 'el_tri_lo_rescato', title: 'El Tri lo rescató 🛟', rarity: 'meme', desc: 'México le salvó una mala jornada.' },
  { id: 'mas_mexa_que_el_var', title: 'Más mexa que el VAR 🇲🇽', rarity: 'meme', desc: 'Apostó siempre por México.' },

  // --- Corea / apuestas incómodas ---
  { id: 'modo_kpop', title: 'Modo K-pop 🎤', rarity: 'meme', desc: 'Apostó Corea sobre México.' },
  { id: 'modo_bts', title: 'Modo BTS 💜', rarity: 'meme', desc: 'Apostó Corea sobre México… y acertó.' },
  { id: 'me_dolio_pero_sume', title: 'Me dolió, pero sumé 😭', rarity: 'meme', desc: 'Apostó contra el sentimiento y ganó puntos.' },
  { id: 'villano_de_la_oficina', title: 'Villano de oficina 😈', rarity: 'meme', desc: 'Acertó un resultado que molestó a la mayoría.' },
  { id: 'nadie_me_creyo', title: 'Nadie me creyó 🤷', rarity: 'epic', desc: 'Casi el único en acertar una sorpresa.' },
  { id: 'perdon_mexico', title: 'Perdón, México 😭', rarity: 'meme', desc: 'Ganó puntos apostando contra México.' },
  { id: 'traia_datos_no_fe', title: 'Traía datos, no fe 📊', rarity: 'rare', desc: 'Acertó contra el favorito popular.' },
  { id: 'enemigo_del_grupo', title: 'Enemigo del grupo 😬', rarity: 'meme', desc: 'Su pronóstico va contra el deseo de la mayoría.' },

  // --- Precisión ---
  { id: 'clavo_el_resultado', title: 'Lo clavó 🎯', rarity: 'rare', desc: 'Primer marcador exacto.' },
  { id: 'brujo_del_marcador', title: 'Brujo del Marcador 🧙', rarity: 'epic', desc: '2 o más exactos.' },
  { id: 'cirujano_del_marcador', title: 'Cirujano del Marcador 🩺', rarity: 'epic', desc: '3 o más exactos.' },
  { id: 'bola_de_cristal', title: 'Bola de cristal 🔮', rarity: 'legendary', desc: '5 o más exactos.' },
  { id: 'profeta_del_2_1', title: 'Profeta del 2-1 📿', rarity: 'rare', desc: 'Acertó un 2-1 exacto.' },
  { id: 'rey_del_empate', title: 'Rey del empate 🤝', rarity: 'rare', desc: '2+ empates acertados al marcador.' },
  { id: 'uno_a_cero_sufrido', title: '1-0 sufrido 😮‍💨', rarity: 'common', desc: 'Acertó un 1-0 exacto.' },
  { id: 'goleada_detectada', title: 'Vio la goleada 🚨', rarity: 'epic', desc: 'Acertó un exacto con diferencia de 3+.' },
  { id: 'dos_cero_de_manual', title: '2-0 de manual 📘', rarity: 'common', desc: 'Acertó un 2-0 exacto.' },
  { id: 'empate_con_colmillo', title: 'Empate con colmillo 🦊', rarity: 'rare', desc: 'Acertó un empate al marcador.' },
  { id: 'leyo_el_guion', title: 'Leyó el guion 📜', rarity: 'epic', desc: 'Exacto en un partido importante.' },
  { id: 'var_humano', title: 'VAR humano 📺', rarity: 'epic', desc: 'Efectividad muy alta.' },
  { id: 'no_adivina_calcula', title: 'No adivina, calcula 🧮', rarity: 'rare', desc: 'Muchos aciertos de resultado.' },
  { id: 'le_susurro_al_balon', title: 'Le susurró al balón ⚽', rarity: 'epic', desc: 'Exacto en un partido de muchos goles.' },
  { id: 'tiro_quirurgico', title: 'Tiro quirúrgico 🎯', rarity: 'rare', desc: 'Exacto en un partido cerrado.' },

  // --- Rachas ---
  { id: 'tres_al_hilo', title: 'Tres al hilo 🧵', rarity: 'rare', desc: '3 partidos seguidos sumando.' },
  { id: 'racha_caliente', title: 'Racha caliente 🔥', rarity: 'epic', desc: '3+ partidos seguidos sumando.' },
  { id: 'no_falla_ni_queriendo', title: 'Imbatible de oficina 😮‍💨', rarity: 'legendary', desc: '5 seguidos sumando.' },
  { id: 'se_congelo', title: 'Se congeló 🥶', rarity: 'meme', desc: '3 fallos seguidos.' },
  { id: 'necesita_limpia', title: 'Necesita limpia 🕯️', rarity: 'meme', desc: '5 fallos seguidos.' },
  { id: 'de_puntito', title: 'De puntito en puntito 🐜', rarity: 'common', desc: 'Muchos aciertos de 1 punto.' },
  { id: 'casi_casi', title: 'Casi, casi... 😭', rarity: 'meme', desc: 'Muchos resultados, pocos exactos.' },
  { id: 'hoy_si_trajo', title: 'Hoy sí trajo 🔥', rarity: 'rare', desc: 'Muchos puntos en una sola jornada.' },
  { id: 'dia_frio', title: 'Día frío 🧊', rarity: 'meme', desc: 'Una jornada en blanco.' },
  { id: 'resucito', title: 'Resucitó 🧟', rarity: 'rare', desc: 'Rompió una mala racha.' },
  { id: 'modo_apagado', title: 'Modo apagado 🔌', rarity: 'meme', desc: 'Muchos errores recientes.' },
  { id: 'volvio_el_toque', title: 'Volvió el toque ✨', rarity: 'rare', desc: 'Rompió la mala racha con un exacto.' },

  // --- Movimiento ---
  { id: 'subio_como_espuma', title: 'Subió como espuma 📈', rarity: 'rare', desc: 'Subió 3+ posiciones.' },
  { id: 'remontada_de_pelicula', title: 'Remontada de película 🎬', rarity: 'epic', desc: 'Subió 8+ desde su peor posición.' },
  { id: 'salio_del_fondo', title: 'Salió del fondo 🕳️', rarity: 'rare', desc: 'Dejó los últimos 3 lugares.' },
  { id: 'resbalon', title: 'Se resbaló 🛝', rarity: 'meme', desc: 'Bajó 3+ posiciones.' },
  { id: 'aguanto_vara', title: 'Aguantó vara 🛡️', rarity: 'rare', desc: 'Mala jornada pero siguió en top 12.' },
  { id: 'no_se_mueve', title: 'Piedra en la tabla 🪨', rarity: 'common', desc: 'Misma posición varios cortes.' },
  { id: 'volvio_del_vestidor', title: 'Volvió del vestidor 🚪', rarity: 'rare', desc: 'Mejoró tras una mala racha.' },
  { id: 'se_metio_por_la_banda', title: 'Se metió por la banda 🏃', rarity: 'rare', desc: 'Subida discreta y constante.' },
  { id: 'caida_libre', title: 'Caída libre 🪂', rarity: 'meme', desc: 'Bajó muchas posiciones.' },
  { id: 'cambio_tactico', title: 'Cambio táctico 🔁', rarity: 'rare', desc: 'Cambió su tendencia.' },

  // --- Fondo / banca ---
  { id: 'banca_vip', title: 'Banca VIP 🪑', rarity: 'meme', desc: 'Fuera del top 12.' },
  { id: 'fue_por_las_aguas', title: 'Fue por las aguas 🧃', rarity: 'meme', desc: 'Último lugar actual.' },
  { id: 'modo_tutorial', title: 'Modo tutorial 🎮', rarity: 'meme', desc: 'Últimos lugares con pocos puntos.' },
  { id: 'todavia_cree', title: 'Todavía cree 🙏', rarity: 'common', desc: 'Abajo, pero sumó recientemente.' },
  { id: 'la_epica_empieza_abajo', title: 'Épica desde abajo 🦅', rarity: 'meme', desc: 'Último con posibilidad matemática.' },
  { id: 'no_es_fondo_es_impulso', title: 'No es fondo, es impulso 🚀', rarity: 'meme', desc: 'Estuvo último y luego subió.' },
  { id: 'cuidando_la_banca', title: 'Cuidando la banca 🪑', rarity: 'meme', desc: 'Fuera del top 12 varios cortes.' },
  { id: 'hielera_fc', title: 'Hielera FC 🧃', rarity: 'meme', desc: 'Último y sin puntos recientes.' },
  { id: 'apenas_calentando', title: 'Apenas calentando 🔥', rarity: 'common', desc: 'Poco avance inicial.' },
  { id: 'historia_de_superacion', title: 'Historia de superación 📖', rarity: 'meme', desc: 'Abajo, pero mejorando.' },

  // --- Interacción (datos de fases 5-6; vía ctx) ---
  { id: 'alma_de_estadio', title: 'Alma de estadio 🏟️', rarity: 'epic', desc: 'Más interacciones totales.' },
  { id: 'treboles_para_ti', title: 'Tréboles para ti 🍀', rarity: 'common', desc: 'Recibió suerte de la oficina.' },
  { id: 'con_toda_la_fe', title: 'Con toda la fe 🙌', rarity: 'rare', desc: '5+ suertes recibidas.' },
  { id: 'bendicion_colectiva', title: 'Bendición colectiva 🍀', rarity: 'epic', desc: '10+ suertes recibidas.' },
  { id: 'porrista_oficial', title: 'Porrista oficial 📣', rarity: 'common', desc: 'Lanzó muchas reacciones.' },
  { id: 'dedo_cansado', title: 'Dedo cansado 👆', rarity: 'meme', desc: 'Muchísimos taps.' },
  { id: 'barra_brava', title: 'Barra brava 🥁', rarity: 'rare', desc: 'Mucho apoyo a equipos.' },
  { id: 'buuu_con_carino', title: 'Buuu con cariño 👻', rarity: 'meme', desc: 'Usó abucheos (a equipos).' },
  { id: 'trebolero_mayor', title: 'Trébolero mayor 🍀', rarity: 'rare', desc: 'Repartió mucha suerte.' },
  { id: 'el_del_ambiente', title: 'El del ambiente 🎉', rarity: 'common', desc: 'Usa reacciones seguido.' }
];

const BADGE_BY_ID = Object.fromEntries(BADGES.map(b => [b.id, b]));

function parseScore(str) {
  const [h, a] = String(str || '').split('-').map(n => Number.parseInt(n, 10));
  return { h, a };
}

// Hechos derivados de los resultados exactos del jugador.
function precisionFacts(results) {
  const exacts = results.filter(r => r.kind === 'exact').map(r => parseScore(r.actual));
  const has = (pred) => exacts.some(pred);
  return {
    exactCount: exacts.length,
    outcomeCount: results.filter(r => r.kind === 'outcome').length,
    has21: has(({ h, a }) => (h === 2 && a === 1) || (h === 1 && a === 2)),
    has10: has(({ h, a }) => (h === 1 && a === 0) || (h === 0 && a === 1)),
    has20: has(({ h, a }) => (h === 2 && a === 0) || (h === 0 && a === 2)),
    drawExacts: exacts.filter(({ h, a }) => h === a).length,
    hasBigWin: has(({ h, a }) => Math.abs(h - a) >= 3),
    hasHighScoring: has(({ h, a }) => h + a >= 4),
    hasTightExact: has(({ h, a }) => h + a <= 1)
  };
}

// Hechos de México a partir de sus partidos y los pronósticos del jugador.
function mexicoFacts(player, matches) {
  const predictions = player.predictions || {};
  const mxMatches = matches
    .filter(m => m.homeTeam === 'México' || m.awayTeam === 'México')
    .sort((a, b) => new Date(a.kickoff || 0) - new Date(b.kickoff || 0));

  let predicted = 0, betFor = 0, betAgainst = 0, exact = 0, outcome = 0, againstWon = 0, firstExact = false;
  mxMatches.forEach((m, i) => {
    const pred = predictions[m.id];
    if (!pred) return;
    predicted++;
    const mexHome = m.homeTeam === 'México';
    const pH = Number(pred.homeScore), pA = Number(pred.awayScore);
    const forMex = mexHome ? pH > pA : pA > pH;
    const againstMex = mexHome ? pH < pA : pA < pH;
    if (forMex) betFor++;
    if (againstMex) betAgainst++;

    if (m.status === 'FINISHED') {
      const mH = Number(m.homeScore), mA = Number(m.awayScore);
      const isExact = pH === mH && pA === mA;
      const isOutcome = Math.sign(pH - pA) === Math.sign(mH - mA);
      if (isExact) { exact++; if (i === 0) firstExact = true; }
      if (isExact || isOutcome) outcome++;
      if (againstMex && (isExact || isOutcome)) againstWon++;
    }
  });

  return {
    total: mxMatches.length,
    predicted, betFor, betAgainst, exact, outcome, againstWon, firstExact
  };
}

// Evalúa qué insignias tiene un jugador. `profile` viene de getPlayerProfile.
// `ctx` (opcional) trae datos de interacción/podio/snapshots de fases posteriores.
export function evaluateBadges(player, profile, { matches = [], totalParticipants = 0, ctx = {} } = {}) {
  const earned = new Set();
  const add = (id, cond) => { if (cond) earned.add(id); };

  const rank = player.rank || 0;
  const points = player.points || 0;
  const exactHits = player.exactHits || 0;
  const effectiveness = player.effectiveness || 0;
  const played = player.playedAndPredicted || 0;
  const { hot = 0, cold = 0 } = profile.streaks || {};
  const pf = precisionFacts(profile.results || []);
  const mx = mexicoFacts(player, matches);
  const inTop3 = rank >= 1 && rank <= 3;
  const inTop12 = rank >= 1 && rank <= 12;
  const isLast = totalParticipants && rank === totalParticipants;
  const lead = ctx.leaderMargin; // ventaja del 1º sobre el 2º (si se provee)

  // Precisión
  add('clavo_el_resultado', exactHits >= 1);
  add('brujo_del_marcador', exactHits >= 2);
  add('cirujano_del_marcador', exactHits >= 3);
  add('bola_de_cristal', exactHits >= 5);
  add('profeta_del_2_1', pf.has21);
  add('uno_a_cero_sufrido', pf.has10);
  add('dos_cero_de_manual', pf.has20);
  add('rey_del_empate', pf.drawExacts >= 2);
  add('empate_con_colmillo', pf.drawExacts >= 1);
  add('goleada_detectada', pf.hasBigWin);
  add('le_susurro_al_balon', pf.hasHighScoring);
  add('tiro_quirurgico', pf.hasTightExact);
  add('var_humano', played >= 4 && effectiveness >= 75);
  add('no_adivina_calcula', pf.outcomeCount >= 5);
  add('leyo_el_guion', exactHits >= 1 && played >= 3);

  // Rachas
  add('tres_al_hilo', hot >= 3);
  add('racha_caliente', hot >= 3);
  add('no_falla_ni_queriendo', hot >= 5);
  add('se_congelo', cold >= 3);
  add('necesita_limpia', cold >= 5);
  add('de_puntito', pf.outcomeCount >= 4 && exactHits <= 1);
  add('casi_casi', pf.outcomeCount >= 4 && exactHits === 0);
  add('hoy_si_trajo', (profile.today?.points || 0) >= 4);
  add('dia_frio', played > 0 && (profile.today?.points || 0) === 0 && (profile.today?.miss || 0) >= 2);
  add('modo_apagado', cold >= 2);
  add('resucito', ctx.brokeColdStreak === true);
  add('volvio_el_toque', ctx.brokeColdStreakWithExact === true);

  // Posición / podio (lo computable sin snapshots)
  add('foto_del_podio', inTop3);
  add('toco_metal', inTop3);
  add('bronce_con_orgullo', rank === 3);
  add('dueno_del_balon', rank === 1 && points > 0);
  add('sombra_del_lider', rank === 2 && lead != null && lead <= 2);
  add('tercero_peligroso', rank === 3 && lead != null && lead <= 3);
  add('me_estan_persiguiendo', rank === 1 && ctx.leadOverSecond != null && ctx.leadOverSecond <= 2);
  add('trono_caliente', rank === 1 && ctx.chasersClose >= 2);
  add('todos_contra_el', rank === 1 && ctx.chasersClose >= 3);
  add('lider_silencioso', inTop3 && exactHits <= 1);

  // Fondo / banca
  add('banca_vip', played > 0 && rank > 12);
  add('cuidando_la_banca', played > 0 && rank > 12);
  add('fue_por_las_aguas', isLast);
  add('hielera_fc', isLast && (profile.today?.points || 0) === 0);
  add('modo_tutorial', rank > 12 && points <= 2);
  add('apenas_calentando', played > 0 && played <= 2);
  add('todavia_cree', rank > 12 && (profile.today?.points || 0) > 0);
  add('la_epica_empieza_abajo', isLast && played > 0);

  // Movimiento (requiere rankDelta en ctx)
  const delta = ctx.rankDelta;
  if (typeof delta === 'number') {
    add('subio_como_espuma', delta >= 3);
    add('remontada_de_pelicula', delta >= 8);
    add('resbalon', delta <= -3);
    add('caida_libre', delta <= -6);
    add('se_metio_por_la_banda', delta >= 1 && delta <= 2);
    add('cambio_tactico', Math.abs(delta) >= 2);
    add('aguanto_vara', delta <= -2 && inTop12);
    add('no_se_mueve', delta === 0 && (ctx.snapshotsSeen || 0) >= 3);
    add('salio_del_fondo', ctx.leftBottom === true);
    add('volvio_del_vestidor', ctx.brokeColdStreak === true && delta > 0);
    add('historia_de_superacion', rank > 12 && delta > 0);
    add('no_es_fondo_es_impulso', ctx.wasLast === true && delta > 0);
  }

  // México
  add('clavo_el_resultado', mx.exact >= 1); // refuerza
  add('tengo_fe', mx.firstExact);
  add('modo_tricolor', mx.outcome >= 1);
  add('mexico_si_cumplio', mx.exact >= 1);
  add('grupo_mexico', mx.total > 0 && mx.outcome >= mx.total);
  add('trilogia_tricolor', mx.total > 0 && mx.exact >= mx.total);
  add('corazon_verde', mx.predicted > 0 && mx.betFor === mx.predicted);
  add('mas_mexa_que_el_var', mx.predicted >= 3 && mx.betFor === mx.predicted);
  add('mexico_me_sostiene', mx.outcome >= 2);
  add('sin_miedo_al_tri', mx.betAgainst >= 1);
  add('traicion_deportiva', mx.againstWon >= 1);
  add('perdon_mexico', mx.againstWon >= 1);
  add('grito_en_la_oficina', mx.outcome >= 1);

  // Corea / incómodas (lo computable; el resto vía ctx de rareza/popularidad)
  add('modo_kpop', mx.betAgainst >= 1);
  add('modo_bts', mx.againstWon >= 1);
  add('me_dolio_pero_sume', mx.againstWon >= 1);
  add('traia_datos_no_fe', ctx.beatPopularFavorite === true);
  add('villano_de_la_oficina', ctx.beatMajority === true);
  add('nadie_me_creyo', ctx.loneCorrect === true);
  add('enemigo_del_grupo', ctx.againstMajorityWish === true);

  // Liderato / podio que dependen de snapshots (vía ctx)
  add('salio_dorada', ctx.justBecameLeader === true);
  add('amanecio_lider', ctx.justBecameLeader === true);
  add('no_pidio_permiso', ctx.leapToLeadFromOutsideTop3 === true);
  add('carta_dorada', ctx.triggeredLeaderAnim === true);
  add('la_silla_grande', ctx.mostLeaderSnapshots === true);
  add('no_suelta_el_metal', (ctx.podiumSnapshots || 0) >= 3);
  add('no_me_bajen', (ctx.podiumSnapshots || 0) >= 3);
  add('rento_arriba', (ctx.podiumEntries || 0) >= 3);
  add('volvio_al_podio', (ctx.podiumEntries || 0) >= 2);
  add('medalla_prestada', inTop3 && lead != null && lead === 0);

  // Leyenda / podio por tiempo (vía ctx)
  add('leyenda_del_podio', ctx.isLegend === true);
  add('vive_en_el_podio', (ctx.podiumMs || 0) >= 24 * 3600 * 1000);

  // Interacción (vía ctx de fases 5-6)
  add('alma_de_estadio', ctx.mostInteractions === true);
  add('treboles_para_ti', (ctx.luckReceived || 0) >= 1);
  add('con_toda_la_fe', (ctx.luckReceived || 0) >= 5);
  add('bendicion_colectiva', (ctx.luckReceived || 0) >= 10);
  add('trebolero_mayor', (ctx.luckGiven || 0) >= 10);
  add('porrista_oficial', (ctx.reactionsSent || 0) >= 10);
  add('el_del_ambiente', (ctx.reactionsSent || 0) >= 5);
  add('dedo_cansado', (ctx.tapsSent || 0) >= 50);
  add('barra_brava', (ctx.supportSent || 0) >= 10);
  add('buuu_con_carino', (ctx.boosSent || 0) >= 1);

  return [...earned]
    .map(id => BADGE_BY_ID[id])
    .filter(Boolean)
    .sort((a, b) => RARITY_RANK[a.rarity] - RARITY_RANK[b.rarity]);
}

// Las N insignias más destacadas (mayor rareza primero) para la ficha.
export function topBadges(badges, n = 5) {
  return badges.slice(0, n);
}
