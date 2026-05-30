const { createClient } = require('@supabase/supabase-js');

// Use SERVICE ROLE key to insert (bypasses RLS) and verify
const supabase = createClient(
  "https://legiyebykxmztaewlmhv.supabase.co",
  "sb_secret_6VxO87KeGefgbw1872g-Ag_uOquixV_",
  { auth: { persistSession: false } }
);

async function main() {
  // Try inserting a test maintenance request
  const testUserId = '87d1399b-1cfb-4445-a98d-0abfeda2f990'; // 冯诗楠
  
  console.log('1. Inserting test maintenance request...');
  const { data: inserted, error: insertErr } = await supabase.from('maintenance_requests').insert({
    user_id: testUserId,
    lease_id: null,
    category: 'Aircon',
    content: 'DEBUG TEST - please delete',
    status: 'pending'
  }).select();
  
  if (insertErr) {
    console.log('INSERT ERROR:', insertErr);
  } else {
    console.log('INSERT SUCCESS:', JSON.stringify(inserted, null, 2));
  }
  
  // Verify it's there
  console.log('\n2. Verifying maintenance_requests...');
  const { data: reqs, error: reqErr } = await supabase.from('maintenance_requests').select('*');
  console.log('Rows:', reqs?.length, 'Error:', reqErr?.message || 'none');
  if (reqs) console.log(JSON.stringify(reqs, null, 2));

  // Now check leases for this user
  console.log('\n3. Checking leases for user...');
  const { data: leases } = await supabase.from('leases').select('id, tenant_id, unit_id, status').eq('tenant_id', testUserId);
  console.log('Leases:', JSON.stringify(leases, null, 2));

  // Check units
  if (leases && leases.length > 0) {
    const unitId = leases[0].unit_id;
    const { data: unit } = await supabase.from('units').select('id, room_type, community_id').eq('id', unitId).maybeSingle();
    console.log('\n4. Unit:', JSON.stringify(unit, null, 2));
    
    if (unit) {
      const { data: comm } = await supabase.from('communities').select('id, name').eq('id', unit.community_id).maybeSingle();
      console.log('5. Community:', JSON.stringify(comm, null, 2));
      
      const user = { unit_number: 'A-12-3' };
      const parts = [comm?.name, unit.room_type, user.unit_number].filter(Boolean);
      console.log('\n=== EXPECTED unitInfo ===');
      console.log(parts.join(' · '));
    }
  }

  // Clean up test data
  if (inserted && inserted[0]) {
    await supabase.from('maintenance_requests').delete().eq('id', inserted[0].id);
    console.log('\nCleaned up test row');
  }
}
main();
