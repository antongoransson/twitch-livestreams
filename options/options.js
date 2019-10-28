function saveOptions(e) {
  e.preventDefault();
  browser.storage.local.set({
    twitchUsername: document.querySelector("#twitchUsername").value,
    twitchUserId: null
  });
}

function restoreOptions() {
  function setCurrentChoice(result) {
    document.querySelector("#twitchUsername").value =
      result.twitchUsername || "";
  }

  function onError(error) {
    console.log(`Error: ${error}`);
  }

  const getting = browser.storage.local.get("twitchUsername");
  getting.then(setCurrentChoice, onError);
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);
