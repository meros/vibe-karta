// --- DOM Elements ---
const startButton = document.getElementById('start-button');
const continueButton = document.getElementById('continue-button');
const resetButton = document.getElementById('reset-button');
const menuButton = document.getElementById('menu-button');
const closeMenuButton = document.getElementById('close-menu-button');

const startArea = document.getElementById('start-area');
const mapElement = document.getElementById('map');
const promptArea = document.getElementById('prompt-area');
const promptCityNameElement = document.getElementById('prompt-city-name');
const notificationPanel = document.getElementById('notification-panel');
const notificationTextElement = document.getElementById('notification-text');
const notificationIconElement = document.getElementById('notification-icon');
const menuOverlay = document.getElementById('menu-overlay');

// HUD Elements
const hudScoreElement = document.getElementById('hud-score');
const hudStreakElement = document.getElementById('hud-streak');

// Menu Stats Elements
const menuQuestionNumberElement = document.getElementById('menu-question-number');
const menuAccuracyElement = document.getElementById('menu-accuracy');
const menuBestStreakElement = document.getElementById('menu-best-streak');
const menuDifficultyElement = document.getElementById('menu-difficulty');


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
let blockClicks = false; // Block clicks during animations/feedback

// --- Local Storage Keys ---
const STORAGE_PREFIX = 'europakollen_v2_'; // Use new prefix if structure changes significantly
const STATE_KEY = STORAGE_PREFIX + 'gameState';

// --- Data (Assume europeanCapitals is loaded externally) ---
if (typeof europeanCapitals === 'undefined') {
    console.error("CRITICAL: europeanCapitals data not loaded!");
    // Handle this more gracefully in UI later if possible
} else {
    allCapitals = [...europeanCapitals];
}

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
        map = null;
    }
    try {
        map = L.map(mapElement, {
            zoomControl: true, // Ensure zoom control is added
            attributionControl: true // Keep attribution
        }).setView([55, 15], 4); // Initial view centered on Europe

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 10,
            minZoom: 3
        }).addTo(map);

        // Optional: Add subtle hover effect to map tiles?
        map.on('load', () => {
            console.log("Map initialized and tiles loaded.");
        });

    } catch (e) {
        console.error("Leaflet map initialization failed:", e);
        mapElement.innerHTML = '<p style="color:red; padding: 20px;">Kartan kunde inte laddas. Försök att ladda om sidan.</p>';
    }
}

function resetGameVariables(keepBestStreak = false) {
    score = 0;
    questionNumber = 0;
    currentQuestionIndex = 0;
    currentStreak = 0;
    if (!keepBestStreak) {
        bestStreak = 0;
    }
    numChoices = 5;
    performanceHistory = [];
    // Ensure allCapitals is populated
     if (!allCapitals || allCapitals.length === 0) {
        if (typeof europeanCapitals !== 'undefined') {
             allCapitals = [...europeanCapitals];
             console.log("Reloaded capitals data during reset.");
        } else {
            console.error("europeanCapitals data is missing during reset!");
            showNotification("❌ Fel: Stadsdata saknas. Kan inte starta.", 'incorrect', 5000);
            return false; // Indicate failure
        }
    }
    currentCapitalsOrder = [...allCapitals];
    shuffleArray(currentCapitalsOrder);
    blockClicks = false;
    console.log("Game variables reset.");
    return true; // Indicate success
}

function startGame(isContinuing = false) {
    console.log(`Starting game (isContinuing: ${isContinuing})`);

    // Hide start area with animation
    startArea.classList.add('hidden');

    if (!isContinuing) {
        // Full reset if starting fresh
        const success = resetGameVariables(false); // Reset best streak too
         if (!success) return; // Stop if reset failed (e.g., data missing)
    } else {
         // If continuing, loadState should have populated variables.
         // Reset variables but keep the loaded best streak.
        resetGameVariables(true);
        // Validate loaded state (loadState function handles detailed checks)
         if (!currentCapitalsOrder || currentCapitalsOrder.length === 0 || currentQuestionIndex < 0 || currentQuestionIndex >= currentCapitalsOrder.length) {
              console.warn("Invalid state on continue. Performing full reset.");
              const success = resetGameVariables(false); // Full reset needed
               if (!success) return; // Stop if reset failed
         }
    }

    updateHUD();
    updateMenuStats(); // Update stats in menu even if hidden

    if (!map) {
       initMap();
    } else {
       map.setView([55, 15], 4); // Reset view
    }

     // Delay slightly after hiding start area before showing first question
    setTimeout(() => {
        if (!map) {
            console.error("Map not ready after init attempt.");
             showNotification("❌ Fel: Kartan är inte redo.", 'incorrect', 5000);
            return;
        }
        console.log("Calling displayQuestion for index:", currentQuestionIndex);
        displayQuestion();
    }, 500); // Matches fade-out duration of start area
}

