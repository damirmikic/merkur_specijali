const fetch = require('node-fetch');
const cheerio = require('cheerio');

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
    };

    const baseUrl = "http://www.sportsmole.co.uk";
    const initialUrl = `${baseUrl}/index_rhs.html?${new Date().getTime()}`;
    const allLineupsData = [];

    try {
        console.log("Fetching initial page to get links...");
        const response = await fetch(initialUrl);
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

        console.log(`Found ${previewLinks.length} preview links. Fetching lineups...`);

        // Process each link to get lineup data
        for (const link of previewLinks) {
            try {
                const articleResponse = await fetch(link);
                if (!articleResponse.ok) continue;

                const articleHtml = await articleResponse.text();
                const $$ = cheerio.load(articleHtml);

                $$('strong').each((i, strongEl) => {
                    const strongText = $$(strongEl).text().trim();
                    if (strongText.includes('possible starting lineup:')) {
                        const teamName = strongText.replace('possible starting lineup:', '').trim();
                        
                        // Find the next non-empty <p> tag
                        let lineupNode = $$(strongEl).nextAll('p').first();
                        while(lineupNode.length && lineupNode.text().trim() === '') {
                            lineupNode = lineupNode.next('p');
                        }

                        if (lineupNode.length) {
                            allLineupsData.push({
                                team: teamName,
                                lineup: lineupNode.text().trim(),
                                source_url: link
                            });
                        }
                    }
                });
            } catch (e) {
                console.warn(`Could not process article: ${link}`, e.message);
            }
        }

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
