/**
 * Lista única de países para nacionalidade e indicativo de telefone.
 * A nacionalidade é gravada sempre na forma portuguesa (ex.: "Portuguesa"),
 * para os contratos e a deteção de países lusófonos continuarem a funcionar.
 * Formato: ISO|Nacionalidade PT|Nationality EN|País PT|Country EN|indicativo
 */
const RAW = `
PT|Portuguesa|Portuguese|Portugal|Portugal|351
BR|Brasileira|Brazilian|Brasil|Brazil|55
AO|Angolana|Angolan|Angola|Angola|244
MZ|Moçambicana|Mozambican|Moçambique|Mozambique|258
CV|Cabo-verdiana|Cape Verdean|Cabo Verde|Cape Verde|238
GW|Guineense (Guiné-Bissau)|Bissau-Guinean|Guiné-Bissau|Guinea-Bissau|245
ST|São-tomense|Santomean|São Tomé e Príncipe|Sao Tome and Principe|239
TL|Timorense|Timorese|Timor-Leste|East Timor|670
ES|Espanhola|Spanish|Espanha|Spain|34
FR|Francesa|French|França|France|33
IT|Italiana|Italian|Itália|Italy|39
DE|Alemã|German|Alemanha|Germany|49
GB|Britânica|British|Reino Unido|United Kingdom|44
IE|Irlandesa|Irish|Irlanda|Ireland|353
NL|Neerlandesa|Dutch|Países Baixos|Netherlands|31
BE|Belga|Belgian|Bélgica|Belgium|32
LU|Luxemburguesa|Luxembourgish|Luxemburgo|Luxembourg|352
CH|Suíça|Swiss|Suíça|Switzerland|41
AT|Austríaca|Austrian|Áustria|Austria|43
PL|Polaca|Polish|Polónia|Poland|48
CZ|Checa|Czech|Chéquia|Czech Republic|420
SK|Eslovaca|Slovak|Eslováquia|Slovakia|421
HU|Húngara|Hungarian|Hungria|Hungary|36
RO|Romena|Romanian|Roménia|Romania|40
BG|Búlgara|Bulgarian|Bulgária|Bulgaria|359
GR|Grega|Greek|Grécia|Greece|30
CY|Cipriota|Cypriot|Chipre|Cyprus|357
MT|Maltesa|Maltese|Malta|Malta|356
SI|Eslovena|Slovenian|Eslovénia|Slovenia|386
HR|Croata|Croatian|Croácia|Croatia|385
RS|Sérvia|Serbian|Sérvia|Serbia|381
BA|Bósnia|Bosnian|Bósnia e Herzegovina|Bosnia and Herzegovina|387
ME|Montenegrina|Montenegrin|Montenegro|Montenegro|382
MK|Macedónia|Macedonian|Macedónia do Norte|North Macedonia|389
AL|Albanesa|Albanian|Albânia|Albania|355
XK|Kosovar|Kosovar|Kosovo|Kosovo|383
MD|Moldava|Moldovan|Moldávia|Moldova|373
UA|Ucraniana|Ukrainian|Ucrânia|Ukraine|380
BY|Bielorrussa|Belarusian|Bielorrússia|Belarus|375
RU|Russa|Russian|Rússia|Russia|7
LT|Lituana|Lithuanian|Lituânia|Lithuania|370
LV|Letã|Latvian|Letónia|Latvia|371
EE|Estónia|Estonian|Estónia|Estonia|372
FI|Finlandesa|Finnish|Finlândia|Finland|358
SE|Sueca|Swedish|Suécia|Sweden|46
NO|Norueguesa|Norwegian|Noruega|Norway|47
DK|Dinamarquesa|Danish|Dinamarca|Denmark|45
IS|Islandesa|Icelandic|Islândia|Iceland|354
AD|Andorrana|Andorran|Andorra|Andorra|376
MC|Monegasca|Monegasque|Mónaco|Monaco|377
SM|São-marinhense|Sammarinese|São Marino|San Marino|378
LI|Liechtensteinense|Liechtensteiner|Liechtenstein|Liechtenstein|423
TR|Turca|Turkish|Turquia|Turkey|90
GE|Georgiana|Georgian|Geórgia|Georgia|995
AM|Arménia|Armenian|Arménia|Armenia|374
AZ|Azerbaijana|Azerbaijani|Azerbaijão|Azerbaijan|994
KZ|Cazaque|Kazakh|Cazaquistão|Kazakhstan|7
UZ|Usbeque|Uzbek|Usbequistão|Uzbekistan|998
US|Norte-americana|American|Estados Unidos|United States|1
CA|Canadiana|Canadian|Canadá|Canada|1
MX|Mexicana|Mexican|México|Mexico|52
GT|Guatemalteca|Guatemalan|Guatemala|Guatemala|502
HN|Hondurenha|Honduran|Honduras|Honduras|504
SV|Salvadorenha|Salvadoran|El Salvador|El Salvador|503
NI|Nicaraguense|Nicaraguan|Nicarágua|Nicaragua|505
CR|Costa-riquenha|Costa Rican|Costa Rica|Costa Rica|506
PA|Panamenha|Panamanian|Panamá|Panama|507
CU|Cubana|Cuban|Cuba|Cuba|53
DO|Dominicana|Dominican|República Dominicana|Dominican Republic|1
PR|Porto-riquenha|Puerto Rican|Porto Rico|Puerto Rico|1
JM|Jamaicana|Jamaican|Jamaica|Jamaica|1
HT|Haitiana|Haitian|Haiti|Haiti|509
CO|Colombiana|Colombian|Colômbia|Colombia|57
VE|Venezuelana|Venezuelan|Venezuela|Venezuela|58
EC|Equatoriana|Ecuadorian|Equador|Ecuador|593
PE|Peruana|Peruvian|Peru|Peru|51
BO|Boliviana|Bolivian|Bolívia|Bolivia|591
CL|Chilena|Chilean|Chile|Chile|56
AR|Argentina|Argentinian|Argentina|Argentina|54
UY|Uruguaia|Uruguayan|Uruguai|Uruguay|598
PY|Paraguaia|Paraguayan|Paraguai|Paraguay|595
MA|Marroquina|Moroccan|Marrocos|Morocco|212
DZ|Argelina|Algerian|Argélia|Algeria|213
TN|Tunisina|Tunisian|Tunísia|Tunisia|216
LY|Líbia|Libyan|Líbia|Libya|218
EG|Egípcia|Egyptian|Egito|Egypt|20
SN|Senegalesa|Senegalese|Senegal|Senegal|221
GN|Guineense (Guiné-Conacri)|Guinean|Guiné|Guinea|224
GQ|Equato-guineense|Equatorial Guinean|Guiné Equatorial|Equatorial Guinea|240
CI|Costa-marfinense|Ivorian|Costa do Marfim|Ivory Coast|225
GH|Ganesa|Ghanaian|Gana|Ghana|233
NG|Nigeriana|Nigerian|Nigéria|Nigeria|234
CM|Camaronesa|Cameroonian|Camarões|Cameroon|237
CD|Congolesa (RD Congo)|Congolese (DRC)|República Democrática do Congo|DR Congo|243
CG|Congolesa|Congolese|Congo|Congo|242
ET|Etíope|Ethiopian|Etiópia|Ethiopia|251
KE|Queniana|Kenyan|Quénia|Kenya|254
TZ|Tanzaniana|Tanzanian|Tanzânia|Tanzania|255
UG|Ugandesa|Ugandan|Uganda|Uganda|256
RW|Ruandesa|Rwandan|Ruanda|Rwanda|250
ZA|Sul-africana|South African|África do Sul|South Africa|27
ZW|Zimbabueana|Zimbabwean|Zimbabué|Zimbabwe|263
ZM|Zambiana|Zambian|Zâmbia|Zambia|260
NA|Namibiana|Namibian|Namíbia|Namibia|264
MU|Mauriciana|Mauritian|Maurícia|Mauritius|230
MG|Malgaxe|Malagasy|Madagáscar|Madagascar|261
IL|Israelita|Israeli|Israel|Israel|972
PS|Palestiniana|Palestinian|Palestina|Palestine|970
LB|Libanesa|Lebanese|Líbano|Lebanon|961
SY|Síria|Syrian|Síria|Syria|963
JO|Jordana|Jordanian|Jordânia|Jordan|962
IQ|Iraquiana|Iraqi|Iraque|Iraq|964
IR|Iraniana|Iranian|Irão|Iran|98
SA|Saudita|Saudi|Arábia Saudita|Saudi Arabia|966
AE|Emiradense|Emirati|Emirados Árabes Unidos|United Arab Emirates|971
QA|Catariana|Qatari|Catar|Qatar|974
KW|Kuwaitiana|Kuwaiti|Kuwait|Kuwait|965
AF|Afegã|Afghan|Afeganistão|Afghanistan|93
PK|Paquistanesa|Pakistani|Paquistão|Pakistan|92
IN|Indiana|Indian|Índia|India|91
BD|Bangladeshiana|Bangladeshi|Bangladesh|Bangladesh|880
NP|Nepalesa|Nepalese|Nepal|Nepal|977
LK|Cingalesa|Sri Lankan|Sri Lanka|Sri Lanka|94
CN|Chinesa|Chinese|China|China|86
HK|Honconguesa|Hongkonger|Hong Kong|Hong Kong|852
MO|Macaense|Macanese|Macau|Macau|853
TW|Taiwanesa|Taiwanese|Taiwan|Taiwan|886
JP|Japonesa|Japanese|Japão|Japan|81
KR|Sul-coreana|South Korean|Coreia do Sul|South Korea|82
MN|Mongol|Mongolian|Mongólia|Mongolia|976
VN|Vietnamita|Vietnamese|Vietname|Vietnam|84
TH|Tailandesa|Thai|Tailândia|Thailand|66
KH|Cambojana|Cambodian|Camboja|Cambodia|855
MY|Malaia|Malaysian|Malásia|Malaysia|60
SG|Singapurense|Singaporean|Singapura|Singapore|65
ID|Indonésia|Indonesian|Indonésia|Indonesia|62
PH|Filipina|Filipino|Filipinas|Philippines|63
AU|Australiana|Australian|Austrália|Australia|61
NZ|Neozelandesa|New Zealander|Nova Zelândia|New Zealand|64
`;

