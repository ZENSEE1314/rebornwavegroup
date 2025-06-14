import bcrypt from 'bcryptjs';

// Test password verification with existing user data
async function testPasswordVerification() {
  // Test with the existing test@example.com user's hash
  const storedHash = '$2b$10$kutwh4lvAs9hDJq.wfuBvugAmnUw9IoSlT0mTcpkD5/ijbpL0guoO';
  
  // Common test passwords to try
  const testPasswords = ['password', 'test123', 'password123', 'test', '123456'];
  
  console.log('Testing password verification...');
  
  for (const pwd of testPasswords) {
    const isValid = await bcrypt.compare(pwd, storedHash);
    console.log(`Password "${pwd}": ${isValid ? 'VALID' : 'INVALID'}`);
  }
  
  // Also test creating a new hash for "password123" to see the process
  console.log('\nCreating new hash for "password123":');
  const newHash = await bcrypt.hash('password123', 10);
  console.log('New hash:', newHash);
  
  const verifyNew = await bcrypt.compare('password123', newHash);
  console.log('Verification of new hash:', verifyNew);
}

testPasswordVerification().catch(console.error);