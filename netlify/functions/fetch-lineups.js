const fetch = require('node-fetch');
const cheerio = require('cheerio');

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
    };

    const fetchOptions = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 8000 // 8-second timeout for each individual fetch
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
            console.warn("   ! WARNING: No preview links found.");
            return { statusCode: 200, headers, body: JSON.stringify([]) };
        }

        console.log(`3. Fetching all ${previewLinks.length} articles in parallel...`);
        const fetchPromises = previewLinks.map(link => fetch(link, fetchOptions));
        const results = await Promise.allSettled(fetchPromises);

        let articleCounter = 0;
        for (const result of results) {
            articleCounter++;
            if (result.status === 'rejected') {
                console.warn(`   - Article ${articleCounter} failed to fetch: ${result.reason}`);
                continue;
            }

            const articleResponse = result.value;
            if (!articleResponse.ok) {
                console.warn(`   - Article ${articleCounter} at ${articleResponse.url} returned status ${articleResponse.status}`);
                continue;
            }

            try {
                const articleHtml = await articleResponse.text();
                const $$ = cheerio.load(articleHtml);

                $$('#article_body strong').each((i, strongEl) => {
                    const strongText = $$(strongEl).text().trim();
                    if (strongText.includes('possible starting lineup:')) {
                        const teamName = strongText.replace('possible starting lineup:', '').trim();
                        
                        // New robust logic: Find all subsequent <p> tags and get the first one with content.
                        const lineupNode = $$(strongEl).nextAll('p').filter((idx, p) => {
                            return $$(p).text().trim().length > 0;
                        }).first();

                        if (lineupNode.length > 0) {
                            const lineupText = lineupNode.text().trim();
                            // Final check that it looks like a lineup
                            if (lineupText.includes(';') || lineupText.includes(',')) {
                                console.log(`   -> Found Lineup for "${teamName}"`);
                                allLineupsData.push({
                                    team: teamName,
                                    lineup: lineupText,
                                    source_url: articleResponse.url
                                });
                            }
                        }
                    }
                });
            } catch (e) {
                console.warn(`   - Could not process article HTML for ${articleResponse.url}`, e.message);
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
