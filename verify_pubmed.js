const fetch = require('node-fetch').default;
const cheerio = require('cheerio');

// Sample PubMed IDs to test
const testIds = ['38553953', '38549899', '38549788'];

async function verifyPubMedFetch() {
    console.log(`Testing PubMed efetch for IDs: ${testIds.join(', ')}`);
    
    const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${testIds.join(',')}&retmode=xml`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`API request failed with status: ${response.status}`);
            return;
        }
        const xmlData = await response.text();
        const $ = cheerio.load(xmlData, { xmlMode: true });

        $('PubmedArticle').each((i, article) => {
            const pmid = $(article).find('PMID').text();
            const title = $(article).find('ArticleTitle').text().trim();
            const abstract = $(article).find('AbstractText').text().trim();

            console.log(`
---------------------------------------------------
`);
            console.log(`PMID: ${pmid}`);
            console.log(`Title: ${title}`);
            console.log(`Abstract: ${abstract ? 'Found' : 'Not Found'}`);
            if (abstract) {
                console.log(`  - Snippet: ${abstract.substring(0, 150)}...`);
            }

            console.log('--- Available Dates ---');
            // Find all possible date fields
            $(article).find('PubDate, ArticleDate, PubMedPubDate').each((j, dateElem) => {
                const year = $(dateElem).find('Year').text();
                const month = $(dateElem).find('Month').text();
                const day = $(dateElem).find('Day').text();
                const dateType = dateElem.tagName;
                console.log(`  - Type: ${dateType}, Date: ${year}-${month}-${day}`);
            });
            console.log(`---------------------------------------------------
`);
        });

    } catch (error) {
        console.error('An error occurred during verification:', error);
    }
}

verifyPubMedFetch();
