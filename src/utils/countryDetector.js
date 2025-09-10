const { countryTermMap, countryData, regionData } = require('./countryData.js');

const PROBABILITY_SCORES = {
    country: 1.0,
    demonym: 0.85,
    city: 0.85,
    region: 0.6, // Score for finding a region
};

function detectCountry(text) {
    if (!text) {
        console.log('[DEBUG-COUNTRY] Input text is empty.');
        return null;
    }

    const lowerCaseText = text.toLowerCase();
    console.log(`[DEBUG-COUNTRY] Analyzing text: "${lowerCaseText.substring(0, 100)}"...`);

    const foundCountries = new Map();

    for (const [term, { country, type }] of countryTermMap.entries()) {
        const escapedTerm = term.replace(/[-\/\\^$*+?.()|[\\]{}]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedTerm}\\b`, 'i');
        
        if (regex.test(lowerCaseText)) {
            // DEBUG LOG: Check continent value
            console.log(`[DEBUG-COUNTRY-CONTINENT] Country: ${country}, Continent: ${countryData[country].continent}`);
            if (!foundCountries.has(country) || PROBABILITY_SCORES[type] > foundCountries.get(country).probability) {
                foundCountries.set(country, {
                    country,
                    probability: PROBABILITY_SCORES[type],
                    risk: countryData[country].risk,
                    type,
                    term,
                    region: countryData[country].continent // Add continent as region
                });
                console.log(`[DEBUG-COUNTRY] Found term "${term}" for country "${country}" (type: ${type}, prob: ${PROBABILITY_SCORES[type]})`);
            }
        }
    }

    if (foundCountries.size === 0) {
        console.log('[DEBUG-COUNTRY] No countries found.');
        return null;
    }

    const sortedDetections = Array.from(foundCountries.values()).sort((a, b) => b.probability - a.probability);

    console.log('[DEBUG-COUNTRY] Final detection:', sortedDetections[0]);
    return sortedDetections[0];
}

function detectRegion(text) {
    if (!text) {
        return null;
    }

    const lowerCaseText = text.toLowerCase();

    for (const regionName in regionData) {
        for (const term of regionData[regionName]) {
            const escapedTerm = term.replace(/[-\/\\^$*+?.()|[\\]{}]/g, '\\$&');
            const regex = new RegExp(`\\b${escapedTerm}\\b`, 'i');
            if (regex.test(lowerCaseText)) {
                // DEBUG LOG: Check region detection
                console.log(`[DEBUG-REGION] Detected region term: ${term}, Region Name: ${regionName}`);
                return {
                    region: regionName,
                    probability: PROBABILITY_SCORES.region,
                    type: 'region',
                    term: term
                };
            }
        }
    }
    return null;
}

module.exports = { detectCountry, detectRegion };