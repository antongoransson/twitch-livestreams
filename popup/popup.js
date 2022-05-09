/* global ElementCreator, getTimeDiffUntilNowString */
const DEFAULT_ERROR_MESSAGE = "Make sure you are logged in";
const STREAM_LIST = document.getElementById("dropdown-content");
const ERROR_MESSAGE = document.getElementById("error");
const LOADER = document.getElementById("spinning-loader");

function createGameContainer(gameName, boxArtUrl) {
  const gameContainer = document
    .querySelector("#game-container-template")
    .content.cloneNode(true);
  const gameUrl = `https://www.twitch.tv/directory/game/${gameName}`;
  ElementCreator.createGameTitleLink(gameContainer, gameName, gameUrl);
  if (boxArtUrl) {
    ElementCreator.createBoxArtLogo(gameContainer, boxArtUrl, gameName);
  }
  gameContainer
    .querySelector("[name=game-logo-link]")
    .setAttribute("href", gameUrl);
  return gameContainer;
}

function createStreamContainer(stream, showStreamThumbnails) {
  const streamContainer = document
    .querySelector("#stream-container-template")
    .content.cloneNode(true);
  if (showStreamThumbnails) {
    ElementCreator.createStreamThumbnail(streamContainer, stream);
  }
  ElementCreator.createStreamLink(streamContainer, stream);
  ElementCreator.createTooltip(streamContainer, stream);
  ElementCreator.createViewCount(streamContainer, stream);
  return streamContainer;
}

function showErrorMessage(message) {
  ERROR_MESSAGE.setAttribute("class", "");
  const errorText = message || DEFAULT_ERROR_MESSAGE;
  const errorTextNode = document.createTextNode(errorText);
  ERROR_MESSAGE.appendChild(errorTextNode);
  LOADER.setAttribute("class", "hidden");
}

function registerRefreshButton() {
  const refreshIcon = document.querySelector("#refresh");
  refreshIcon.setAttribute("class", "refresh-button");
  refreshIcon.addEventListener("click", refreshStreams);
}

function registerTotalLiveStreamsInfo(result) {
  const totalLiveStreamsSpan = document.querySelector("#total-live-streams");
  const totalLiveStreams = Object.values(result.liveFollowedStreams).reduce(
    (acc, curr) => acc + curr.length,
    0
  );
  totalLiveStreamsSpan.textContent = totalLiveStreams;
}

async function refreshStreams() {
  const BACKGROUND_PAGE = await browser.runtime.getBackgroundPage();
  const refreshButton = document.querySelector("#refresh-button");

  refreshButton.setAttribute("class", "hidden");
  ERROR_MESSAGE.setAttribute("class", "hidden");
  const toBeRemoved = [];
  for (let i = 0; i < STREAM_LIST.children.length; i++) {
    if (STREAM_LIST.children[i].className === "game-container") {
      toBeRemoved.push(STREAM_LIST.children[i]);
    }
  }
  LOADER.setAttribute("class", "lds-hourglass");
  toBeRemoved.forEach((c) => STREAM_LIST.removeChild(c));
  const result = await BACKGROUND_PAGE.getAllData();
  refreshButton.setAttribute("class", "");
  createStreamList(result);
}

function createStreamList(result) {
  const {
    liveFollowedStreams,
    gameNames,
    showGameBoxArt,
    showStreamThumbnails,
  } = result;
  if (Object.keys(liveFollowedStreams).length === 0) {
    showErrorMessage("No followed streams are live");
    return;
  }
  const sortedGames = Object.keys(liveFollowedStreams).sort((a, b) =>
    gameNames[a].name.localeCompare(gameNames[b].name)
  );

  sortedGames.forEach((game) => {
    let { name: gameName, boxArtUrl } = gameNames[game];
    if (!showGameBoxArt) {
      boxArtUrl = null;
    }
    const gameContainerClone = createGameContainer(gameName, boxArtUrl);
    const gameCategory = gameContainerClone.querySelector("[name=game-info]");
    liveFollowedStreams[game].forEach((stream) => {
      gameCategory.appendChild(
        createStreamContainer(stream, showStreamThumbnails)
      );
    });
    STREAM_LIST.appendChild(gameContainerClone);
  });
  LOADER.setAttribute("class", "hidden");
}

async function getSession() {
  const BACKGROUND_PAGE = await browser.runtime.getBackgroundPage();
  const isLoggedIn = await BACKGROUND_PAGE.authorize();
  if (!isLoggedIn) {
    return;
  }
  const result = await BACKGROUND_PAGE.getSession();
  if (!result.userId) {
    const updatedResult = await BACKGROUND_PAGE.getAllData();
    if (updatedResult === null || updatedResult.userId === "") {
      showErrorMessage();
      return;
    }
    return updatedResult;
  }
  return result;
}

function startLiveSinceInterval() {
  setInterval(() => {
    const tooltips = document.getElementsByName("tooltiptext");
    for (let i = 0; i < tooltips.length; i++) {
      const tooltip = tooltips[i];
      const streamStartedAt = tooltip.dataset.startedAt;
      tooltip.querySelector("[name=tooltip-stream-started-at]").textContent =
        getTimeDiffUntilNowString(streamStartedAt);
    }
  }, 1000);
}

async function main() {
  ERROR_MESSAGE.setAttribute("class", "hidden");
  const result = await getSession();
  if (!result) {
    return;
  }
  createStreamList(result);
  registerRefreshButton();
  registerTotalLiveStreamsInfo(result);
  startLiveSinceInterval();
}

main();
