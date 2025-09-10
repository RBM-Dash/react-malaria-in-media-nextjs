const fetch = require('node-fetch').default;
const CONFIG = require('./config.js');

const RSS2JSON_API_KEY = CONFIG.apis.rss2json.apiKey;

const feeds = [
    { name: 'AllAfrica Health (EN)', url: 'https://allafrica.com/tools/headlines/rdf/health/headlines.rdf', lang: 'en' },
    { name: 'AllAfrica Science', url: 'https://allafrica.com/tools/headlines/rdf/science/headlines.rdf', lang: 'en' }
];

async function testAllAfricaFeeds() {
    console.log('--- Fetching current articles from AllAfrica feeds ---');

    for (const feed of feeds) {
        console.log(`
[SOURCE] ${feed.name}`);
        const rssUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}&api_key=${RSS2JSON_API_KEY}`;
        try {
            const response = await fetch(rssUrl, { timeout: 20000 });
            const data = await response.json();

            if (response.ok && data.status === 'ok' && data.items && data.items.length > 0) {
                console.log(`  Found ${data.items.length} articles:`);
                data.items.forEach((item, index) => {
                    console.log(`    ${index + 1}. ${item.title}`);
                });
            } else if (data.items && data.items.length === 0) {
                 console.log('  Found 0 articles.');
            }
            else {
                console.error(`  [ERROR] Failed to retrieve feed. Status: ${data.status}. Message: ${data.message || 'No message'}`);
            }
        } catch (e) {
            console.error(`  [CRITICAL ERROR] Fetch failed for ${feed.name}: ${e.message}`);
        }
    }
    console.log(`
--- Test Complete ---`);
}

testAllAfricaFeeds();
