const fetch = require('node-fetch');
const cheerio = require('cheerio');

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
    };

    // Dodajemo User-Agent da bismo se predstavili kao standardni browser
    const fetchOptions = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    };

    const baseUrl = "http://www.sportsmole.co.uk";
    // Koristimo timestamp da izbegnemo keširanje stranice
    const initialUrl = `${baseUrl}/index_rhs.html?${new Date().getTime()}`;
    const allLineupsData = [];

    try {
        console.log("--- Lineup Scraper START ---");
        console.log(`1. Fetching initial page: ${initialUrl}`);

        const response = await fetch(initialUrl, fetchOptions);
        if (!response.ok) throw new Error(`Failed to fetch initial page: ${response.statusText}`);
        
        const html = await response.text();
        const $ = cheerio.load(html);
        
        const previewLinks = [];
        $('a').each((i, el) => {
            const dataTitle = $(el).attr('data-title');
            if (dataTitle && dataTitle.startsWith('Preview:')) {
                const href = $(el).attr('href');
                if (href) {
                    previewLinks.push(baseUrl + href);
                }
            }
        });

        console.log(`2. Found ${previewLinks.length} preview links.`);
        if (previewLinks.length === 0) {
            console.warn("   ! WARNING: No preview links found. The scraper might need updating.");
        }

        let articleCounter = 0;
        for (const link of previewLinks) {
            articleCounter++;
            console.log(`\n3. Processing article ${articleCounter}/${previewLinks.length}: ${link}`);
            try {
                const articleResponse = await fetch(link, fetchOptions);
                if (!articleResponse.ok) continue;

                const articleHtml = await articleResponse.text();
                const $$ = cheerio.load(articleHtml);

                $$('strong').each((i, strongEl) => {
                    const strongText = $$(strongEl).text().trim();
                    if (strongText.includes('possible starting lineup:')) {
                        console.log(`   ✔️ Found lineup title: "${strongText}"`);
                        const teamName = strongText.replace('possible starting lineup:', '').trim();
                        
                        let lineupNode = $$(strongEl).nextAll('p').first();
                        while(lineupNode.length && lineupNode.text().trim() === '') {
                            lineupNode = lineupNode.next('p');
                        }

                        if (lineupNode.length) {
                            const lineupText = lineupNode.text().trim();
                            console.log(`   ✅ Successfully extracted lineup: "${lineupText}"`);
                            allLineupsData.push({
                                team: teamName,
                                lineup: lineupText,
                                source_url: link
                            });
                        } else {
                            console.log(`   ❌ Found title for "${teamName}" but couldn't find the next <p> with the lineup.`);
                        }
                    }
                });
            } catch (e) {
                console.warn(`   ⚠️ Could not process article: ${link}`, e.message);
            }
        }

        console.log(`\n4. Finished processing. Total lineups found: ${allLineupsData.length}`);
        console.log("--- Lineup Scraper END ---");

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(allLineupsData),
        };

    } catch (error) {
        console.error('Function Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: `Function Error: ${error.message}` }),
        };
    }
};
