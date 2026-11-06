import fs from 'fs';
import { query, pool } from './db.js';

async function main() {
    const rows = JSON.parse(fs.readFileSync('src/interpretations.json', 'utf8'));
    for (const r of rows) {
        await query(
            `INSERT INTO interpretations(id, planet, house, text) VALUES ($1,$2,$3,$4)
       ON CONFLICT (id) DO UPDATE SET text = EXCLUDED.text`,
            [`${String(r.planet).toUpperCase()}_H${r.house}`, r.planet, r.house, r.text]
        );
    }
    console.log(`Seeded ${rows.length} interpretations`);
    await pool.end();
}
main();