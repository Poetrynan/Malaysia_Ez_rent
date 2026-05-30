const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = "https://legiyebykxmztaewlmhv.supabase.co";
const serviceKey = "sb_secret_6VxO87KeGefgbw1872g-Ag_uOquixV_";

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

async function main() {
  const { data: leases, error } = await adminClient.from('leases').select('*');
  if (error) {
    console.error('Error fetching total leases:', error.message);
  } else {
    console.log('Total leases in table:', leases.length);
    console.log('Lease records:', leases);
  }
}
main();
