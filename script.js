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

let markers = []; // Holds markers currently on the map
let correctAnswer = null;
let blockClicks = false;

// --- Local Storage Keys ---
const STORAGE_PREFIX = 'europakollen_';
const STATE_KEY = STORAGE_PREFIX + 'gameState';

// --- Data (Assume europeanCapitals is loaded externally) ---
// Example: const europeanCapitals = [ { city: "...", country: "...", lat: ..., lon: ... }, ... ];


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
        map = null; // Ensure map object is cleared
    }
    map = L.map(mapElement).setView([55, 15], 4); // Initial view
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 10, // Adjust maxZoom if needed for close-ups
        minZoom: 3
    }).addTo(map);
    console.log("Map initialized.");
}

function resetGameVariables() {
    score = 0;
    questionNumber = 0;
    currentQuestionIndex = 0;
    currentStreak = 0;
    // Keep bestStreak unless explicitly reset or starting fresh without loadState
    // bestStreak = 0;
    numChoices = 5;
    performanceHistory = [];
    if (allCapitals.length === 0) {
        if (typeof europeanCapitals !== 'undefined') {
             allCapitals = [...europeanCapitals];
        } else {
            console.error("europeanCapitals data is not loaded!");
            return; // Stop if data is missing
        }
    }
    currentCapitalsOrder = [...allCapitals];
    shuffleArray(currentCapitalsOrder);
    blockClicks = false;
    console.log("Game variables reset.");
}

function startGame(isContinuing = false) {
    console.log(`Starting game (isContinuing: ${isContinuing})`);
    if (allCapitals.length === 0) {
       if (typeof europeanCapitals !== 'undefined') {
            allCapitals = [...europeanCapitals];
            console.log("Capitals loaded.");
       } else {
            console.error("europeanCapitals data is not loaded! Cannot start game.");
            feedbackTextElement.textContent = "Error: Capital data not loaded.";
            feedbackTextElement.className = 'incorrect';
            startArea.style.display = 'block'; // Show start button again
            gameArea.style.display = 'none';
            controlsArea.style.display = 'none';
            return;
        }
    }

    if (!isContinuing) {
        // If starting fresh, reset best streak from potential previous loaded state
        bestStreak = 0;
        resetGameVariables();
    } else {
         // If continuing, we assume loadState has populated bestStreak etc.
         // Ensure currentCapitalsOrder exists if continuing
         if (!currentCapitalsOrder || currentCapitalsOrder.length === 0) {
            console.warn("Continuing game but capital order is missing/invalid. Resetting order.");
            currentCapitalsOrder = [...allCapitals];
            shuffleArray(currentCapitalsOrder);
            // Reset index if order was reset
            if (currentQuestionIndex >= currentCapitalsOrder.length || currentQuestionIndex < 0) {
                currentQuestionIndex = 0;
            }
         }
    }

    updateStatsDisplay();

    startArea.style.display = 'none';
    gameArea.style.display = 'block';
    controlsArea.style.display = 'block';

    if (!map) {
       initMap();
    } else {
       // Optional: reset view slightly if continuing game
       // map.setView([55, 15], 4);
    }

    // Check if map initialization is complete before proceeding
    if (!map) {
        console.error("Map object not available after initMap/check. Aborting.");
        return;
    }

    console.log("Calling displayQuestion for index:", currentQuestionIndex);
    displayQuestion();
}

