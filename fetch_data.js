// FINAL, CORRECTED SCRIPT - 2025-09-01

console.log("fetch_data.js started.");
const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch').default;
const OpenAI = require('openai');
const cheerio = require('cheerio');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const CONFIG = require('./config.js');
const { exec } = require('child_process');
const { deduplicateMalariaNews } = require('./src/utils/openaiDeduplicator.js');
const { normalizeUrl, cleanText } = require('./src/utils/dedupHelper.js');
const stringSimilarity = require('string-similarity');

// Use path.resolve to ensure paths are always correct relative to the script location
const TRANSLATION_CACHE_PATH = path.resolve(__dirname, 'translation_cache.json');
const LOG_FILE_PATH = path.resolve(__dirname, 'fetch_data.log');
let translationCache = {};

async function loadTranslationCache() {
    try {
        const data = await fs.readFile(TRANSLATION_CACHE_PATH, 'utf8');
        translationCache = JSON.parse(data);
        serverLog('[CACHE] Translation cache loaded.');
    } catch (error) {
        if (error.code === 'ENOENT') {
            serverLog('[CACHE] Translation cache file not found, starting with empty cache.');
        } else {
            serverLog(`[ERROR] Failed to load translation cache: ${error.message}`, 'error');
        }
        translationCache = {};
    }
}

async function saveTranslationCache() {
    try {
        await fs.writeFile(TRANSLATION_CACHE_PATH, JSON.stringify(translationCache, null, 2), 'utf8');
        serverLog('[CACHE] Translation cache saved.');
    } catch (error) {
        serverLog(`[ERROR] Failed to save translation cache: ${error.message}`, 'error');
    }
}

function serverLog(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    console.log(logMessage);
    fs.appendFile(LOG_FILE_PATH, logMessage + '\n', 'utf8').catch(error => {
        console.error(`[ERROR] Failed to write to log file: ${error.message}`);
    });
}

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
            serverLog(`Request to ${url} timed out.`, 'error');
        }
        throw error;
    }
}

function extractDateFromUrl(url) {
    if (!url) return null;
    // Regex to find YYYY/MM/DD or YYYY-MM-DD patterns in the URL
    const regex = /(\d{4})[/-](\d{2})[/-](\d{2})|(\d{4})[/-](\d{2})/; // Added a less specific YYYY-MM pattern
    const match = url.match(regex);
    if (match) {
        // Re-construct a valid date string, handling partial matches
        const year = match[1] || match[4];
        const month = match[2] || match[5];
        const day = match[3] || '01'; // Default to the first day if day is not present
        const dateStr = `${year}-${month}-${day}`;
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
            return date.toISOString();
        }
    }
    return null;
}

function sortArticles(a, b) {
    const dateA = new Date(a.publishedAt);
    const dateB = new Date(b.publishedAt);
    if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
    if (isNaN(dateA.getTime())) return 1;
    if (isNaN(dateB.getTime())) return -1;
    return dateB - dateA;
}

// Helper function to parse various date formats
function parseDateString(dateString) {
    if (!dateString) return null;
    serverLog(`[DEBUG-DATE] Attempting to parse dateString: "${dateString}"`);
    let date = new Date(dateString);
    if (!isNaN(date.getTime())) {
        serverLog(`[DEBUG-DATE] Successfully parsed as ISO: ${date.toISOString()}`);
        return date.toISOString();
    }
    serverLog(`[DEBUG-DATE] Initial parsing failed. Trying common RSS formats.`);
    const formats = [
        "ddd, DD MMM YYYY HH:mm:ss ZZ", // RFC 822, 1036, 1123, 2822
        "YYYY-MM-DDTHH:mm:ssZ",        // ISO 8601
        "YYYY-MM-DD HH:mm:ss",
        "DD MMM YYYY HH:mm:ss",
        "MMM DD, YYYY HH:mm:ss"
    ];

    for (const format of formats) {
        try {
            let cleanedDateString = dateString.replace(/\s*\(\w+\)\s*/g, '') // Remove content in parentheses
                                              .replace(/\s*GMT|UTC/g, '') // Remove timezone abbreviations
                                              .trim();
            date = new Date(cleanedDateString);
            if (!isNaN(date.getTime())) {
                return date.toISOString();
            }
        } catch (e) {
            // Continue to next format
        }
    }
    return null;
}

const { detectCountry } = require('./src/utils/countryDetector.js');

function filterArticlesByDate(articles) {
    serverLog(`[DATE-FILTER] Starting date filtering on ${articles.length} articles.`);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const filtered = articles.filter(article => {
        let articleDate = null;
        if (article.publishedAt) {
            articleDate = new Date(parseDateString(article.publishedAt));
        }

        if (!article.publishedAt || isNaN(articleDate.getTime())) {
            const extractedDate = extractDateFromUrl(article.url);
            if (extractedDate) {
                article.publishedAt = extractedDate; // Update the article with the extracted date
                articleDate = new Date(parseDateString(extractedDate));
                serverLog(`[INFO] Extracted date ${extractedDate} from URL for article: ${article.title}`);
            } else {
                serverLog(`[FILTER] Article "${article.title}" has no valid date. Keeping it for now.`, 'warning');
                return true; // Keep articles with no date
            }
        }

        if (isNaN(articleDate.getTime())) {
            serverLog(`[FILTER] Article "${article.title}" has invalid date: "${article.publishedAt}". Keeping it for now.`, 'warning');
            return true; // Keep articles with invalid dates
        }

        const isRecent = articleDate >= sixMonthsAgo;

        if (!isRecent) {
            serverLog(`[FILTER] Removing old article (${articleDate.toISOString().split('T')[0]}): ${article.title}`);
        }
        return isRecent;
    });
    serverLog(`[DATE-FILTER] After date filtering: ${filtered.length} articles remain.`);
    return filtered;
}


class EnhancedMalariaIntelligence {
    constructor() {
        this.openai = new OpenAI({ apiKey: CONFIG.apis.openai.apiKey });
        this.logProgress = this.logProgress.bind(this);
    }

    logProgress(message, type = 'info') { serverLog(message, type); }

    async time(label, promise) {
        const start = Date.now();
        this.logProgress(`[PERF] Starting: ${label}`);
        const result = await promise;
        const duration = (Date.now() - start) / 1000;
        this.logProgress(`[PERF] Finished: ${label} in ${duration.toFixed(2)}s`);
        return result;
    }

