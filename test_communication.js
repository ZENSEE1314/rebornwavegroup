// Test communication system functionality
const fetch = require('node-fetch');

async function testCommunication() {
  const baseUrl = 'http://localhost:5000';
  
  // Test email endpoint
  console.log('Testing email endpoint...');
  try {
    const emailResponse = await fetch(`${baseUrl}/api/admin/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=test_session'
      },
      body: JSON.stringify({
        subject: 'Test Email',
        text: 'This is a test email',
        sendToAll: true
      })
    });
    
    const emailData = await emailResponse.json();
    console.log('Email response:', emailData);
  } catch (error) {
    console.error('Email test error:', error.message);
  }
  
  // Test WhatsApp endpoint
  console.log('\nTesting WhatsApp endpoint...');
  try {
    const whatsappResponse = await fetch(`${baseUrl}/api/admin/send-whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=test_session'
      },
      body: JSON.stringify({
        message: 'Test WhatsApp message',
        sendToAll: true
      })
    });
    
    const whatsappData = await whatsappResponse.json();
    console.log('WhatsApp response:', whatsappData);
  } catch (error) {
    console.error('WhatsApp test error:', error.message);
  }
}

testCommunication();