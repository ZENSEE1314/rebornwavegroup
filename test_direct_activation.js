// Direct test of toy activation
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function testActivation() {
  console.log('Testing direct toy activation...');
  
  try {
    // Check if toy exists
    const toyResult = await pool.query('SELECT * FROM toys WHERE qr_code = $1', ['QR-3252f20aee42-a8bc494c-d782c5']);
    console.log('Toy found:', toyResult.rows[0]);
    
    if (toyResult.rows[0] && !toyResult.rows[0].is_activated) {
      // Test the activation logic
      const userId = '43157729'; // Your user ID
      
      // Update toy
      const updateResult = await pool.query(
        'UPDATE toys SET is_activated = true, owner_id = $1, purchased_by = $1, updated_at = NOW() WHERE qr_code = $2 RETURNING *',
        [userId, 'QR-3252f20aee42-a8bc494c-d782c5']
      );
      console.log('Toy updated:', updateResult.rows[0]);
      
      // Create pet
      const petResult = await pool.query(
        'INSERT INTO pets (user_id, toy_id, name, species, happiness, hunger, cleanliness, energy, current_age, growth_stage) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
        [userId, updateResult.rows[0].id, updateResult.rows[0].name, 'Doluruu', 100, 100, 100, 100, 0, 'baby']
      );
      console.log('Pet created:', petResult.rows[0]);
      
      console.log('✓ Activation completed successfully!');
    } else {
      console.log('Toy already activated or not found');
    }
  } catch (error) {
    console.error('Activation error:', error);
  } finally {
    await pool.end();
  }
}

testActivation();