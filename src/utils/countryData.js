const regionData = {
    "Africa": ["africa", "african"],
    "Latin America": ["latin america", "south america", "central america", "latam","latino"],
    "Caribbean": ["caribbean","Caribe"],
    "Asia": ["asia", "asian", "southeast asia","asiatic"],
    "North America": ["north america", "american"],
    "Europe": ["europe", "european"]
};

const countryData = {
    "Nigeria": { "risk": "High", "cities": ["lagos", "abuja", "kano", "ibadan", "port harcourt", "kaduna"], "demonyms": ["nigerian"], "continent": "Africa" },
    "Democratic Republic of Congo": { "risk": "High", "cities": ["kinshasa", "lubumbashi", "mbuji-mayi", "kisangani"], "demonyms": ["congolese"], "continent": "Africa" },
    "Ethiopia": { "risk": "High", "cities": ["addis ababa", "dire dawa", "mekelle", "gondar", "hawassa"], "demonyms": ["ethiopian"], "continent": "Africa" },
    "Uganda": { "risk": "High", "cities": ["kampala", "gulu", "lira", "mbarara", "jinja"], "demonyms": ["ugandan"], "continent": "Africa" },
    "Kenya": { "risk": "Low-Moderate", "cities": ["nairobi", "mombasa", "kisumu", "nakuru", "eldoret"], "demonyms": ["kenyan"], "continent": "Africa" },
    "Tanzania": { "risk": "High", "cities": ["dar es salaam", "dodoma", "mwanza", "arusha", "mbeya"], "demonyms": ["tanzanian"], "continent": "Africa" },
    "Zambia": { "risk": "High", "cities": ["lusaka", "ndola", "kitwe", "livingstone"], "demonyms": ["zambian"], "continent": "Africa" },
    "Zimbabwe": { "risk": "Low-Moderate", "cities": ["harare", "bulawayo", "chitungwiza", "mutare"], "demonyms": ["zimbabwean"], "continent": "Africa" },
    "Mozambique": { "risk": "High", "cities": ["maputo", "matola", "beira", "nampula"], "demonyms": ["mozambican"], "continent": "Africa" },
    "Angola": { "risk": "High", "cities": ["luanda", "huambo", "lobito", "benguela"], "demonyms": ["angolan"], "continent": "Africa" },
    "Ghana": { "risk": "High", "cities": ["accra", "kumasi", "tamale", "cape coast"], "demonyms": ["ghanian"], "continent": "Africa" },
    "Burkina Faso": { "risk": "High", "cities": ["ouagadougou", "bobo-dioulasso"], "demonyms": ["burkinabe"], "continent": "Africa" },
    "Mali": { "risk": "High", "cities": ["bamako", "sikasso", "mopti"], "demonyms": ["malian"], "continent": "Africa" },
    "Niger": { "risk": "High", "cities": ["niamey", "zinder", "maradi"], "demonyms": ["nigerien"], "continent": "Africa" },
    "Chad": { "risk": "High", "cities": ["ndjamena", "moundou", "sarh"], "demonyms": ["chadian"], "continent": "Africa" },
    "Senegal": { "risk": "Low-Moderate", "cities": ["dakar", "touba", "thies"], "demonyms": ["senegalese"], "continent": "Africa" },
    "Guinea": { "risk": "High", "cities": ["conakry", "nzerekore", "kankan"], "demonyms": ["guinean"], "continent": "Africa" },
    "Ivory Coast": { "risk": "Low-Moderate", "cities": ["abidjan", "bouake", "daloa", "yamoussoukro"], "demonyms": ["ivorian"], "continent": "Africa" },
    "Liberia": { "risk": "Low-Moderate", "cities": ["monrovia", "gbarnga"], "demonyms": ["liberian"], "continent": "Africa" },
    "Sierra Leone": { "risk": "High", "cities": ["freetown", "bo", "kenema"], "demonyms": ["sierra leonean"], "continent": "Africa" },
    "Gambia": { "risk": "Low-Moderate", "cities": ["banjul", "serekunda"], "demonyms": ["gambian"], "continent": "Africa" },
    "Guinea-Bissau": { "risk": "Low-Moderate", "cities": ["bissau"], "demonyms": ["guinea-bissauan"], "continent": "Africa" },
    "Cape Verde": { "risk": "Low-Moderate", "cities": ["praia", "mindelo"], "demonyms": ["cape verdean"], "continent": "Africa" },
    "Equatorial Guinea": { "risk": "Low-Moderate", "cities": ["malabo", "bata"], "demonyms": ["equatoguinean"], "continent": "Africa" },
    "Gabon": { "risk": "Low-Moderate", "cities": ["libreville", "port-gentil"], "demonyms": ["gabonese"], "continent": "Africa" },
    "Republic of Congo": { "risk": "Low-Moderate", "cities": ["brazzaville", "pointe-noire"], "demonyms": ["congolese"], "continent": "Africa" },
    "Cameroon": { "risk": "Low-Moderate", "cities": ["yaounde", "douala", "garoua", "bamenda"], "demonyms": ["cameroonian"], "continent": "Africa" },
    "Central African Republic": { "risk": "High", "cities": ["bangui"], "demonyms": ["central african"], "continent": "Africa" },
    "Rwanda": { "risk": "Low-Moderate", "cities": ["kigali", "butare", "gitarama"], "demonyms": ["rwandan"], "continent": "Africa" },
    "Burundi": { "risk": "Low-Moderate", "cities": ["bujumbura", "gitega"], "demonyms": ["burundian"], "continent": "Africa" },
    "Djibouti": { "risk": "Low-Moderate", "cities": ["djibouti"], "demonyms": ["djiboutian"], "continent": "Africa" },
    "Somalia": { "risk": "Low-Moderate", "cities": ["mogadishu", "hargeisa", "bosaso"], "demonyms": ["somali"], "continent": "Africa" },
    "Eritrea": { "risk": "Low-Moderate", "cities": ["asmara", "keren"], "demonyms": ["eritrean"], "continent": "Africa" },
    "Sudan": { "risk": "Low-Moderate", "cities": ["khartoum", "omdurman", "port sudan", "kassala"], "demonyms": ["sudanese"], "continent": "Africa" },
    "South Sudan": { "risk": "Low-Moderate", "cities": ["juba", "wau", "malakal"], "demonyms": ["south sudanese"], "continent": "Africa" },
    "Madagascar": { "risk": "Low-Moderate", "cities": ["antananarivo", "toamasina", "antsirabe", "fianarantsoa"], "demonyms": ["malagasy"], "continent": "Africa" },
    "Mauritius": { "risk": "Low-Moderate", "cities": ["port louis"], "demonyms": ["mauritian"], "continent": "Africa" },
    "Comoros": { "risk": "Low-Moderate", "cities": ["moroni"], "demonyms": ["comoran"], "continent": "Africa" },
    "Seychelles": { "risk": "Low-Moderate", "cities": ["victoria"], "demonyms": ["seychellois"], "continent": "Africa" },
    "Sao Tome and Principe": { "risk": "Low-Moderate", "cities": ["sao tome"], "demonyms": ["sao tomean"], "continent": "Africa" },
    "India": { "risk": "Moderate", "cities": ["mumbai", "delhi", "bangalore", "hyderabad", "chennai", "kolkata", "pune", "ahmedabad", "jaipur", "lucknow", "kanpur", "nagpur", "bhubaneswar", "raipur", "ranchi"], "demonyms": ["indian"], "continent": "Asia" },
    "Indonesia": { "risk": "Moderate", "cities": ["jakarta", "surabaya", "medan", "bandung", "bekasi", "palembang", "makassar", "semarang", "jayapura", "manado"], "demonyms": ["indonesian"], "continent": "Asia" },
    "Myanmar": { "risk": "High", "cities": ["yangon", "mandalay", "naypyidaw", "mawlamyine"], "demonyms": ["myanma"], "continent": "Asia" },
    "Bangladesh": { "risk": "Moderate", "cities": ["dhaka", "chittagong", "sylhet", "rajshahi", "khulna", "cox's bazar"], "demonyms": ["bangladeshi"], "continent": "Asia" },
    "Pakistan": { "risk": "Moderate", "cities": ["islamabad", "karachi", "lahore", "faisalabad", "rawalpindi", "multan", "peshawar", "quetta"], "demonyms": ["pakistani"], "continent": "Asia" },
    "Afghanistan": { "risk": "Low-Moderate", "cities": ["kabul", "kandahar", "herat", "mazar-i-sharif"], "demonyms": ["afghan"], "continent": "Asia" },
    "Cambodia": { "risk": "Moderate", "cities": ["phnom penh", "siem reap", "battambang"], "demonyms": ["cambodian"], "continent": "Asia" },
    "Laos": { "risk": "Moderate", "cities": ["vientiane", "savannakhet", "pakse"], "demonyms": ["lao"], "continent": "Asia" },
    "Vietnam": { "risk": "Moderate", "cities": ["hanoi", "ho chi minh city", "da nang", "can tho", "hai phong"], "demonyms": ["vietnamese"], "continent": "Asia" },
    "Thailand": { "risk": "Moderate", "cities": ["bangkok", "chiang mai", "phuket", "hat yai"], "demonyms": ["thai"], "continent": "Asia" },
    "Malaysia": { "risk": "Moderate", "cities": ["kuala lumpur", "george town", "johor bahru", "kota kinabalu", "kuching"], "demonyms": ["malaysian"], "continent": "Asia" },
    "Philippines": { "risk": "Moderate", "cities": ["manila", "quezon city", "davao", "cebu city", "zamboanga", "cagayan de oro"], "demonyms": ["filipino"], "continent": "Asia" },
    "Papua New Guinea": { "risk": "High", "cities": ["port moresby", "lae", "mount hagen"], "demonyms": ["papua new guinean"], "continent": "Oceania" },
    "Solomon Islands": { "risk": "High", "cities": ["honiara"], "demonyms": ["solomon islander"], "continent": "Oceania" },
    "Vanuatu": { "risk": "Low-Moderate", "cities": ["port vila"], "demonyms": ["vanuatuan"], "continent": "Oceania" },
    "Fiji": { "risk": "Low-Moderate", "cities": ["suva"], "demonyms": ["fijian"], "continent": "Oceania" },
    "Brazil": { "risk": "Moderate", "cities": ["brasilia", "sao paulo", "rio de janeiro", "salvador", "fortaleza", "belo horizonte", "manaus", "curitiba", "recife", "porto alegre", "belem", "goiania", "campo grande", "macapa", "rio branco", "boa vista", "porto velho", "palmas"], "demonyms": ["brazilian"], "continent": "Latin America" },
    "Colombia": { "risk": "Moderate", "cities": ["bogota", "medellin", "cali", "barranquilla", "cartagena", "bucaramanga", "pereira", "santa marta", "villavicencio", "pasto", "monteria", "valledupar", "neiva", "armenia", "popayan", "sincelejo", "florencia", "riohacha", "yopal", "arauca", "puerto carreno", "leticia", "inirida", "mitu"], "demonyms": ["colombian"], "continent": "Latin America" },
    "Venezuela": { "risk": "Moderate", "cities": ["caracas", "maracaibo", "valencia", "barquisimeto", "maracay", "ciudad guayana", "maturin", "barcelona", "cumana", "merida", "puerto la cruz", "petare", "turmero", "barinas", "trujillo", "acarigua", "valera", "punto fijo", "los teques", "guanare", "san cristobal", "cabimas", "coro", "ciudad bolivar"], "demonyms": ["venezuelan"], "continent": "Latin America" },
    "Guyana": { "risk": "Low-Moderate", "cities": ["georgetown", "linden", "new amsterdam"], "demonyms": ["guyanese"], "continent": "Latin America" },
    "Suriname": { "risk": "Low-Moderate", "cities": ["paramaribo", "lelydorp", "nieuw nickerie"], "demonyms": ["surinamese"], "continent": "Latin America" },
    "French Guiana": { "risk": "Low-Moderate", "cities": ["cayenne", "saint-laurent-du-maroni"], "demonyms": ["french guianese"], "continent": "Latin America" },
    "Peru": { "risk": "Moderate", "cities": ["lima", "arequipa", "trujillo", "chiclayo", "piura", "iquitos", "cusco", "chimbote", "huancayo", "tacna", "ica", "sullana", "ayacucho", "cajamarca", "pucallpa", "huanuco", "tarapoto", "tumbes", "jaen", "moyobamba", "bagua", "chachapoyas", "yurimaguas"], "demonyms": ["peruvian"], "continent": "Latin America" },
    "Bolivia": { "risk": "Moderate", "cities": ["la paz", "santa cruz", "cochabamba", "sucre", "oruro", "tarija", "potosi", "trinidad", "cobija"], "demonyms": ["bolivian"], "continent": "Latin America" },
    "Panama": { "risk": "Moderate", "cities": ["panama city", "san miguelito", "tocumen", "david", "arraijan", "colon", "la chorrera", "santiago", "chitra", "las tablas"], "demonyms": ["panamanian"], "continent": "Latin America" },
    "Costa Rica": { "risk": "Low-Moderate", "cities": ["san jose", "cartago", "puntarenas", "limon", "alajuela", "heredia", "liberia"], "demonyms": ["costa rican"], "continent": "Latin America" },
    "Nicaragua": { "risk": "Low-Moderate", "cities": ["managua", "leon", "masaya", "matagalpa", "chinandega", "granada", "jinotega", "esteli", "nueva guinea", "bluefields", "puerto cabezas"], "demonyms": ["nicaraguan"], "continent": "Latin America" },
    "Honduras": { "risk": "Moderate", "cities": ["tegucigalpa", "san pedro sula", "choloma", "la ceiba", "el progreso", "comayagua", "puerto cortes", "siguatepeque", "tocoa", "juticalpa", "catacamas", "choluteca", "danli", "olanchito", "santa rosa de copan", "yoro", "tela", "roatan"], "demonyms": ["honduran"], "continent": "Latin America" },
    "Guatemala": { "risk": "Moderate", "cities": ["guatemala city", "mixco", "villa nueva", "petapa", "quetzaltenango", "villa canales", "escuintla", "chinautla", "chimaltenango", "huehuetenango", "amatitlan", "santa lucia cotzumalguapa", "puerto barrios", "coban", "san marcos", "antigua guatemala", "jalapa", "retalhuleu", "mazatenango", "zacapa", "chiquimula", "flores"], "demonyms": ["guatemalan"], "continent": "Latin America" },
    "Belize": { "risk": "Low-Moderate", "cities": ["belize city", "san ignacio", "belmopan", "orange walk", "corozal", "dangriga", "punta gorda"], "demonyms": ["belizean"], "continent": "Latin America" },
    "El Salvador": { "risk": "Low-Moderate", "cities": ["san salvador", "soyapango", "santa ana", "san miguel", "mejicanos", "santa tecla", "apopa", "delgado", "san marcos", "usulutan", "cojutepeque", "ilopango", "chalatenango", "ahuachapan", "sonsonate", "la union", "zacatecoluca"], "demonyms": ["salvadoran"], "continent": "Latin America" },
    "Haiti": { "risk": "Moderate", "cities": ["port-au-prince", "carrefour", "delmas", "cap-haitien", "petionville", "gonaives", "saint-marc", "les cayes", "port-de-paix", "jacmel", "limbe", "fort-liberte", "hinche", "petit-goave", "mirebalais", "jeremie"], "demonyms": ["haitian"], "continent": "Caribbean" },
    "Dominican Republic": { "risk": "Low-Moderate", "cities": ["santo domingo", "santiago", "santo domingo oeste", "santo domingo este", "san pedro de macoris", "la romana", "san cristobal", "puerto plata", "san francisco de macoris", "higüey", "concepcion de la vega", "moca", "bani", "bonao", "barahona", "mao", "monte cristi", "azua", "nagua", "esperanza"], "demonyms": ["dominican"], "continent": "Caribbean" },
    "Saudi Arabia": { "risk": "Low-Moderate", "cities": ["riyadh", "jeddah", "mecca", "medina", "dammam", "khobar", "tabuk", "abha", "khamis mushait", "najran", "jazan", "al-baha", "hail", "al-qassim", "dhahran", "qatif", "hafar al-batin"], "demonyms": ["saudi"], "continent": "Asia" },
    "Yemen": { "risk": "Low-Moderate", "cities": ["sanaa", "aden", "taiz", "hodeidah", "ibb", "dhamar", "mukalla", "hajjah", "amran", "saada", "al-bayda", "zinjibar", "al-mahwit", "marib", "shabwah", "al-jawf", "hadramawt", "lahij", "abyan", "al-daleh"], "demonyms": ["yemeni"], "continent": "Asia" },
    "Oman": { "risk": "Low-Moderate", "cities": ["muscat", "sohar", "salalah", "nizwa", "sur", "bahla", "ibri", "rustaq", "buraimi", "khasab", "adam", "samail", "ibra", "bidiya", "duqm"], "demonyms": ["omani"], "continent": "Asia" },
    "Iran": { "risk": "Low-Moderate", "cities": ["tehran", "mashhad", "isfahan", "karaj", "shiraz", "tabriz", "qom", "ahvaz", "kermanshah", "urmia", "rasht", "zahedan", "kerman", "nazarabad", "yazd", "ardabil", "bandar abbas", "eslamshahr", "zanjan", "hamadan", "azadshahr", "takestan", "khomeini shahr", "malard", "shahriar"], "demonyms": ["iranian"], "continent": "Asia" },
    "Malawi": { "risk": "High", "cities": [], "demonyms": ["malawian"], "continent": "Africa" },
    "Mauritania": { "risk": "Low-Moderate", "cities": [], "demonyms": ["mauritanian"], "continent": "Africa" },
    "Benin": { "risk": "Low-Moderate", "cities": [], "demonyms": ["beninese"], "continent": "Africa" },
    "Togo": { "risk": "Low-Moderate", "cities": [], "demonyms": ["togolese"], "continent": "Africa" },
    "Botswana": { "risk": "Low-Moderate", "cities": [], "demonyms": ["botswanan"], "continent": "Africa" },
    "Namibia": { "risk": "Low-Moderate", "cities": [], "demonyms": ["namibian"], "continent": "Africa" },
    "Swaziland": { "risk": "Low-Moderate", "cities": [], "demonyms": ["swazi"], "continent": "Africa" },
    "Timor-Leste": { "risk": "Low-Moderate", "cities": [], "demonyms": ["timorese"], "continent": "Asia" },
    "Nepal": { "risk": "Low-Moderate", "cities": [], "demonyms": ["nepalese"], "continent": "Asia" },
    "Bhutan": { "risk": "Low-Moderate", "cities": [], "demonyms": ["bhutanese"], "continent": "Asia" },
    "Sri Lanka": { "risk": "Low-Moderate", "cities": [], "demonyms": ["sri lankan"], "continent": "Asia" },
    "North Korea": { "risk": "Low-Moderate", "cities": [], "demonyms": ["north korean"], "continent": "Asia" },
    "China": { "risk": "Low-Moderate", "cities": [], "demonyms": ["chinese"], "continent": "Asia" },
    "Ecuador": { "risk": "Moderate", "cities": [], "demonyms": ["ecuadorian"], "continent": "Latin America" },
    "Mexico": { "risk": "Low-Moderate", "cities": [], "demonyms": ["mexican"], "continent": "North America" },
    "Iraq": { "risk": "Low-Moderate", "cities": [], "demonyms": ["iraqi"], "continent": "Asia" },
    "Syria": { "risk": "Low-Moderate", "cities": [], "demonyms": ["syrian"], "continent": "Asia" },
    "Turkey": { "risk": "Low-Moderate", "cities": [], "demonyms": ["turkish"], "continent": "Europe" }
};

const countryTermMap = new Map();

for (const [country, data] of Object.entries(countryData)) {
    // Add country name (lowercase)
    countryTermMap.set(country.toLowerCase(), { country, type: 'country' });

    // Add demonyms
    data.demonyms.forEach(demonym => {
        countryTermMap.set(demonym.toLowerCase(), { country, type: 'demonym' });
    });

    // Add cities
    data.cities.forEach(city => {
        countryTermMap.set(city.toLowerCase(), { country, type: 'city' });
    });
}

module.exports = { countryData, countryTermMap, regionData };