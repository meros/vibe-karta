// --- DOM-element ---
const startButton = document.getElementById('start-button');
const resetButton = document.getElementById('reset-button');
const startArea = document.getElementById('start-area');
const gameArea = document.getElementById('game-area');
const controlsArea = document.getElementById('controls-area');
const cityNameElement = document.getElementById('city-name');
const mapElement = document.getElementById('map');
const feedbackTextElement = document.getElementById('feedback-text');

// Statistik-element
const scoreElement = document.getElementById('score');
const questionNumberElement = document.getElementById('question-number');
const accuracyElement = document.getElementById('accuracy');
const currentStreakElement = document.getElementById('current-streak');
const bestStreakElement = document.getElementById('best-streak');
const difficultyElement = document.getElementById('difficulty');

// --- Spelvariabler ---
let map;
let allCapitals = [];
let currentCapitalsOrder = [];
let currentQuestionIndex = 0;
let score = 0;
let questionNumber = 0;
let currentStreak = 0;
let bestStreak = 0;

// --- Svårighetsgrad ---
const minChoices = 3;
const maxChoices = 10;
const historyWindowSize = 5;
const correctThreshold = 0.8;
const incorrectThreshold = 0.4;
let numChoices = 5;
let performanceHistory = [];

let markers = [];
let correctAnswer = null;
let blockClicks = false;

// --- Local Storage Keys ---
const STORAGE_PREFIX = 'europakollen_';
const STATE_KEY = STORAGE_PREFIX + 'gameState';

// --- Funktioner ---

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function initMap() {
     if (map) {
        map.remove();
    }
    map = L.map(mapElement).setView([55, 15], 4);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 10,
        minZoom: 3
    }).addTo(map);
}

function resetGameVariables() {
    score = 0;
    questionNumber = 0;
    currentQuestionIndex = 0;
    currentStreak = 0;
    bestStreak = 0;
    numChoices = 5;
    performanceHistory = [];
    // Se till att allCapitals är laddad innan vi använder den
    if (allCapitals.length === 0) {
        allCapitals = [...europeanCapitals];
    }
    currentCapitalsOrder = [...allCapitals];
    shuffleArray(currentCapitalsOrder);
    blockClicks = false;
}

function startGame(isContinuing = false) {
    if (allCapitals.length === 0) {
         allCapitals = [...europeanCapitals];
    }

    if (!isContinuing) {
        resetGameVariables();
    }

    updateStatsDisplay();

    startArea.style.display = 'none';
    gameArea.style.display = 'block';
    controlsArea.style.display = 'block';

    if (!map) {
       initMap();
    }
    console.log("Starting game, calling displayQuestion for index:", currentQuestionIndex);
    displayQuestion();
}

function selectDistractors(correctCapital, count) {
    const distractors = [];
    // Se till att allCapitals är laddad
    if (allCapitals.length === 0) {
        allCapitals = [...europeanCapitals];
    }
    const possibleDistractors = allCapitals.filter(capital => capital && capital.city !== correctCapital.city);
    shuffleArray(possibleDistractors);
    for (let i = 0; i < count && i < possibleDistractors.length; i++) {
        distractors.push(possibleDistractors[i]);
    }
    return distractors;
}

function updateStatsDisplay() {
    scoreElement.textContent = score;
    questionNumberElement.textContent = questionNumber;
    const accuracy = questionNumber > 0 ? ((score / questionNumber) * 100).toFixed(0) : 0;
    accuracyElement.textContent = `${accuracy}%`;
    currentStreakElement.textContent = currentStreak;
    bestStreakElement.textContent = bestStreak;
    difficultyElement.textContent = numChoices;
}

