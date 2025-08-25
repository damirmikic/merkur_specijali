exports.handler = async function(event, context) {
  // Korišćenje istog API ključa kao za fudbal
  const API_KEY = process.env.API_KEY;

  if (!API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API ključ nije konfigurisan u Netlify environment variables.' }),
    };
  }

  // Izračunavanje vremenskih oznaka za naredna 3 dana
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const threeDaysFromNowInSeconds = nowInSeconds + (3 * 24 * 60 * 60);

  const API_ENDPOINT = `https://sports-api.cloudbet.com/pub/v2/odds/events?sport=basketball&from=${nowInSeconds}&to=${threeDaysFromNowInSeconds}&live=false&markets=basketball.moneyline&markets=basketball.player_points&markets=basketball.totals&players=true&limit=100`;

  try {
    const response = await fetch(API_ENDPOINT, {
      headers: {
        "Accept": "application/json",
        "X-API-Key": API_KEY
      }
    });

    if (!response.ok) {
      // Vraća detaljniju poruku o grešci ako API vrati grešku
      const errorBody = await response.text();
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: `API zahtev nije uspeo sa statusom ${response.status}: ${errorBody}` })
      };
    }

    const data = await response.json();
    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error("Greška pri preuzimanju:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Nije uspelo preuzimanje podataka' })
    };
  }
};
