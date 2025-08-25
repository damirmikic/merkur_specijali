const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  // Calculate timestamps
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const threeDaysFromNowInSeconds = nowInSeconds + (3 * 24 * 60 * 60); // 3 days * 24 hours * 60 minutes * 60 seconds

  // Dynamically construct the API URL
  const API_ENDPOINT = `https://sports-api.cloudbet.com/pub/v2/odds/events?sport=basketball&from=${nowInSeconds}&to=${threeDaysFromNowInSeconds}&live=false&markets=basketball.moneyline&markets=basketball.player_points&markets=basketball.totals&players=true&limit=100`;
  
  // It's best practice to store sensitive keys as environment variables
  const API_KEY = process.env.API_KEY;
  response = await fetch(API_ENDPOINT, {
      headers: {
        "Accept": "application/json",
        "X-API-Key": API_KEY
      }
    });

    if (!response.ok) {
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
    console.error("Fetch error:", error); // Log the error for debugging
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch data' })
    };
  }
};
