const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = "https://legiyebykxmztaewlmhv.supabase.co";
const serviceKey = "sb_secret_6VxO87KeGefgbw1872g-Ag_uOquixV_";

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

async function main() {
  const adminEmail = 'poetrynan666@gmail.com';
  
  console.log(`Generating session link for admin: ${adminEmail}...`);
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: adminEmail
  });
  
  if (error) {
    console.error('Error generating link:', error.message);
    return;
  }
  
  const link = data.properties.action_link;
  console.log('Action link:', link);
  
  const urlObj = new URL(link);
  const token = urlObj.searchParams.get('token');
  
  const userClient = createClient(supabaseUrl, "sb_publishable_Uzk4ArRjDh6XkgUDak9c3A_PyyNAY8j", {
    auth: { persistSession: false }
  });
  
  // Try 'email' type as required by Supabase JS SDK for magiclinks
  console.log(`Verifying token with type 'email'...`);
  const { data: sessionData, error: verifyErr } = await userClient.auth.verifyOtp({
    email: adminEmail,
    token: token,
    type: 'email'
  });
  
  if (verifyErr) {
    console.error('Verification with email type failed:', verifyErr.message);
    return;
  }
  
  const accessToken = sessionData.session.access_token;
  console.log('Successfully logged in as Admin! Token obtained.');
  
  const authUserClient = createClient(supabaseUrl, "sb_publishable_Uzk4ArRjDh6XkgUDak9c3A_PyyNAY8j", {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });
  
  console.log('1. Trying to select * from leases as Admin user...');
  const { data: leases, error: leaseErr } = await authUserClient.from('leases').select('*');
  if (leaseErr) {
    console.error('Leases query error:', leaseErr.message);
  } else {
    console.log('Leases query success! Count:', leases.length);
    console.log('Leases:', leases);
  }
}
main();
