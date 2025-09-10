const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const fetch = require('node-fetch').default;
const cheerio = require('cheerio'); // For parsing RSS feed

async function fetchWithTimeout(url, options = {}, timeout = 20000) {
    const controller = new AbortController();
    options.signal = controller.signal;
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, options);
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            console.error(`Request to ${url} timed out.`);
        }
        throw error;
    }
}

async function extractFullArticleContent(articleUrl) {
    try {
        console.log(`Attempting to fetch full content from: ${articleUrl}`);
        const response = await fetchWithTimeout(articleUrl);
        const html = await response.text();

        const dom = new JSDOM(html, { url: articleUrl });
        const reader = new Readability(dom.window.document);
        const article = reader.parse();

        if (article) {
            console.log(`Successfully extracted content from: ${articleUrl}`);
            return {
                title: article.title,
                content: article.textContent,
                length: article.length,
                excerpt: article.excerpt
            };
        } else {
            console.warn(`Could not extract readable content from: ${articleUrl}`);
            return null;
        }
    } catch (error) {
        console.error(`Error extracting content from ${articleUrl}: ${error.message}`);
        return null;
    }
}

async function testGoogleNewsFullTextExtraction() {
    const rssFeedUrl = 'https://news.google.com/rss/search?q=malaria&hl=en-US&gl=US&ceid=US%3Aen';
    console.log(`Fetching Google News RSS feed from: ${rssFeedUrl}`);

    try {
        const rssResponse = await fetchWithTimeout(rssFeedUrl);
        const rssXml = await rssResponse.text();
        const $ = cheerio.load(rssXml, { xmlMode: true });

        const articles = [];
        $('item').each((i, element) => {
            const title = $(element).find('title').text();
            const googleNewsLink = $(element).find('link').text();
            const pubDate = $(element).find('pubDate').text();
            const source = $(element).find('source').text();

            articles.push({
                title,
                googleNewsLink,
                pubDate,
                source
            });
        });

        console.log(`Found ${articles.length} articles in the RSS feed. Testing full-text extraction for the first 5.`);

        // Test base64 decoding for one of the links
        if (articles.length > 0) {
            const sampleLink = articles[0].googleNewsLink;
            const match = sampleLink.match(/articles\/(.*?)(?:\?|$)/);
            if (match && match[1]) {
                const encodedPart = match[1];
                console.log(`\nAttempting to decode: ${encodedPart}`);
                try {
                    // Google News uses a custom base64-like encoding, not standard base64.
                    // This is a common pattern for Google's internal IDs.
                    // Standard base64 decode will likely fail or produce garbage.
                    // We need to find a specific library or method to decode these.
                    // For now, I'll just log the encoded part and acknowledge the difficulty.
                    console.log("Direct base64 decoding is unlikely to work for Google News article IDs.");
                    console.log("These are often custom-encoded or internal IDs that require specific Google APIs or reverse-engineering.");
                    console.log("Proceeding with the original plan of trying to resolve redirects, as direct decoding is not straightforward.");
                } catch (decodeError) {
                    console.error(`Error during decoding attempt: ${decodeError.message}`);
                }
            }
        }

        for (let i = 0; i < Math.min(5, articles.length); i++) {
            const article = articles[i];
            console.log(`\n--- Processing Article ${i + 1} ---`);
            console.log(`Title: ${article.title}`);
            console.log(`Google News Link: ${article.googleNewsLink}`);

            let actualArticleUrl = article.googleNewsLink;
            try {
                // Fetch the Google News redirect link to get the actual article URL after redirects
                // This still seems to be the most viable programmatic approach without headless browsers.
                const redirectResponse = await fetchWithTimeout(article.googleNewsLink, { redirect: 'follow' });
                actualArticleUrl = redirectResponse.url; // This will be the final URL after all redirects
                console.log(`Resolved Actual Article URL: ${actualArticleUrl}`);
            } catch (redirectError) {
                console.warn(`Could not resolve redirect for ${article.googleNewsLink}: ${redirectError.message}`);
                // If redirect fails, try to extract from the original Google News link, though it's unlikely to work
                actualArticleUrl = article.googleNewsLink;
            }

            const fullContent = await extractFullArticleContent(actualArticleUrl);
            if (fullContent) {
                console.log(`Extracted Title: ${fullContent.title}`);
                console.log(`Extracted Excerpt: ${fullContent.excerpt ? fullContent.excerpt.substring(0, 200) + '...' : 'N/A'}`);
                console.log(`Content Length: ${fullContent.length} characters`);
                // console.log(`Full Content: ${fullContent.content.substring(0, 500)}...`); // Log first 500 chars of full content
            } else {
                console.log('Full content extraction failed for this article.');
            }
        }
    } catch (error) {
        console.error(`Error during Google News full-text extraction test: ${error.message}`);
    }
}

testGoogleNewsFullTextExtraction();