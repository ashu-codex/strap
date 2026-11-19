const fs = require('fs');

const store = JSON.parse(fs.readFileSync('data/strap-store.json', 'utf8'));

console.log('=== PAYMENTS ===');
store.payments.forEach((p, idx) => {
  console.log(`Payment #${idx}:`, p);
});

console.log('\n=== SUBSCRIPTIONS ===');
store.subscriptions.forEach(([key, s], idx) => {
  console.log(`Subscription #${idx} (Key: "${key}"):`, s);
});

console.log('\n=== USERS ===');
store.users.forEach(([key, u], idx) => {
  console.log(`User #${idx} (Key: "${key}"):`, u);
});
