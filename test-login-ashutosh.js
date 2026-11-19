async function testLoginAshutosh() {
  const res = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ashutoshkkr6200@gmail.com', password: 'password123' })
  });
  console.log('Login Status:', res.status);
  const data = await res.json();
  console.log('Login Data:', data);
  const cookie = res.headers.get('set-cookie');
  console.log('Set-Cookie:', cookie);

  // Now call /api/auth/me with that cookie
  const meRes = await fetch('http://localhost:3000/api/auth/me', {
    headers: { 'Cookie': cookie }
  });
  console.log('Me Status:', meRes.status);
  const meData = await meRes.json();
  console.log('Me Data:', meData);

  // Now call /api/user/subscription with that cookie
  const subRes = await fetch('http://localhost:3000/api/user/subscription', {
    headers: { 'Cookie': cookie }
  });
  console.log('Sub Status:', subRes.status);
  const subData = await subRes.json();
  console.log('Sub Data:', subData);
}

testLoginAshutosh();
