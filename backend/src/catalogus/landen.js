/**
 * Canonieke landenlijst (FR-28c, FR-28d)
 * --------------------------------------
 * Eén vaste lijst van landen ter wereld (ISO 3166-1). Op twee plekken gebruikt:
 *  1. het land-kiesscherm van de beheerder (bladeren/zoeken, geen vrije tekst),
 *  2. de multiple-choice-opties bij het vraagtype "land van herkomst artiest".
 * Zo blijven opgeslagen landen en getoonde antwoordopties altijd consistent.
 *
 * De tweeletter-code (bv. "GB") wordt gebruikt om een MusicBrainz-resultaat naar
 * de canonieke naam ("United Kingdom") te vertalen.
 */

// [ISO 3166-1 alpha-2 code, canonieke Engelse naam]
const LANDEN = [
  ['AF', 'Afghanistan'], ['AL', 'Albania'], ['DZ', 'Algeria'], ['AD', 'Andorra'],
  ['AO', 'Angola'], ['AG', 'Antigua and Barbuda'], ['AR', 'Argentina'], ['AM', 'Armenia'],
  ['AU', 'Australia'], ['AT', 'Austria'], ['AZ', 'Azerbaijan'], ['BS', 'Bahamas'],
  ['BH', 'Bahrain'], ['BD', 'Bangladesh'], ['BB', 'Barbados'], ['BY', 'Belarus'],
  ['BE', 'Belgium'], ['BZ', 'Belize'], ['BJ', 'Benin'], ['BT', 'Bhutan'],
  ['BO', 'Bolivia'], ['BA', 'Bosnia and Herzegovina'], ['BW', 'Botswana'], ['BR', 'Brazil'],
  ['BN', 'Brunei'], ['BG', 'Bulgaria'], ['BF', 'Burkina Faso'], ['BI', 'Burundi'],
  ['KH', 'Cambodia'], ['CM', 'Cameroon'], ['CA', 'Canada'], ['CV', 'Cape Verde'],
  ['CF', 'Central African Republic'], ['TD', 'Chad'], ['CL', 'Chile'], ['CN', 'China'],
  ['CO', 'Colombia'], ['KM', 'Comoros'], ['CG', 'Congo'], ['CD', 'DR Congo'],
  ['CR', 'Costa Rica'], ['CI', "Côte d'Ivoire"], ['HR', 'Croatia'], ['CU', 'Cuba'],
  ['CY', 'Cyprus'], ['CZ', 'Czechia'], ['DK', 'Denmark'], ['DJ', 'Djibouti'],
  ['DM', 'Dominica'], ['DO', 'Dominican Republic'], ['EC', 'Ecuador'], ['EG', 'Egypt'],
  ['SV', 'El Salvador'], ['GQ', 'Equatorial Guinea'], ['ER', 'Eritrea'], ['EE', 'Estonia'],
  ['SZ', 'Eswatini'], ['ET', 'Ethiopia'], ['FJ', 'Fiji'], ['FI', 'Finland'],
  ['FR', 'France'], ['GA', 'Gabon'], ['GM', 'Gambia'], ['GE', 'Georgia'],
  ['DE', 'Germany'], ['GH', 'Ghana'], ['GR', 'Greece'], ['GD', 'Grenada'],
  ['GT', 'Guatemala'], ['GN', 'Guinea'], ['GW', 'Guinea-Bissau'], ['GY', 'Guyana'],
  ['HT', 'Haiti'], ['HN', 'Honduras'], ['HU', 'Hungary'], ['IS', 'Iceland'],
  ['IN', 'India'], ['ID', 'Indonesia'], ['IR', 'Iran'], ['IQ', 'Iraq'],
  ['IE', 'Ireland'], ['IL', 'Israel'], ['IT', 'Italy'], ['JM', 'Jamaica'],
  ['JP', 'Japan'], ['JO', 'Jordan'], ['KZ', 'Kazakhstan'], ['KE', 'Kenya'],
  ['KI', 'Kiribati'], ['KW', 'Kuwait'], ['KG', 'Kyrgyzstan'], ['LA', 'Laos'],
  ['LV', 'Latvia'], ['LB', 'Lebanon'], ['LS', 'Lesotho'], ['LR', 'Liberia'],
  ['LY', 'Libya'], ['LI', 'Liechtenstein'], ['LT', 'Lithuania'], ['LU', 'Luxembourg'],
  ['MG', 'Madagascar'], ['MW', 'Malawi'], ['MY', 'Malaysia'], ['MV', 'Maldives'],
  ['ML', 'Mali'], ['MT', 'Malta'], ['MH', 'Marshall Islands'], ['MR', 'Mauritania'],
  ['MU', 'Mauritius'], ['MX', 'Mexico'], ['FM', 'Micronesia'], ['MD', 'Moldova'],
  ['MC', 'Monaco'], ['MN', 'Mongolia'], ['ME', 'Montenegro'], ['MA', 'Morocco'],
  ['MZ', 'Mozambique'], ['MM', 'Myanmar'], ['NA', 'Namibia'], ['NR', 'Nauru'],
  ['NP', 'Nepal'], ['NL', 'Netherlands'], ['NZ', 'New Zealand'], ['NI', 'Nicaragua'],
  ['NE', 'Niger'], ['NG', 'Nigeria'], ['KP', 'North Korea'], ['MK', 'North Macedonia'],
  ['NO', 'Norway'], ['OM', 'Oman'], ['PK', 'Pakistan'], ['PW', 'Palau'],
  ['PS', 'Palestine'], ['PA', 'Panama'], ['PG', 'Papua New Guinea'], ['PY', 'Paraguay'],
  ['PE', 'Peru'], ['PH', 'Philippines'], ['PL', 'Poland'], ['PT', 'Portugal'],
  ['QA', 'Qatar'], ['RO', 'Romania'], ['RU', 'Russia'], ['RW', 'Rwanda'],
  ['KN', 'Saint Kitts and Nevis'], ['LC', 'Saint Lucia'], ['VC', 'Saint Vincent and the Grenadines'],
  ['WS', 'Samoa'], ['SM', 'San Marino'], ['ST', 'São Tomé and Príncipe'], ['SA', 'Saudi Arabia'],
  ['SN', 'Senegal'], ['RS', 'Serbia'], ['SC', 'Seychelles'], ['SL', 'Sierra Leone'],
  ['SG', 'Singapore'], ['SK', 'Slovakia'], ['SI', 'Slovenia'], ['SB', 'Solomon Islands'],
  ['SO', 'Somalia'], ['ZA', 'South Africa'], ['KR', 'South Korea'], ['SS', 'South Sudan'],
  ['ES', 'Spain'], ['LK', 'Sri Lanka'], ['SD', 'Sudan'], ['SR', 'Suriname'],
  ['SE', 'Sweden'], ['CH', 'Switzerland'], ['SY', 'Syria'], ['TW', 'Taiwan'],
  ['TJ', 'Tajikistan'], ['TZ', 'Tanzania'], ['TH', 'Thailand'], ['TL', 'Timor-Leste'],
  ['TG', 'Togo'], ['TO', 'Tonga'], ['TT', 'Trinidad and Tobago'], ['TN', 'Tunisia'],
  ['TR', 'Turkey'], ['TM', 'Turkmenistan'], ['TV', 'Tuvalu'], ['UG', 'Uganda'],
  ['UA', 'Ukraine'], ['AE', 'United Arab Emirates'], ['GB', 'United Kingdom'],
  ['US', 'United States'], ['UY', 'Uruguay'], ['UZ', 'Uzbekistan'], ['VU', 'Vanuatu'],
  ['VA', 'Vatican City'], ['VE', 'Venezuela'], ['VN', 'Vietnam'], ['YE', 'Yemen'],
  ['ZM', 'Zambia'], ['ZW', 'Zimbabwe'],
];

