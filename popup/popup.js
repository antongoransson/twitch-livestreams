const DEFAULT_ERROR_MESSAGE =
  "Make sure you have put the correct username in the extension settings";
const BOX_ART_WIDTH = 60;
const BOX_ART_HEIGHT = 80;
const STREAM_LIST = document.getElementById("dropdown-content");
const ERROR_MESSAGE = document.getElementById("error");
const LOADER = document.getElementById("spinning-loader");

function createGameContainer(gameName, boxArtUrl) {
  const gameContainerTemplate = document.getElementsByTagName("template")[0];
  const gameContainerClone = gameContainerTemplate.content.cloneNode(true);
  const gameTitleLink = gameContainerClone.querySelector("#game-title");
  const gameBoxLogo = gameContainerClone.querySelector("#box-logo");
  const gameUrl = `https://www.twitch.tv/directory/game/${gameName}`;

  gameTitleLink.textContent = gameName;
  gameTitleLink.setAttribute("title", gameName);
  gameTitleLink.setAttribute("href", gameUrl);
  boxArtUrl = boxArtUrl
    .replace("{width}", BOX_ART_WIDTH)
    .replace("{height}", BOX_ART_HEIGHT);
  gameBoxLogo.setAttribute("src", boxArtUrl);
  gameBoxLogo.setAttribute("title", gameName);
  gameContainerClone
    .querySelector("#game-logo-link")
    .setAttribute("href", gameUrl);
  return gameContainerClone;
}

function createStreamContainer(stream) {
  const streamContainer = document
    .getElementsByTagName("template")[1]
    .content.cloneNode(true);
  const streamLink = streamContainer.querySelector("#stream-link");
  const viewCount = streamContainer.querySelector("#stream-view-count");

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
  const { liveFollowedStreams, gameNames } = result;
  if (Object.keys(liveFollowedStreams).length === 0) {
    showErrorMessage("No followed streams are live");
    return;
  }
  const sortedGames = Object.keys(liveFollowedStreams).sort((a, b) =>
    gameNames[a].name.localeCompare(gameNames[b].name)
  );

  sortedGames.forEach(key => {
    const { name: gameName, boxArtUrl } = gameNames[key];
    const gameContainerClone = createGameContainer(gameName, boxArtUrl);
    const gameCategory = gameContainerClone.querySelector("#game-info");
    liveFollowedStreams[key].forEach(stream => {
      gameCategory.appendChild(createStreamContainer(stream));
    });
    STREAM_LIST.appendChild(gameContainerClone);
  });
  LOADER.setAttribute("class", "hidden");
}

async function getSession() {
  const BACKGROUND_PAGE = await browser.runtime.getBackgroundPage();
  const result = BACKGROUND_PAGE.getSession();
  if (result.userName === "" || result.userId === null) {
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
}

main();
