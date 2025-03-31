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

// NEW: Shield Prompt Elements
const shieldPromptDiv = document.getElementById('shield-prompt');
const shieldYesButton = document.getElementById('shield-yes-button');
const shieldNoButton = document.getElementById('shield-no-button');

// HUD Elements
const hudScoreElement = document.getElementById('hud-score');
const hudStreakElement = document.getElementById('hud-streak');
const hudShieldsElement = document.getElementById('hud-shields'); // NEW

// Menu Stats Elements
const menuQuestionNumberElement = document.getElementById('menu-question-number');
const menuAccuracyElement = document.getElementById('menu-accuracy');
const menuBestStreakElement = document.getElementById('menu-best-streak');
const menuDifficultyElement = document.getElementById('menu-difficulty');
const menuShieldsElement = document.getElementById('menu-shields'); // NEW


// --- Spelvariabler ---
let map;
let allCapitals = [];
let currentCapitalsOrder = [];
let currentQuestionIndex = 0;
let score = 0;
let questionNumber = 0;
let currentStreak = 0;
let bestStreak = 0;
let rescueTokens = 0; // NEW: Rescue Shields
let consecutiveErrors = 0; // NEW: Track consecutive errors

// --- Konstanter ---
const MIN_CHOICES = 2; // Start with 2 choices
const MAX_CHOICES = 15; // Allow progression up to 15 choices
const STREAK_MILESTONE_DIFFICULTY_INCREASE = 5; // Increase difficulty every 5 streak
const CONSECUTIVE_ERRORS_DIFFICULTY_DECREASE = 2; // Decrease difficulty after 2 consecutive errors
const STREAK_MILESTONE_FOR_TOKEN = 7; // Earn a shield every 7 streak
const INITIAL_RESCUE_TOKENS = 1; // Start with one shield

let numChoices = MIN_CHOICES; // Start at the minimum

let markers = []; // Holds markers currently on the map
let correctAnswer = null;
let blockClicks = false; // Block clicks during animations/feedback/prompts
let blockNextQuestion = false; // NEW: Block advancing question during shield prompt
let shieldPromptTimeout = null; // Variable to hold shield prompt timeout

// --- Local Storage Keys ---
const STORAGE_PREFIX = 'europakollen_v3_'; // Update version prefix
const STATE_KEY = STORAGE_PREFIX + 'gameState';

// --- Data (Assume europeanCapitals is loaded externally) ---
if (typeof europeanCapitals === 'undefined') {
    console.error("CRITICAL: europeanCapitals data not loaded!");
    // Handle this more gracefully in UI later if possible
} else {
    allCapitals = [...europeanCapitals];
}

// --- Funktioner ---

// Helper: Calculate distance between two lat/lon points (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance); // Return distance in km, rounded
}

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
            zoomControl: true,
            attributionControl: true
        }).setView([55, 15], 4);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 10,
            minZoom: 3
        }).addTo(map);

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
    numChoices = MIN_CHOICES; // Reset difficulty to minimum
    rescueTokens = INITIAL_RESCUE_TOKENS; // Start with initial tokens
    consecutiveErrors = 0; // Reset error counter

     if (!allCapitals || allCapitals.length === 0) {
        if (typeof europeanCapitals !== 'undefined') {
             allCapitals = [...europeanCapitals];
             console.log("Reloaded capitals data during reset.");
        } else {
            console.error("europeanCapitals data is missing during reset!");
            showNotification("❌ Fel: Stadsdata saknas. Kan inte starta.", 'incorrect', 5000);
            return false;
        }
    }
    currentCapitalsOrder = [...allCapitals];
    shuffleArray(currentCapitalsOrder);
    blockClicks = false;
    blockNextQuestion = false;
    console.log("Game variables reset.");
    return true;
}

