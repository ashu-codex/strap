// One-off refactor helper: split SEED_EXERCISES out of src/lib/store.ts into src/lib/exercises.ts
const fs = require('fs');
const path = require('path');
const storePath = path.join(__dirname, '..', 'src', 'lib', 'store.ts');
const src = fs.readFileSync(storePath, 'utf8').split(/\r?\n/);
const start = src.findIndex((l) => l.startsWith('export const SEED_EXERCISES'));
let end = -1;
for (let i = start + 1; i < src.length; i++) {
  if (src[i] === '];') { end = i; break; }
}
if (start < 0 || end < 0) throw new Error('bounds not found ' + start + ' ' + end);
const body = src.slice(start, end + 1).join('\n');
const out = "import { ExerciseItem } from '@/types';\n\n" + body + '\n';
fs.writeFileSync(path.join(__dirname, '..', 'src', 'lib', 'exercises.ts'), out);
console.log('exercises.ts written, lines', start + 1, '-', end + 1);
