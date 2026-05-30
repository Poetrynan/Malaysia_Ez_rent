const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = "https://legiyebykxmztaewlmhv.supabase.co";
const serviceKey = "sb_secret_6VxO87KeGefgbw1872g-Ag_uOquixV_";

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

async function main() {
  const { data: reqs, error } = await adminClient.from('maintenance_requests').select('*');
  if (error) {
    console.error('Error fetching maintenance requests:', error.message);
  } else {
    console.log('Total maintenance requests:', reqs.length);
    console.log('Records:', reqs);
  }
}
main();
