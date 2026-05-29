const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = "https://legiyebykxmztaewlmhv.supabase.co";
const supabaseKey = "sb_secret_6VxO87KeGefgbw1872g-Ag_uOquixV_";
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function main() {
  const { data, error } = await supabase.from('communities').select('*');
  console.log('--- communities ---');
  console.log(data);
  if (error) console.error(error);
}
main();