function selectDistractors(correctCapital, count) {
    const distractors = [];
    if (allCapitals.length === 0) {
        console.error("Attempted to select distractors but allCapitals is empty.");
        return [];
    }
    // Filter out the correct answer AND any potential null/undefined entries
    const possibleDistractors = allCapitals.filter(capital =>
        capital && capital.city && capital.city !== correctCapital.city
    );

    shuffleArray(possibleDistractors);
    const numToPick = Math.min(count, possibleDistractors.length);
    for (let i = 0; i < numToPick; i++) {
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
    bestStreakElement.textContent = bestStreak; // Display loaded or current best streak
    difficultyElement.textContent = numChoices;
}

function displayQuestion() {
    console.log("--- displayQuestion START ---");
    // Ensure map exists
    if (!map) {
        console.error("displayQuestion called but map is not initialized.");
        initMap(); // Attempt to re-initialize
        if (!map) return; // Stop if still fails
    }

    // Clear previous markers and reset styles
    try {
        markers.forEach(marker => {
             if (marker) {
                 // Remove specific marker classes added previously
                 if (marker._icon) {
                     L.DomUtil.removeClass(marker._icon, 'correct-marker');
                     L.DomUtil.removeClass(marker._icon, 'incorrect-marker-clicked');
                     L.DomUtil.removeClass(marker._icon, 'incorrect-marker-correct');
                 }
                 if (map.hasLayer(marker)) {
                     map.removeLayer(marker);
                 }
             }
        });
        markers = []; // Clear the array
        console.log("Old markers removed and styles reset.");
    } catch (error) {
        console.error("Error removing markers:", error);
    }

    feedbackTextElement.textContent = '';
    feedbackTextElement.className = '';
    blockClicks = false; // Allow clicks

    // --- Validate question progression ---
    if (!currentCapitalsOrder || currentCapitalsOrder.length === 0 || allCapitals.length === 0) {
        console.warn("Capital order invalid or capitals not loaded. Resetting.");
        resetGameVariables();
        if (allCapitals.length === 0) {
             console.error("Capitals still not loaded. Aborting displayQuestion.");
             feedbackTextElement.textContent = "Error loading questions. Please reset.";
             feedbackTextElement.className = 'incorrect';
             return;
        }
    }
     if (currentQuestionIndex >= currentCapitalsOrder.length || currentQuestionIndex < 0) {
        console.log(`Index ${currentQuestionIndex} out of bounds (${currentCapitalsOrder.length}). Resetting index and shuffling.`);
        currentQuestionIndex = 0;
        shuffleArray(currentCapitalsOrder);
        // Save state because order/index changed
        saveState();
    }

    correctAnswer = currentCapitalsOrder[currentQuestionIndex];

    if (!correctAnswer || typeof correctAnswer.city !== 'string' || typeof correctAnswer.lat !== 'number' || typeof correctAnswer.lon !== 'number' || isNaN(correctAnswer.lat) || isNaN(correctAnswer.lon)) {
        console.error("Invalid correctAnswer at index", currentQuestionIndex, "- Skipping question:", correctAnswer);
        currentQuestionIndex++;
        saveState();
        setTimeout(displayQuestion, 50);
        return;
    }

    console.log(`Question ${questionNumber + 1}: ${correctAnswer.city} (Index: ${currentQuestionIndex})`);
    cityNameElement.textContent = correctAnswer.city;
    updateStatsDisplay(); // Show stats for the upcoming question

    const actualNumChoices = Math.min(numChoices, allCapitals.length);
    const numDistractors = actualNumChoices - 1;
    const distractors = selectDistractors(correctAnswer, numDistractors);
    const choicesForThisRound = [correctAnswer, ...distractors];
    shuffleArray(choicesForThisRound);
    console.log("Choices:", choicesForThisRound.map(c => c.city));

    const currentChoiceLatLngs = [];

    // --- Add new markers ---
    console.log("Adding new markers...");
    choicesForThisRound.forEach(capital => {
        try {
            if (typeof capital.lat !== 'number' || typeof capital.lon !== 'number' || isNaN(capital.lat) || isNaN(capital.lon)) {
                console.error("Invalid coordinates for city:", capital.city, capital);
                throw new Error(`Invalid coordinates for ${capital.city}`);
            }
            const marker = L.marker([capital.lat, capital.lon], { capitalData: capital });
            marker.on('click', handleMarkerClick);
            marker.addTo(map);
            markers.push(marker); // Add to the marker array for this question
            currentChoiceLatLngs.push([capital.lat, capital.lon]);
        } catch (error) {
            console.error("Error creating marker for:", capital ? capital.city : 'undefined capital', error);
        }
    });
    console.log("New markers added. Total on map:", markers.length);

    // --- Zoom map to fit all current markers ---
    if (currentChoiceLatLngs.length > 1 && map) {
        try {
            const bounds = L.latLngBounds(currentChoiceLatLngs);
            map.flyToBounds(bounds, { padding: [40, 40], duration: 0.7, easeLinearity: 0.5, maxZoom: 9 });
            console.log("Map zoomed to fit choices.");
        } catch(e) {
            console.error("Error fitting map bounds:", e);
            map.setView([55, 15], 4); // Fallback
        }
    } else if (currentChoiceLatLngs.length === 1 && map) {
        // Handle case with only one choice
        map.flyTo(currentChoiceLatLngs[0], 6, { duration: 0.7 }); // Zoom to a reasonable level
    } else if (map) {
        // Fallback if no markers could be added
        map.setView([55, 15], 4);
    }

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
        // Optionally update display immediately if needed, though it happens before next question anyway
        // difficultyElement.textContent = numChoices;
    }
}

