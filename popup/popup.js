const DEFAULT_ERROR_MESSAGE =
  "Make sure you are logged in";
const BOX_ART_WIDTH = 60;
const BOX_ART_HEIGHT = 80;
const STREAM_LIST = document.getElementById("dropdown-content");
const ERROR_MESSAGE = document.getElementById("error");
const LOADER = document.getElementById("spinning-loader");

function createGameContainer(gameName, boxArtUrl) {
  const gameContainerTemplate = document.getElementsByTagName("template")[0];
  const gameContainerClone = gameContainerTemplate.content.cloneNode(true);
  const gameTitleLink = gameContainerClone.querySelector("#game-title");
  const gameUrl = `https://www.twitch.tv/directory/game/${gameName}`;

  gameTitleLink.textContent = gameName;
  gameTitleLink.setAttribute("title", gameName);
  gameTitleLink.setAttribute("href", gameUrl);
  if (boxArtUrl) {
    const gameBoxLogo = gameContainerClone.querySelector("#box-logo");
    boxArtUrl = boxArtUrl
      .replace("{width}", BOX_ART_WIDTH)
      .replace("{height}", BOX_ART_HEIGHT);
    gameBoxLogo.setAttribute("src", boxArtUrl);
    gameBoxLogo.setAttribute("title", gameName);
  }
  gameContainerClone
    .querySelector("#game-logo-link")
    .setAttribute("href", gameUrl);
  return gameContainerClone;
}

function createStreamContainer(stream, showStreamThumbnails) {
  const streamContainer = document
    .getElementsByTagName("template")[1]
    .content.cloneNode(true);
  const streamLink = streamContainer.querySelector("#stream-link");
  const viewCount = streamContainer.querySelector("#stream-view-count");

  if (showStreamThumbnails) {
    const thumbnail = streamContainer.querySelector("#thumbnail");
    const thumbnailUrl = stream.thumbnail_url
      .replace("{width}", 80)
      .replace("{height}", 50);
    thumbnail.setAttribute("src", thumbnailUrl);
  }
  const trimmedUserName = stream.user_name.replace(/\s+/g, "");
  streamLink.childNodes[0].textContent = stream.user_name;
  streamLink.setAttribute("href", `https://www.twitch.tv/${trimmedUserName}`);
  streamContainer.querySelector("#tooltiptext").textContent = stream.title;
  viewCount.textContent = stream.viewer_count;
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
  const totalLiveStreams = Object.values(result.liveFollowedStreams)
    .reduce((acc, curr) => acc + curr.length, 0)
  totalLiveStreamsSpan.textContent = totalLiveStreams;
}

async function refreshStreams() {
  const BACKGROUND_PAGE = await browser.runtime.getBackgroundPage();
  const refreshButton = document.getElementById("refresh-button");

  refreshButton.setAttribute("class", "hidden");
  ERROR_MESSAGE.setAttribute("class", "hidden");
  const toBeRemoved = [];
  for (let i = 0; i < STREAM_LIST.children.length; i++) {
    if (STREAM_LIST.children[i].className === "game-container") {
      toBeRemoved.push(STREAM_LIST.children[i]);
    }
  }
  LOADER.setAttribute("class", "lds-hourglass");
  toBeRemoved.forEach(c => STREAM_LIST.removeChild(c));
  const result = await BACKGROUND_PAGE.getAllData();
  refreshButton.setAttribute("class", "");
  createStreamList(result);
}

function createStreamList(result) {
  const { liveFollowedStreams, gameNames, showGameBoxArt, showStreamThumbnails } = result;
  if (Object.keys(liveFollowedStreams).length === 0) {
    showErrorMessage("No followed streams are live");
    return;
  }
  const sortedGames = Object.keys(liveFollowedStreams).sort((a, b) =>
    gameNames[a].name.localeCompare(gameNames[b].name)
  );

  sortedGames.forEach(key => {
    let { name: gameName, boxArtUrl } = gameNames[key];
    if (!showGameBoxArt) {
      boxArtUrl = null;
    }
    const gameContainerClone = createGameContainer(gameName, boxArtUrl);
    const gameCategory = gameContainerClone.querySelector("#game-info");
    liveFollowedStreams[key].forEach(stream => {
      gameCategory.appendChild(createStreamContainer(stream, showStreamThumbnails));
    });
    STREAM_LIST.appendChild(gameContainerClone);
  });
  LOADER.setAttribute("class", "hidden");
}

async function getSession() {
  const BACKGROUND_PAGE = await browser.runtime.getBackgroundPage();
  const isLoggedIn = await BACKGROUND_PAGE.authorize();
  if (!isLoggedIn) {
    return
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

async function main() {
  ERROR_MESSAGE.setAttribute("class", "hidden");
  const result = await getSession();
  if (!result) {
    return;
  }
  createStreamList(result);
  registerRefreshButton();
  registerTotalLiveStreamsInfo(result);
}

main();
