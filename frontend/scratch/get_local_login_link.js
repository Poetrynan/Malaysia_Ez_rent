const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = "https://legiyebykxmztaewlmhv.supabase.co";
const serviceKey = "sb_secret_6VxO87KeGefgbw1872g-Ag_uOquixV_";

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

async function main() {
  const adminEmail = 'poetrynan666@gmail.com';
  
  console.log(`Generating local login link for admin: ${adminEmail}...`);
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: adminEmail,
    options: {
      redirectTo: 'http://localhost:3000/'
    }
  });
  
  if (error) {
    console.error('Error generating link:', error.message);
  } else {
    console.log('--- LOCAL LOGIN LINK ---');
    console.log(data.properties.action_link);
    console.log('------------------------');
  }
}
main();
