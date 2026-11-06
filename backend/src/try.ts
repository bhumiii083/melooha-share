import { computeChart } from './chart.js';

// Nagpur, 14 May 2004, 10:30 IST. Replace with YOUR real birth details to verify.
const chart = computeChart({
    year: 2004, month: 5, day: 14, hour: 10, minute: 30,
    lat: 21.1458, lon: 79.0882,
});

console.log(`Ascendant: ${chart.ascendant} (${chart.ascendantLongitude})`);
console.table(chart.planets.map((p) => ({
    planet: p.name, sign: p.sign, deg: p.degreeInSign, house: p.house,
})));