function handleMarkerClick(event) {
    console.log("--- handleMarkerClick START ---");
    if (blockClicks) {
        console.log("Click blocked.");
        return;
    }
    if (!map) {
        console.error("Map not available in handleMarkerClick");
        return;
    }

    blockClicks = true; // Block subsequent clicks immediately
    console.log("Clicks blocked.");

    const clickedMarker = event.target;
    const clickedCapital = clickedMarker.options.capitalData;

    // Ensure correctAnswer is valid for comparison
    if (!correctAnswer || !correctAnswer.city) {
        console.error("handleMarkerClick called but correctAnswer is invalid!");
        // Attempt recovery: Go to next question after a short delay
        blockClicks = false; // Allow clicks again maybe? Or just proceed to next?
         setTimeout(() => {
            currentQuestionIndex++;
            displayQuestion();
        }, 1000);
        return;
    }

    const isCorrect = clickedCapital.city === correctAnswer.city;
    questionNumber++; // Increment question number regardless of outcome
    console.log(`Answered question ${questionNumber}. Correct: ${isCorrect}`);

    // Find the marker corresponding to the correct answer BEFORE removing others
    const correctMapMarker = markers.find(m => m && m.options.capitalData.city === correctAnswer.city);
     if (!correctMapMarker) {
         console.warn("Could not find the marker instance for the correct answer:", correctAnswer.city);
         // This shouldn't happen if displayQuestion worked, but good to log.
     }

    // --- Feedback and Coloring ---
    if (isCorrect) {
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
        currentStreak = 0;
        feedbackTextElement.textContent = `Fel. Det där är ${clickedCapital.city}. Rätt svar var ${correctAnswer.city}.`;
        feedbackTextElement.className = 'incorrect';
        // Color the clicked (wrong) marker red
        if (clickedMarker._icon) L.DomUtil.addClass(clickedMarker._icon, 'incorrect-marker-clicked');
        // Color the actual correct marker green
        if (correctMapMarker && correctMapMarker._icon) {
            L.DomUtil.addClass(correctMapMarker._icon, 'incorrect-marker-correct');
        }
        console.log("Incorrect answer clicked.");
    }

    // --- Remove Distractor Markers ---
    const markersToKeep = [];
    if (isCorrect) {
        if(clickedMarker) markersToKeep.push(clickedMarker);
    } else {
        if(clickedMarker) markersToKeep.push(clickedMarker);
        // Ensure correctMapMarker exists and is different from clickedMarker before adding
        if(correctMapMarker && correctMapMarker !== clickedMarker) {
            markersToKeep.push(correctMapMarker);
        }
    }

    markers.forEach(marker => {
        // If this marker is NOT in the list of markers to keep...
        if (marker && !markersToKeep.includes(marker)) {
            if (map.hasLayer(marker)) {
                try {
                    map.removeLayer(marker);
                    // console.log("Removed distractor marker for:", marker.options.capitalData.city);
                } catch (e) {
                    console.warn("Error removing a distractor marker:", e);
                }
            }
        }
    });
    // Update the global 'markers' array to only contain the ones left on the map
    markers = markersToKeep;
    console.log("Distractor markers removed. Remaining markers:", markers.length);


    // --- Zooming Logic ---
    if (isCorrect) {
        if (clickedMarker) {
             // Zoom fairly close to the single correct marker
             map.flyTo(clickedMarker.getLatLng(), 7, { // Zoom level 7
                 duration: 0.8,
                 easeLinearity: 0.4
             });
             console.log("Zoomed to correct answer.");
        }
    } else {
        // Zoom to fit both clicked (wrong) and correct markers
        if (markersToKeep.length === 2) { // Should contain clicked and correct
             try {
                const bounds = L.latLngBounds(markersToKeep.map(m => m.getLatLng()));
                map.flyToBounds(bounds, {
                    padding: [60, 60], // Add padding around the markers
                    duration: 1.0,
                    easeLinearity: 0.4,
                    maxZoom: 8 // Don't zoom in excessively close
                });
                 console.log("Zoomed to show incorrect and correct answers.");
             } catch (e) {
                 console.error("Error zooming to incorrect/correct bounds:", e);
                 // Fallback: Center between them? Or zoom out slightly?
                 if(clickedMarker) map.flyTo(clickedMarker.getLatLng(), 5, { duration: 0.8 }); // Zoom out a bit near the wrong one
             }
        } else if (markersToKeep.length === 1) { // Only the clicked one remained (maybe correct one failed?)
            map.flyTo(markersToKeep[0].getLatLng(), 6, { duration: 0.8 }); // Zoom to the single remaining (wrong) marker
             console.log("Zoomed to the single incorrect marker (correct marker missing?).");
        }
    }

    // --- Update Stats, Difficulty, Save State ---
    performanceHistory.push(isCorrect ? 1 : 0);
    if (performanceHistory.length > historyWindowSize) {
        performanceHistory.shift();
    }
    adjustDifficulty();
    updateStatsDisplay(); // Update display with new score/streak/etc.
    saveState(); // Save state after every answer

    // --- Schedule Next Question ---
    console.log("Scheduling next question...");
    // Increased delay to allow user to see the result and zoom animation
    const delay = 2500;
    setTimeout(() => {
        console.log("setTimeout triggered. Current index before increment:", currentQuestionIndex);
        currentQuestionIndex++;
        console.log("Current index after increment:", currentQuestionIndex);
        displayQuestion(); // Display the *next* question
    }, delay);

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
        // Ensure currentCapitalsOrder exists before saving
        currentCapitalsOrder: currentCapitalsOrder && currentCapitalsOrder.length > 0 ? currentCapitalsOrder : []
    };
    try {
        localStorage.setItem(STATE_KEY, JSON.stringify(state));
        // console.log("Game state saved."); // Less verbose logging
    } catch (e) {
        console.error("Could not save game state:", e);
        // Consider notifying user if storage is full/fails
    }
}

