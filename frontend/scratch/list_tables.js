const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = "https://legiyebykxmztaewlmhv.supabase.co";
const supabaseKey = "sb_secret_6VxO87KeGefgbw1872g-Ag_uOquixV_";
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function main() {
  const { data, error } = await supabase.rpc('get_tables'); // if rpc exists
  if (error) {
    // Fallback: query a known table or run an sql query if possible
    console.log("RPC get_tables failed, trying to query pg_catalog...");
  }
  
  // Let's try to query database tables via postgrest if there is a way, or we can use another method
  // Actually, we can fetch from postgres tables using standard queries if we have a function.
  // Wait, let's write a script to try to query some common table names:
  const tables = ['maintenance_requests', 'feedback', 'work_orders', 'users', 'leases', 'units', 'communities'];
  for (const t of tables) {
    const { data: rows, error: err } = await supabase.from(t).select('count', { count: 'exact', head: true });
    if (err) {
      console.log(`Table ${t}: Error (${err.message})`);
    } else {
      console.log(`Table ${t}: Exists, row count = ${rows ? rows.length : 0}`);
    }
  }
}
main();
