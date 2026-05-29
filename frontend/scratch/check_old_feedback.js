const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = "https://legiyebykxmztaewlmhv.supabase.co";
const supabaseKey = "sb_secret_6VxO87KeGefgbw1872g-Ag_uOquixV_";
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function main() {
  const { data: feedback, error } = await supabase.from('feedback').select('*');
  console.log('--- feedback table ---');
  if (error) {
    console.error('Error fetching from feedback:', error.message);
  } else {
    console.log(feedback);
  }
}
main();