function loadState() {
    try {
        const savedState = localStorage.getItem(STATE_KEY);
        if (savedState) {
            const state = JSON.parse(savedState);

            // Basic validation
            if (typeof state.score !== 'number' || typeof state.questionNumber !== 'number' || typeof state.currentQuestionIndex !== 'number' || typeof state.bestStreak !== 'number' ) {
                throw new Error("Invalid core state data types.");
            }
             if (!Array.isArray(state.performanceHistory) || !Array.isArray(state.currentCapitalsOrder)) {
                 throw new Error("Invalid array types in state.");
             }

            score = state.score;
            questionNumber = state.questionNumber;
            currentQuestionIndex = state.currentQuestionIndex;
            currentStreak = state.currentStreak || 0;
            bestStreak = state.bestStreak || 0; // Load best streak
            numChoices = state.numChoices || 5;
            performanceHistory = state.performanceHistory;
            currentCapitalsOrder = state.currentCapitalsOrder;

            // Ensure capitals data is loaded if we are restoring state
            if (allCapitals.length === 0) {
                 if (typeof europeanCapitals !== 'undefined') {
                    allCapitals = [...europeanCapitals];
                 } else {
                     throw new Error("Cannot load state without europeanCapitals data.");
                 }
            }

            // **Validate loaded order against current data**
            const isValidOrder = currentCapitalsOrder.length > 0 && currentCapitalsOrder.every(capital =>
                capital && typeof capital.city === 'string' && typeof capital.lat === 'number' && typeof capital.lon === 'number'
                // Optional: Check if cities in the saved order still exist in the main 'allCapitals' list
                // && allCapitals.some(c => c.city === capital.city)
            );

            if (!isValidOrder) {
                 console.warn("Loaded currentCapitalsOrder is invalid or empty. Resetting order.");
                 currentCapitalsOrder = [...allCapitals];
                 shuffleArray(currentCapitalsOrder);
                 // If order is reset, should we reset progress? Maybe just the index.
                 currentQuestionIndex = 0;
            }

            // Validate index bounds after loading order
             if (currentQuestionIndex < 0 || currentQuestionIndex >= currentCapitalsOrder.length) {
                console.warn(`Loaded index ${state.currentQuestionIndex} is out of bounds for loaded order (${currentCapitalsOrder.length}). Resetting index.`);
                currentQuestionIndex = 0;
             }


            console.log("Game state loaded successfully.");
            return true; // Signal that state was loaded
        }
    } catch (e) {
        console.error("Could not load or parse game state:", e);
        localStorage.removeItem(STATE_KEY); // Clear potentially corrupt data
    }
    return false; // Signal that no valid state was loaded
}

