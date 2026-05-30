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
  const urlObj = new URL(link);
  const tokenHash = urlObj.searchParams.get('token');
  
  const userClient = createClient(supabaseUrl, "sb_publishable_Uzk4ArRjDh6XkgUDak9c3A_PyyNAY8j", {
    auth: { persistSession: false }
  });
  
  const { data: sessionData, error: verifyErr } = await userClient.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'magiclink'
  });
  
  if (verifyErr) {
    console.error('Verification failed:', verifyErr.message);
    return;
  }
  
  const accessToken = sessionData.session.access_token;
  console.log('Successfully logged in! Access token obtained.');
  
  const authUserClient = createClient(supabaseUrl, "sb_publishable_Uzk4ArRjDh6XkgUDak9c3A_PyyNAY8j", {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });
  
  console.log('Querying leases...');
  const { data: leases, error: leaseErr } = await authUserClient.from('leases').select('*');
  if (leaseErr) {
    console.error('Leases query error:', leaseErr.message);
  } else {
    console.log('Leases query success! Count:', leases.length);
    console.log('Leases data:', leases);
  }
  
  console.log('Querying units...');
  const { data: units, error: unitErr } = await authUserClient.from('units').select('*');
  if (unitErr) {
    console.error('Units query error:', unitErr.message);
  } else {
    console.log('Units query success! Count:', units.length);
  }
  
  console.log('Querying communities...');
  const { data: comms, error: commErr } = await authUserClient.from('communities').select('*');
  if (commErr) {
    console.error('Communities query error:', commErr.message);
  } else {
    console.log('Communities query success! Count:', comms.length);
  }
}
main();