const NAMEN = LANDEN.map(([, naam]) => naam);
const CODE_NAAR_NAAM = new Map(LANDEN.map(([code, naam]) => [code.toUpperCase(), naam]));
const NAAM_SET = new Set(NAMEN.map((n) => n.toLowerCase()));

/** Alle landnamen, alfabetisch gesorteerd (voor bladeren, FR-28d). */
function alleLandennamen() {
  return [...NAMEN].sort((a, b) => a.localeCompare(b));
}

/**
 * Live zoeken: geeft alle landen terug waarvan de naam de zoekterm ergens bevat
 * (niet alleen aan het begin), hoofdletter-ongevoelig (FR-28d).
 */
function zoekLanden(term) {
  const t = String(term ?? '').trim().toLowerCase();
  if (!t) return alleLandennamen();
  return alleLandennamen().filter((naam) => naam.toLowerCase().includes(t));
}

/** Is dit een geldige landnaam uit de canonieke lijst? (FR-28c) */
function isGeldigLand(naam) {
  return NAAM_SET.has(String(naam ?? '').trim().toLowerCase());
}

/** Vertaalt een ISO-landcode (bv. "GB") naar de canonieke naam ("United Kingdom"). */
function landVoorCode(code) {
  return CODE_NAAR_NAAM.get(String(code ?? '').trim().toUpperCase()) || null;
}

module.exports = {
  LANDEN,
  alleLandennamen,
  zoekLanden,
  isGeldigLand,
  landVoorCode,
};
