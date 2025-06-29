// Test token claim approval directly
const apiRequest = async (method, endpoint, body = null) => {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': 'connect.sid=s%3AAdKHeDXMaBNmwVIusnMiCncI0K866oRp.BYqQJ0XdmJfTtK6B8YMFh2qFhD%2BLfb%2FQGKOOKkOKH3o'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`http://localhost:5000${endpoint}`, options);
  const data = await response.text();
  
  console.log(`${method} ${endpoint}:`, response.status, data);
  return { status: response.status, data };
};

const testApproval = async () => {
  console.log('Testing token claim approval...');
  
  // Try to approve claim ID 10
  const result = await apiRequest('PATCH', '/api/admin/token-claims/10', {
    status: 'approved',
    adminNotes: 'Test approval from script'
  });
  
  console.log('Approval result:', result);
};

testApproval().catch(console.error);