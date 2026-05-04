const supabaseUrl = "https://fmahzalaxbkmhbpcally.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtYWh6YWxheGJrbWhicGNhbGx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NjQ0NDYsImV4cCI6MjA5MzM0MDQ0Nn0.d4y612cjG6bSHL6vNK1YdxFmKjCJ6YpDIV7oG9XFis4";

async function insert(m) {
    await fetch(`${supabaseUrl}/rest/v1/kurdish_cc_registry`, {
        method: 'POST',
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify(m)
    });
}

async function test() {
    await insert({ tmdb_id: 823464, media_type: 'movie', title: 'Godzilla x Kong: The New Empire', poster_path: '/tMefBSflR6PGQLvLuPEHZotAKhQ.jpg' });
    await insert({ tmdb_id: 653346, media_type: 'movie', title: 'Kingdom of the Planet of the Apes', poster_path: '/gKkl37BQuEPA924PZ6QpTcCPdaf.jpg' });
    await insert({ tmdb_id: 693134, media_type: 'movie', title: 'Dune: Part Two', poster_path: '/1pdfLvkbY9ohJlCjQH2JGjjc91p.jpg' });
    await insert({ tmdb_id: 1011985, media_type: 'movie', title: 'Kung Fu Panda 4', poster_path: '/kDp1vUBnMpe8ak4rjgl3cLELqjU.jpg' });
    await insert({ tmdb_id: 748783, media_type: 'movie', title: 'The Garfield Movie', poster_path: '/p6AbOJvMQhBmffd0PIv0u8ghWeY.jpg' });
    console.log("Done");
}
test();
