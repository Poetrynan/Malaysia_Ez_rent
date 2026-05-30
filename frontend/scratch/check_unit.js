const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = "https://legiyebykxmztaewlmhv.supabase.co";
const serviceKey = "sb_secret_6VxO87KeGefgbw1872g-Ag_uOquixV_";

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

async function main() {
  const unitId = 'df2506e8-b2cb-4c04-87e8-8db0cc78fcf4';
  const { data: unit, error } = await adminClient.from('units').select('*').eq('id', unitId).maybeSingle();
  if (error) {
    console.error('Error fetching unit:', error.message);
  } else {
    console.log('Unit record:', unit);
    if (unit) {
      const { data: comm, error: commErr } = await adminClient.from('communities').select('*').eq('id', unit.community_id).maybeSingle();
      if (commErr) {
        console.error('Error fetching community:', commErr.message);
      } else {
        console.log('Community record:', comm);
      }
    }
  }
}
main();