export type Country = {
  iso: string;
  nationalityPt: string;
  nationalityEn: string;
  countryPt: string;
  countryEn: string;
  dial: string; // "+351"
};

export const COUNTRIES: Country[] = RAW.trim()
  .split("\n")
  .map((line) => {
    const [iso, nationalityPt, nationalityEn, countryPt, countryEn, dial] = line.split("|");
    return { iso, nationalityPt, nationalityEn, countryPt, countryEn, dial: `+${dial}` };
  });

/** Bandeira em emoji a partir do código ISO. */
export const flagOf = (iso: string) =>
  iso.length === 2 ? String.fromCodePoint(...[...iso.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0))) : "";

const norm = (s: string) =>
  s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "");

const NAT_INDEX = new Map<string, Country>();
for (const c of COUNTRIES) {
  for (const k of [c.nationalityPt, c.nationalityEn, c.countryPt, c.countryEn, c.iso]) {
    const n = norm(k);
    if (n && !NAT_INDEX.has(n)) NAT_INDEX.set(n, c);
  }
}
// Formas comuns escritas pelos candidatos
const EXTRA: Record<string, string> = {
  brasileiro: "BR", portugues: "PT", italiano: "IT", alemao: "DE", ingles: "GB", inglesa: "GB", english: "GB",
  escocesa: "GB", scottish: "GB", galesa: "GB", welsh: "GB", americana: "US", americano: "US", usa: "US",
  holandesa: "NL", holanda: "NL", holland: "NL", polonesa: "PL", ucraniano: "UA", ukrainiana: "UA",
  espanhol: "ES", frances: "FR", coreana: "KR", korean: "KR", korea: "KR", chines: "CN", japones: "JP",
  marroquino: "MA", angolano: "AO", mocambicano: "MZ", caboverdiano: "CV", checo: "CZ", czechia: "CZ",
  russo: "RU", grego: "GR", sueco: "SE", turco: "TR", indiano: "IN", uk: "GB", greatbritain: "GB",
};
for (const [k, iso] of Object.entries(EXTRA)) {
  const c = COUNTRIES.find((x) => x.iso === iso);
  if (c && !NAT_INDEX.has(k)) NAT_INDEX.set(k, c);
}

