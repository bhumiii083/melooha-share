import sweph from 'sweph';

const { constants: C } = sweph;

/**
 * ASTROLOGY SETTINGS USED (fixed on purpose, so results are reproducible):
 * - Zodiac:        SIDEREAL (the Indian / Vedic zodiac)
 * - Ayanamsa:      Lahiri (Chitrapaksha), SE_SIDM_LAHIRI
 * - Houses:        WHOLE SIGN ("W"). House 1 = the whole sign the Ascendant is in.
 * - Nodes:         MEAN Rahu; Ketu = Rahu + 180 degrees
 * - Planets:       Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, Ketu
 * - Ephemeris:     Moshier (built in, no data files needed)
 * - Time zone:     input is IST (UTC+5:30), converted to UT
 */

export const SIGNS = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const;

function signAt(index: number): (typeof SIGNS)[number] {
    const sign = SIGNS[index];
    if (sign === undefined) {
        throw new Error(`Invalid zodiac sign index: ${index}`);
    }
    return sign;
}

const IST_OFFSET_HOURS = 5.5;

const PLANETS = [
    { name: 'Sun', id: C.SE_SUN },
    { name: 'Moon', id: C.SE_MOON },
    { name: 'Mars', id: C.SE_MARS },
    { name: 'Mercury', id: C.SE_MERCURY },
    { name: 'Jupiter', id: C.SE_JUPITER },
    { name: 'Venus', id: C.SE_VENUS },
    { name: 'Saturn', id: C.SE_SATURN },
    { name: 'Rahu', id: C.SE_MEAN_NODE },
] as const;

export interface BirthInput {
    year: number;
    month: number;
    day: number;
    hour: number; // 0-23, IST
    minute: number; // 0-59, IST
    lat: number;
    lon: number; // east positive
}

export interface Placement {
    name: string;
    longitude: number; // sidereal, 0-360
    sign: (typeof SIGNS)[number];
    degreeInSign: number;
    house: number; // 1-12, whole sign
}

export interface Chart {
    ascendant: (typeof SIGNS)[number];
    ascendantLongitude: number;
    settings: { zodiac: 'sidereal'; ayanamsa: 'lahiri'; houseSystem: 'whole-sign'; node: 'mean' };
    planets: Placement[];
}

function place(name: string, lon: number, ascSign: number): Placement {
    const norm = ((lon % 360) + 360) % 360;
    const sign = Math.floor(norm / 30);
    return {
        name,
        longitude: Number(norm.toFixed(4)),
        sign: signAt(sign),
        degreeInSign: Number((norm - sign * 30).toFixed(2)),
        house: ((sign - ascSign + 12) % 12) + 1,
    };
}

export function computeChart(b: BirthInput): Chart {
    // 1. IST -> UT. julday accepts hours outside 0-24 and rolls the date over.
    const utHour = b.hour + b.minute / 60 - IST_OFFSET_HOURS;
    const jd = sweph.julday(b.year, b.month, b.day, utHour, C.SE_GREG_CAL);

    // 2. Sidereal zodiac with the Lahiri ayanamsa
    sweph.set_sid_mode(C.SE_SIDM_LAHIRI, 0, 0);
    const flags = C.SEFLG_MOSEPH | C.SEFLG_SIDEREAL;

    // 3. Ascendant, sidereal. "W" = whole sign houses.
    const h = sweph.houses_ex(jd, flags, b.lat, b.lon, 'W');
    if (h.flag === C.ERR) throw new Error('Could not compute the ascendant');
    const ascLon = ((h.data.points[0] % 360) + 360) % 360;
    const ascSign = Math.floor(ascLon / 30);

    // 4. Planets
    const planets: Placement[] = PLANETS.map((p) => {
        const r = sweph.calc_ut(jd, p.id, flags);
        if (r.flag === C.ERR) throw new Error(`Could not compute ${p.name}: ${r.error}`);
        return place(p.name, r.data[0], ascSign);
    });

    // 5. Ketu is always exactly opposite Rahu
    const rahu = planets.find((p) => p.name === 'Rahu')!;
    planets.push(place('Ketu', rahu.longitude + 180, ascSign));

    return {
        ascendant: signAt(ascSign),
        ascendantLongitude: Number(ascLon.toFixed(4)),
        settings: { zodiac: 'sidereal', ayanamsa: 'lahiri', houseSystem: 'whole-sign', node: 'mean' },
        planets,
    };
}