const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = "https://legiyebykxmztaewlmhv.supabase.co";
const supabaseKey = "sb_secret_6VxO87KeGefgbw1872g-Ag_uOquixV_";
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function main() {
  const tables = ['maintenance_requests', 'feedback', 'work_orders', 'users', 'leases', 'units', 'communities'];
  for (const t of tables) {
    const { count, error: err } = await supabase.from(t).select('*', { count: 'exact', head: true });
    if (err) {
      console.log(`Table ${t}: Error (${err.message})`);
    } else {
      console.log(`Table ${t}: Exists, row count = ${count}`);
    }
  }
}
main();