    removeDuplicatesFast(newArticles, existingArticles = []) {
        this.logProgress(`[DEDUP-FAST] Starting fast deduplication on ${newArticles.length} new articles against ${existingArticles.length} existing articles.`);
        
        const DEDUP_OPTIONS = { threshold: 0.85, recentLimit: 2000 };

        const existingUrlSet = new Set(existingArticles.map(a => normalizeUrl(a.url)).filter(Boolean));
        const existingCleanedTexts = existingArticles.slice(-DEDUP_OPTIONS.recentLimit).map(a => cleanText((a.title || '') + ' ' + (a.description || '')));

        const uniqueNewArticles = [];
        const newUrlSet = new Set();
        const newCleanedTexts = [];

        for (const article of newArticles) {
            let isDuplicate = false;

            // 1. URL Check against existing and new articles
            const u = normalizeUrl(article.url);
            if (u && (existingUrlSet.has(u) || newUrlSet.has(u))) {
                isDuplicate = true;
            }

            // 2. Fuzzy Text Check
            if (!isDuplicate) {
                const newText = cleanText((article.title || '') + ' ' + (article.description || ''));
                if (newText) {
                    // Check against recent existing articles
                    for (const existingText of existingCleanedTexts) {
                        if (stringSimilarity.compareTwoStrings(newText, existingText) >= DEDUP_OPTIONS.threshold) {
                            isDuplicate = true;
                            break;
                        }
                    }
                    // Check against new articles found in this run
                    if (!isDuplicate) {
                        for (const newCleanedText of newCleanedTexts) {
                            if (stringSimilarity.compareTwoStrings(newText, newCleanedText) >= DEDUP_OPTIONS.threshold) {
                                isDuplicate = true;
                                break;
                            }
                        }
                    }
                }
            }

            if (!isDuplicate) {
                uniqueNewArticles.push(article);
                if (u) {
                    newUrlSet.add(u);
                }
                const newText = cleanText((article.title || '') + ' ' + (article.description || ''));
                if (newText) {
                    newCleanedTexts.push(newText);
                }
            } else {
                this.logProgress(`[DEDUP-FAST] Skipped duplicate: "${article.title}"`);
            }
        }
        
        this.logProgress(`[DEDUP-FAST] After fast deduplication: ${uniqueNewArticles.length} new articles remain.`);
        return uniqueNewArticles;
    }

