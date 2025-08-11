/**
 * Netlify serverless function to securely fetch sports events data from the Cloudbet API.
 * This function acts as a proxy to hide the API key from the frontend.
 */
exports.handler = async (event, context) => {
  // Get the secret API key from the Netlify environment variables
  const API_KEY = process.env.API_KEY;
  // Check if the API key is configured in the Netlify environment
  if (!API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API key is not configured.' }),
    };
  }
  
  // Set up the time window for the API call (from now to 96 hours in the future)
  const from = Math.floor(Date.now() / 1000);
  const to = from + (96 * 3600); // 96 hours from now

  // Construct the API URL with all the required markets for both players and specials tabs
  const API_URL = `https://sports-api.cloudbet.com/pub/v2/odds/events?sport=soccer&from=${from}&to=${to}&live=false&markets=soccer.match_odds&markets=soccer.total_goals&markets=soccer.anytime_goalscorer&markets=soccer.both_teams_to_score&markets=soccer.total_corners&markets=soccer.corner_handicap&players=true&limit=100`;

  try {
    // Fetch data from the Cloudbet API
    const response = await fetch(API_URL, {
      headers: { 'X-API-Key': API_KEY }
    });

    // If the response from the API is not successful, forward the error
    if (!response.ok) {
      const errorBody = await response.text();
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: `API Error: ${response.statusText}`, details: errorBody }),
      };
    }

    // Parse the JSON response from the API
    const data = await response.json();

    // Return the fetched data to the frontend
    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };

  } catch (error) {
    // Handle any unexpected errors during the fetch operation
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Function Error: ${error.message}` }),
    };
  }
};
