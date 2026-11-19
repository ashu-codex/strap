const fs = require('fs');
const path = require('path');

function walk(d) {
  let res = [];
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) {
      if (f !== 'node_modules' && f !== '.next' && f !== '.git') {
        res.push(...walk(p));
      }
    } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
      res.push(p);
    }
  }
  return res;
}

const files = walk('src');
console.log('Total TS/TSX files:', files.length);

console.log('\n--- Files checking subscription/isPremium ---');
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('/api/user/subscription') || content.includes('/api/auth/me')) {
    console.log(file);
  }
}

console.log('\n--- Checking store data for payments and subscriptions ---');
if (fs.existsSync('data/strap-store.json')) {
  const store = JSON.parse(fs.readFileSync('data/strap-store.json', 'utf8'));
  console.log('Users in store:', store.users ? store.users.map(u => ({ id: u[0], email: u[1].email, role: u[1].role })) : []);
  console.log('Subscriptions in store:', store.subscriptions ? store.subscriptions.map(s => ({ userId: s[0], plan: s[1].plan, status: s[1].status, end: s[1].current_period_end })) : []);
  console.log('Payments in store:', store.payments ? store.payments.map(p => ({ id: p.id, user_id: p.user_id, email: p.user_email, utr: p.utr_reference, status: p.payment_status })) : []);
}
