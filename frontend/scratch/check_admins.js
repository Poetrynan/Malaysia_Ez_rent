const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  "https://legiyebykxmztaewlmhv.supabase.co",
  "sb_secret_6VxO87KeGefgbw1872g-Ag_uOquixV_",
  { auth: { persistSession: false } }
);

async function main() {
  const { data: admins, error: err1 } = await supabase.from('admin_users').select('*');
  console.log('Admin Users in DB:', admins);
  
  const { data: authUsers, error: err2 } = await supabase.auth.admin.listUsers();
  if (err2) {
    console.log('List auth users error:', err2.message);
  } else {
    console.log('Auth Users:', authUsers.users.map(u => ({ id: u.id, email: u.email })));
  }
}
main();
