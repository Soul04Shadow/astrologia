export type Locale = "en" | "hi";

type Dict = Record<string, string>;

const en: Dict = {
  "app.name": "Astrologia",
  "app.tagline": "Vedic Astrology & AI",
  "nav.people": "Horoscopes",
  "nav.new": "New Kundli",
  "nav.collapse": "Collapse",
  "nav.active_section": "Active Horoscope",
  "nav.chart": "Kundli Chart",
  "nav.consult": "AI Consultation",
  "nav.edit": "Edit Details",
  "nav.switch": "Switch",
  "nav.no_active": "Select a horoscope to view chart & consultation",
  "menu.station": "Consultation Station",
  "menu.mode": "Private practice mode · v1.0",
  "menu.providers": "AI Providers",
  "menu.ready": "ready",
  "menu.nokey": "no key",
  "menu.ok": "{n} provider(s) active — consultations enabled.",
  "menu.hint": "Add a key in backend/.env to enable consultations.",
  "dash.title": "Horoscope Dossiers",
  "dash.sub": "High-precision Vedic natal charts and AI consultations",
  "dash.search_placeholder": "Search horoscopes by name, birthplace, or date...",
  "dash.count_single": "{n} Horoscope",
  "dash.count_plural": "{n} Horoscopes",
  "dash.view_chart": "View Kundli",
  "dash.start_consult": "Consult AI",
  "dash.active_badge": "Active",
  "dash.no_results": "No horoscopes matched '{query}'",
  "dash.add": "New Kundli",
  "dash.loading": "Loading…",
  "dash.errsuffix": "Is the backend running on port 8000?",
  "dash.empty_title": "No saved people yet",
  "dash.empty_sub": "Create the first birth profile to generate a kundli.",
  "dash.chart": "Chart",
  "dash.consult": "Consult",
  "dash.delete_q": "Delete {name}?",
  "dash.delete_a": "Delete",
  "form.title": "New Birth Profile",
  "form.sub": "Enter exact birth details. Time zone is detected automatically from the birthplace.",
  "form.name": "Full name",
  "form.name_ph": "e.g., Ramesh Sharma",
  "form.dob": "Date of birth",
  "form.tob": "Time of birth (24h)",
  "form.place": "Place of birth",
  "form.place_ph": "Type a city, e.g., Ujjain",
  "form.searching": "searching…",
  "form.selected": "Selected",
  "form.notfound": 'Place "{q}" not found — pick from suggestions',
  "form.submit": "Generate Kundli",
  "form.submitting": "Generating…",
  "chart.pdf": "PDF Report",
  "chart.consult": "Consult AI",
  "chart.legend_d1": "* exalted · R retrograde",
  "chart.legend_d9": "Asc = D9 lagna · * vargottama",
  "chart.positions": "Planetary Positions",
  "chart.d9_table": "Navamsa Placements",
  "chart.body": "Planet",
  "chart.sign": "Sign",
  "chart.degree": "Degree",
  "chart.house": "Hs",
  "chart.nakshatra": "Nakshatra",
  "chart.sublord": "Sublord",
  "chart.pada": "pada",
  "chart.notes": "Notes",
  "chart.state": "State",
  "chart.direct": "Direct",
  "chart.retrograde": "Retrograde",
  "chart.combust": "Combust",
  "chart.vargottama": "Vargottama",
  "chart.yes": "Yes",
  "chart.lord": "lord {x}",
  "chart.antardasha_of": "{x} antardasha",
  "stat.lagna": "Lagna",
  "stat.moonrashi": "Moon Rashi",
  "stat.currdasha": "Current Dasha",
  "stat.birthnak": "Birth Nakshatra",
  "tabs.d1": "D1 Rasi",
  "tabs.d9": "D9 Navamsa",
  "tabs.dasha": "Dashas",
  "tabs.panchang": "Panchang & Gochar",
  "tabs.yogas": "Yogas",
  "dasha.title": "Vimshottari Dasha Timeline",
  "dasha.now": "Now running: {maha} Mahadasha ({from} to {to}) · {antar} Antardasha",
  "dasha.next": "· next {lord} begins {date}",
  "dasha.maha": "{x} Mahadasha",
  "dasha.active": "ACTIVE",
  "panchang.title": "Panchang — {date} ({tz})",
  "panchang.tithi": "Tithi",
  "panchang.nakshatra": "Nakshatra",
  "panchang.yoga": "Yoga",
  "panchang.karana": "Karana",
  "panchang.var": "Var",
  "panchang.luminaries": "Sun / Moon in",
  "gochar.title": "Current Transits — {at} UTC",
  "yogas.title": "Yogas Detected ({n})",
  "yogas.none": "No yogas from the tracked set are present in this chart.",
  "chat.back": "Chart",
  "chat.title": "Consultation — {name}",
  "chat.placeholder": "Ask about career, marriage, dasha, remedies…",
  "chat.send": "Send",
  "chat.new": "New chat",
  "chat.none": "No chats yet",
  "chat.translating": "Translating…",
  "chat.delete_confirm": "Delete this chat? Messages will be lost.",
  "chat.rename": "Rename",
  "chat.empty":
    "Ask anything about this chart — career, marriage, health timing, dasha effects… Answers are grounded in the exact calculated positions.",
  "common.calculating": "Calculating chart…",
};

