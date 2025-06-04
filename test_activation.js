// Test QR code activation
const http = require('http');

const data = JSON.stringify({
  qrCode: "QR-3252f20aee42-a8bc494c-d782c5"
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/toys/scan',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`statusCode: ${res.statusCode}`);
  console.log(`headers:`, res.headers);

  res.on('data', (d) => {
    console.log('Response:', d.toString());
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(data);
req.end();