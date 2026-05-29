const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = "https://legiyebykxmztaewlmhv.supabase.co";
const supabaseKey = "sb_secret_6VxO87KeGefgbw1872g-Ag_uOquixV_";
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function main() {
  const { data: requests, error: reqErr } = await supabase.from('maintenance_requests').select('*');
  console.log('--- maintenance_requests ---');
  console.log(JSON.stringify(requests, null, 2));
  if (reqErr) console.error(reqErr);
}
main();
