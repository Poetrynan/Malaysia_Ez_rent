const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = "https://legiyebykxmztaewlmhv.supabase.co";
const supabaseKey = "sb_secret_6VxO87KeGefgbw1872g-Ag_uOquixV_";
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function main() {
  const { data: requests, error: reqErr } = await supabase.from('maintenance_requests').select('*');
  console.log('--- maintenance_requests ---');
  console.log(requests);
  if (reqErr) console.error(reqErr);

  const { data: leases, error: leaseErr } = await supabase.from('leases').select('*');
  console.log('--- leases ---');
  console.log(leases);
  if (leaseErr) console.error(leaseErr);

  const { data: users, error: userErr } = await supabase.from('users').select('*');
  console.log('--- users ---');
  console.log(users);
  if (userErr) console.error(userErr);
}
main();
