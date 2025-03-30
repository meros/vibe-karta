// Lista med europeiska huvudstäder och deras ungefärliga koordinater
// Källa: Wikipedia / Google Maps (avrundat för enkelhet)
// Lägg gärna till fler!
const europeanCapitals = [
    { city: "Stockholm", country: "Sverige", lat: 59.33, lon: 18.07 },
    { city: "Oslo", country: "Norge", lat: 59.91, lon: 10.75 },
    { city: "Köpenhamn", country: "Danmark", lat: 55.68, lon: 12.57 },
    { city: "Helsingfors", country: "Finland", lat: 60.17, lon: 24.94 },
    { city: "Berlin", country: "Tyskland", lat: 52.52, lon: 13.41 },
    { city: "Paris", country: "Frankrike", lat: 48.86, lon: 2.35 },
    { city: "London", country: "Storbritannien", lat: 51.51, lon: -0.13 },
    { city: "Dublin", country: "Irland", lat: 53.35, lon: -6.26 },
    { city: "Madrid", country: "Spanien", lat: 40.42, lon: -3.70 },
    { city: "Lissabon", country: "Portugal", lat: 38.72, lon: -9.14 },
    { city: "Rom", country: "Italien", lat: 41.90, lon: 12.50 },
    { city: "Wien", country: "Österrike", lat: 48.21, lon: 16.37 },
    { city: "Prag", country: "Tjeckien", lat: 50.08, lon: 14.42 },
    { city: "Warszawa", country: "Polen", lat: 52.23, lon: 21.01 },
    { city: "Budapest", country: "Ungern", lat: 47.50, lon: 19.04 },
    { city: "Aten", country: "Grekland", lat: 37.98, lon: 23.73 },
    { city: "Amsterdam", country: "Nederländerna", lat: 52.37, lon: 4.89 },
    { city: "Bryssel", country: "Belgien", lat: 50.85, lon: 4.35 },
    { city: "Bern", country: "Schweiz", lat: 46.95, lon: 7.44 },
    { city: "Kiev", country: "Ukraina", lat: 50.45, lon: 30.52 }, // Observera: Läget kan vara känsligt
    { city: "Reykjavik", country: "Island", lat: 64.15, lon: -21.82 },
];

// Du kan lägga till fler huvudstäder här genom att följa samma format:
// { city: "Stadsnamn", country: "Landsnamn", lat: LATTITUD, lon: LONGITUD },