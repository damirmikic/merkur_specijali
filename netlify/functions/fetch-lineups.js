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

    const baseUrl = "https://www.sportsmole.co.uk";
    const initialUrl = `${baseUrl}/football/previews/`;
    const allLineupsData = [];

    try {
        console.log("--- Lineup Scraper START ---");
        console.log(`1. Fetching initial page: ${initialUrl}`);

        const response = await fetch(initialUrl, fetchOptions);
        if (!response.ok) throw new Error(`Failed to fetch initial page: ${response.statusText}`);
        
        const html = await response.text();
        const $ = cheerio.load(html);
        
        const previewLinks = [];
        $('div.previews a').each((i, el) => {
            const href = $(el).attr('href');
            if (href && href.includes('/preview/') && href.endsWith('.html')) {
                const fullUrl = new URL(href, baseUrl).href;
                if (!previewLinks.includes(fullUrl)) {
                    previewLinks.push(fullUrl);
                }
            }
        });

        console.log(`2. Found ${previewLinks.length} unique preview links.`);
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

                $$('#article_body strong').each((i, strongEl) => {
                    const strongText = $$(strongEl).text().trim();
                    if (strongText.includes('possible starting lineup:')) {
                        console.log(`   ✔️ Found lineup title: "${strongText}"`);
                        const teamName = strongText.replace('possible starting lineup:', '').trim();
                        
                        let currentElement = $$(strongEl);
                        let lineupText = null;

                        // Loop through subsequent elements to find the first non-empty paragraph with a semicolon
                        while (currentElement.length) {
                            currentElement = currentElement.next();
                            if (!currentElement.length) break;

                            if (currentElement.is('p')) {
                                const text = currentElement.text().trim();
                                if (text && text.includes(';')) {
                                    lineupText = text;
                                    break; 
                                }
                            }
                            // Stop if we hit another strong tag, indicating a new section
                            if (currentElement.is('strong')) {
                                break;
                            }
                        }

                        if (lineupText) {
                            console.log(`   ✅ Successfully extracted lineup for "${teamName}": "${lineupText}"`);
                            allLineupsData.push({
                                team: teamName,
                                lineup: lineupText,
                                source_url: link
                            });
                        } else {
                            console.log(`   ❌ Found title for "${teamName}" but couldn't find the lineup paragraph.`);
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
