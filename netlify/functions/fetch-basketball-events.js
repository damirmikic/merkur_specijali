exports.handler = async function(event, context) {
  // Najbolja praksa je čuvanje osetljivih ključeva kao environment variable
  const API_KEY = process.env.CLOUDBET_API_KEY || 'eyJhbGciOiJSUzI1NiIsImtpZCI6IkhKcDkyNnF3ZXBjNnF3LU9rMk4zV05pXzBrRFd6cEdwTzAxNlRJUjdRWDAiLCJ0eXAiOiJKV1QifQ.eyJhY2Nlc3NfdGllciI6InRyYWRpbmciLCJleHAiOjIwNjE1Mzc1MDIsImlhdCI6MTc0NjE3NzUwMiwianRpIjoiNTU1ODk0NjgtZjJhZi00ZGQ3LWE3MTQtZjNiNjgyMWU4OGRkIiwic3ViIjoiOGYwYTk5YTEtNTFhZi00YzJlLWFlNDUtY2MxNjgwNDVjZTc3IiwidGVuYW50IjoiY2xvdWRiZXQiLCJdWlkIjoiOGYwYTk5YTEtNTFhZi00YzJlLWFlNDUtY2MxNjgwNDVjZTc3In0.BW_nXSwTkxTI7C-1UzgxWLnNzo9Bo1Ed8hI9RfVLnrJa6sfsMyvQ1NrtT5t6i_emwhkRHU1hY-9i6c2c5AI4fc2mRLSNBujvrfbVHX67uB58E8TeSOZUBRi0eqfLBL7sYl1JNPZzhFkDBCBNFJZJpn40FIjrtIiPd-G5ClaaSMRWrFUDiwA1NmyxHSfkfRpeRSnfk15qck7zSIeNeITzPbD7kZGDIeStmcHuiHfcQX3NaHaI0gyw60wmDgan83NpYQYRVLQ9C4icbNhel4n5H5FGFAxQS8IcvynqV8f-vz2t4BRGuYXBU8uhdYKgezhyQrSvX6NpwNPBJC8CWo2fA';

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
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: `API zahtev nije uspeo sa statusom ${response.status}` })
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