function selectDistractors(correctCapital, count) {
    const distractors = [];
    if (!allCapitals || allCapitals.length === 0) {
        console.error("Attempted to select distractors but allCapitals is empty.");
        return [];
    }
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

function updateHUD() {
    hudScoreElement.textContent = score;
    hudStreakElement.textContent = currentStreak;
     // Optional: Add animation class for score/streak changes
}

function updateMenuStats() {
     menuQuestionNumberElement.textContent = questionNumber;
     const accuracy = questionNumber > 0 ? ((score / questionNumber) * 100).toFixed(0) : 0;
     menuAccuracyElement.textContent = `${accuracy}%`;
     menuBestStreakElement.textContent = bestStreak;
     menuDifficultyElement.textContent = numChoices;
}

function showNotification(message, type = 'info', duration = 2500) {
    notificationTextElement.textContent = message;
    notificationPanel.className = 'notification-visible'; // Base class for visibility
    notificationPanel.classList.add(type); // 'correct', 'incorrect', or 'info'

    if (type === 'correct') {
         notificationIconElement.textContent = '✔️';
    } else if (type === 'incorrect') {
        notificationIconElement.textContent = '❌';
    } else {
        notificationIconElement.textContent = 'ℹ️';
    }

    // Auto-hide after duration
    setTimeout(() => {
        hideNotification();
    }, duration);
}

function hideNotification() {
     notificationPanel.className = 'notification-hidden';
}

function showPrompt(cityName) {
    promptCityNameElement.textContent = cityName;
    promptArea.classList.remove('prompt-hidden');
}

function hidePrompt() {
    promptArea.classList.add('prompt-hidden');
}


function displayQuestion() {
    console.log("--- displayQuestion START ---");
    if (!map) {
        console.error("displayQuestion called but map is not initialized.");
        initMap();
        if (!map) {
             showNotification("❌ Fel: Kartan kunde inte laddas.", 'incorrect', 5000);
             return;
        }
         // Retry displaying after short delay if map was just initialized
         setTimeout(displayQuestion, 200);
         return;
    }

    // --- Cleanup from previous question ---
    hideNotification(); // Ensure previous feedback is hidden
    markers.forEach(marker => {
        if (marker && map.hasLayer(marker)) {
            // Remove specific classes if necessary, though removing layer is usually enough
            if (marker._icon) {
                 marker._icon.classList.remove('correct-marker-reveal', 'incorrect-marker-clicked', 'incorrect-marker-correct-reveal');
            }
             try {
                map.removeLayer(marker);
            } catch (e) { /* Ignore errors if layer already removed */ }
        }
    });
    markers = [];
    console.log("Old markers removed.");
    blockClicks = false;

    // --- Validate Data & Progression ---
     if (!currentCapitalsOrder || currentCapitalsOrder.length === 0 || allCapitals.length === 0) {
        console.warn("Capital order invalid or capitals not loaded. Resetting.");
        resetGameVariables(true); // Keep best streak if possible
        if (!allCapitals || allCapitals.length === 0) {
             showNotification("❌ Fel: Kunde inte ladda frågedata.", 'incorrect', 5000);
             return;
        }
    }
     if (currentQuestionIndex >= currentCapitalsOrder.length || currentQuestionIndex < 0) {
        console.log(`Index ${currentQuestionIndex} out of bounds (${currentCapitalsOrder.length}). Wrapping around.`);
        currentQuestionIndex = 0; // Wrap around to the beginning
        shuffleArray(currentCapitalsOrder); // Re-shuffle for variety
        saveState();
    }

    correctAnswer = currentCapitalsOrder[currentQuestionIndex];

    // --- Validate Current Question Data ---
     if (!correctAnswer || typeof correctAnswer.city !== 'string' || typeof correctAnswer.lat !== 'number' || typeof correctAnswer.lon !== 'number' || isNaN(correctAnswer.lat) || isNaN(correctAnswer.lon)) {
        console.error("Invalid correctAnswer data at index", currentQuestionIndex, "- Skipping:", correctAnswer);
        currentQuestionIndex++;
        saveState();
        setTimeout(displayQuestion, 50); // Try next immediately
        return;
    }

    console.log(`Question ${questionNumber + 1}: Ask for ${correctAnswer.city} (Index: ${currentQuestionIndex})`);

    // --- Show Prompt ---
    showPrompt(correctAnswer.city);

    // --- Select Choices & Create Markers ---
    const actualNumChoices = Math.min(numChoices, allCapitals.length);
    const numDistractors = actualNumChoices - 1;
    const distractors = selectDistractors(correctAnswer, numDistractors);
    const choicesForThisRound = [correctAnswer, ...distractors];
    shuffleArray(choicesForThisRound);
    console.log("Choices:", choicesForThisRound.map(c => c.city));

    const currentChoiceLatLngs = [];
    console.log("Adding new markers...");
    choicesForThisRound.forEach(capital => {
        try {
            if (typeof capital.lat !== 'number' || typeof capital.lon !== 'number' || isNaN(capital.lat) || isNaN(capital.lon)) {
                throw new Error(`Invalid coordinates for ${capital.city}`);
            }
            const marker = L.marker([capital.lat, capital.lon], { capitalData: capital });
            marker.on('click', handleMarkerClick);
            marker.addTo(map);
            markers.push(marker);
            currentChoiceLatLngs.push([capital.lat, capital.lon]);
        } catch (error) {
            console.error("Error creating marker for:", capital ? capital.city : 'undefined capital', error);
        }
    });
    console.log("New markers added. Total:", markers.length);
    adjustMarkerZIndex();

    // --- Zoom Map ---
     if (currentChoiceLatLngs.length > 1 && map) {
        try {
            const bounds = L.latLngBounds(currentChoiceLatLngs);
            map.flyToBounds(bounds, { padding: [50, 50], duration: 0.7, easeLinearity: 0.5, maxZoom: 9 });
            console.log("Map zoomed to fit choices.");
        } catch(e) {
            console.error("Error fitting map bounds:", e);
            map.setView([55, 15], 4); // Fallback
        }
    } else if (currentChoiceLatLngs.length === 1 && map) {
        map.flyTo(currentChoiceLatLngs[0], 6, { duration: 0.7 });
    } else if (map) {
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

    blockClicks = true; // Block clicks immediately
    console.log("Clicks blocked.");
    hidePrompt(); // Hide the "Hitta:" prompt

    const clickedMarker = event.target;
    const clickedCapital = clickedMarker.options.capitalData;

    if (!correctAnswer || !correctAnswer.city) {
        console.error("handleMarkerClick: correctAnswer is invalid!");
        showNotification("❌ Ett internt fel uppstod.", 'incorrect', 3000);
        blockClicks = false;
         // Attempt recovery - maybe just wait longer? Or reset? For now, just unblock.
        return;
    }

    const isCorrect = clickedCapital.city === correctAnswer.city;
    questionNumber++;
    console.log(`Answered question ${questionNumber}. Correct: ${isCorrect}`);

    const correctMapMarker = markers.find(m => m && m.options.capitalData.city === correctAnswer.city);

    // --- Feedback Logic ---
    if (isCorrect) {
        score++;
        currentStreak++;
        if (currentStreak > bestStreak) {
            bestStreak = currentStreak;
        }
        showNotification(`Rätt! Det är ${correctAnswer.city}, ${correctAnswer.country}.`, 'correct', 2500);
        if (clickedMarker._icon) {
            clickedMarker._icon.classList.add('correct-marker-reveal');
        }
        console.log("Correct answer visual feedback.");

        // Remove incorrect markers
        markers.forEach(marker => {
            if (marker !== clickedMarker && map.hasLayer(marker)) {
                 try { map.removeLayer(marker); } catch(e){}
            }
        });
        markers = [clickedMarker]; // Only keep the correct one

        // Zoom to correct answer
        if (clickedMarker) {
            map.flyTo(clickedMarker.getLatLng(), 7, { duration: 0.8, easeLinearity: 0.4 });
        }

    } else { // Incorrect Answer
        currentStreak = 0;
        showNotification(`Fel. Det där var ${clickedCapital.city}. Rätt svar: ${correctAnswer.city}.`, 'incorrect', 3500); // Longer duration for incorrect

        // Style clicked (wrong) marker
        if (clickedMarker._icon) {
            clickedMarker._icon.classList.add('incorrect-marker-clicked');
        }
        // Style correct marker
        if (correctMapMarker && correctMapMarker._icon) {
            correctMapMarker._icon.classList.add('incorrect-marker-correct-reveal');
        } else if (correctMapMarker && !correctMapMarker._icon) {
             // If icon isn't rendered yet, try adding later? Or just log.
             console.warn("Correct marker found but its icon element doesn't exist yet.");
        } else if (!correctMapMarker) {
             console.warn("Correct marker instance not found for styling.");
        }
        console.log("Incorrect answer visual feedback.");

        // Remove other distractors (neither clicked nor correct)
         const markersToKeep = [clickedMarker, correctMapMarker].filter(Boolean); // Filter out null/undefined
         markers.forEach(marker => {
             if (!markersToKeep.includes(marker) && map.hasLayer(marker)) {
                 try { map.removeLayer(marker); } catch(e){}
             }
         });
         markers = markersToKeep; // Keep clicked and correct


        // Zoom to show both
        if (markers.length >= 2) {
             try {
                const bounds = L.latLngBounds(markers.map(m => m.getLatLng()));
                map.flyToBounds(bounds, { padding: [70, 70], duration: 1.0, easeLinearity: 0.4, maxZoom: 8 });
             } catch (e) {
                 console.error("Error zooming to incorrect/correct bounds:", e);
                 if(clickedMarker) map.flyTo(clickedMarker.getLatLng(), 5, { duration: 0.8 });
             }
        } else if (clickedMarker) { // Only clicked marker remained
            map.flyTo(clickedMarker.getLatLng(), 6, { duration: 0.8 });
        }
    }

    adjustMarkerZIndex(); // Re-adjust Z-index if needed after styling/removals

    // --- Update State & Schedule Next ---
    performanceHistory.push(isCorrect ? 1 : 0);
    if (performanceHistory.length > historyWindowSize) {
        performanceHistory.shift();
    }
    adjustDifficulty();
    updateHUD(); // Update score/streak in HUD
    updateMenuStats(); // Update stats in menu data
    saveState();

    // Schedule next question after feedback duration
    const nextQuestionDelay = isCorrect ? 2700 : 3700; // Slightly longer than notification
    console.log(`Scheduling next question in ${nextQuestionDelay}ms`);
    setTimeout(() => {
        console.log("setTimeout triggered for next question. Index before increment:", currentQuestionIndex);
        currentQuestionIndex++;
        console.log("Index after increment:", currentQuestionIndex);
        displayQuestion();
    }, nextQuestionDelay);

    console.log("--- handleMarkerClick END ---");
}


// --- Local Storage Functions ---
function saveState() {
    const state = {
        score,
        questionNumber,
        currentQuestionIndex,
        currentStreak,
        bestStreak,
        numChoices,
        performanceHistory,
        currentCapitalsOrder: currentCapitalsOrder && currentCapitalsOrder.length > 0 ? currentCapitalsOrder : []
    };
    try {
        localStorage.setItem(STATE_KEY, JSON.stringify(state));
        // console.log("Game state saved."); // Reduce console noise
    } catch (e) {
        console.error("Could not save game state:", e);
        showNotification("⚠️ Kunde inte spara spelets status.", 'info', 3000);
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
             // Ensure capitals data is loaded FIRST
             if (!allCapitals || allCapitals.length === 0) {
                  if (typeof europeanCapitals !== 'undefined') {
                     allCapitals = [...europeanCapitals];
                  } else {
                      throw new Error("Cannot load state without europeanCapitals data.");
                  }
             }
             // Validate loaded order
             const isValidOrder = state.currentCapitalsOrder.length > 0 && state.currentCapitalsOrder.every(capital =>
                 capital && typeof capital.city === 'string' && typeof capital.lat === 'number' && typeof capital.lon === 'number'
             );

             if (!isValidOrder) {
                  console.warn("Loaded currentCapitalsOrder is invalid or empty. State load failed.");
                  localStorage.removeItem(STATE_KEY); // Clear invalid state
                  return false;
             }

            // Assign loaded values
            score = state.score;
            questionNumber = state.questionNumber;
            currentQuestionIndex = state.currentQuestionIndex;
            currentStreak = state.currentStreak || 0;
            bestStreak = state.bestStreak || 0; // Load best streak
            numChoices = state.numChoices || 5;
            performanceHistory = state.performanceHistory;
            currentCapitalsOrder = state.currentCapitalsOrder;


            // Validate index bounds AFTER loading order
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
     // Confirmation Dialog
     if (!confirm("Är du säker på att du vill nollställa spelet? All statistik försvinner.")) {
        console.log("Reset cancelled by user.");
        return;
     }

    localStorage.removeItem(STATE_KEY); // Clear saved state
    hideMenu(); // Hide menu if open
    hidePrompt(); // Hide any active prompt
    hideNotification(); // Hide any active notification

     if (map) {
         markers.forEach(marker => {
             if (marker && map.hasLayer(marker)) {
                 try { map.removeLayer(marker); } catch(e){}
             }
         });
         markers = [];
         // Don't remove the map instance, just reset view and clear layers
         map.setView([55, 15], 4);
    }

    const success = resetGameVariables(false); // Full reset including best streak
    if (success) {
        console.log("Starting new game after reset.");
         // Show start area briefly? Or start directly? Start directly.
         startArea.classList.add('hidden'); // Ensure start area is hidden
         setTimeout(() => {
            if (!map) initMap(); // Re-init map if it failed previously
            displayQuestion(); // Display the first question of the new game
        }, 100); // Short delay
        updateHUD();
        updateMenuStats();
    } else {
        console.error("Reset failed, likely due to missing capital data.");
        // Show start area again if reset fails?
         startArea.classList.remove('hidden');
    }
}

function toggleMenu() {
     if (menuOverlay.classList.contains('menu-hidden')) {
         showMenu();
     } else {
         hideMenu();
     }
}

function showMenu() {
    updateMenuStats(); // Ensure stats are current when menu opens
    menuOverlay.classList.remove('menu-hidden');
    // Optional: Pause game timer/activity if applicable
}

function hideMenu() {
    menuOverlay.classList.add('menu-hidden');
    // Optional: Resume game timer/activity
}

function adjustMarkerZIndex() {
    // Sort markers by latitude (North to South)
    const sortedMarkers = [...markers].sort((a, b) => b.getLatLng().lat - a.getLatLng().lat);
    // Assign z-index offset based on sorted order
    sortedMarkers.forEach((marker, index) => {
        if (marker._icon) {
            // Assign a base z-index + an offset. Higher numbers are further south (appear on top)
            // Leaflet's default marker z-index is based on latitude, this reinforces it or overrides if needed.
             // Let Leaflet handle zIndex based on lat by default, only override if needed.
             // marker.setZIndexOffset(index * 10); // Example: Explicit offset if default isn't enough
        }
    });
     // Alternatively, rely on Leaflet's default behavior which should handle most cases.
     // If overlaps are consistently wrong, use setZIndexOffset.
}


// --- Event Listeners ---
startButton.addEventListener('click', () => startGame(false));
continueButton.addEventListener('click', () => startGame(true));
resetButton.addEventListener('click', resetGame);
menuButton.addEventListener('click', toggleMenu);
closeMenuButton.addEventListener('click', hideMenu);
// Close menu if clicking outside the content area
menuOverlay.addEventListener('click', (event) => {
    if (event.target === menuOverlay) { // Check if the click is on the overlay itself
        hideMenu();
    }
});


// --- Initialisering vid sidladdning ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed.");

    if (!allCapitals || allCapitals.length === 0) {
       console.error("CRITICAL: europeanCapitals data not found after DOM load!");
       startArea.innerHTML = `<p style="color:red;">Fel: Kunde inte ladda stadsdata. Försök ladda om sidan.</p>`;
        startArea.classList.remove('hidden'); // Make sure error is visible
       return; // Stop initialization
    }

    initMap(); // Initialize map on load to show background

    if (loadState()) {
        console.log("Saved state found.");
        updateHUD(); // Show loaded stats immediately in HUD
        updateMenuStats(); // Update menu stats
        // Show continue button, hide start button
        startButton.style.display = 'none';
        continueButton.style.display = 'inline-block';
        startArea.classList.remove('hidden'); // Show start area with continue option
    } else {
        console.log("No valid saved state found. Ready for new game.");
        // Show start button, hide continue button
        startButton.style.display = 'inline-block';
        continueButton.style.display = 'none';
        startArea.classList.remove('hidden'); // Show start area
        // Update displays to show initial zeroed/default stats
        updateHUD();
        updateMenuStats();
    }
});