const TWITCH_USERNAME = "twitchUsername"
const SHOW_GAME_BOX_ART = "showGameBoxArt"
const SHOW_STREAM_THUMBNAILS = "showStreamThumbnails"
function saveOptions(e) {
  e.preventDefault();
  browser.storage.local.set({
    [TWITCH_USERNAME]: document.querySelector(`#${TWITCH_USERNAME}`).value,
    [SHOW_GAME_BOX_ART]: document.querySelector(`#${SHOW_GAME_BOX_ART}`).checked,
    [SHOW_STREAM_THUMBNAILS]: document.querySelector(`#${SHOW_STREAM_THUMBNAILS}`).checked,
    twitchUserId: null
  });
  browser.runtime.getBackgroundPage().then(page => page.getAllData());
}

function restoreOptions() {
  function setTwitchUserName(result) {
    document.querySelector(`#${TWITCH_USERNAME}`).value =
      result[TWITCH_USERNAME] || "";
  }

  function setShowGameBoxart(result) {
    document.querySelector(`#${SHOW_GAME_BOX_ART}`).checked =
      result[SHOW_GAME_BOX_ART] || "";
  }
  
  function setShowStreamThumbnails(result) {
    document.querySelector(`#${SHOW_STREAM_THUMBNAILS}`).checked =
      result[SHOW_STREAM_THUMBNAILS] || "";
  }

  function onError(error) {
    console.log(`Error: ${error}`);
  }

  [
    [TWITCH_USERNAME, setTwitchUserName], 
    [SHOW_GAME_BOX_ART, setShowGameBoxart],
    [SHOW_STREAM_THUMBNAILS, setShowStreamThumbnails]
  ].forEach(([setting, setFunction])=> {
    const getting = browser.storage.local.get(setting);
    getting.then(setFunction, onError);
  })
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);
