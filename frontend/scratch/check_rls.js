const { createClient } = require('@supabase/supabase-js');

// Use anon key to simulate browser client (RLS applies)
const anonSupabase = createClient(
  "https://legiyebykxmztaewlmhv.supabase.co",
  "sb_publishable_Uzk4ArRjDh6XkgUDak9c3A_PyyNAY8j",
  { auth: { persistSession: false } }
);

// Use service role key (bypasses RLS)
const adminSupabase = createClient(
  "https://legiyebykxmztaewlmhv.supabase.co",
  "sb_secret_6VxO87KeGefgbw1872g-Ag_uOquixV_",
  { auth: { persistSession: false } }
);

async function main() {
  const tables = ['maintenance_requests', 'users', 'leases', 'units', 'communities', 'admin_users', 'payment_records'];
  
  console.log('=== RLS Detection: comparing anon vs service_role results ===\n');
  
  for (const t of tables) {
    const { count: srvCount } = await adminSupabase.from(t).select('*', { count: 'exact', head: true });
    const { count: anonCount, error: anonErr } = await anonSupabase.from(t).select('*', { count: 'exact', head: true });
    
    const rlsActive = (srvCount > 0 && anonCount === 0) || anonErr;
    console.log(`${t}: service_role=${srvCount}, anon=${anonCount}${anonErr ? ' ERROR: ' + anonErr.message : ''} => RLS blocking: ${rlsActive ? '⚠️ YES' : '✅ No'}`);
  }
}
main();
