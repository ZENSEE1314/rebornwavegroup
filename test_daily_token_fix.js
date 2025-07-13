const http = require('http');

const testDailyTokenSystem = async () => {
  try {
    console.log('Testing daily token system fix...');
    
    // Test pet ID 16 which qualifies for daily token
    const petId = 16;
    const userId = 'bspsDLxUJTQqbox6vGjH5';
    
    console.log(`Testing pet ${petId} for user ${userId}`);
    
    const data = JSON.stringify({
      petId: petId,
      userId: userId
    });

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/api/pets/${petId}/check-daily-token`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer mock-session-${userId}`, // Mock auth for testing
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        console.log('Response Status:', res.statusCode);
        console.log('Response Body:', body);
        
        try {
          const response = JSON.parse(body);
          if (response.tokenAwarded) {
            console.log('✅ Daily token system working! Token awarded successfully.');
          } else {
            console.log('❌ Token not awarded. Reason:', response.message);
          }
        } catch (e) {
          console.log('❌ Failed to parse response:', body);
        }
      });
    });

    req.on('error', (error) => {
      console.error('Request error:', error);
    });

    req.write(data);
    req.end();

  } catch (error) {
    console.error('Test failed:', error);
  }
};

testDailyTokenSystem();