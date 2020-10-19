let loadGame = false
let highScore = 0

chrome.browserAction.setIcon({ path: 'assets/logoOff.png' })

chrome.extension.onRequest.addListener((request) => {
  switch (request.command) {
    case 'getLoadGame':
      if (loadGame) {
        chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, {
            command: 'loadGame',
            value: loadGame,
          })
        })
      }
      break
    case 'setScore':
      if (request.score > highScore) {
        highScore = request.score
        chrome.browserAction.setBadgeText({
          text: highScore.toString(),
        })
      }
      break
  }
})

chrome.browserAction.onClicked.addListener(function (tab) {
  loadGame = !loadGame
  if (loadGame) {
    chrome.browserAction.setIcon({ path: 'assets/logoOn.png' })
    chrome.tabs.sendMessage(tab.id, {
      command: 'loadGame',
      value: loadGame,
    })

    if (highScore) {
      chrome.browserAction.setBadgeText({ text: highScore.toString() })
    }
  } else {
    chrome.tabs.sendMessage(tab.id, { command: 'cleanUp' })
    chrome.browserAction.setBadgeText({ text: '' })
    chrome.browserAction.setIcon({ path: 'assets/logoOff.png' })
  }
})

chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason == 'install' || details.reason == 'update') {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        chrome.tabs.executeScript(tab.id, { file: './phaser.js' }, () => {
          chrome.tabs.executeScript(tab.id, {
            file: './contentScript.js',
          })
        })
      })
    })
  }
})