    async openAITranslateProvider(text, lang) {
        const chatCompletion = await this.openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "system", content: `Translate the following text to ${lang}.` }, { role: "user", content: text }],
            temperature: 0.7,
            max_tokens: 1000
        });
        return chatCompletion.choices[0].message.content;
    }

    async translateArticle(article) {
        // Skip translation for scientific articles, they should remain in English
        if (article.type === 'research') {
            this.logProgress(`[TRANSLATE] Skipping translation for research article: ${article.title.substring(0,50)}...`);
            return article;
        }

        const targetLanguages = Object.keys(CONFIG.search.allMalariaKeywords).filter(lang => lang !== (article.language || 'en'));
        article.translations = article.translations || {};

        for (const lang of targetLanguages) {
            article.translations[lang] = article.translations[lang] || {};
            for (const field of ['title', 'description']) {
                if (article[field] && typeof article[field] === 'string' && !article.translations[lang][field]) {
                    const originalText = article[field];
                    let translatedText = originalText; // Default to original text if all fails
                    let translationSuccessful = false;

                    if (translationCache[originalText] && translationCache[originalText][lang]) {
                        translatedText = translationCache[originalText][lang];
                        translationSuccessful = true;
                    } else {
                        const translators = [
                            { name: 'OpenAI', translate: this.openAITranslateProvider.bind(this) }
                        ];

                        for (const translator of translators) {
                            try {
                                this.logProgress(`[TRANSLATE] Attempting translation with ${translator.name} for: "${originalText.substring(0, 50)}"... to ${lang}`);
                                const result = await this.time(`Translate-${translator.name}-${lang}`, translator.translate(originalText, lang));
                                if (result) {
                                    translatedText = result;
                                    translationSuccessful = true;
                                    this.logProgress(`[TRANSLATE] Success with ${translator.name}: "${originalText.substring(0, 20)}"... to ${lang}`);
                                    break;
                                }
                            } catch (error) {
                                this.logProgress(`[WARN] ${translator.name} Translate failed: ${error.message}`, 'warning');
                            }
                        }
                    }

                    if (translationSuccessful && !(translationCache[originalText] && translationCache[originalText][lang])) {
                        translationCache[originalText] = { ...translationCache[originalText], [lang]: translatedText };
                    }
                    article.translations[lang][field] = translatedText;
                }
            }
        }
        return article;
    }

    // 3. Extract article text content (fallback if Readability fails)
    extractArticleText(doc) {
      const selectors = [
        'article',
        '.article-content',
        '.post-content',
        '.entry-content',
        '.content',
        '[role="main"]',
        'main p'
      ];
      
      for (const selector of selectors) {
        const element = doc.querySelector(selector);
        if (element) {
          const scripts = element.querySelectorAll('script, style');
          scripts.forEach(el => el.remove());
          
          return element.textContent.trim();
        }
      }
      
      const paragraphs = doc.querySelectorAll('p');
      return Array.from(paragraphs)
        .map(p => p.textContent.trim())
        .filter(text => text.length > 50)
        .join('\n\n');
    }

    // 4. Extract published date
    extractPublishedDate(doc) {
      const dateSelectors = [
        'meta[property="article:published_time"]',
        'meta[name="publish-date"]',
        'meta[name="date"]',
        'time[datetime]',
        '.date',
        '.published',
        '.post-date',
        // Add more selectors for common date locations
        '.byline .date',
        '.article-date',
        '.post-info .date',
        '.entry-date',
        '.td-post-date .entry-date'
      ];
      
      for (const selector of dateSelectors) {
        const element = doc.querySelector(selector);
        if (element) {
          const dateValue = element.getAttribute('content') || 
                           element.getAttribute('datetime') || 
                           element.textContent;
          
          if (dateValue) {
            const date = new Date(dateValue);
            if (!isNaN(date.getTime())) {
              return date.toISOString();
            }
          }
        }
      }

      // Fallback: try to find date patterns in the body text
      const bodyText = doc.body.textContent;
      const dateRegexes = [
          /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},\s+\d{4}\b/i, // Month Day, Year
          /\b\d{1,2}\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}\b/i, // Day Month Year
          /\b\d{4}[-/]\d{2}[-/]\d{2}\b/, // YYYY-MM-DD or YYYY/MM/DD
          /\b\d{2}[-/]\d{2}[-/]\d{4}\b/ // DD-MM-YYYY or DD/MM/YYYY
      ];

      for (const regex of dateRegexes) {
          const match = bodyText.match(regex);
          if (match) {
              const date = new Date(match[0]);
              if (!isNaN(date.getTime())) {
                  return date.toISOString();
              }
          }
      }
      
      return null;
    }

    // 2. Scrape individual article content
    async scrapeArticleContent(url) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const html = await response.text();
        const dom = new JSDOM(html);
        const doc = dom.window.document;
        
        // Use Readability for main content extraction
        const reader = new Readability(dom.window.document);
        const article = reader.parse();

        if (article) {
            return {
                title: article.title || doc.querySelector('h1')?.textContent || doc.querySelector('title')?.textContent || '',
                content: article.textContent,
                length: article.length,
                excerpt: article.excerpt,
                publishedDate: this.extractPublishedDate(doc), // Use this.extractPublishedDate
                author: doc.querySelector('[name="author"]')?.getAttribute('content') ||
                        doc.querySelector('.author')?.textContent ||
                        doc.querySelector('[rel="author"]')?.textContent || '',
                description: article.excerpt || doc.querySelector('meta[name="description"]')?.getAttribute('content') ||
                             doc.querySelector('meta[property="og:description"]')?.getAttribute('content') || '',
                image: doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
                       doc.querySelector('img')?.src || '',
                source: doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content') ||
                        new URL(url).hostname
            };
        } else {
            // Fallback to custom extraction if Readability fails
            return {
                title: doc.querySelector('h1')?.textContent || doc.querySelector('title')?.textContent || '',
                content: this.extractArticleText(doc), // Use this.extractArticleText
                publishedDate: this.extractPublishedDate(doc), // Use this.extractPublishedDate
                author: doc.querySelector('[name="author"]')?.getAttribute('content') ||
                        doc.querySelector('.author')?.textContent ||
                        doc.querySelector('[rel="author"]')?.textContent || '',
                description: doc.querySelector('meta[name="description"]')?.getAttribute('content') ||
                             doc.querySelector('meta[property="og:description"]')?.getAttribute('content') || '',
                image: doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
                       doc.querySelector('img')?.src || '',
                source: doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content') ||
                        new URL(url).hostname
            };
        }
      } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return { error: error.message };
  }
}

    async searchGoogleNewsRSS() {
        this.logProgress('[FETCH] Starting Google News RSS search...');
        try {
            const googleNewsScraper = require('google-news-scraper');
            const articles = await googleNewsScraper({
                searchTerm: "malaria",
                prettyURLs: true,
                timeframe: "7d",
                // getArticleContent: true, // Temporarily commented out due to 'Execution context was destroyed' errors. Revisit for full content.
                getArticleContent: true,
                puppeteerArgs: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            this.logProgress(`[FETCH] Successfully scraped ${articles.length} articles from Google News RSS.`);
            return articles.map(article => ({
                title: article.title,
                description: article.content,
                url: article.link,
                publishedAt: article.datetime,
                source: article.source,
                language: 'en',
                uniqueId: article.link,
                imageUrl: article.image,
                author: null,
                fullContent: article.content
            }));
        } catch (error) {
            this.logProgress(`[ERROR] Google News RSS scraping workflow error: ${error.message}`, 'error');
            return [];
        }
    }

    filterArticle(article) {
        const articleText = ((article.title || '') + ' ' + (article.description || '')).toLowerCase();

        for (const keyword of CONFIG.search.excludeKeywords) {
            if (articleText.includes(keyword)) {
                this.logProgress(`[FILTER] Skipping politically sensitive article: ${article.title}`);
                return false;
            }
        }

        const score = this.calculateRelevanceScore(article);
        article.relevanceScore = score;
        if (score < 20) {
            this.logProgress(`[FILTER] Skipping low score (${score}): ${article.title}`) 
            return false;
        }
        this.logProgress(`[FILTER] Passed with score (${score}): ${article.title}`);
        return true;
    }

      calculateRelevanceScore(article) {
          this.logProgress(`[DEBUG-SCORE] Full article object: ${JSON.stringify(article, null, 2)}`);
          const content = ((article.title || '') + ' ' + (article.description || '')).toLowerCase();
          this.logProgress(`[DEBUG-SCORE] Analyzing content: "${content.substring(0, 100)}..."`);
          const coreKeywords = ['malaria', 'plasmodium', 'anopheles', 'paludisme', 'malária', 'antimalarial', 'artemisinin', 'falciparum', 'mosquito', 'moustique'];
          const hasCoreKeyword = coreKeywords.some(kw => content.includes(kw));
          this.logProgress(`[DEBUG-SCORE] Has core keyword: ${hasCoreKeyword}`);
          if (!hasCoreKeyword) {
              this.logProgress('[DEBUG-SCORE] No core keyword found. Returning 0.');
              return 0;
          }
          let score = 25;
          const highValueTerms = ['outbreak', 'epidemic', 'deaths', 'cases', 'resistance', 'vaccine', 'nets', 'spraying', 'elimination'];
          highValueTerms.forEach(term => { if (content.includes(term)) score += 15; });
          const mediumValueTerms = ['treatment', 'prevention', 'diagnosis', 'control', 'research', 'surveillance'];
          mediumValueTerms.forEach(term => { if (content.includes(term)) score += 10; });

          const countryDetection = detectCountry(content);
          this.logProgress(`[DEBUG-SCORE] Country detection result: ${JSON.stringify(countryDetection)}`);
          article.countryDetection = countryDetection;

          // Check for WHO mentions
          if (content.toLowerCase().includes('world health organization') ||
              /\bwho\b/i.test(content) || // Match 'WHO' as a whole word (case insensitive)
              content.includes('WHO')) {
              article.country = 'WHO';
              article.continent = 'Global'; // WHO is considered global
          } else if (countryDetection && countryDetection.country) {
              // Country was detected
              article.country = countryDetection.country;

              // Add continent information if available
              const { countryData } = require('./src/utils/countryData.js');
              if (countryData[countryDetection.country] && countryData[countryDetection.country].continent) {
                  article.continent = countryData[countryDetection.country].continent;
                  this.logProgress(`[DEBUG-SCORE] Added continent: ${article.continent} for country: ${article.country}`);
              }
          } else {
              // Try to detect continent if no country was found
              const { detectRegion } = require('./src/utils/countryDetector.js');
              const regionDetection = detectRegion(content);

              if (regionDetection && regionDetection.region) {
                  article.country = regionDetection.region;
                  article.continent = regionDetection.region; // The region is already a continent
                  this.logProgress(`[DEBUG-SCORE] No country detected, but found region: ${regionDetection.region}`);
              } else {
                  article.country = 'Global';
                  article.continent = 'Global';
                  this.logProgress('[DEBUG-SCORE] No country or region detected, assigning Global');
              }
          }

          this.logProgress(`[DEBUG-SCORE] Final article country: ${article.country}`);

          if (article.country && article.country !== 'Global' && article.country !== 'Unidentified') {
              score += 10;
          }
          const penaltyTerms = ['stock market', 'stock price', 'stock exchange', 'shares', 'dividends', 'merger', 'acquisition'];
          penaltyTerms.forEach(term => { if (content.includes(term)) score -= 30; });
          this.logProgress(`[DEBUG-SCORE] Score before final clamp: ${score}`);
          return Math.max(0, Math.min(score, 100));
      }

    async searchNewsAPITargeted() {
        this.logProgress('[FETCH] Starting NewsAPI search...');
        const results = [];
        for (const keyword of CONFIG.search.allMalariaKeywords.en) {
            const url = `${CONFIG.apis.newsapi.baseUrl}/everything?q=${encodeURIComponent(keyword)}&language=en&sortBy=publishedAt&apiKey=${CONFIG.apis.newsapi.apiKey}&pageSize=100`;
            try {
                const response = await fetchWithTimeout(url);
                const data = await response.json();
                if (data.status === 'ok') results.push(...data.articles.map(a => ({ ...a, source: 'NewsAPI', language: 'en', uniqueId: a.url, imageUrl: a.urlToImage })));
            } catch (e) { this.logProgress(`[ERROR] NewsAPI for "${keyword}": ${e.message}`, 'error'); }
        }
        return results;
    }

    async searchWHORSS() {
        this.logProgress('[FETCH] Fetching WHO RSS feed...');
        const rssUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent('https://www.who.int/rss-feeds/news-english.xml')}&api_key=${CONFIG.apis.rss2json.apiKey}`;
        try {
            const response = await fetchWithTimeout(rssUrl);
            const data = await response.json();
            if (data.items) return data.items.map(item => ({ ...item, source: 'WHO RSS', type: 'official', language: 'en', uniqueId: item.link, imageUrl: item.thumbnail || (item.enclosure && item.enclosure.link) }));
        } catch (e) { this.logProgress(`[ERROR] WHO RSS: ${e.message}`, 'error'); }
        return [];
    }

    

    // Helper function to parse various date formats
    // Helper function to parse various date formats
  

    // Helper function to check if content is malaria-related
    isMalariaRelated(title, description) {
        const malariaKeywords = [
            'malaria', 'mosquito', 'bednet', 'artemisinin', 'ACT', 'RDT',
            'anopheles', 'plasmodium', 'ITN', 'LLIN', 'IRS', 'SMC',
            'seasonal malaria chemoprevention', 'intermittent preventive treatment',
            'indoor residual spraying', 'rapid diagnostic test'
        ];
        
        const text = (title + ' ' + (description || '')).toLowerCase();
        return malariaKeywords.some(keyword => text.includes(keyword));
    }

    // Helper to extract images from description HTML
    extractImageFromDescription(description) {
        if (!description) return null;
        
        const imgRegex = /<img[^>]+src="([^"]+)"/i;
        const match = description.match(imgRegex);
        return match ? match[1] : null;
    }

    // Alternative scraping approach for AllAfrica malaria page
    async scrapeAllAfricaMalariaPage(results) {
        try {
            const response = await fetchWithTimeout('https://allafrica.com/malaria/', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                }
            });

            const html = await response.text();
            const dom = new JSDOM(html);
            const doc = dom.window.document;
            
            // Parse HTML for article links and titles
            const articlesOnPage = doc.querySelectorAll('div.story-item'); // Adjust selector based on actual AllAfrica HTML structure
            
            articlesOnPage.forEach(itemElement => {
                const linkElement = itemElement.querySelector('a');
                const titleElement = itemElement.querySelector('h4, h3, h2'); // Common title tags
                const dateElement = itemElement.querySelector('.date, .story-date, .pub-date'); // Common date tags
                const descriptionElement = itemElement.querySelector('p'); // Common description tag

                if (linkElement && titleElement) {
                    const link = linkElement.href;
                    const title = titleElement.textContent.trim();
                    const description = descriptionElement ? descriptionElement.textContent.trim() : '';
                    let publishedAt = null;

                    if (dateElement) {
                        publishedAt = parseDateString(dateElement.textContent.trim());
                    }
                    // Fallback to extract from URL if not found in element
                    if (!publishedAt) {
                        publishedAt = extractDateFromUrl(link);
                    }

                    if (this.isMalariaRelated(title, description)) {
                        results.push({
                            title: title,
                            description: description,
                            url: link.startsWith('http') ? link : `https://allafrica.com${link}`,
                            publishedAt: publishedAt,
                            source: 'African Media',
                            sourceName: 'AllAfrica Malaria Scrape',
                            language: 'en',
                            uniqueId: link,
                            imageUrl: this.extractImageFromDescription(description) // Try to extract image from description
                        });
                    }
                }
            });
            
            this.logProgress(`[SCRAPE-SUCCESS] Found ${results.length} articles from AllAfrica malaria page`);
            
        } catch (e) {
            this.logProgress(`[SCRAPE-ERROR] Failed to scrape AllAfrica malaria page: ${e.message}`, 'error');
        }
    }

    async searchHealthBlogsAndFeeds() {
        this.logProgress('[FETCH] Fetching African media feeds...');
        
        // Updated and expanded feed list with working URLs
        const feeds = [
            // AllAfrica feeds - try multiple endpoints
            { name: 'AllAfrica Health (EN)', url: 'https://allafrica.com/tools/headlines/rdf/health/headlines.rdf', lang: 'en' },
            { name: 'AllAfrica Malaria Search', url: 'https://allafrica.com/malaria/feed/', lang: 'en' }, // Try direct malaria feed
            { name: 'AllAfrica Main RSS', url: 'https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf', lang: 'en' },
            
            // Alternative RSS2JSON approach for AllAfrica malaria page
            { name: 'AllAfrica Malaria Scrape', url: 'https://allafrica.com/malaria/', lang: 'en', scrape: true },
            
            // Other African sources
            { name: 'Radarr Africa (Malaria Search)', url: 'https://radarr.africa/feed/?s=malaria', lang: 'en' },
            { name: 'AllAfrica Science', url: 'https://allafrica.com/tools/headlines/rdf/science/headlines.rdf', lang: 'en' },
            { name: 'Africanews Health', url: 'https://www.africanews.com/tag/health/feed/', lang: 'en' },
            { name: 'Africanews Main', url: 'https://www.africanews.com/feed/', lang: 'en' },
            { name: 'Africanews (FR)', url: 'https://fr.africanews.com/feed/', lang: 'fr' },
            
            // Specialized malaria feeds
            { name: 'Malaria No More News', url: 'https://www.malarianomore.org/category/news/feed/', lang: 'en' },
            { name: 'WHO Africa RSS', url: 'https://www.afro.who.int/rss/press-releases', lang: 'en' },
            { name: 'Global Fund RSS', url: 'https://www.theglobalfund.org/en/site/rss/', lang: 'en' },
            { name: 'MMV RSS', url: 'https://www.mmv.org/rss-main-feed', lang: 'en' }
        ];

        const results = [];
        const maxRetries = 3;
        const retryDelay = 2000; // 2 seconds

        for (const feed of feeds) {
            let attempts = 0;
            let success = false;

            while (attempts < maxRetries && !success) {
                attempts++;
                
                try {
                    if (feed.scrape) {
                        // For AllAfrica malaria page, try web scraping approach
                        await this.scrapeAllAfricaMalariaPage(results);
                        success = true;
                    } else {
                        // Standard RSS approach with improved error handling
                        const rssUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}&api_key=${CONFIG.apis.rss2json.apiKey}&count=50`;
                        
                        this.logProgress(`[FETCH-ATTEMPT] ${feed.name} (Attempt ${attempts}): ${rssUrl}`);
                        
                        const response = await fetchWithTimeout(rssUrl, {
                            timeout: 30000, // 30 second timeout
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)',
                                'Accept': 'application/json',
                            }
                        });

                        if (!response.ok) {
                            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                        }

                        const data = await response.json();
                        
                        // Enhanced error checking
                        if (data.status === 'error') {
                            throw new Error(`RSS2JSON Error: ${data.message}`);
                        }

                        if (!data.items || !Array.isArray(data.items)) {
                            throw new Error('Invalid RSS data structure - no items array');
                        }

                        this.logProgress(`[FETCH-SUCCESS] ${feed.name}: Found ${data.items.length} items`);

                        // Enhanced debugging
                        data.items.forEach((item, index) => {
                            if (index < 3) { // Log first 3 items for debugging
                                this.logProgress(`[DEBUG-ITEM-${index}] ${JSON.stringify({
                                    title: item.title,
                                    link: item.link,
                                    pubDate: item.pubDate,
                                    description: item.description?.substring(0, 100) + '...'
                                }, null, 2)}`);
                            }
                        });

                        // Filter for malaria-related content
                        const filteredItems = data.items.filter(item => 
                            this.isMalariaRelated(item.title, item.description)
                        );

                        this.logProgress(`[FILTER-RESULT] ${feed.name}: ${filteredItems.length}/${data.items.length} malaria-related items`);

                        // Process and add items
                        const processedItems = filteredItems.map(item => ({
                            ...item,
                            publishedAt: parseDateString(item.pubDate),
                            source: 'African Media',
                            sourceName: feed.name,
                            language: feed.lang,
                            uniqueId: item.link || item.guid || `${feed.name}-${item.title}`,
                            imageUrl: item.thumbnail || 
                                     (item.enclosure && item.enclosure.link) ||
                                     this.extractImageFromDescription(item.description)
                        }));

                        results.push(...processedItems);
                        success = true;
                    }

                } catch (e) {
                    this.logProgress(`[ERROR] ${feed.name} (Attempt ${attempts}): ${e.message}`, 'error');
                    
                    if (attempts < maxRetries) {
                        this.logProgress(`[RETRY] Waiting ${retryDelay/1000}s before retry...`);
                        await new Promise(resolve => setTimeout(resolve, retryDelay));
                    }
                }
            }

            if (!success) {
                this.logProgress(`[FAILED] ${feed.name}: All ${maxRetries} attempts failed`, 'error');
            }

            // Small delay between feeds to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        this.logProgress(`[TOTAL-RESULTS] Found ${results.length} total articles from African feeds`);
        return results;
    }

    async searchLatinAmericanFeeds() {
        this.logProgress('[FETCH] Fetching Latin American media feeds...');
        const feeds = [
            { name: 'PAHO News (ES)', url: 'https://www.paho.org/es/rss/paho-noticias.xml', lang: 'es' },
            { name: 'PAHO News (PT)', url: 'https://www.paho.org/pt/rss/paho-noticias.xml', lang: 'pt' },
            { name: 'MedlinePlus (ES)', url: 'https://medlineplus.gov/spanish/rss/', lang: 'es' }
        ];
        const results = [];
        for (const feed of feeds) {
            const rssUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}&api_key=${CONFIG.apis.rss2json.apiKey}`;
            try {
                const response = await fetchWithTimeout(rssUrl);
                const data = await response.json();
                if (data.items) results.push(...data.items.map(item => ({ ...item, source: 'Latin American Media', sourceName: feed.name, language: feed.lang, uniqueId: item.link, imageUrl: item.thumbnail || (item.enclosure && item.enclosure.link) })));
            } catch (e) { this.logProgress(`[ERROR] ${feed.name}: ${e.message}`, 'error'); }
        }
        return results;
    }

    async searchPubMedAPI() {
        this.logProgress('[FETCH] Starting PubMed search...');
        const query = '(malaria OR plasmodium OR antimalarial OR artemisinin) AND (research OR study OR clinical OR trial)';
        const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=100&retmode=json&sort=pub+date`;
        try {
            const searchResponse = await fetchWithTimeout(searchUrl);
            const searchData = await searchResponse.json();
            if (searchData.esearchresult && searchData.esearchresult.idlist.length > 0) {
                const ids = searchData.esearchresult.idlist;
                this.logProgress(`[FETCH] PubMed found ${ids.length} IDs. Fetching details...`);
                const detailsUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${ids.join(',')}&retmode=xml`;
                const detailsResponse = await fetchWithTimeout(detailsUrl);
                const xmlData = await detailsResponse.text();
                const $ = cheerio.load(xmlData, { xmlMode: true });
                const articles = [];

                $('PubmedArticle').each((i, article) => {
                    const pmid = $(article).find('PMID').text();
                    const articleNode = $(article).find('Article');
                    const title = articleNode.find('ArticleTitle').text().trim();
                    const abstract = articleNode.find('AbstractText').text().trim();
                    if (!abstract) {
                        this.logProgress(`[WARN] No abstract found for PubMed article: ${title}`, 'warning');
                    }
                    
                    let publishedAt = null;
                    // Attempt to find the most reliable date from multiple possible tags
                    const articleDate = $(articleNode).find('ArticleDate').first();
                    const pubDate = $(articleNode).find('PubDate').first();

                    let year, month, day;

                    if (articleDate.length) {
                        year = articleDate.find('Year').text();
                        month = articleDate.find('Month').text();
                        day = articleDate.find('Day').text();
                    } else if (pubDate.length) {
                        year = pubDate.find('Year').text();
                        month = pubDate.find('Month').text() || pubDate.find('MedlineDate').text().split(' ')[1];
                        day = pubDate.find('Day').text();
                    }

                    if (year && month) {
                        // Convert month name to number if necessary
                        if (isNaN(parseInt(month, 10))) {
                            month = new Date(Date.parse(month + " 1, 2012")).getMonth() + 1;
                        }
                        // Default day to 01 if missing
                        day = day || '01';
                        publishedAt = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    } else {
                         this.logProgress(`[WARN] Could not determine a valid date for PubMed article: ${title}`, 'warning');
                    }

                    articles.push({
                        title: title,
                        description: abstract,
                        publishedAt: publishedAt,
                        url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
                        source: 'PubMed',
                        type: 'research',
                        language: 'en',
                        uniqueId: `pubmed-${pmid}`
                    });
                });
                return articles;
            }
        } catch (e) { this.logProgress(`[ERROR] PubMed: ${e.message}`, 'error'); }
        return [];
    }

    async searchPMCAPI() {
        this.logProgress('[FETCH] Starting PMC search...');
        const query = '(malaria OR plasmodium OR antimalarial OR artemisinin) AND (research OR study OR clinical OR trial)';
        const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pmc&term=${encodeURIComponent(query)}&retmax=100&retmode=json&sort=pub+date`;
        try {
            const searchResponse = await fetchWithTimeout(searchUrl);
            const searchData = await searchResponse.json();
            if (searchData.esearchresult && searchData.esearchresult.idlist.length > 0) {
                const ids = searchData.esearchresult.idlist;
                this.logProgress(`[FETCH] PMC found ${ids.length} IDs. Fetching details...`);
                const detailsUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id=${ids.join(',')}&retmode=xml`;
                const detailsResponse = await fetchWithTimeout(detailsUrl);
                const xmlData = await detailsResponse.text();
                const $ = cheerio.load(xmlData, { xmlMode: true });
                const articles = [];

                $('article').each((i, article) => {
                    const title = $(article).find('article-title').first().text().trim();
                    const abstract = $(article).find('abstract').first().text().trim();
                    if (!abstract) {
                        this.logProgress(`[WARN] No abstract found for PMC article: ${title}`, 'warning');
                    }
                    const pmid = $(article).find('article-id[pub-id-type="pmid"]').first().text();
                    const pmcid = $(article).find('article-id[pub-id-type="pmc"]').first().text();
                    const uniqueId = pmid ? `pmid-${pmid}` : `pmc-${pmcid}`;
                    const url = pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${pmcid}`;

                    let publishedAt = null;
                    const dateNode = $(article).find('pub-date[pub-type="epub"], pub-date[pub-type="ppub"]').first();
                    if (dateNode.length) {
                        const year = dateNode.find('year').text();
                        const month = dateNode.find('month').text();
                        const day = dateNode.find('day').text();
                        if (year && month && day) {
                            publishedAt = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                        }
                    }
                    if (!publishedAt) {
                        this.logProgress(`[WARN] Could not determine a valid date for PMC article: ${title}`, 'warning');
                    }

                    articles.push({
                        title: title,
                        description: abstract,
                        publishedAt: publishedAt,
                        url: url,
                        source: 'PMC',
                        type: 'research',
                        language: 'en',
                        uniqueId: uniqueId
                    });
                });
                return articles;
            }
        } catch (e) { this.logProgress(`[ERROR] PMC: ${e.message}`, 'error'); }
        return [];
    }

    async searchEuropePMCAPI() {
        this.logProgress('[FETCH] Starting Europe PMC search...');
        const query = '(malaria OR plasmodium OR antimalarial OR artemisinin) AND (research OR study OR clinical OR trial)';
        const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(query)}&resultType=lite&format=json&pageSize=100`;
        try {
            const response = await fetchWithTimeout(url);
            const data = await response.json();
            if (data.resultList && data.resultList.result.length > 0) {
                return data.resultList.result.map(p => {
                    return {
                        title: p.title,
                        description: p.abstractText,
                        publishedAt: p.firstPublicationDate,
                        url: p.fullTextUrlList?.fullTextUrl[0]?.url,
                        source: 'Europe PMC',
                        type: 'research',
                        language: p.language,
                        uniqueId: `europepmc-${p.id}`,
                    };
                });
            }
        } catch (e) { this.logProgress(`[ERROR] Europe PMC: ${e.message}`, 'error'); }
        return [];
    }

    async searchDOAJAPI() {
        this.logProgress('[FETCH] Starting DOAJ API search...');
        const results = [];
        const searchQueries = [ 'malaria', 'plasmodium', 'anopheles', 'paludisme', 'malária', 'antimalarial', 'artemisinin', 'falciparum', 'mosquito', 'moustique', 'antiplasmodial' ];
        for (const query of searchQueries) {
            const url = `https://doaj.org/api/search/articles?query=title:${encodeURIComponent(query)} OR abstract:${encodeURIComponent(query)}&pageSize=100`;
            try {
                const response = await fetchWithTimeout(url);
                const data = await response.json();
                if (data.results && data.results.length > 0) {
                    this.logProgress(`[RETRIEVED] DOAJ: ${data.results.length} raw articles for "${query}".`);
                    results.push(...data.results.map(item => ({
                        title: item.bibjson.title,
                        description: item.bibjson.abstract,
                        publishedAt: item.bibjson.journal.publication_start_date || item.created_date,
                        url: item.bibjson.link.find(link => link.type === 'fulltext')?.url,
                        source: 'DOAJ',
                        language: item.bibjson.journal.language?.[0] || 'en', // Assuming first language if multiple
                        uniqueId: item.id // DOAJ's internal ID
                    })));
                }
            } catch (error) { this.logProgress(`[ERROR] DOAJ for "${query}": ${error.message}`, 'error'); }
            
        }
        return results;
    }

    async searchGuardianAPI() {
        this.logProgress('[FETCH] Starting Guardian search...');
        const query = 'malaria OR paludisme OR malária';
        const url = `${CONFIG.apis.guardian.baseUrl}/search?q=${encodeURIComponent(query)}&pagesize=100&show-fields=thumbnail,bodyText&api-key=${CONFIG.apis.guardian.apiKey}`;
        try {
            const response = await fetchWithTimeout(url);
            const data = await response.json();
            if (data.response && data.response.results) return data.response.results.map(a => ({ ...a, source: 'Guardian', language: 'en', uniqueId: a.webUrl }));
        } catch (e) { this.logProgress(`[ERROR] Guardian: ${e.message}`, 'error'); }
        return [];
    }

    async searchGoogleNewsAPI() {
        this.logProgress('[FETCH] Starting Google News search...');
        const results = [];
        const searchTerms = ['(malaria OR plasmodium)'];
        for (const term of searchTerms) {
            for (const lang of ['en', 'fr', 'pt', 'es']) {
                const url = `${CONFIG.apis.googlenews.baseUrl}/search?apikey=${CONFIG.apis.googlenews.apiKey}&q=${encodeURIComponent(term)}&lang=${lang}&sortby=publishedAt&max=100&in=title,description`;
                try {
                    const response = await fetchWithTimeout(url);
                    const data = await response.json();
                    if (data.articles) results.push(...data.articles.map(a => ({ ...a, source: 'Google News', language: lang, uniqueId: a.url, imageUrl: a.image })));
                } catch (e) { this.logProgress(`[ERROR] Google News for "${term}" (${lang}): ${e.message}`, 'error'); }
            }
        }
        return results;
    }

    async searchAsianPacificFeeds() {
        this.logProgress('[FETCH] Fetching Asian Pacific feeds...');
        const feeds = [
            { name: 'BBC Asia', url: 'https://feeds.bbci.co.uk/news/world/asia/rss.xml' },
            { name: 'Times of India Health', url: 'https://timesofindia.indiatimes.com/rssfeeds/3908999.cms' }
        ];
        const results = [];
        for (const feed of feeds) {
            const rssUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}&api_key=${CONFIG.apis.rss2json.apiKey}&count=100`;
            try {
                const response = await fetchWithTimeout(rssUrl);
                const data = await response.json();
                if (data.items) results.push(...data.items.map(item => ({ ...item, source: 'Asian Pacific', sourceName: feed.name, uniqueId: item.link, imageUrl: item.thumbnail || (item.enclosure && item.enclosure.link) })));
            } catch (e) { this.logProgress(`[ERROR] ${feed.name}: ${e.message}`, 'error'); }
        }
        return results;
    }

    async searchOutbreakAlerts() {
        this.logProgress('[FETCH] Fetching outbreak alerts...');
        const feeds = [
            { name: 'Outbreak News Today', url: 'http://outbreaknewstoday.com/feed', lang: 'en' }
        ];
        const results = [];
        for (const feed of feeds) {
            const rssUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}&api_key=${CONFIG.apis.rss2json.apiKey}&count=100`;
            try {
                const response = await fetchWithTimeout(rssUrl);
                const data = await response.json();
                if (data.items) results.push(...data.items.map(item => ({ ...item, source: 'Outbreak Alert', sourceName: feed.name, language: feed.lang, uniqueId: item.link, imageUrl: item.thumbnail || (item.enclosure && item.enclosure.link) })));
            } catch (e) { this.logProgress(`[ERROR] ${feed.name}: ${e.message}`, 'error'); }
        }
        return results;
    }

    async searchMalariaConsortium() {
        this.logProgress('[FETCH] Starting Malaria Consortium search...');
        const url = 'https://www.malariaconsortium.org/news-events/news';
        try {
            const response = await fetchWithTimeout(url);
            const html = await response.text();
            const $ = cheerio.load(html);
            const articles = [];
            $('.news-list-item').each((i, elem) => {
                const title = $(elem).find('h3').text().trim();
                const link = $(elem).find('a').attr('href');
                const description = $(elem).find('.news-list-item-description').text().trim();
                const publishedAt = $(elem).find('.news-list-item-date').text().trim();

                if (title && link) {
                    articles.push({
                        title, 
                        description,
                        url: `https://www.malariaconsortium.org${link}`,
                        publishedAt,
                        source: 'Malaria Consortium',
                        language: 'en',
                        uniqueId: `https://www.malariaconsortium.org${link}`,
                        imageUrl: null
                    });
                }
            });
            return articles;
        } catch (e) {
            this.logProgress(`[ERROR] Malaria Consortium: ${e.message}`, 'error');
            return [];
        }
    }

    async searchGavi() {
        this.logProgress('[FETCH] Starting Gavi search...');
        const url = 'https://www.gavi.org/news-resources/news-releases';
        try {
            const response = await fetchWithTimeout(url);
            const html = await response.text();
            const $ = cheerio.load(html);
            const articles = [];
            $('div.sf-news-releases-view .list-item').each((i, elem) => {
                const title = $(elem).find('h3.item-title a').text().trim();
                const link = $(elem).find('h3.item-title a').attr('href');
                const description = $(elem).find('.item-summary').text().trim();
                const publishedAt = $(elem).find('.item-publication-date').text().trim();

                if (title && link) {
                    articles.push({
                        title,
                        description,
                        url: `https://www.gavi.org${link}`,
                        publishedAt,
                        source: 'Gavi',
                        language: 'en',
                        uniqueId: `https://www.gavi.org${link}`,
                        imageUrl: null
                    });
                }
            });
            
            return articles;
        } catch (e) {
            this.logProgress(`[ERROR] Gavi: ${e.message}`, 'error');
            return [];
        }
    }

    async searchNewsDataAPI() {
        this.logProgress('[FETCH] Starting NewsData.io search...');
        const results = [];
        const query = 'malaria OR paludisme OR malária';
        const languages = 'en,fr,pt,es';
        const url = `https://newsdata.io/api/1/news?apikey=${CONFIG.apis.newsdata.apiKey}&q=${encodeURIComponent(query)}&language=${languages}`;

        try {
            const response = await fetchWithTimeout(url);
            const data = await response.json();

            if (data.status === 'success' && data.results) {
                this.logProgress(`[RETRIEVED] NewsData.io: ${data.results.length} raw articles.`);
                results.push(...data.results.map(a => ({
                    title: a.title,
                    description: a.description,
                    url: a.link,
                    publishedAt: a.pubDate,
                    source: 'NewsData.io',
                    language: a.language,
                    uniqueId: a.link, // Using link as uniqueId
                    imageUrl: a.image_url
                })));
            } else if (data.status === 'error') {
                const errorMessage = data.results ? data.results.message : 'Unknown error';
                this.logProgress(`[ERROR] NewsData.io: ${errorMessage}`, 'error');
            }
        } catch (e) {
            this.logProgress(`[ERROR] NewsData.io fetch failed: ${e.message}`, 'error');
        }
        return results;
    }

    async aggregateAll(existingArticles = []) {
        this.logProgress('Starting data aggregation with all optimizations...');
        const sources = [
            this.time('NewsAPI', this.searchNewsAPITargeted()),
            this.time('WHORSS', this.searchWHORSS()),
            this.time('HealthBlogsAndFeeds', this.searchHealthBlogsAndFeeds()),
            this.time('PubMed', this.searchPubMedAPI()),
            this.time('PMC', this.searchPMCAPI()),
            this.time('EuropePMC', this.searchEuropePMCAPI()),
            this.time('DOAJ', this.searchDOAJAPI()),
            this.time('Guardian', this.searchGuardianAPI()),
            this.time('GoogleNews', this.searchGoogleNewsAPI()),
            this.time('GoogleNewsRSS', this.searchGoogleNewsRSS()),
            this.time('NewsData', this.searchNewsDataAPI()),
            this.time('AsianPacificFeeds', this.searchAsianPacificFeeds()),
            this.time('LatinAmericanFeeds', this.searchLatinAmericanFeeds()),
            this.time('OutbreakAlerts', this.searchOutbreakAlerts()),
            this.time('MalariaConsortium', this.searchMalariaConsortium()),
            this.time('Gavi', this.searchGavi())
        ];
        const results = await Promise.all(sources.map(p => p.catch(e => { this.logProgress(e.message, 'error'); return []; })));
        const newlyFetchedArticles = results.flat();
        this.logProgress(`[AGGREGATE] Retrieved ${newlyFetchedArticles.length} raw articles from all sources.`);
        
        // Step 1: Fast Deduplication of new articles against existing ones
        let uniqueNewArticles = await this.time('FastDeduplication', Promise.resolve(this.removeDuplicatesFast(newlyFetchedArticles, existingArticles)));

        // Step 2: Filtering on new articles
        let filteredNewArticles = await this.time('Filtering', Promise.resolve(uniqueNewArticles.filter(article => this.filterArticle(article))));
        this.logProgress(`[AGGREGATE] After initial filtering: ${filteredNewArticles.length} new articles.`);

        // Step 3: Date Filtering on new articles
        let dateFilteredNewArticles = filterArticlesByDate(filteredNewArticles);

        // Step 4: Translation of new articles
        const translatedNewArticles = [];
        const batchSize = 10;
        for (let i = 0; i < dateFilteredNewArticles.length; i += batchSize) {
            const batch = dateFilteredNewArticles.slice(i, i + batchSize);
            this.logProgress(`[TRANSLATE] Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(dateFilteredNewArticles.length / batchSize)}...`);
            const translatedBatch = await this.time(`TranslationBatch-${i}`, Promise.all(batch.map(article => this.translateArticle(article))));
            translatedNewArticles.push(...translatedBatch);
        }
        this.logProgress(`[AGGREGATE] Translation complete for new articles.`);

        // Step 5: Final AI Deduplication of new translated articles against existing ones
        this.logProgress('[DEDUP-AI] Starting AI deduplication...');
        let finalNewArticles = await this.time('AIDeduplication', deduplicateMalariaNews(translatedNewArticles, existingArticles, CONFIG.apis.openai.apiKey));
        this.logProgress(`[DEDUP-AI] AI deduplication complete. Reduced from ${translatedNewArticles.length} to ${finalNewArticles.uniqueArticles.length} articles.`);
        
        // Step 6: Combine and Sort
        const finalArticleList = [...existingArticles, ...finalNewArticles.uniqueArticles];
        finalArticleList.sort(sortArticles);

        this.logProgress(`[AGGREGATE] Aggregation complete. Final article count: ${finalArticleList.length}`);
        return finalArticleList;
    }
}


