/**
 * Canonieke landenlijst (FR-28c, FR-28d) — Nederlandstalig (NFR-8)
 * ---------------------------------------------------------------
 * Eén vaste lijst van landen ter wereld (ISO 3166-1), met de landnamen in het
 * Nederlands, want de spelers zien deze namen als antwoordopties. Op twee
 * plekken gebruikt:
 *  1. het land-kiesscherm van de beheerder (bladeren/zoeken, geen vrije tekst),
 *  2. de multiple-choice-opties bij het vraagtype "land van herkomst artiest".
 * Zo blijven opgeslagen landen en getoonde antwoordopties altijd consistent.
 *
 * De tweeletter-code (bv. "GB") wordt gebruikt om een MusicBrainz-resultaat naar
 * de Nederlandse naam ("Verenigd Koninkrijk") te vertalen.
 */

// [ISO 3166-1 alpha-2 code, canonieke Nederlandse naam]
const LANDEN = [
  ['AF', 'Afghanistan'], ['AL', 'Albanië'], ['DZ', 'Algerije'], ['AD', 'Andorra'],
  ['AO', 'Angola'], ['AG', 'Antigua en Barbuda'], ['AR', 'Argentinië'], ['AM', 'Armenië'],
  ['AU', 'Australië'], ['AT', 'Oostenrijk'], ['AZ', 'Azerbeidzjan'], ['BS', "Bahama's"],
  ['BH', 'Bahrein'], ['BD', 'Bangladesh'], ['BB', 'Barbados'], ['BY', 'Belarus'],
  ['BE', 'België'], ['BZ', 'Belize'], ['BJ', 'Benin'], ['BT', 'Bhutan'],
  ['BO', 'Bolivia'], ['BA', 'Bosnië en Herzegovina'], ['BW', 'Botswana'], ['BR', 'Brazilië'],
  ['BN', 'Brunei'], ['BG', 'Bulgarije'], ['BF', 'Burkina Faso'], ['BI', 'Burundi'],
  ['KH', 'Cambodja'], ['CM', 'Kameroen'], ['CA', 'Canada'], ['CV', 'Kaapverdië'],
  ['CF', 'Centraal-Afrikaanse Republiek'], ['TD', 'Tsjaad'], ['CL', 'Chili'], ['CN', 'China'],
  ['CO', 'Colombia'], ['KM', 'Comoren'], ['CG', 'Congo-Brazzaville'], ['CD', 'Congo-Kinshasa'],
  ['CR', 'Costa Rica'], ['CI', 'Ivoorkust'], ['HR', 'Kroatië'], ['CU', 'Cuba'],
  ['CY', 'Cyprus'], ['CZ', 'Tsjechië'], ['DK', 'Denemarken'], ['DJ', 'Djibouti'],
  ['DM', 'Dominica'], ['DO', 'Dominicaanse Republiek'], ['EC', 'Ecuador'], ['EG', 'Egypte'],
  ['SV', 'El Salvador'], ['GQ', 'Equatoriaal-Guinea'], ['ER', 'Eritrea'], ['EE', 'Estland'],
  ['SZ', 'Eswatini'], ['ET', 'Ethiopië'], ['FJ', 'Fiji'], ['FI', 'Finland'],
  ['FR', 'Frankrijk'], ['GA', 'Gabon'], ['GM', 'Gambia'], ['GE', 'Georgië'],
  ['DE', 'Duitsland'], ['GH', 'Ghana'], ['GR', 'Griekenland'], ['GD', 'Grenada'],
  ['GT', 'Guatemala'], ['GN', 'Guinee'], ['GW', 'Guinee-Bissau'], ['GY', 'Guyana'],
  ['HT', 'Haïti'], ['HN', 'Honduras'], ['HU', 'Hongarije'], ['IS', 'IJsland'],
  ['IN', 'India'], ['ID', 'Indonesië'], ['IR', 'Iran'], ['IQ', 'Irak'],
  ['IE', 'Ierland'], ['IL', 'Israël'], ['IT', 'Italië'], ['JM', 'Jamaica'],
  ['JP', 'Japan'], ['JO', 'Jordanië'], ['KZ', 'Kazachstan'], ['KE', 'Kenia'],
  ['KI', 'Kiribati'], ['KW', 'Koeweit'], ['KG', 'Kirgizië'], ['LA', 'Laos'],
  ['LV', 'Letland'], ['LB', 'Libanon'], ['LS', 'Lesotho'], ['LR', 'Liberia'],
  ['LY', 'Libië'], ['LI', 'Liechtenstein'], ['LT', 'Litouwen'], ['LU', 'Luxemburg'],
  ['MG', 'Madagaskar'], ['MW', 'Malawi'], ['MY', 'Maleisië'], ['MV', 'Maldiven'],
  ['ML', 'Mali'], ['MT', 'Malta'], ['MH', 'Marshalleilanden'], ['MR', 'Mauritanië'],
  ['MU', 'Mauritius'], ['MX', 'Mexico'], ['FM', 'Micronesia'], ['MD', 'Moldavië'],
  ['MC', 'Monaco'], ['MN', 'Mongolië'], ['ME', 'Montenegro'], ['MA', 'Marokko'],
  ['MZ', 'Mozambique'], ['MM', 'Myanmar'], ['NA', 'Namibië'], ['NR', 'Nauru'],
  ['NP', 'Nepal'], ['NL', 'Nederland'], ['NZ', 'Nieuw-Zeeland'], ['NI', 'Nicaragua'],
  ['NE', 'Niger'], ['NG', 'Nigeria'], ['KP', 'Noord-Korea'], ['MK', 'Noord-Macedonië'],
  ['NO', 'Noorwegen'], ['OM', 'Oman'], ['PK', 'Pakistan'], ['PW', 'Palau'],
  ['PS', 'Palestina'], ['PA', 'Panama'], ['PG', 'Papoea-Nieuw-Guinea'], ['PY', 'Paraguay'],
  ['PE', 'Peru'], ['PH', 'Filipijnen'], ['PL', 'Polen'], ['PT', 'Portugal'],
  ['QA', 'Qatar'], ['RO', 'Roemenië'], ['RU', 'Rusland'], ['RW', 'Rwanda'],
  ['KN', 'Saint Kitts en Nevis'], ['LC', 'Saint Lucia'], ['VC', 'Saint Vincent en de Grenadines'],
  ['WS', 'Samoa'], ['SM', 'San Marino'], ['ST', 'Sao Tomé en Principe'], ['SA', 'Saoedi-Arabië'],
  ['SN', 'Senegal'], ['RS', 'Servië'], ['SC', 'Seychellen'], ['SL', 'Sierra Leone'],
  ['SG', 'Singapore'], ['SK', 'Slowakije'], ['SI', 'Slovenië'], ['SB', 'Salomonseilanden'],
  ['SO', 'Somalië'], ['ZA', 'Zuid-Afrika'], ['KR', 'Zuid-Korea'], ['SS', 'Zuid-Soedan'],
  ['ES', 'Spanje'], ['LK', 'Sri Lanka'], ['SD', 'Soedan'], ['SR', 'Suriname'],
  ['SE', 'Zweden'], ['CH', 'Zwitserland'], ['SY', 'Syrië'], ['TW', 'Taiwan'],
  ['TJ', 'Tadzjikistan'], ['TZ', 'Tanzania'], ['TH', 'Thailand'], ['TL', 'Oost-Timor'],
  ['TG', 'Togo'], ['TO', 'Tonga'], ['TT', 'Trinidad en Tobago'], ['TN', 'Tunesië'],
  ['TR', 'Turkije'], ['TM', 'Turkmenistan'], ['TV', 'Tuvalu'], ['UG', 'Oeganda'],
  ['UA', 'Oekraïne'], ['AE', 'Verenigde Arabische Emiraten'], ['GB', 'Verenigd Koninkrijk'],
  ['US', 'Verenigde Staten'], ['UY', 'Uruguay'], ['UZ', 'Oezbekistan'], ['VU', 'Vanuatu'],
  ['VA', 'Vaticaanstad'], ['VE', 'Venezuela'], ['VN', 'Vietnam'], ['YE', 'Jemen'],
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
