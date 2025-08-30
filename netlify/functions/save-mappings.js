const { createClient } = require('@supabase/supabase-js');

// Ova funkcija čuva nova mapiranja u vašu Supabase bazu.
// Prvo obriše sve stare unose, a zatim upiše nove.
exports.handler = async (event, context) => {
    // Dozvoljavamo samo POST zahteve za upisivanje
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    // Koristimo ispravno ime varijable
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        const mappings = JSON.parse(event.body);

        // SQL upit: DELETE FROM team_mappings
        const { error: deleteError } = await supabase
            .from('team_mappings')
            .delete()
            .neq('id', 0); // Uslov da se obrišu svi redovi

        if (deleteError) throw deleteError;

        // Priprema novih redova za unos u bazu
        const rowsToInsert = Object.entries(mappings).map(([canonical_name, aliases]) => ({
            canonical_name,
            aliases,
        }));
        
        // SQL upit: INSERT INTO team_mappings (...) VALUES (...)
        const { error: insertError } = await supabase
            .from('team_mappings')
            .insert(rowsToInsert);
            
        if (insertError) throw insertError;

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Mapiranja uspešno sačuvana na Supabase!' }),
        };
    } catch (error) {
        console.error("Greška pri čuvanju mapiranja na Supabase:", error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
