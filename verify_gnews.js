const fetch = require('node-fetch').default;
const CONFIG = require('./config.js');

const GNEWS_API_KEY = CONFIG.apis.googlenews.apiKey;
const GNEWS_BASE_URL = CONFIG.apis.googlenews.baseUrl;

const queries = [
    "Internationally Recognized Malaria Researcher Stefan Kappe, PhD, Appointed New Director of the UM School of Medicine's Center for Vaccine Development and Global Health",
    "Malaria education could reduce cases by over a fifth, study finds"
];

async function verifyQuery(query) {
    console.log(`\nSearching for: "${query}"`);
    console.log('---------------------------------------------------');
    
    const encodedQuery = `"${encodeURIComponent(query)}"`;
    const url = `${GNEWS_BASE_URL}/search?apikey=${GNEWS_API_KEY}&q=${encodedQuery}&lang=en&sortby=publishedAt`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.articles && data.articles.length > 0) {
            console.log(`Found ${data.articles.length} article(s):`);
            data.articles.forEach(article => {
                console.log(`  - Title: ${article.title}`);
                console.log(`    Source: ${article.source.name}`);
                console.log(`    URL: ${article.url}`);
            });
        } else {
            console.log('No articles found for this exact query.');
        }
    } catch (error) {
        console.error('An error occurred:', error);
    }
}

async function main() {
    for (const query of queries) {
        await verifyQuery(query);
    }
}

main();