function startGame(isContinuing = false) {
    console.log(`Starting game (isContinuing: ${isContinuing})`);
    startArea.classList.add('hidden');

    let success = true;
    if (!isContinuing) {
        success = resetGameVariables(false);
    } else {
        if (!loadState()) { // Try loading again if somehow missed, or validate
             console.warn("Invalid state on continue or state not loaded. Performing full reset.");
             success = resetGameVariables(false);
        } else if (!currentCapitalsOrder || currentCapitalsOrder.length === 0 || currentQuestionIndex < 0 || currentQuestionIndex >= currentCapitalsOrder.length || numChoices < MIN_CHOICES) {
            console.warn("Loaded state appears corrupt. Performing full reset.");
            success = resetGameVariables(false); // Full reset if state looks bad
        } else {
            console.log("Continuing with loaded state.");
            bestStreak = Math.max(bestStreak, currentStreak);
        }
    }

    if (!success) {
         startArea.classList.remove('hidden'); // Show start area again if reset failed
         return;
    }

    updateHUD();
    updateMenuStats();

    if (!map) {
       initMap();
    } else {
       map.setView([55, 15], 4); // Reset view
    }

    setTimeout(() => {
        if (!map) {
            console.error("Map not ready after init attempt.");
            showNotification("❌ Fel: Kartan är inte redo.", 'incorrect', 5000);
            startArea.classList.remove('hidden'); // Show start area again
            return;
        }
        console.log("Calling displayQuestion for index:", currentQuestionIndex);
        displayQuestion();
    }, 500);
}

