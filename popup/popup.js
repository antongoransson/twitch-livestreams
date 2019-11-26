function createGameContainer(gameName, boxArtUrl) {
  const width = 60;
  const height = 80;

  const gameContainerTemplate = document.getElementsByTagName("template")[0];
  const gameContainerClone = gameContainerTemplate.content.cloneNode(true);
  const gameTitleLink = gameContainerClone.querySelector("#game-title");
  const gameBoxLogo = gameContainerClone.querySelector("#box-logo");

  const gameUrl = `https://www.twitch.tv/directory/game/${gameName}`;

  gameTitleLink.textContent = gameName;
  gameTitleLink.setAttribute("href", gameUrl);

  gameBoxLogo.setAttribute(
    "src",
    boxArtUrl.replace("{width}", width).replace("{height}", height)
  );
  gameContainerClone.querySelector("#game-logo-link").setAttribute("href", gameUrl);
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
  streamLink.href = `https://www.twitch.tv/${trimmedUserName}`;

  streamContainer.querySelector("#tooltiptext").textContent = stream.title;
  viewCount.textContent = stream.viewer_count;
  return streamContainer;
}

function showErrorMessage() {
  document.getElementById("error").setAttribute("class", "");
  const errorText =
    "Make sure you have put the correct username in the extension settings";
  const errorTextNode = document.createTextNode(errorText);
  document.getElementById("error").appendChild(errorTextNode);
  document.getElementById("spinning-loader").setAttribute("class", "hidden");
}

async function getSession() {
  const BACKGROUND_PAGE = await browser.runtime.getBackgroundPage();
  const result = BACKGROUND_PAGE.getSession();
  if (result.userName === "" || result.userId === null) {
    const updateResult = await BACKGROUND_PAGE.getAllData();
    if (updateResult === null || updateResult.userId === "") {
      showErrorMessage();
      return;
    }
    return updateResult;
  }
  return result;
}

async function main() {
  document.getElementById("error").setAttribute("class", "hidden");
  const result = await getSession();
  if (!result) {
    return;
  }
  const { liveFollowedStreams: liveStreams, gameNames } = result;
  const sortedGames = Object.keys(liveStreams).sort((a, b) =>
    (gameNames[a].name || "").localeCompare(gameNames[b].name || "")
  );

  const streamList = document.getElementById("dropdown-content");
  sortedGames.forEach(key => {
    const { name: gameName, boxArtUrl } = gameNames[key];
    const gameContainerClone = createGameContainer(gameName, boxArtUrl);
    const gameCategory = gameContainerClone.querySelector("#game-info");

    liveStreams[key].forEach(stream => {
      gameCategory.appendChild(createStreamContainer(stream));
    });

    streamList.appendChild(gameContainerClone);
  });
  document.getElementById("spinning-loader").setAttribute("class", "hidden");
}

main();
