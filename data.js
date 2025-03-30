// Lista med europeiska huvudstäder och deras ungefärliga koordinater
// Källa: Diverse källor inklusive Wikipedia / Google Maps (avrundat för enkelhet)
// Uppdaterad och utökad lista
const europeanCapitals = [
    // Original + Verifierade
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
    { city: "Amsterdam", country: "Nederländerna", lat: 52.37, lon: 4.89 }, // Konstitutionell huvudstad, regeringssäte är Haag
    { city: "Bryssel", country: "Belgien", lat: 50.85, lon: 4.35 },
    { city: "Bern", country: "Schweiz", lat: 46.95, lon: 7.44 }, // De facto huvudstad / säte för federala myndigheter
    { city: "Kiev", country: "Ukraina", lat: 50.45, lon: 30.52 },
    { city: "Reykjavik", country: "Island", lat: 64.15, lon: -21.82 },

    // Tillagda huvudstäder
    { city: "Tirana", country: "Albanien", lat: 41.33, lon: 19.82 },
    { city: "Andorra la Vella", country: "Andorra", lat: 42.51, lon: 1.52 },
    { city: "Minsk", country: "Belarus", lat: 53.90, lon: 27.57 },
    { city: "Sarajevo", country: "Bosnien och Hercegovina", lat: 43.86, lon: 18.41 },
    { city: "Sofia", country: "Bulgarien", lat: 42.70, lon: 23.32 },
    { city: "Zagreb", country: "Kroatien", lat: 45.81, lon: 15.98 },
    { city: "Nicosia", country: "Cypern", lat: 35.18, lon: 33.38 }, // Geografiskt i Asien, politiskt/kulturellt ofta räknat till Europa
    { city: "Tallinn", country: "Estland", lat: 59.44, lon: 24.75 },
    { city: "Riga", country: "Lettland", lat: 56.95, lon: 24.11 },
    { city: "Vaduz", country: "Liechtenstein", lat: 47.14, lon: 9.52 },
    { city: "Vilnius", country: "Litauen", lat: 54.69, lon: 25.28 },
    { city: "Luxemburg", country: "Luxemburg", lat: 49.61, lon: 6.13 },
    { city: "Valletta", country: "Malta", lat: 35.90, lon: 14.51 },
    { city: "Chișinău", country: "Moldavien", lat: 47.01, lon: 28.86 },
    { city: "Monaco", country: "Monaco", lat: 43.73, lon: 7.42 }, // Stadsstat
    { city: "Podgorica", country: "Montenegro", lat: 42.44, lon: 19.26 },
    { city: "Skopje", country: "Nordmakedonien", lat: 42.00, lon: 21.43 },
    { city: "Bukarest", country: "Rumänien", lat: 44.43, lon: 26.10 },
    { city: "Moskva", country: "Ryssland", lat: 55.75, lon: 37.62 }, // Transkontinentalt land
    { city: "San Marino", country: "San Marino", lat: 43.94, lon: 12.45 }, // Huvudstaden heter samma som landet
    { city: "Belgrad", country: "Serbien", lat: 44.79, lon: 20.45 },
    { city: "Bratislava", country: "Slovakien", lat: 48.15, lon: 17.11 },
    { city: "Ljubljana", country: "Slovenien", lat: 46.05, lon: 14.51 },
    { city: "Vatikanstaten", country: "Vatikanstaten", lat: 41.90, lon: 12.45 }, // Stadsstat

    // Huvudstäder i transkontinentala länder som ibland räknas till Europa
    { city: "Jerevan", country: "Armenien", lat: 40.18, lon: 44.51 },
    { city: "Baku", country: "Azerbajdzjan", lat: 40.41, lon: 49.87 },
    { city: "Tbilisi", country: "Georgien", lat: 41.72, lon: 44.79 },

    // Huvudstad i ett område med omstridd status
    { city: "Pristina", country: "Kosovo", lat: 42.66, lon: 21.17 }, // Område med omstridd status, delvis erkänd stat
];

// Notera: Listan inkluderar länder vars geografiska eller politiska tillhörighet till Europa kan diskuteras (t.ex. transkontinentala länder som Ryssland, Cypern, Armenien, Azerbajdzjan, Georgien).
// Huvudstäder för länder som ibland räknas till Europa men vars huvudstad ligger i Asien (t.ex. Ankara/Turkiet, Nur-Sultan (Astana)/Kazakstan) är inte medtagna.
// Färöarna (Torshamn) och Gibraltar (Gibraltar Town) är självstyrande territorier och inte självständiga stater, och är därför inte med i denna lista över nationella huvudstäder.
