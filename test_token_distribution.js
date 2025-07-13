const http = require('http');

const testTokenDistribution = async () => {
  try {
    console.log('Testing automatic daily token distribution...');
    
    // Make request to trigger manual token distribution check
    const data = JSON.stringify({
      action: 'manual_token_check'
    });

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/api/admin/manual-token-distribution`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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

testTokenDistribution();