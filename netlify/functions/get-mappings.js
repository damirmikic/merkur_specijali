const { createClient } = require('@supabase/supabase-js');

// Ova funkcija preuzima sva postojeća mapiranja iz vaše Supabase baze.
exports.handler = async (event, context) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    // Koristimo ispravno ime varijable koje Netlify integracija kreira.
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // SQL upit: SELECT canonical_name, aliases FROM team_mappings
        const { data, error } = await supabase
            .from('team_mappings')
            .select('canonical_name, aliases');

        if (error) throw error;

        // Preformatiranje podataka iz baze u JSON objekat koji frontend očekuje
        const mappings = data.reduce((acc, item) => {
            acc[item.canonical_name] = item.aliases;
            return acc;
        }, {});

        return {
            statusCode: 200,
            body: JSON.stringify(mappings),
        };
    } catch (error) {
        console.error("Greška pri preuzimanju mapiranja sa Supabase:", error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
