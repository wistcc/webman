let loadGame = false
let highScore = 0

chrome.browserAction.setIcon({ path: 'assets/logoOff.png' });

chrome.extension.onRequest.addListener((request) => {
    switch (request.command) {
        case 'getLoadGame':
            if (loadGame) {
                chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, loadGame);
                }
                );
            }
            break
        case 'setScore':
            if (request.score > highScore) {
                highScore = request.score
                chrome.browserAction.setBadgeText({ text: highScore.toString() })
            }
            break
    }
});

chrome.browserAction.onClicked.addListener(function (tab) {
    loadGame = !loadGame
    if (loadGame) {
        chrome.browserAction.setIcon({ path: 'assets/logoOn.png' });
        chrome.tabs.sendMessage(tab.id, loadGame);

        if (highScore) {
            chrome.browserAction.setBadgeText({ text: highScore.toString() })
        }
    } else {
        chrome.browserAction.setBadgeText({ text: '' })
        chrome.browserAction.setIcon({ path: 'assets/logoOff.png' });
    }
});

chrome.runtime.onMessage.addListener((request, _, callback) => {
    switch (request.command) {
        case 'setLoadGame':
            if (!request.value) {
                loadGame = request.value
                return
            }
            chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
                loadGame = request.value
                chrome.tabs.sendMessage(tabs[0].id, request.value);
            }
            );
            break
        case 'getLoadGame':
            callback(loadGame);
            break
    }
});