const hi: Dict = {
  "app.name": "ज्योतिष्य · Astrologia",
  "app.tagline": "वैदिक ज्योतिष एवं दैवज्ञ परामर्श",
  "nav.people": "जातक पत्रिकाएँ",
  "nav.new": "नई कुंडली",
  "nav.collapse": "सिकोड़ें",
  "nav.active_section": "सक्रिय पत्रिका",
  "nav.chart": "जन्म कुंडली",
  "nav.consult": "दैवज्ञ परामर्श",
  "nav.edit": "संशोधन",
  "nav.switch": "बदलें",
  "nav.no_active": "कुंडली व परामर्श के लिए जातक चुनें",
  "menu.station": "परामर्श केंद्र",
  "menu.mode": "व्यक्तिगत प्रयोग · v1.0",
  "menu.providers": "एआई सेवाएँ",
  "menu.ready": "तैयार",
  "menu.nokey": "कुंजी नहीं",
  "menu.ok": "{n} सेवा सक्रिय — परामर्श चालू है।",
  "menu.hint": "परामर्श चालू करने के लिए backend/.env में कुंजी डालें।",
  "dash.title": "जातक पत्रिकाएँ",
  "dash.sub": "सटीक वैदिक जन्म पत्रिकाएँ एवं दैवज्ञ परामर्श",
  "dash.search_placeholder": "नाम, जन्मस्थान या तिथि से खोजें...",
  "dash.count_single": "{n} पत्रिका",
  "dash.count_plural": "{n} पत्रिकाएँ",
  "dash.view_chart": "कुंडली देखें",
  "dash.start_consult": "दैवज्ञ परामर्श",
  "dash.active_badge": "सक्रिय",
  "dash.no_results": "कोई मेल नहीं मिला",
  "dash.add": "नई कुंडली",
  "dash.loading": "लोड हो रहा है…",
  "dash.errsuffix": "क्या बैकएंड पोर्ट 8000 पर चल रहा है?",
  "dash.empty_title": "अभी कोई जातक सुरक्षित नहीं",
  "dash.empty_sub": "कुंडली बनाने के लिए पहला जन्म विवरण जोड़ें।",
  "dash.chart": "कुंडली",
  "dash.consult": "परामर्श",
  "dash.delete_q": "{name} को हटाएँ?",
  "dash.delete_a": "हटाएँ",
  "form.title": "नया जन्म विवरण",
  "form.sub": "जन्म के सटीक विवरण भरें। जन्मस्थान से समय-क्षेत्र स्वयं पहचाना जाएगा।",
  "form.name": "पूरा नाम",
  "form.name_ph": "जैसे: रमेश शर्मा",
  "form.dob": "जन्म तिथि",
  "form.tob": "जन्म समय (24 घंटे)",
  "form.place": "जन्मस्थान",
  "form.place_ph": "शहर लिखें, जैसे: उज्जैन",
  "form.searching": "खोज रहे हैं…",
  "form.selected": "चयनित",
  "form.notfound": '"{q}" नहीं मिला — सुझाव में से चुनें',
  "form.submit": "कुंडली बनाएँ",
  "form.submitting": "बन रही है…",
  "chart.pdf": "पीडीएफ रिपोर्ट",
  "chart.consult": "एआई परामर्श",
  "chart.legend_d1": "* उच्च · र वक्री",
  "chart.legend_d9": "लग्न = द9 लग्न · * वर्गोत्तम",
  "chart.positions": "ग्रह स्थिति (द1)",
  "chart.d9_table": "नवमांश स्थिति",
  "chart.body": "ग्रह",
  "chart.sign": "राशि",
  "chart.degree": "अंश",
  "chart.house": "भाव",
  "chart.nakshatra": "नक्षत्र",
  "chart.sublord": "उपस्वामी",
  "chart.pada": "चरण",
  "chart.notes": "विशेष",
  "chart.state": "अवस्था",
  "chart.direct": "मार्गी",
  "chart.retrograde": "वक्री",
  "chart.combust": "अस्त",
  "chart.vargottama": "वर्गोत्तम",
  "chart.yes": "हाँ",
  "chart.lord": "स्वामी {x}",
  "chart.antardasha_of": "{x} अंतर्दशा",
  "stat.lagna": "लग्न",
  "stat.moonrashi": "चंद्र राशि",
  "stat.currdasha": "वर्तमान दशा",
  "stat.birthnak": "जन्म नक्षत्र",
  "tabs.d1": "द1 कुंडली",
  "tabs.d9": "द9 नवमांश",
  "tabs.dasha": "दशाएँ",
  "tabs.panchang": "पंचांग व गोचर",
  "tabs.yogas": "योग",
  "dasha.title": "विंशोत्तरी दशा क्रम",
  "dasha.now": "वर्तमान: {maha} महादशा ({from} से {to}) · {antar} अंतर्दशा",
  "dasha.next": "· अगली {lord} {date} से",
  "dasha.maha": "{x} महादशा",
  "dasha.active": "चालू",
  "panchang.title": "पंचांग — {date} ({tz})",
  "panchang.tithi": "तिथि",
  "panchang.nakshatra": "नक्षत्र",
  "panchang.yoga": "योग",
  "panchang.karana": "करण",
  "panchang.var": "वार",
  "panchang.luminaries": "सूर्य / चंद्र राशि",
  "gochar.title": "वर्तमान गोचर — {at} UTC",
  "yogas.title": "दृष्ट योग ({n})",
  "yogas.none": "इस कुंडली में ट्रैक किए गए योग नहीं पाए गए।",
  "chat.back": "कुंडली",
  "chat.title": "परामर्श — {name}",
  "chat.placeholder": "करियर, विवाह, दशा, उपाय… के बारे में पूछें",
  "chat.send": "भेजें",
  "chat.new": "नई चैट",
  "chat.none": "अभी कोई चैट नहीं",
  "chat.translating": "अनुवाद हो रहा है…",
  "chat.delete_confirm": "यह चैट हटाएँ? संदेश हमेशा के लिए खो जाएँगे।",
  "chat.rename": "नाम बदलें",
  "chat.empty":
    "कुंडली से जुड़ा कुछ भी पूछें — करियर, विवाह, स्वास्थ्य, दशाफल… उत्तर सटीक गणना किए गए ग्रह-स्थितियों के आधार पर दिए जाएँगे।",
  "common.calculating": "कुंडली गणना हो रही है…",
};

