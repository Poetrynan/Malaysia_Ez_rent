const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  "https://legiyebykxmztaewlmhv.supabase.co",
  "sb_secret_6VxO87KeGefgbw1872g-Ag_uOquixV_",
  { auth: { persistSession: false } }
);

async function main() {
  // Let's run a query to inspect active policies on leases and payment_records
  const { data, error } = await supabase.rpc('inspect_policies'); // We might not have this rpc
  
  // Alternative: select from pg_policies via standard sql (since we are using service_role, we can run direct SQL commands if we use a helper SQL executor function, but we don't have one).
  // Let's write a simple query checking if there are policies on leases table.
  // Wait, is there any error in Supabase log when we try to fetch?
  // Let's check leases directly using the admin user session JWT!
  // We can simulate the admin user log in using their ID!
  console.log('Simulating admin log in...');
  
  // Sign in as admin to test if admin can read leases via RLS:
  // Since we have service_role, we can create a client and sign in by creating a custom JWT or we can just try to fetch leases with admin role bypass.
  // Let's check if the policy exists by trying to read pg_policies using custom query if we can:
  // But wait, can we write a Postgres query using supabase.rpc or check the migrations table?
  const { data: schema_migrations } = await supabase.from('schema_migrations').select('*');
  console.log('Schema Migrations applied:', schema_migrations);
}
main();
