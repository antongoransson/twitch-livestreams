const SHOW_GAME_BOX_ART = "showGameBoxArt";
const SHOW_STREAM_THUMBNAILS = "showStreamThumbnails";
function saveOptions(e) {
  e.preventDefault();
  browser.storage.local.set({
    [SHOW_GAME_BOX_ART]: document.querySelector(`#${SHOW_GAME_BOX_ART}`)
      .checked,
    [SHOW_STREAM_THUMBNAILS]: document.querySelector(
      `#${SHOW_STREAM_THUMBNAILS}`
    ).checked,
    twitchUserId: null,
  });
  browser.runtime.getBackgroundPage().then((page) => page.getAllData());
}

function restoreOptions() {
  function setShowGameBoxart(result) {
    const defaultValue = true;
    let checkboxValue = result[SHOW_GAME_BOX_ART];
    if (checkboxValue === undefined) {
      checkboxValue = defaultValue;
    }
    document.querySelector(`#${SHOW_GAME_BOX_ART}`).checked = checkboxValue;
  }

  function setShowStreamThumbnails(result) {
    const defaultValue = true;
    let checkboxValue = result[SHOW_STREAM_THUMBNAILS];
    if (checkboxValue === undefined) {
      checkboxValue = defaultValue;
    }
    document.querySelector(`#${SHOW_STREAM_THUMBNAILS}`).checked =
      checkboxValue;
  }

  function onError(error) {
    console.log(`Error: ${error}`);
  }

  [
    [SHOW_GAME_BOX_ART, setShowGameBoxart],
    [SHOW_STREAM_THUMBNAILS, setShowStreamThumbnails],
  ].forEach(([setting, setFunction]) => {
    const getting = browser.storage.local.get(setting);
    getting.then(setFunction, onError);
  });
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);
