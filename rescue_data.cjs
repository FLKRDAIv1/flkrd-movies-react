const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://kqezlyhoqfelgfhdfxzf.supabase.co';
const supabaseKey = 'sb_publishable_1kQfO_UIJTrLrID6J2yXMg_Ym-NacoA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function rescueData() {
  console.log('Fetching dubbed movies...');
  const { data: movies, error: err1 } = await supabase.from('dubbed_movies').select('*');
  if (err1) console.error('Error fetching movies:', err1.message);
  else {
    fs.writeFileSync('dubbed_movies_backup.json', JSON.stringify(movies, null, 2));
    console.log(`Saved ${movies?.length || 0} movies to dubbed_movies_backup.json`);
  }

  console.log('Fetching banned IPs...');
  const { data: ips, error: err2 } = await supabase.from('banned_ips').select('*');
  if (err2) console.error('Error fetching IPs:', err2.message);
  else {
    fs.writeFileSync('banned_ips_backup.json', JSON.stringify(ips, null, 2));
    console.log(`Saved ${ips?.length || 0} banned IPs to banned_ips_backup.json`);
  }
}

rescueData();