function displayQuestion() {
    console.log("--- displayQuestion START ---");
    // Rensa gamla markörer
    try {
        markers.forEach(marker => {
             if (marker) { // Extra säkerhetskoll
                 map.removeLayer(marker);
             }
        });
        markers = []; // Töm arrayen direkt efter
        console.log("Old markers removed.");
    } catch (error) {
        console.error("Error removing markers:", error);
        // Försök fortsätta ändå, men logga felet
    }

    feedbackTextElement.textContent = '';
    feedbackTextElement.className = '';
    blockClicks = false; // Tillåt klick igen!

    // Kolla ordningen och blanda om vid behov
    if (!currentCapitalsOrder || currentCapitalsOrder.length === 0) {
        console.warn("currentCapitalsOrder is invalid, resetting.");
        resetGameVariables(); // Nollställ om listan är helt fel
    }
     if (currentQuestionIndex >= currentCapitalsOrder.length) {
        currentQuestionIndex = 0;
        shuffleArray(currentCapitalsOrder);
        console.log("Shuffled question order.");
    }

    correctAnswer = currentCapitalsOrder[currentQuestionIndex];

    // Kontrollera att correctAnswer är giltigt
    if (!correctAnswer || typeof correctAnswer.city === 'undefined') {
        console.error("Invalid correctAnswer at index", currentQuestionIndex, "- Skipping question.");
        currentQuestionIndex++; // Hoppa över denna trasiga fråga
        // Försök visa nästa direkt istället för att krascha
        setTimeout(displayQuestion, 50);
        return; // Avsluta denna körning av displayQuestion
    }

    console.log("Current question:", correctAnswer.city, "at index:", currentQuestionIndex);
    cityNameElement.textContent = correctAnswer.city;
    updateStatsDisplay();

    const actualNumChoices = Math.min(numChoices, allCapitals.length);
    const numDistractors = actualNumChoices - 1;
    const distractors = selectDistractors(correctAnswer, numDistractors);
    const choicesForThisRound = [correctAnswer, ...distractors];
    shuffleArray(choicesForThisRound);
    console.log("Choices for this round:", choicesForThisRound.map(c => c.city));


    // Lägg till nya markörer med try-catch
    console.log("Adding new markers...");
    choicesForThisRound.forEach(capital => {
        try {
            // **VIKTIG KONTROLL**: Har vi giltiga koordinater?
            if (typeof capital.lat !== 'number' || typeof capital.lon !== 'number') {
                console.error("Invalid coordinates for city:", capital.city, capital);
                throw new Error(`Invalid coordinates for ${capital.city}`); // Skapa ett fel för att hoppa till catch
            }

            const marker = L.marker([capital.lat, capital.lon], { capitalData: capital });
            marker.on('click', handleMarkerClick);
            marker.addTo(map);
            markers.push(marker); // Lägg till i den NYA marker-arrayen
        } catch (error) {
            console.error("Error creating marker for:", capital ? capital.city : 'undefined capital', error);
            // Fortsätt med nästa stad istället för att stoppa allt
        }
    });
     console.log("New markers added. Total markers:", markers.length);
     console.log("--- displayQuestion END ---");
}

function adjustDifficulty() {
    if (performanceHistory.length < historyWindowSize) return;
    const correctInWindow = performanceHistory.reduce((sum, result) => sum + result, 0);
    const correctRatio = correctInWindow / historyWindowSize;

    let difficultyChanged = false;
    if (correctRatio >= correctThreshold && numChoices < maxChoices) {
        numChoices++;
        difficultyChanged = true;
    } else if (correctRatio <= incorrectThreshold && numChoices > minChoices) {
        numChoices--;
         difficultyChanged = true;
    }
    if (difficultyChanged) {
        console.log("Difficulty adjusted to:", numChoices);
    }
}

function handleMarkerClick(event) {
    console.log("--- handleMarkerClick START ---");
    if (blockClicks) {
        console.log("Click blocked.");
        return;
    }

    blockClicks = true; // Blockera direkt!
    console.log("Clicks blocked.");
    const clickedMarker = event.target;
    const clickedCapital = clickedMarker.options.capitalData;
    let wasCorrect = false;

    questionNumber++;
    console.log("Question number incremented to:", questionNumber);

    if (!correctAnswer) {
        console.error("handleMarkerClick called but correctAnswer is null!");
        // Försök återhämta genom att gå till nästa fråga?
        blockClicks = false; // Tillåt klick igen
         setTimeout(() => {
            currentQuestionIndex++;
            displayQuestion();
        }, 500);
        return;
    }

    if (clickedCapital.city === correctAnswer.city) {
        wasCorrect = true;
        score++;
        currentStreak++;
        if (currentStreak > bestStreak) {
            bestStreak = currentStreak;
        }
        feedbackTextElement.textContent = `Rätt! Det är ${correctAnswer.city}, ${correctAnswer.country}.`;
        feedbackTextElement.className = 'correct';
        if (clickedMarker._icon) L.DomUtil.addClass(clickedMarker._icon, 'correct-marker');
        console.log("Correct answer clicked.");

    } else {
        wasCorrect = false;
        currentStreak = 0;
        feedbackTextElement.textContent = `Fel. Det där är ${clickedCapital.city}. Rätt svar var ${correctAnswer.city}.`;
        feedbackTextElement.className = 'incorrect';
        if (clickedMarker._icon) L.DomUtil.addClass(clickedMarker._icon, 'incorrect-marker-clicked');
        console.log("Incorrect answer clicked.");

        const correctMapMarker = markers.find(m => m.options.capitalData.city === correctAnswer.city);
        if (correctMapMarker && correctMapMarker._icon) {
            L.DomUtil.addClass(correctMapMarker._icon, 'incorrect-marker-correct');
        }
    }

    performanceHistory.push(wasCorrect ? 1 : 0);
    if (performanceHistory.length > historyWindowSize) {
        performanceHistory.shift();
    }

    adjustDifficulty();
    updateStatsDisplay();
    saveState();

    console.log("Scheduling next question...");
    setTimeout(() => {
        console.log("setTimeout triggered. Current index before increment:", currentQuestionIndex);
        currentQuestionIndex++;
        console.log("Current index after increment:", currentQuestionIndex);
        displayQuestion();
    }, 2000);
    console.log("--- handleMarkerClick END ---");
}

