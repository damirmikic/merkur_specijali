const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  const API_ENDPOINT = "https://sports-api.cloudbet.com/pub/v2/odds/events?sport=basketball&from=1756122625&to=1757497825&live=false&markets=basketball.moneyline&markets=basketball.player_points&markets=basketball.totals&players=true&limit=100";
  
  // It's best practice to store sensitive keys as environment variables.
  const API_KEY = process.env.API_KEY;
    const response = await fetch(API_ENDPOINT, {
      headers: {
        "Accept": "application/json",
        "X-API-Key": API_KEY // Added your API Key here
      }
    });

    if (!response.ok) {
      // Handle non-successful responses
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: `API request failed with status ${response.status}` })
      };
    }

    const data = await response.json();
    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch data' })
    };
  }
};