// New function to push to GitHub
async function pushToGitHub() {
    serverLog('[GIT] Starting Git operations to push articles.json to GitHub...');
    try {
        // Add articles.json to staging
        await new Promise((resolve, reject) => {
            exec('git add articles.json', { cwd: __dirname }, (error, stdout, stderr) => {
                if (error) {
                    serverLog(`[GIT ERROR] git add failed: ${stderr}`, 'error');
                    return reject(error);
                }
                serverLog(`[GIT] git add output: ${stdout.trim()}`);
                resolve();
            });
        });

        // Commit the changes
        await new Promise((resolve, reject) => {
            const commitMessage = "chore: Update articles.json via fetch_data script";
            exec(`git commit -m \"${commitMessage}\"`, { cwd: __dirname }, (error, stdout, stderr) => {
                if (error && !stdout.includes('nothing to commit')) { // 'nothing to commit' is not an error
                    serverLog(`[GIT ERROR] git commit failed: ${stderr}`, 'error');
                    return reject(error);
                }
                serverLog(`[GIT] git commit output: ${stdout.trim()}`);
                resolve();
            });
        });

        // Push to GitHub
        await new Promise((resolve, reject) => {
            exec('git push origin main', { cwd: __dirname }, (error, stdout, stderr) => {
                if (error) {
                    serverLog(`[GIT ERROR] git push failed: ${stderr}`, 'error');
                    return reject(error);
                }
                serverLog(`[GIT] git push output: ${stdout.trim()}`);
                serverLog('[GIT] Successfully pushed articles.json to GitHub.');
                resolve();
            });
        });
    } catch (error) {
        serverLog(`[GIT CRITICAL] Failed to push to GitHub: ${error.message}`, 'error');
    }
}

