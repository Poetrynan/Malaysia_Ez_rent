const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  "https://legiyebykxmztaewlmhv.supabase.co",
  "sb_secret_6VxO87KeGefgbw1872g-Ag_uOquixV_",
  { auth: { persistSession: false } }
);

async function main() {
  // 1. Check maintenance_requests
  const { data: reqs } = await supabase.from('maintenance_requests').select('*');
  console.log('=== maintenance_requests ===');
  console.log(JSON.stringify(reqs, null, 2));

  if (!reqs || reqs.length === 0) { console.log('NO REQUESTS FOUND'); return; }

  // 2. Get user info
  const userIds = [...new Set(reqs.map(r => r.user_id))];
  const { data: users } = await supabase.from('users').select('id, full_name, phone, unit_number').in('id', userIds);
  console.log('\n=== users ===');
  console.log(JSON.stringify(users, null, 2));

  // 3. Check leases for these users
  const { data: leases } = await supabase.from('leases').select('id, tenant_id, unit_id, status').in('tenant_id', userIds);
  console.log('\n=== leases for tenant ===');
  console.log(JSON.stringify(leases, null, 2));

  // 4. Check units
  if (leases && leases.length > 0) {
    const unitIds = leases.map(l => l.unit_id);
    const { data: units } = await supabase.from('units').select('id, room_type, community_id').in('id', unitIds);
    console.log('\n=== units ===');
    console.log(JSON.stringify(units, null, 2));

    if (units && units.length > 0) {
      const commIds = units.map(u => u.community_id);
      const { data: comms } = await supabase.from('communities').select('id, name').in('id', commIds);
      console.log('\n=== communities ===');
      console.log(JSON.stringify(comms, null, 2));
    }
  }

  // 5. Check admin_users
  const { data: admins } = await supabase.from('admin_users').select('*');
  console.log('\n=== admin_users ===');
  console.log(JSON.stringify(admins, null, 2));

  // 6. Simulate enrichment
  console.log('\n=== ENRICHMENT SIMULATION ===');
  for (const req of reqs) {
    const u = users?.find(x => x.id === req.user_id);
    const lease = leases?.find(l => l.id === req.lease_id) || leases?.find(l => l.tenant_id === req.user_id);
    console.log(`Request: user_id=${req.user_id}, lease_id=${req.lease_id}`);
    console.log(`  User found: ${!!u}, name=${u?.full_name}, unit_number=${u?.unit_number}`);
    console.log(`  Lease found: ${!!lease}, unit_id=${lease?.unit_id}`);
    if (lease) {
      const { data: unit } = await supabase.from('units').select('id, room_type, community_id').eq('id', lease.unit_id).maybeSingle();
      console.log(`  Unit found: ${!!unit}, room_type=${unit?.room_type}`);
      if (unit) {
        const { data: comm } = await supabase.from('communities').select('id, name').eq('id', unit.community_id).maybeSingle();
        console.log(`  Community found: ${!!comm}, name=${comm?.name}`);
        const parts = [comm?.name, unit?.room_type, u?.unit_number].filter(Boolean);
        console.log(`  => unitInfo would be: "${parts.join(' · ')}"`);
      }
    }
  }
}
main();
