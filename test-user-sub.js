async function testUserSub() {
  const res = await fetch('http://localhost:3000/api/user/subscription', {
    headers: {
      'Cookie': 'strap_session_user=user-1795068178798'
    }
  });
  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Data:', JSON.stringify(data, null, 2));
}

testUserSub();
