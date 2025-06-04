const { Pool } = require('pg');

async function testQRActivation() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Test 1: Check if toy exists and its current state
    console.log('=== Test 1: Check toy status ===');
    const toyCheck = await pool.query(
      'SELECT id, name, qr_code, owner_id, purchased_by, is_activated FROM toys WHERE qr_code = $1',
      ['QR-254184720f56-751bee5b-268e5e']
    );
    console.log('Toy status:', toyCheck.rows[0]);
    
    // Test 2: Direct activation via SQL
    console.log('\n=== Test 2: Direct SQL activation ===');
    const directUpdate = await pool.query(`
      UPDATE toys 
      SET owner_id = $1, purchased_by = $1, is_activated = true, updated_at = NOW() 
      WHERE qr_code = $2 
      RETURNING id, name, owner_id, is_activated
    `, ['43157729', 'QR-254184720f56-751bee5b-268e5e']);
    console.log('Direct SQL result:', directUpdate.rows[0]);
    
    // Test 3: Make HTTP request to activation endpoint
    console.log('\n=== Test 3: HTTP API test ===');
    console.log('You need to test the HTTP endpoint manually with authentication');
    console.log('curl -X POST http://localhost:5000/api/toys/scan \\');
    console.log('  -H "Content-Type: application/json" \\');
    console.log('  -H "Cookie: [your-session-cookie]" \\');
    console.log('  -d \'{"qrCode": "QR-254184720f56-751bee5b-268e5e"}\'');
    
  } catch (error) {
    console.error('Test error:', error.message);
  } finally {
    await pool.end();
  }
}

testQRActivation();