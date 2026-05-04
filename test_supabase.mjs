const supabaseUrl = "https://fmahzalaxbkmhbpcally.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtYWh6YWxheGJrbWhicGNhbGx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NjQ0NDYsImV4cCI6MjA5MzM0MDQ0Nn0.d4y612cjG6bSHL6vNK1YdxFmKjCJ6YpDIV7oG9XFis4";

async function test() {
    const res = await fetch(`${supabaseUrl}/rest/v1/kurdish_cc_registry?select=*`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    console.log("Fetch Table Status:", res.status);
    console.log("Fetch Data:", await res.text());

    const insertRes = await fetch(`${supabaseUrl}/rest/v1/kurdish_cc_registry`, {
        method: 'POST',
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify({
            tmdb_id: 1202549,
            media_type: 'movie',
            title: 'The Well',
            poster_path: '/c5kGttzE6QGq10vDCRFj2tJdI3w.jpg'
        })
    });
    console.log("Insert Status:", insertRes.status);
    console.log("Insert Data:", await insertRes.text());
}
test();
