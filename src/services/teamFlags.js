export const TEAM_COUNTRY_CODES = {
  México: 'mx',
  Mexico: 'mx',
  Chequia: 'cz',
  Czechia: 'cz',
  'República Checa': 'cz',
  Canada: 'ca',
  Canadá: 'ca',
  USA: 'us',
  'Estados Unidos': 'us',
  Brasil: 'br',
  Brazil: 'br',
  Corea: 'kr',
  'Corea del Sur': 'kr',
  'Korea Republic': 'kr',
  'South Korea': 'kr',
  Sudáfrica: 'za',
  'South Africa': 'za',
  Francia: 'fr',
  France: 'fr',
  Senegal: 'sn',
  'Arabia Saudita': 'sa',
  'Saudi Arabia': 'sa',
  Portugal: 'pt',
  'RD Congo': 'cd',
  'DR Congo': 'cd',
  Inglaterra: 'gb-eng',
  England: 'gb-eng',
  Croacia: 'hr',
  Croatia: 'hr',
  Ghana: 'gh',
  Suiza: 'ch',
  Switzerland: 'ch',
  Alemania: 'de',
  Germany: 'de',
  Italia: 'it',
  Italy: 'it',
  España: 'es',
  Spain: 'es',
  Argentina: 'ar',
  Uruguay: 'uy',
  Colombia: 'co',
  Japón: 'jp',
  Japan: 'jp',
  Marruecos: 'ma',
  Morocco: 'ma',
  Australia: 'au',
  'Nueva Zelanda': 'nz',
  'New Zealand': 'nz',
  Qatar: 'qa',
  Catar: 'qa',
  Egipto: 'eg',
  Egypt: 'eg',
  Irán: 'ir',
  Iran: 'ir',
  Bélgica: 'be',
  Belgium: 'be',
  PaísesBajos: 'nl',
  'Países Bajos': 'nl',
  Netherlands: 'nl'
};

export function normalizeTeamName(teamName) {
  return String(teamName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function getTeamCountryCode(teamName) {
  if (TEAM_COUNTRY_CODES[teamName]) return TEAM_COUNTRY_CODES[teamName];
  const normalized = normalizeTeamName(teamName);
  const entry = Object.entries(TEAM_COUNTRY_CODES)
    .find(([name]) => normalizeTeamName(name) === normalized);
  return entry?.[1] || null;
}