export const dictionaries: Record<Locale, Dict> = { en, hi };

const SIGN_HI: Record<string, string> = {
  Aries: "मेष", Taurus: "वृषभ", Gemini: "मिथुन", Cancer: "कर्क",
  Leo: "सिंह", Virgo: "कन्या", Libra: "तुला", Scorpio: "वृश्चिक",
  Sagittarius: "धनु", Capricorn: "मकर", Aquarius: "कुम्भ", Pisces: "मीन",
};

const PLANET_HI: Record<string, string> = {
  Sun: "सूर्य", Moon: "चंद्र", Mars: "मंगल", Mercury: "बुध",
  Jupiter: "गुरु", Venus: "शुक्र", Saturn: "शनि", Rahu: "राहु", Ketu: "केतु",
  Lagna: "लग्न", Asc: "लग्न",
};

const NAKSHATRA_HI: Record<string, string> = {
  Ashwini: "अश्विनी", Bharani: "भरणी", Krittika: "कृत्तिका", Rohini: "रोहिणी",
  Mrigashira: "मृगशिरा", Ardra: "आर्द्रा", Punarvasu: "पुनर्वसु", Pushya: "पुष्य",
  Ashlesha: "आश्लेषा", Magha: "मघा", "Purva Phalguni": "पूर्वा फाल्गुनी",
  "Uttara Phalguni": "उत्तरा फाल्गुनी", Hasta: "हस्त", Chitra: "चित्रा",
  Swati: "स्वाति", Vishakha: "विशाखा", Anuradha: "अनुराधा", Jyeshtha: "ज्येष्ठा",
  Moola: "मूल", "Purva Ashadha": "पूर्वाषाढ़ा", "Uttara Ashadha": "उत्तराषाढ़ा",
  Shravana: "श्रवण", Dhanishta: "धनिष्ठा", Shatabhisha: "शतभिषा",
  "Purva Bhadrapada": "पूर्वा भाद्रपद", "Uttara Bhadrapada": "उत्तरा भाद्रपद",
  Revati: "रेवती",
};

