const googleNewsScraper = require('google-news-scraper');

async function testGoogleNewsScraper() {
    try {
        const articles = await googleNewsScraper({
            searchTerm: "malaria",
            prettyURLs: true,
            timeframe: "7d",
            getArticleContent: true,
            puppeteerArgs: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        console.log(JSON.stringify(articles, null, 2));
    } catch (error) {
        console.error('Error scraping Google News:', error);
    }
}

testGoogleNewsScraper();