// --- Local Storage Funktioner ---
function saveState() {
    const state = {
        score,
        questionNumber,
        currentQuestionIndex,
        currentStreak,
        bestStreak,
        numChoices,
        performanceHistory,
        currentCapitalsOrder // Spara hela objekt-arrayen
    };
    try {
        localStorage.setItem(STATE_KEY, JSON.stringify(state));
        // console.log("Game state saved."); // Lite mindre spam
    } catch (e) {
        console.error("Could not save game state:", e);
    }
}

function loadState() {
    try {
        const savedState = localStorage.getItem(STATE_KEY);
        if (savedState) {
            const state = JSON.parse(savedState);

            // Validera laddad data noggrannare
            if (typeof state.score !== 'number' || typeof state.questionNumber !== 'number' || typeof state.currentQuestionIndex !== 'number') {
                throw new Error("Invalid core state data types.");
            }
             if (!Array.isArray(state.performanceHistory) || !Array.isArray(state.currentCapitalsOrder)) {
                 throw new Error("Invalid array types in state.");
             }

            score = state.score;
            questionNumber = state.questionNumber;
            currentQuestionIndex = state.currentQuestionIndex;
            currentStreak = state.currentStreak || 0; // Fallback om de saknas
            bestStreak = state.bestStreak || 0;
            numChoices = state.numChoices || 5;
            performanceHistory = state.performanceHistory;
            currentCapitalsOrder = state.currentCapitalsOrder;

            if (allCapitals.length === 0) {
                allCapitals = [...europeanCapitals];
            }

            // **Förbättrad validering av currentCapitalsOrder**
            // Kontrollera att varje element ser ut som ett giltigt capital-objekt
            const isValidOrder = currentCapitalsOrder.every(capital =>
                capital && typeof capital.city === 'string' && typeof capital.lat === 'number' && typeof capital.lon === 'number'
            );

            if (!isValidOrder || currentCapitalsOrder.length === 0) {
                 console.warn("Loaded currentCapitalsOrder is invalid or empty. Resetting order.");
                 currentCapitalsOrder = [...allCapitals];
                 shuffleArray(currentCapitalsOrder);
                 currentQuestionIndex = 0; // Börja om i ordningen
                 // Nollställ även stats som hör ihop med en specifik ordning? Valfritt.
                 // score = 0; questionNumber = 0; etc.
            }

            console.log("Game state loaded successfully.");
            return true;
        }
    } catch (e) {
        console.error("Could not load or parse game state:", e);
        localStorage.removeItem(STATE_KEY); // Rensa korrupt data
    }
    return false;
}

function resetGame() {
    console.log("Resetting game...");
    localStorage.removeItem(STATE_KEY);
    if (map) {
        map.remove();
        map = null;
    }
    // Säkerställ att allCapitals är laddad innan resetGameVariables
     if (allCapitals.length === 0) {
        allCapitals = [...europeanCapitals];
    }
    resetGameVariables();
    startGame(false); // Starta en helt ny omgång direkt
}

// --- Event Listeners ---
startButton.addEventListener('click', () => startGame(false));
resetButton.addEventListener('click', resetGame);

// --- Initialisering vid sidladdning ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed.");
    // Förladda huvudstäderna direkt
    if (allCapitals.length === 0) {
       allCapitals = [...europeanCapitals];
       console.log("Preloaded capitals.");
    }

    if (loadState()) {
        console.log("Saved state found, starting continued game.");
        startGame(true);
    } else {
        console.log("No saved state found, showing start button.");
        startArea.style.display = 'block';
        gameArea.style.display = 'none';
        controlsArea.style.display = 'block';
    }
});