const YOGA_STATE_HI: Record<string, string> = {
  Vishkambha: "विष्कुंभ", Priti: "प्रीति", Ayushman: "आयुष्मान", Saubhagya: "सौभाग्य",
  Shobhana: "शोभन", Atiganda: "अतिगंड", Sukarman: "सुकर्मा", Dhriti: "धृति",
  Shoola: "शूल", Ganda: "गंड", Vriddhi: "वृद्धि", Dhruva: "ध्रुव",
  Vyaghata: "व्याघात", Harshana: "हर्षण", Vajra: "वज्र", Siddhi: "सिद्धि",
  Vyatipata: "व्यतीपात", Variyan: "वरीयान्", Parigha: "परिघ", Shiva: "शिव",
  Siddha: "सिद्ध", Sadhya: "साध्य", Shubha: "शुभ", Shukla: "शुक्ल",
  Brahma: "ब्रह्म", Indra: "इन्द्र", Vaidhriti: "वैधृति",
};

const TITHI_HI: Record<string, string> = {
  Pratipada: "प्रतिपदा", Dwitiya: "द्वितीया", Tritiya: "तृतीया", Chaturthi: "चतुर्थी",
  Panchami: "पंचमी", Shashthi: "षष्ठी", Saptami: "सप्तमी", Ashtami: "अष्टमी",
  Navami: "नवमी", Dashami: "दशमी", Ekadashi: "एकादशी", Dwadashi: "द्वादशी",
  Trayodashi: "त्रयोदशी", Chaturdashi: "चतुर्दशी", Purnima: "पूर्णिमा", Amavasya: "अमावस्या",
};

const PAKSHA_HI: Record<string, string> = { Shukla: "शुक्ल", Krishna: "कृष्ण" };

