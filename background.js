/**
 * background.js — Service Worker for Battle Predictor
 *
 * Lightweight background script for Manifest V3.
 * Handles state persistence and extension lifecycle.
 */

// ─── Installation ───

chrome.runtime.onInstalled.addListener((details) => {
    console.log('[ShowdownPredictor] Extension installed:', details.reason);

    // Set default storage
    chrome.storage.local.set({
        enabled: true,
        archetype: 'AUTO',
        theme: 'dark',
        version: '1.0.0'
    });
});

// ─── Message Handling ───

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'saveState':
            // Persist game state across navigation
            chrome.storage.local.set({ gameState: request.state }, () => {
                sendResponse({ success: true });
            });
            return true; // async response

        case 'loadState':
            chrome.storage.local.get('gameState', (data) => {
                sendResponse({ state: data.gameState || null });
            });
            return true;

        case 'getSettings':
            chrome.storage.local.get(['enabled', 'archetype', 'theme'], (data) => {
                sendResponse(data);
            });
            return true;

        case 'updateSettings':
            chrome.storage.local.set(request.settings, () => {
                sendResponse({ success: true });
            });
            return true;

        default:
            sendResponse({ error: 'Unknown action' });
    }
});

// ─── Tab Updates ───

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        if (tab.url.includes('play.pokemonshowdown.com') || tab.url.includes('.psim.us')) {
            console.log('[ShowdownPredictor] Showdown tab detected:', tab.url);
        }
    }
});
