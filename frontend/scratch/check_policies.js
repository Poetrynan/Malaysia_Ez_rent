const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = "https://legiyebykxmztaewlmhv.supabase.co";
const supabaseKey = "sb_secret_6VxO87KeGefgbw1872g-Ag_uOquixV_";
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function main() {
  const { data, error } = await supabase.rpc('get_policies'); // if exists
  
  // Or we can query pg_policies using an sql function if we have pg_catalog view access.
  // Wait, let's query pg_policies using supabase.rpc or a direct select if we have a custom function.
  // If not, we can write an sql query and try to run it.
  // Wait! Do we have a sql query running capability?
  // Let's check: we can use a postgres client if we have pg, but we don't have database credentials except Supabase REST.
  // Let's try to query pg_policies via supabase:
  const { data: policies, error: polErr } = await supabase.from('pg_policies').select('*'); // pg_policies is usually not exposed to postgrest
  if (polErr) {
    console.log("pg_policies query failed:", polErr.message);
  } else {
    console.log(policies);
  }
}
main();
