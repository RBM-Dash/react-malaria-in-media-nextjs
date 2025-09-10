const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch').default;
const OpenAI = require('openai');
const cheerio = require('cheerio');
const CONFIG = require('./config.js'); // Assuming config.js is in the same directory

// --- Copied from fetch_data.js ---
const TRANSLATION_CACHE_PATH = path.resolve(__dirname, 'translation_cache.json');
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
    // For testing, we won't write to fetch_data.log, just console.log
    // fs.appendFile(LOG_FILE_PATH, logMessage + '\n', 'utf8').catch(error => {
    //     console.error(`[ERROR] Failed to write to log file: ${error.message}`);
    // });
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

// Minimal detectCountry for testing purposes, as it's a dependency of EnhancedMalariaIntelligence
// In a real test, you might mock this or import it properly if exported.
const { detectCountry } = require('./src/utils/countryDetector.js');

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
                        this.logProgress(`[TRANSLATE] Served from cache: "${originalText.substring(0, 20)}"...`);
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
                                    this.logProgress(`[TRANSLATE] Success with ${translator.name}: "${originalText.substring(0, 20)}"..." to ${lang}`);
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
}

// --- Test Logic ---
async function runTranslationTest() {
    serverLog('Starting translation test...');
    await loadTranslationCache();

    const intelligenceSystem = new EnhancedMalariaIntelligence();

    const dummyArticle = {
        title: "Malaria vaccine shows promising results in clinical trials.",
        description: "Researchers announced today that a new malaria vaccine candidate has demonstrated high efficacy in phase 2 trials in Africa.",
        language: "en",
        uniqueId: "test-article-1"
    };

    serverLog('Translating dummy article...');
    const translatedArticle = await intelligenceSystem.translateArticle(dummyArticle);

    serverLog('Translated Article:', JSON.stringify(translatedArticle, null, 2));

    serverLog('Saving translation cache...');
    await saveTranslationCache();
    serverLog('Translation test complete.');
}

runTranslationTest();