function selectDistractors(correctCapital, count) {
    const distractors = [];
    if (!allCapitals || allCapitals.length === 0) {
        console.error("Attempted to select distractors but allCapitals is empty.");
        return [];
    }
     if (!correctCapital || !correctCapital.city) {
         console.error("Cannot select distractors without a valid correctCapital.");
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
    hudShieldsElement.textContent = rescueTokens; // Update shield count
}

function updateMenuStats() {
     menuQuestionNumberElement.textContent = questionNumber;
     const accuracy = questionNumber > 0 ? ((score / questionNumber) * 100).toFixed(0) : 0;
     menuAccuracyElement.textContent = `${accuracy}%`;
     menuBestStreakElement.textContent = bestStreak;
     menuDifficultyElement.textContent = numChoices;
     menuShieldsElement.textContent = rescueTokens; // Update shields in menu
}

// Modified showNotification to handle refined text and shield prompt integration
function showNotification(message, type = 'info', duration = 3000, offerShield = false) {
    notificationTextElement.textContent = message; // Assign the refined message passed in
    notificationPanel.className = 'notification-visible'; // Base class for visibility + triggers transition
    notificationPanel.classList.add(type); // Add specific type class

    // Clear any previous special styles like 'shield-earned' if not the current type
    if (type !== 'shield-earned') notificationPanel.classList.remove('shield-earned');
    if (type !== 'info' && type !== 'difficulty') notificationPanel.classList.remove('info');

    // Set icon based on type
    if (type === 'correct') {
        notificationIconElement.textContent = '✅'; // Use checkmark emoji
    } else if (type === 'incorrect') {
        notificationIconElement.textContent = '❌';
    } else if (type === 'shield-earned') {
        notificationIconElement.textContent = '🛡️';
        // The 'shield-earned' class is added above
    } else if (type === 'difficulty') {
        notificationIconElement.textContent = '⚙️'; // Gear icon
        notificationPanel.classList.add('info'); // Use info styling for difficulty
    } else { // Default to info
        notificationIconElement.textContent = 'ℹ️';
        notificationPanel.classList.add('info');
    }

    // Handle shield prompt display
    if (offerShield) {
        // Update shield prompt text for clarity (use innerHTML to render icon reliably)
        document.getElementById('shield-prompt-text').innerHTML = `Rädda din streak på ${currentStreak} för 1 <strong>🛡️</strong>?`;
        shieldPromptDiv.classList.remove('hidden');
        notificationTextElement.style.marginBottom = '10px'; // Add space above prompt
        blockNextQuestion = true; // Block next question until prompt resolved

        // Clear previous timeout just in case
        if (shieldPromptTimeout) clearTimeout(shieldPromptTimeout);

        // Set timeout to automatically decline if no response
        shieldPromptTimeout = setTimeout(() => {
             console.log("Shield prompt timed out.");
             handleShieldResponse(false); // Auto-decline
        }, 7000); // 7 second timeout
    } else {
        shieldPromptDiv.classList.add('hidden');
        notificationTextElement.style.marginBottom = '0';

        // Clear previous timeout just in case (e.g., if correct answer cancels a pending prompt)
        if (shieldPromptTimeout) clearTimeout(shieldPromptTimeout);

        // Auto-hide notification if not showing shield prompt
        setTimeout(() => {
            // Only hide if the shield prompt isn't active/wasn't just offered
            // AND if the notification is still meant to be for this message (check current text)
             if (!blockNextQuestion && notificationTextElement.textContent === message) {
                hideNotification();
             }
        }, duration);
    }
}


function hideNotification() {
     notificationPanel.className = 'notification-hidden'; // Triggers hiding transition
     // Ensure shield prompt is also hidden when notification hides normally
     shieldPromptDiv.classList.add('hidden');
     blockNextQuestion = false; // Unblock next question advancement
     // Clear any pending timeout for the shield prompt
     if (shieldPromptTimeout) {
        clearTimeout(shieldPromptTimeout);
        shieldPromptTimeout = null;
     }
}


function showPrompt(cityName) {
    promptCityNameElement.textContent = cityName;
    promptArea.classList.remove('prompt-hidden');
    promptArea.classList.add('prompt-visible');
}

function hidePrompt() {
     promptArea.classList.remove('prompt-visible');
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
         setTimeout(displayQuestion, 200);
         return;
    }

    hideNotification(); // Hide previous feedback/prompt first
    markers.forEach(marker => {
        if (marker && map.hasLayer(marker)) {
            if (marker._icon) {
                 marker._icon.className = marker._icon.className.replace(/ correct-marker-reveal| incorrect-marker-clicked| incorrect-marker-correct-reveal/g, '');
            }
             try { map.removeLayer(marker); } catch (e) { /* Ignore */ }
        }
    });
    markers = [];
    console.log("Old markers removed.");
    blockClicks = false;
    blockNextQuestion = false; // Ensure unblocked

    if (!currentCapitalsOrder || currentCapitalsOrder.length === 0 || allCapitals.length === 0) {
        console.warn("Capital order invalid or capitals not loaded. Resetting.");
        resetGameVariables(true);
        if (!allCapitals || allCapitals.length === 0) {
             showNotification("❌ Fel: Kunde inte ladda frågedata.", 'incorrect', 5000);
             return;
        }
    }
     if (currentQuestionIndex >= currentCapitalsOrder.length || currentQuestionIndex < 0) {
        console.log(`Index ${currentQuestionIndex} out of bounds (${currentCapitalsOrder.length}). Wrapping around.`);
        currentQuestionIndex = 0;
        shuffleArray(currentCapitalsOrder);
        saveState();
    }

    correctAnswer = currentCapitalsOrder[currentQuestionIndex];

     if (!correctAnswer || typeof correctAnswer.city !== 'string' || typeof correctAnswer.lat !== 'number' || typeof correctAnswer.lon !== 'number' || isNaN(correctAnswer.lat) || isNaN(correctAnswer.lon)) {
        console.error("Invalid correctAnswer data at index", currentQuestionIndex, "- Skipping:", correctAnswer);
        currentQuestionIndex++;
        saveState();
        setTimeout(displayQuestion, 50);
        return;
    }

    console.log(`Question ${questionNumber + 1}: Ask for ${correctAnswer.city} (Index: ${currentQuestionIndex}, Difficulty: ${numChoices})`);
    showPrompt(correctAnswer.city);

    const actualNumChoices = Math.min(numChoices, allCapitals.length);
    const numDistractors = actualNumChoices - 1;

     let distractors = [];
     if (correctAnswer && correctAnswer.city) {
         distractors = selectDistractors(correctAnswer, numDistractors);
     } else {
         console.error("Cannot select distractors because correctAnswer is invalid before selection.");
     }

    const choicesForThisRound = correctAnswer ? [correctAnswer, ...distractors] : [...distractors];
    const uniqueChoices = Array.from(new Map(choicesForThisRound.map(item => [item.city, item])).values());
    shuffleArray(uniqueChoices);
    console.log("Choices:", uniqueChoices.map(c => c.city));

    const currentChoiceLatLngs = [];
    console.log("Adding new markers...");
    uniqueChoices.forEach(capital => {
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

     if (currentChoiceLatLngs.length > 1 && map) {
        try {
            const bounds = L.latLngBounds(currentChoiceLatLngs);
            map.flyToBounds(bounds, { padding: [50, 50], duration: 0.7, easeLinearity: 0.5, maxZoom: 9 });
            console.log("Map zoomed to fit choices.");
        } catch(e) {
            console.error("Error fitting map bounds:", e);
             if (map) map.setView([55, 15], 4); // Fallback
        }
    } else if (currentChoiceLatLngs.length === 1 && map) {
        map.flyTo(currentChoiceLatLngs[0], 6, { duration: 0.7 });
    } else if (map) {
        map.setView([55, 15], 4);
    } else {
         console.log("No valid markers to zoom to or map not ready.");
    }

    console.log("--- displayQuestion END ---");
}


function adjustDifficulty() {
    let difficultyChanged = false;
    let message = ''; // Store message for notification

    // Increase difficulty based on streak milestone (only trigger once per milestone)
    if (currentStreak > 0 && currentStreak % STREAK_MILESTONE_DIFFICULTY_INCREASE === 0) {
        // Check if we haven't already increased for this specific streak number
        // This requires storing the last streak level difficulty was increased at, or checking numChoices relation.
        // Simpler approach: Only increase if numChoices is BELOW the theoretical max for this streak.
        // Or just let it trigger - the check `numChoices < MAX_CHOICES` prevents going over.
        if (numChoices < MAX_CHOICES) {
            numChoices++;
            difficultyChanged = true;
            message = `Snygg streak! 🔥 Svårigheten ökad till ${numChoices} val.`;
            console.log(`Difficulty increased to ${numChoices} based on streak ${currentStreak}`);
        }
    }

    // Decrease difficulty based on consecutive errors
    if (consecutiveErrors >= CONSECUTIVE_ERRORS_DIFFICULTY_DECREASE) {
        if (numChoices > MIN_CHOICES) {
            numChoices--;
            difficultyChanged = true;
            consecutiveErrors = 0; // Reset error count after decreasing difficulty
            message = `Lite knepigt? Svårigheten sänkt till ${numChoices} val.`;
            console.log(`Difficulty decreased to ${numChoices} due to consecutive errors.`);
        } else {
            consecutiveErrors = 0; // Reset even if already at min difficulty
        }
    }

     if (difficultyChanged && message) {
         // Show notification about difficulty change with a slight delay
         setTimeout(() => {
             showNotification(message, 'difficulty', 2500); // Use new 'difficulty' type
         }, 50); // Short delay
         updateMenuStats();
         saveState(); // Save state when difficulty changes
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

    blockClicks = true;
    console.log("Clicks blocked.");
    hidePrompt();

    const clickedMarker = event.target;
    const clickedCapital = clickedMarker.options.capitalData;

    if (!correctAnswer || !correctAnswer.city) {
        console.error("handleMarkerClick: correctAnswer is invalid!");
        showNotification("❌ Ett internt fel uppstod.", 'incorrect', 3000);
        blockClicks = false;
        return;
    }

    const isCorrect = clickedCapital.city === correctAnswer.city;
    questionNumber++;
    console.log(`Answered question ${questionNumber}. Correct: ${isCorrect}`);

    const correctMapMarker = markers.find(m => m && m.options.capitalData.city === correctAnswer.city);

    // --- Refined Feedback & Game Logic ---
    if (isCorrect) {
        score++;
        currentStreak++;
        consecutiveErrors = 0; // Reset consecutive errors on correct answer
        if (currentStreak > bestStreak) {
            bestStreak = currentStreak;
        }
        // Refined Correct Message
        const correctMsg = `✅ Perfekt! ${correctAnswer.city} (${correctAnswer.country}) är rätt! +1 Poäng!`;
        showNotification(correctMsg, 'correct', 2500);

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

        if (clickedMarker) {
            map.flyTo(clickedMarker.getLatLng(), 7, { duration: 0.8, easeLinearity: 0.4 });
        }

        // Check for shield award
        if (currentStreak > 0 && currentStreak % STREAK_MILESTONE_FOR_TOKEN === 0) {
            rescueTokens++;
            console.log("Shield earned! Total:", rescueTokens);
            const shieldEarnedMsg = `🛡️ Grym streak på ${currentStreak}! Du fick en sköld!`;
            // Show shield notification *after* correct answer feedback fades
            setTimeout(() => {
                 showNotification(shieldEarnedMsg, 'shield-earned', 3000);
                 updateHUD(); // Update HUD here too for immediate shield visibility
                 updateMenuStats();
                 saveState();
            }, 2600); // Delay slightly longer than correct feedback
        } else {
            // Save state even if no shield was earned
             saveState();
        }

        // Check for difficulty increase AFTER processing the correct answer
        adjustDifficulty(); // This might trigger its own notification and saveState

    } else { // Incorrect Answer
        consecutiveErrors++; // Increment consecutive errors
        console.log(`Incorrect. Consecutive errors: ${consecutiveErrors}`);

        const distance = calculateDistance(clickedCapital.lat, clickedCapital.lon, correctAnswer.lat, correctAnswer.lon);
        // Refined Incorrect Message (base part)
        const incorrectBaseMsg = `❌ Aj då! Det var ${clickedCapital.city}. Rätt svar var ${correctAnswer.city} (${distance} km bort).`;

        // Style markers
        if (clickedMarker._icon) clickedMarker._icon.classList.add('incorrect-marker-clicked');
        if (correctMapMarker?._icon) correctMapMarker._icon.classList.add('incorrect-marker-correct-reveal');
        else console.warn("Correct marker or its icon not found for styling.");

        // Remove other distractors
        const markersToKeep = [clickedMarker, correctMapMarker].filter(Boolean);
        markers.forEach(marker => {
             if (!markersToKeep.includes(marker) && map.hasLayer(marker)) {
                 try { map.removeLayer(marker); } catch(e){}
             }
        });
        markers = markersToKeep;

        // Zoom to show both
        if (markers.length >= 2) {
            try {
                const bounds = L.latLngBounds(markers.map(m => m.getLatLng()));
                map.flyToBounds(bounds, { padding: [70, 70], duration: 1.0, easeLinearity: 0.4, maxZoom: 8 });
            } catch (e) { console.error("Error zooming to incorrect/correct bounds:", e); if(clickedMarker) map.flyTo(clickedMarker.getLatLng(), 5); }
        } else if (clickedMarker) { map.flyTo(clickedMarker.getLatLng(), 6); }


        // Offer Shield or Reset Streak
        const hadStreak = currentStreak > 0; // Store if streak was active *before* this guess
        if (rescueTokens > 0 && hadStreak) {
            console.log("Offering shield to save streak.");
            // Show incorrect message WITH shield prompt
             showNotification(incorrectBaseMsg, 'incorrect', 7000, true); // offerShield = true
             // saveState() will happen in handleShieldResponse or scheduleNextQuestion
        } else {
            const streakLostMsg = hadStreak ? ` Streak på ${currentStreak} bruten!` : ''; // Add if streak > 0
            console.log(`Streak broken (streak was ${currentStreak}, shields: ${rescueTokens}).`);
            currentStreak = 0; // Reset streak here
             showNotification(incorrectBaseMsg + streakLostMsg, 'incorrect', 3500); // Show combined message
             // Check difficulty decrease AFTER processing incorrect answer w/o shield save
             adjustDifficulty(); // This might save state
             saveState(); // Save state after streak is confirmed broken
        }
    }

    adjustMarkerZIndex(); // Ensure markers layer correctly
    updateHUD(); // Update HUD immediately
    updateMenuStats(); // Update menu data

    // Schedule next question (only if shield prompt is NOT active)
    // Delay depends on outcome and whether prompt will be shown
    let nextQuestionDelay = 2700; // Default for correct
    if (!isCorrect) {
        // If shield prompt will be offered (tokens > 0 and had streak)
        if (rescueTokens > 0 && currentStreak > 0) { // Check currentStreak *before* reset
            nextQuestionDelay = 7200; // Wait longer for prompt timeout possibility
        } else {
            nextQuestionDelay = 3700; // Normal incorrect delay
        }
    }

    if (!blockNextQuestion) {
        scheduleNextQuestion(nextQuestionDelay);
    }
    // If blockNextQuestion is true, scheduleNextQuestion will be called by handleShieldResponse

    console.log("--- handleMarkerClick END ---");
}


// Function to handle Yes/No response from shield prompt
function handleShieldResponse(useShield) {
     console.log(`Shield response: ${useShield}`);
     if (shieldPromptTimeout) { // Clear the auto-decline timeout
        clearTimeout(shieldPromptTimeout);
        shieldPromptTimeout = null;
     }
     // Don't hide notification here, let scheduleNextQuestion->displayQuestion handle it

     blockNextQuestion = false; // Allow next question scheduling

     if (useShield && rescueTokens > 0) {
         rescueTokens--;
         console.log("Shield used. Streak saved. Tokens remaining:", rescueTokens);
         // Streak remains unchanged.
         consecutiveErrors = 0; // Reset error count as the shield 'negated' the error effect for streak/difficulty
         showNotification(`🛡️ Streak räddad! Du har ${rescueTokens} sköldar kvar.`, 'info', 2000); // Feedback shield used
     } else {
         const oldStreak = currentStreak; // Store streak before resetting
         currentStreak = 0; // Reset streak
         console.log("Shield not used or none left. Streak broken.");
         showNotification(`❌ Streak på ${oldStreak} bruten.`, 'incorrect', 2000); // Feedback streak lost
         // Check difficulty decrease now that streak is confirmed broken
         adjustDifficulty();
     }

     updateHUD();
     updateMenuStats();
     saveState(); // Save final state after shield decision

     // Schedule next question shortly after prompt closes
     // Hide notification before showing next question
     hideNotification();
     scheduleNextQuestion(500);
}


function scheduleNextQuestion(delay) {
     if (blockNextQuestion) {
         console.log("Next question blocked (likely shield prompt active).");
         return;
     }
     console.log(`Scheduling next question in ${delay}ms`);
     setTimeout(() => {
         if (blockNextQuestion) { // Double check before proceeding
             console.log("setTimeout fired, but next question is now blocked.");
             return;
         }
         console.log("setTimeout triggered for next question. Index before increment:", currentQuestionIndex);
         currentQuestionIndex++;
         console.log("Index after increment:", currentQuestionIndex);
         displayQuestion(); // Display the next question
     }, delay);
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
        rescueTokens, // Save shields
        consecutiveErrors, // Save error count
        // Only save valid order
        currentCapitalsOrder: currentCapitalsOrder && currentCapitalsOrder.length === allCapitals.length ? currentCapitalsOrder : []
    };
    // Avoid saving empty or incomplete order
    if (state.currentCapitalsOrder.length === 0 && allCapitals.length > 0) {
        console.warn("Attempted to save empty capitals order. Re-shuffling.");
        state.currentCapitalsOrder = [...allCapitals];
        shuffleArray(state.currentCapitalsOrder);
        currentCapitalsOrder = state.currentCapitalsOrder; // Update live variable too
    }

    try {
        localStorage.setItem(STATE_KEY, JSON.stringify(state));
        // console.log("Game state saved.");
    } catch (e) {
        console.error("Could not save game state:", e);
        // Avoid showing notification repeatedly if saving fails often
        // showNotification("⚠️ Kunde inte spara spelets status.", 'info', 3000);
    }
}

function loadState() {
    try {
        const savedState = localStorage.getItem(STATE_KEY);
        if (savedState) {
            const state = JSON.parse(savedState);

            // Robust validation
            if (typeof state.score !== 'number' || typeof state.questionNumber !== 'number' ||
                typeof state.currentQuestionIndex !== 'number' || typeof state.bestStreak !== 'number' ||
                typeof state.numChoices !== 'number' || typeof state.rescueTokens !== 'number' ||
                !Array.isArray(state.currentCapitalsOrder)) {
                 throw new Error("Invalid data types or missing arrays in saved state.");
            }
             // Ensure capitals data is loaded FIRST
             if (!allCapitals || allCapitals.length === 0) {
                  if (typeof europeanCapitals !== 'undefined') {
                     allCapitals = [...europeanCapitals];
                  } else {
                      throw new Error("Cannot load state without europeanCapitals data.");
                  }
             }
             // Validate loaded order consistency
             const isValidOrder = state.currentCapitalsOrder.length === allCapitals.length &&
                                state.currentCapitalsOrder.every(capital =>
                                    capital && typeof capital.city === 'string' &&
                                    typeof capital.lat === 'number' && typeof capital.lon === 'number' &&
                                    allCapitals.some(c => c.city === capital.city)); // Check if city exists in master list

             if (!isValidOrder) {
                  console.warn("Loaded currentCapitalsOrder is invalid, empty, or mismatched. State load failed.");
                  localStorage.removeItem(STATE_KEY);
                  return false;
             }
             // Validate numChoices range
             if(state.numChoices < MIN_CHOICES || state.numChoices > MAX_CHOICES) {
                 console.warn(`Loaded numChoices (${state.numChoices}) out of range [${MIN_CHOICES}-${MAX_CHOICES}]. Resetting to ${MIN_CHOICES}.`);
                 state.numChoices = MIN_CHOICES;
             }
             // Validate index bounds AFTER loading order
             if (state.currentQuestionIndex < 0 || state.currentQuestionIndex >= state.currentCapitalsOrder.length) {
                console.warn(`Loaded index ${state.currentQuestionIndex} is out of bounds for loaded order (${state.currentCapitalsOrder.length}). Resetting index.`);
                state.currentQuestionIndex = 0; // Reset index safely
             }

            // Assign validated & potentially corrected values
            score = state.score;
            questionNumber = state.questionNumber;
            currentQuestionIndex = state.currentQuestionIndex;
            currentStreak = state.currentStreak || 0;
            bestStreak = state.bestStreak || 0;
            numChoices = state.numChoices;
            rescueTokens = state.rescueTokens;
            consecutiveErrors = state.consecutiveErrors || 0;
            currentCapitalsOrder = state.currentCapitalsOrder;

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
     if (!confirm("Är du säker på att du vill nollställa spelet? All statistik och alla sköldar försvinner.")) {
        console.log("Reset cancelled by user.");
        return;
     }

    localStorage.removeItem(STATE_KEY);
    hideMenu();
    hidePrompt();
    hideNotification();

     if (map) {
         markers.forEach(marker => {
             if (marker && map.hasLayer(marker)) {
                 try { map.removeLayer(marker); } catch(e){}
             }
         });
         markers = [];
         map.setView([55, 15], 4);
    }

    const success = resetGameVariables(false); // Full reset
    if (success) {
        console.log("Starting new game after reset.");
         startArea.classList.add('hidden');
         setTimeout(() => {
            if (!map) initMap();
            if (map) {
                displayQuestion();
            } else {
                console.error("Map not available after reset/init attempt.");
                showNotification("❌ Fel: Kartan kunde inte startas.", 'incorrect', 5000);
                startArea.classList.remove('hidden');
            }
        }, 150);
        updateHUD();
        updateMenuStats();
    } else {
        console.error("Reset failed, likely due to missing capital data.");
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
}

function hideMenu() {
    menuOverlay.classList.add('menu-hidden');
}

function adjustMarkerZIndex() {
    // Primarily rely on Leaflet default + CSS for explicit overrides (.incorrect-marker-correct-reveal)
}


// --- Event Listeners ---
startButton.addEventListener('click', () => startGame(false));
continueButton.addEventListener('click', () => startGame(true));
resetButton.addEventListener('click', resetGame);
menuButton.addEventListener('click', toggleMenu);
closeMenuButton.addEventListener('click', hideMenu);
menuOverlay.addEventListener('click', (event) => {
    if (event.target === menuOverlay) { hideMenu(); }
});

// Global listeners for shield buttons (added once)
shieldYesButton.addEventListener('click', () => handleShieldResponse(true));
shieldNoButton.addEventListener('click', () => handleShieldResponse(false));


// --- Initialisering vid sidladdning ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed.");

    if (!allCapitals || allCapitals.length === 0) {
       if (typeof europeanCapitals !== 'undefined') {
           console.log("Populating allCapitals from europeanCapitals during DOM load.");
           allCapitals = [...europeanCapitals];
       } else {
           console.error("CRITICAL: europeanCapitals data not found after DOM load!");
           startArea.innerHTML = `<p style="color:red;">Fel: Kunde inte ladda stadsdata. Försök ladda om sidan.</p>`;
           startArea.classList.remove('hidden');
           return; // Stop initialization
       }
    }

    initMap(); // Initialize map early

    const loaded = loadState(); // Attempt to load state

    if (!loaded) {
        console.log("No valid saved state found or load failed. Performing initial reset.");
        resetGameVariables(false); // Ensure clean state if load fails or no state exists
    }

    updateHUD(); // Update HUD with loaded or initial state
    updateMenuStats(); // Update menu stats

    if (loaded && questionNumber > 0) { // Show continue only if state loaded AND game had started
        console.log("Saved state found and game was in progress.");
        startButton.style.display = 'none';
        continueButton.style.display = 'inline-block';
        startArea.classList.remove('hidden');
    } else {
         console.log("No saved game progress or starting fresh.");
        startButton.style.display = 'inline-block';
        continueButton.style.display = 'none';
        startArea.classList.remove('hidden'); // Show start area
    }

     // Update welcome text dynamically
     const welcomeParagraph = document.querySelector('#start-area p');
     if (welcomeParagraph) {
         welcomeParagraph.innerHTML = `Klicka på kartan för att gissa huvudstadens läge. Få långa streaks för att öka svårigheten och tjäna sköldar <strong>🛡️</strong> som kan rädda din streak när du gissar fel!`; // Use innerHTML for bold icon
     }
});