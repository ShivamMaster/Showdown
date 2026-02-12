/**
 * content.js — Entry point for the Battle Predictor
 *
 * Initializes the scraper, engine, and UI when a Pokémon Showdown battle
 * is detected. Watches for battle rooms being opened/closed and manages
 * the full pipeline lifecycle.
 */

(function () {
    'use strict';

    const POLL_INTERVAL = 2000;    // ms between battle detection polls
    const UPDATE_DEBOUNCE = 100;   // ms debounce for state updates
    let initialized = false;
    let updateTimer = null;
    let pollTimer = null;

    console.log('[ShowdownPredictor] Content script loaded on', window.location.href);

    /**
     * Check if we're currently in a battle room
     */
    function isBattleActive() {
        const hasBattle = !!(
            document.querySelector('.battle') ||
            document.querySelector('.battle-log') ||
            document.querySelector('.innerbattle') ||
            document.querySelector('.playbutton') === null && document.querySelector('.battle-controls')
        );
        if (hasBattle) console.log('[ShowdownPredictor] Battle container detected');
        return hasBattle;
    }

    /**
     * Wait for battle DOM to be ready
     */
    function waitForBattle() {
        return new Promise((resolve) => {
            if (isBattleActive()) {
                resolve();
                return;
            }

            // Poll for battle DOM
            const check = setInterval(() => {
                if (isBattleActive()) {
                    clearInterval(check);
                    resolve();
                }
            }, POLL_INTERVAL);
        });
    }

    /**
     * Run the analysis pipeline
     */
    function runAnalysis() {
        const state = ShowdownScraper.state;
        if (!state.battleActive && !state.myActive && !state.opponentActive) return;

        const analysis = PredictionEngine.analyze(state);
        PredictorUI.update(analysis);
    }

    /**
     * Debounced state update handler — called by scraper on every DOM change
     */
    function onStateUpdate(state) {
        if (updateTimer) clearTimeout(updateTimer);
        updateTimer = setTimeout(() => {
            runAnalysis();
        }, UPDATE_DEBOUNCE);
    }

    /**
     * Initialize the predictor for a battle
     */
    function initialize() {
        if (initialized) return;
        initialized = true;

        console.log('[ShowdownPredictor] Initializing...');

        // Create the UI overlay
        PredictorUI.create();

        // Run initial scan
        ShowdownScraper.initialScan();

        // Start observing DOM changes
        ShowdownScraper.startObserving(onStateUpdate);

        // Run initial analysis
        setTimeout(runAnalysis, 1000);

        console.log('[ShowdownPredictor] Initialized successfully');
    }

    /**
     * Teardown when battle ends
     */
    function teardown() {
        if (!initialized) return;

        console.log('[ShowdownPredictor] Tearing down...');
        ShowdownScraper.stopObserving();
        ShowdownScraper.reset();
        PredictorUI.destroy();
        initialized = false;

        // Resume polling for next battle
        startPolling();
    }

    /**
     * Start polling for battle rooms
     */
    function startPolling() {
        if (pollTimer) clearInterval(pollTimer);

        pollTimer = setInterval(() => {
            if (isBattleActive() && !initialized) {
                console.log('[ShowdownPredictor] Battle detected!');
                // Short delay to let the battle DOM fully render
                setTimeout(initialize, 1500);
            } else if (!isBattleActive() && initialized) {
                console.log('[ShowdownPredictor] Battle ended');
                teardown();
            }
        }, POLL_INTERVAL);
    }

    /**
     * Watch for Showdown's SPA navigation
     * Showdown is a single-page app that changes rooms without page reloads
     */
    function watchNavigation() {
        // Observe the main content area for room changes
        const mainEl = document.getElementById('room-') ||
            document.querySelector('.ps-room') ||
            document.body;

        const navObserver = new MutationObserver(() => {
            if (isBattleActive() && !initialized) {
                console.log('[ShowdownPredictor] Battle room detected via navigation');
                setTimeout(initialize, 1500);
            } else if (!isBattleActive() && initialized) {
                teardown();
            }
        });

        navObserver.observe(mainEl, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style']
        });
    }

    // ─── Bootstrap ───

    // Start immediately
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            startPolling();
            watchNavigation();
        });
    } else {
        startPolling();
        watchNavigation();
    }

    // Also try immediate initialization if already in battle
    if (isBattleActive()) {
        setTimeout(initialize, 2000);
    }

    // Listen for messages from background script
    if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'getState') {
                sendResponse({
                    state: ShowdownScraper.state,
                    initialized: initialized,
                    battleActive: isBattleActive()
                });
            } else if (request.action === 'reset') {
                teardown();
                sendResponse({ success: true });
            }
        });
    }

})();