async function fetchDataAndSave() {
    try {
        await fs.writeFile(LOG_FILE_PATH, '', 'utf8');
        serverLog('Starting data fetch process...');
        await loadTranslationCache();
        const outputPath = path.resolve(__dirname, 'public', 'articles.json');
        let existingArticles = [];
        try {
            const existingData = await fs.readFile(outputPath, 'utf8');
            existingArticles = JSON.parse(existingData);
            serverLog(`[INFO] Loaded ${existingArticles.length} existing articles.`);
        } catch (error) {
            serverLog('[INFO] articles.json not found. Starting fresh.');
        }
        const intelligenceSystem = new EnhancedMalariaIntelligence();
        const articles = await intelligenceSystem.aggregateAll(existingArticles);

        let articlesWithNoDateCount = 0;
        let pubmedArticlesWithNoDateCount = 0;
        const articlesWithNoDateTitles = [];

        articles.forEach(article => {
            if (!article.publishedAt || isNaN(new Date(parseDateString(article.publishedAt)).getTime())) {
                articlesWithNoDateCount++;
                articlesWithNoDateTitles.push(`- ${article.title} (Source: ${article.source})`);
                if (article.source === 'PubMed') {
                    pubmedArticlesWithNoDateCount++;
                }
            }
        });

        serverLog(`[FINAL SUMMARY] Total articles with no/invalid date: ${articlesWithNoDateCount}`);
        serverLog(`[FINAL SUMMARY] PubMed articles with no/invalid date: ${pubmedArticlesWithNoDateCount}`);
        if (articlesWithNoDateTitles.length > 0) {
            serverLog(`[FINAL SUMMARY] Titles of articles with no/invalid date:\n${articlesWithNoDateTitles.join('\n')}`);
        }

        await fs.writeFile(outputPath, JSON.stringify(articles, null, 2));
        serverLog(`Processing complete. Aggregated ${articles.length} articles and saved to articles.json`);

        // Copy articles.json to root for GitHub Pages
        const rootOutputPath = path.resolve(__dirname, 'articles.json');
        await fs.copyFile(outputPath, rootOutputPath); // Use fs.copyFile for Node.js
        serverLog(`[FILE] Copied articles.json to root for GitHub Pages.`);

        await saveTranslationCache();

        // Call the new function to push to GitHub
        await pushToGitHub(); // Call this after saving and copying

    } catch (error) {
        serverLog(`A critical error occurred in fetchDataAndSave: ${error.message}`, 'error');
        console.error(error);
    }
}

const cron = require('node-cron');

module.exports = { fetchDataAndSave };

fetchDataAndSave();

/*
// Schedule to run every day at 2:00 AM
cron.schedule('0 2 * * *', () => {
    serverLog('Cron job started: running fetchDataAndSave...');
    fetchDataAndSave();
}, {
    scheduled: true,
    timezone: "Etc/UTC" // Using UTC timezone
});

serverLog('Scheduler initialized. Waiting for the next scheduled run at 2:00 AM UTC.');
*/
