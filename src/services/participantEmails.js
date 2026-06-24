export const PARTICIPANT_EMAIL_ROSTER = [
  { name: 'Claudia Arreola',   email: 'claudia.arreola@uppharma.com',      team: 'up' },
  { name: 'Alejandro Perez',   email: 'alejandro.perez@bacherzoppi.com',   team: 'bz' },
  { name: 'Yarhely',           email: 'yarhely.lopez@uppharma.com',        team: 'up' },
  { name: 'Mauricio',          email: 'mauricio.ortiz@uppharma.com',       team: 'up' },
  { name: 'Luis',              email: 'luis.silva@bacherzoppi.com',        team: 'bz' },
  { name: 'Elizabeth',         email: 'elizabeth.pedraza@bacherzoppi.com', team: 'bz' },
  { name: 'Ángel Velázquez',   email: 'angel.velazquez@bacherzoppi.com',   team: 'bz' },
  { name: 'Miguel',            email: 'miguel.cabrera@uppharma.com',       team: 'up' },
  { name: 'Natalia',           email: 'natalia.garcia@uppharma.com',       team: 'up' },
  { name: 'Roberto',           email: 'roberto.tejeda@bacherzoppi.com',    team: 'bz' },
  { name: 'Gustavo',           email: 'gestoria@bacherzoppi.com',          team: 'bz' },
  { name: 'Nohemí',            email: 'nohemi.tellez@uppharma.com',        team: 'up' },
  { name: 'Ángel Montiel',     email: 'gabriel.montiel@bacherzoppi.com',   team: 'bz' },
  { name: 'Omar',              email: 'omar.mejia@uppharma.com',           team: 'up' },
  { name: 'Claudia Gonzalez',  email: 'claudia.gonzalez@bacherzoppi.com',  team: 'bz' },
  { name: 'Fernando',          email: 'fernando.diaz@bacherzoppi.com',     team: 'bz' },
  { name: 'Zeltzin',           email: 'zeltzin.arzate@bacherzoppi.com',    team: 'bz' },
  { name: 'Vannesa',           email: 'vanessa.atonal@bacherzoppi.com',    team: 'bz' },
  { name: 'Alberto Perez',     email: 'alberto.perez@uppharma.com',        team: 'up' },
  { name: 'Daniel',            email: 'pedro.aguirre@bacherzoppi.com',     team: 'bz' },
  { name: 'Caty',              email: 'caty.garcia@bacherzoppi.com',       team: 'bz' },
  { name: 'Enrique',           email: 'enrique.tapia@bacherzoppi.com',     team: 'bz' },
  { name: 'Andrés',            email: 'andres.arenas@bacherzoppi.com',     team: 'bz' },
  { name: 'Ricardo Sánchez',   email: 'ricardo.sanchez@bacherzoppi.com',   team: 'bz' },
];

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function isCorporateEmail(email) {
  const n = normalizeEmail(email);
  return n.endsWith('@bacherzoppi.com') || n.endsWith('@uppharma.com');
}

function normalize(str) {
  return String(str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function getRosterEntry(name) {
  const n = normalize(name);
  return PARTICIPANT_EMAIL_ROSTER.find(r => normalize(r.name) === n) || null;
}

export function getRosterEntryByEmail(email) {
  const e = normalizeEmail(email);
  return PARTICIPANT_EMAIL_ROSTER.find(r => normalizeEmail(r.email) === e) || null;
}
