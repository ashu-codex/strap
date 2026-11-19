const fs = require('fs');

const store = JSON.parse(fs.readFileSync('data/strap-store.json', 'utf8'));

console.log('--- ALL USERS ---');
for (const [id, u] of store.users) {
  console.log(`User ID: "${id}", Email: "${u.email}", Name: "${u.full_name}", Role: "${u.role}"`);
}

console.log('\n--- ALL PAYMENTS ---');
for (const p of store.payments) {
  console.log(`Payment ID: "${p.id}", User ID: "${p.user_id}", Email: "${p.user_email}", UTR: "${p.utr_reference}", Status: "${p.payment_status}", Amount: ${p.amount_inr}`);
}

console.log('\n--- ALL SUBSCRIPTIONS ---');
for (const [id, s] of store.subscriptions) {
  console.log(`Sub Key: "${id}", User ID: "${s.user_id}", Plan: "${s.plan}", Status: "${s.status}", Start: "${s.current_period_start}", End: "${s.current_period_end}"`);
}
