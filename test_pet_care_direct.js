const fetch = require('node-fetch');

async function testPetCare() {
  try {
    // Test the pet care endpoint directly
    console.log('Testing pet care endpoint...');
    
    const response = await fetch('http://localhost:5000/api/pets/1/care/fed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=s%3AExample-Session-ID.signature'
      },
      body: JSON.stringify({})
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers.raw());
    
    const text = await response.text();
    console.log('Response body:', text);
    
  } catch (error) {
    console.error('Error testing pet care:', error);
  }
}

testPetCare();