/** Encontra o país a partir de qualquer forma escrita (PT/EN, nacionalidade ou país). */
export const matchNationality = (raw: string | null | undefined): Country | null => {
  const n = norm(String(raw ?? ""));
  return n ? NAT_INDEX.get(n) ?? null : null;
};

/** Valor canónico a gravar (nacionalidade em português); se não reconhecer, devolve o original. */
export const canonicalNationality = (raw: string | null | undefined): string => {
  const c = matchNationality(raw);
  return c ? c.nationalityPt : String(raw ?? "").trim();
};

/** Lista de indicativos únicos, ordenados por país. */
export const DIAL_OPTIONS = COUNTRIES.map((c) => ({ iso: c.iso, dial: c.dial, countryPt: c.countryPt, countryEn: c.countryEn }));

const DIALS_BY_LENGTH = [...new Set(COUNTRIES.map((c) => c.dial.slice(1)))].sort((a, b) => b.length - a.length);

export const DEFAULT_DIAL = "+351";

/**
 * Separa um telefone guardado em indicativo + número.
 * "+351 912345678", "00351912…", "+351-939-378-777" → { dial: "+351", number: "912345678" }.
 * Sem indicativo: 9 dígitos começados por 9/2 contam como Portugal; caso contrário fica sem indicativo.
 */
