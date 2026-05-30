const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  "https://legiyebykxmztaewlmhv.supabase.co",
  "sb_secret_6VxO87KeGefgbw1872g-Ag_uOquixV_",
  { auth: { persistSession: false } }
);

async function main() {
  const { data: reqs, error } = await supabase.from('maintenance_requests').select('*');
  console.log('Error:', error);
  console.log('Current maintenance_requests in DB:', JSON.stringify(reqs, null, 2));
}
main();
