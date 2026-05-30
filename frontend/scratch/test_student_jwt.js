const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const supabaseUrl = "https://legiyebykxmztaewlmhv.supabase.co";
const serviceKey = "sb_secret_6VxO87KeGefgbw1872g-Ag_uOquixV_";

// We will sign a JWT token ourselves using the Supabase JWT secret (which is the service role key! Wait, in Supabase local, the JWT secret is the API key, but in production it is a custom secret. However, we can use the supabase client to sign a token or we can just use the admin.generateLink or similar.
// Wait! Supabase GoTrue admin API allows us to sign in or get user session directly.
// Let's check if we can get a session by using adminClient.auth.admin.getUserById and generating a token, or we can just use supabase.auth.signInWithOtp.
// Wait, is there an easier way?
// Yes! GoTrue admin API has a method `auth.admin.generateLink` which returns a redirect link containing the access_token in the URL hash! We can extract it!
const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

async function main() {
  const studentEmail = 'fyt747039290@gmail.com'; // 冯诗楠
  const studentId = '87d1399b-1cfb-4445-a98d-0abfeda2f990';
  
  console.log(`Generating login link for student: ${studentEmail}...`);
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: studentEmail
  });
  
  if (error) {
    console.error('Error generating link:', error.message);
    return;
  }
  
  // The link looks like: http://localhost:3000/auth/callback?tokenhash=...
  // We can also extract the token directly if GoTrue returns it, or we can just use the token_hash to sign in.
  // Actually, we can generate a sign-in token using supabase.auth.signInWithOtp and then verify the OTP.
  // But wait, there is an even simpler way to query the database!
  // In Supabase, the JWT secret is not the service role key, but we can query PostgreSQL system catalogs via supabase if we create a function.
  // Wait, let's write a script to check if we can call supabase.rpc('get_policies') or see if we can create a temporary table.
  // Let's check the table: we can just check if the student can read leases table.
  // Wait! In the student's browser, if they go to "My Lease" tab, does it show their lease now?
  // Let's check!
}
main();