const KARANA_HI: Record<string, string> = {
  Bava: "बव", Balava: "बालव", Kaulava: "कौलव", Taitila: "तैतिल",
  Gara: "गर", Vanija: "वणिज", Vishti: "विष्टि", Kimstughna: "किंस्तुघ्न",
  Shakuni: "शकुनि", Chatushpada: "चतुष्पद", Naga: "नाग",
};

const WEEKDAY_HI: Record<string, string> = {
  Sunday: "रविवार", Monday: "सोमवार", Tuesday: "मंगलवार", Wednesday: "बुधवार",
  Thursday: "गुरुवार", Friday: "शुक्रवार", Saturday: "शनिवार",
};

const DIGNITY_HI: Record<string, string> = {
  Exalted: "उच्च", Debilitated: "नीच", "Own Sign": "स्वगृही",
  Moolatrikona: "मूलत्रिकोण", Neutral: "",
};

const FORMATION_HI: [RegExp, string][] = [
  [/Gajakesari/, "गजकेसरी योग"],
  [/Budhaditya/, "बुधादित्य योग"],
  [/Neecha Bhanga Raja/, "नीचभंग राज योग"],
  [/Ruchaka/, "रुचक योग (पंच महापुरुष)"],
  [/Bhadra/, "भद्र योग (पंच महापुरुष)"],
  [/Hamsa/, "हंस योग (पंच महापुरुष)"],
  [/Malavya/, "मालव्य योग (पंच महापुरुष)"],
  [/Shasha/, "शश योग (पंच महापुरुष)"],
  [/Dhana Yoga/, "धन योग"],
];

const CHART_ABBREV: Record<Locale, Record<string, string>> = {
  en: { Sun: "Su", Moon: "Mo", Mars: "Ma", Mercury: "Me", Jupiter: "Ju", Venus: "Ve", Saturn: "Sa", Rahu: "Ra", Ketu: "Ke" },
  hi: { Sun: "सू", Moon: "चं", Mars: "मं", Mercury: "बु", Jupiter: "गु", Venus: "शु", Saturn: "श", Rahu: "रा", Ketu: "के" },
};

export function translate(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  let s = dictionaries[locale][key] ?? dictionaries.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  }
  return s;
}

const SIGN_ORDER_EN = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

export function localizedSignNames(locale: Locale): string[] {
  return SIGN_ORDER_EN.map((en) => (locale === "hi" ? SIGN_HI[en] ?? en : en));
}

export const SIGN_CODES_EN = ["Ar", "Ta", "Ge", "Cn", "Le", "Vi", "Li", "Sc", "Sg", "Cp", "Aq", "Pi"];

function mapOr(m: Record<string, string>, value: string) {
  return m[value] ?? value;
}

export function makeTerms(locale: Locale) {
  const hi = locale === "hi";
  return {
    planet: (v: string) => (hi ? mapOr(PLANET_HI, v) : v),
    sign: (v: string) => (hi ? mapOr(SIGN_HI, v) : v),
    nakshatra: (v: string) => (hi ? mapOr(NAKSHATRA_HI, v) : v),
    yogaState: (v: string) => (hi ? mapOr(YOGA_STATE_HI, v) : v),
    tithi: (v: string) => (hi ? mapOr(TITHI_HI, v) : v),
    paksha: (v: string) => (hi ? mapOr(PAKSHA_HI, v) : v),
    karana: (v: string) => (hi ? mapOr(KARANA_HI, v) : v),
    weekday: (v: string) => (hi ? mapOr(WEEKDAY_HI, v) : v),
    dignity: (v: string) => (hi && DIGNITY_HI[v] ? DIGNITY_HI[v] : v === "Neutral" && hi ? "" : v),
    formation: (v: string) => {
      if (!hi) return v;
      for (const [re, hiName] of FORMATION_HI) if (re.test(v)) return hiName;
      return v;
    },
    abbrev: (v: string) => CHART_ABBREV[locale][v] ?? v.slice(0, 2),
    ascLabel: () => (hi ? "ल" : "Asc"),
  };
}

export type Terms = ReturnType<typeof makeTerms>;