export const splitPhone = (raw: string | null | undefined): { dial: string; number: string } => {
  const s = String(raw ?? "").trim();
  if (!s) return { dial: DEFAULT_DIAL, number: "" };
  let digits = s.replace(/[^\d+]/g, "");
  let intl = false;
  if (digits.startsWith("+")) {
    intl = true;
    digits = digits.slice(1).replace(/\+/g, "");
  } else if (digits.startsWith("00")) {
    intl = true;
    digits = digits.slice(2);
  }
  digits = digits.replace(/\+/g, "");
  if (intl) {
    const d = DIALS_BY_LENGTH.find((p) => digits.startsWith(p));
    if (d) return { dial: `+${d}`, number: digits.slice(d.length) };
    return { dial: "", number: digits };
  }
  if (/^[29]\d{8}$/.test(digits)) return { dial: DEFAULT_DIAL, number: digits };
  if (/^351[29]\d{8}$/.test(digits)) return { dial: DEFAULT_DIAL, number: digits.slice(3) };
  return { dial: "", number: digits };
};

/** Junta indicativo + número no formato gravado: "+351 912345678". */
export const joinPhone = (dial: string, number: string): string => {
  const n = number.replace(/\D/g, "");
  if (!n) return "";
  return dial ? `${dial} ${n}` : n;
};

/** Normaliza um telefone já escrito para o formato gravado. */
export const normalizePhone = (raw: string | null | undefined): string => {
  const { dial, number } = splitPhone(raw);
  return joinPhone(dial, number);
};