function resetGame() {
    console.log("Resetting game...");
    localStorage.removeItem(STATE_KEY); // Clear saved state
    if (map) {
        // Remove markers before removing map
         markers.forEach(marker => {
             if (marker && map.hasLayer(marker)) {
                 map.removeLayer(marker);
             }
         });
         markers = [];
        map.remove();
        map = null;
    }
    // No need to reload allCapitals if already loaded
     if (allCapitals.length === 0) {
        if (typeof europeanCapitals !== 'undefined') {
           allCapitals = [...europeanCapitals];
        } else {
           console.error("Cannot reset game - europeanCapitals data missing.");
           // Show error state?
           return;
        }
    }
    // Reset variables, including bestStreak for a full reset
    bestStreak = 0;
    resetGameVariables();

    // Immediately start a new game after resetting
    console.log("Starting new game after reset.");
    startGame(false);
    // Ensure UI reflects the reset state
    updateStatsDisplay();
    startArea.style.display = 'none'; // Hide start button
    gameArea.style.display = 'block'; // Show game
    controlsArea.style.display = 'block'; // Show controls
}


// --- Event Listeners ---
startButton.addEventListener('click', () => startGame(false));
resetButton.addEventListener('click', resetGame);

// --- Initialisering vid sidladdning ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed.");
    // Attempt to preload capitals data immediately
    if (typeof europeanCapitals !== 'undefined') {
       allCapitals = [...europeanCapitals];
       console.log("Preloaded capitals.");
    } else {
       console.error("CRITICAL: europeanCapitals data not found on page load!");
       // Display an error message to the user on the page?
       feedbackTextElement.textContent = "ERROR: Could not load city data. Please refresh or check the console.";
       feedbackTextElement.className = 'incorrect';
       startArea.style.display = 'none'; // Hide start button if data is missing
       return; // Stop initialization
    }


    if (loadState()) {
        console.log("Saved state found, starting continued game.");
        // Start the game in 'continue' mode, map will be initialized in startGame
        startGame(true);
    } else {
        console.log("No valid saved state found, showing start area.");
        startArea.style.display = 'block';
        gameArea.style.display = 'none';
        // Show controls (like reset) even before game starts
        controlsArea.style.display = 'block';
        // Optional: Initialize map here for background, or wait for startGame
        // initMap(); // If you want map visible behind start button
        // Update display to show initial zeroed/default stats
        updateStatsDisplay();
    }
});


// --- CSS (Add to your stylesheet) ---
/*
Make sure you have CSS rules like these:

.leaflet-marker-icon {
    filter: brightness(1.1) saturate(1.2);
    transition: filter 0.3s ease-in-out, transform 0.2s ease; // Add transform transition
}

// Style for the correctly guessed marker OR the actual correct one when guessed wrong
.correct-marker,
.incorrect-marker-correct {
    filter: brightness(1.1) saturate(3) hue-rotate(90deg); // Greenish
    // Optional: Slightly larger?
    // transform: scale(1.1);
    // z-index: 1000 !important; // Ensure it's on top if needed
}

// Style for the marker that was clicked when it was the wrong answer
.incorrect-marker-clicked {
     filter: brightness(1.0) saturate(4) hue-rotate(0deg); // Reddish
     // Optional: Make it stand out
     // transform: scale(1.1);
     // z-index: 1000 !important;
}

// Ensure map container has a defined size
#map {
    height: 500px; // Or your desired height
    width: 100%;
}

// Feedback text styles
#feedback-text {
    margin-top: 10px;
    font-weight: bold;
}
.correct {
    color: green;
}
.incorrect {
    color: red;
}

*/