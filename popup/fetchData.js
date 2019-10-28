const BASE_URL = "https://api.twitch.tv/helix/";
async function doGetRequest(url) {
  const headers = new Headers({
    "Client-ID": "rw3b9oz0ukowvdsvu58g335gqh8q1g"
  });
  const response = await fetch(url, { headers });
  const json = await response.json();
  return json;
}

async function getUserId() {
  const { twitchUsername, twitchUserId } = await browser.storage.local.get();
  if (twitchUsername === undefined) {
    return null;
  }
  if (twitchUserId !== null) {
    return twitchUserId;
  }
  const getUserInfoUrl = `${BASE_URL}users?login=${twitchUsername}`;
  const userInfo = await doGetRequest(getUserInfoUrl);
  if (userInfo.data && userInfo.data.length > 0) {
    const userId = userInfo.data[0].id;
    browser.storage.local.set({ twitchUserId: userId });
    return userId;
  }
  return null;
}

function getFollowedStreamsUrl(data) {
  const streamIds = getUrlParametersAsString(data, "user_id", "to_id");
  return `${BASE_URL}streams?${streamIds}`;
}

function groupLiveStreamsById(liveStreams) {
  const liveStreamsGroupedByGameId = {};
  liveStreams.forEach(stream => {
    if (liveStreamsGroupedByGameId[stream.game_id]) {
      liveStreamsGroupedByGameId[stream.game_id].push(stream);
    } else {
      liveStreamsGroupedByGameId[stream.game_id] = [stream];
    }
  });
  return liveStreamsGroupedByGameId;
}

function createStreamLink(streamerUserName) {
  const link = document.createElement("a");
  const trimmedUserName = streamerUserName.replace(/\s+/g, "");
  link.setAttribute("href", "https://www.twitch.tv/" + trimmedUserName);
  link.setAttribute("class", "stream-link tooltip");
  link.appendChild(document.createTextNode(streamerUserName));
  return link;
}

function createStreamContainerDiv() {
  const linkContainerDiv = document.createElement("div");
  linkContainerDiv.setAttribute("class", "stream-link-container");
  return linkContainerDiv;
}

function createToolTipText(text) {
  const toolTipText = document.createElement("span");
  toolTipText.appendChild(document.createTextNode(text));
  toolTipText.setAttribute("class", "tooltiptext");
  return toolTipText;
}

function createSpanGameTitle(gameName) {
  const textSpan = document.createElement("a");
  textSpan.setAttribute("class", "game-title");
  textSpan.setAttribute(
    "href",
    `https://www.twitch.tv/directory/game/${gameName}`
  );
  textSpan.appendChild(document.createTextNode(gameName));
  return textSpan;
}

function createSpanViewerCount(viewerCount) {
  const span = document.createElement("span");
  span.appendChild(document.createTextNode(viewerCount));
  span.setAttribute("class", "stream-view-count");
  return span;
}

function createGameBoxArt(url, gameName) {
  const width = 60;
  const height = 80;
  const link = document.createElement("a");
  link.setAttribute("href", `https://www.twitch.tv/directory/game/${gameName}`);

  let url1 = url.replace("{width}", width).replace("{height}", height);
  const img = document.createElement("img");
  console.log(url1);

  // span.appendChild(document.createTextNode(viewerCount));
  img.setAttribute("src", url1);
  img.setAttribute("class", "box-art-logo");
  link.appendChild(img);
  return link;
}

function showErrorMessage() {
  document.getElementById("error").setAttribute("class", "");
  const errorText = document.createTextNode(
    "Make sure you have put the correct username in the extension settings"
  );
  document.getElementById("error").appendChild(errorText);
  document.getElementById("spinning-loader").setAttribute("class", "hidden");
}

function getUrlParametersAsString(liveStreams, attrName, keyName) {
  return liveStreams
    .map((stream, i) => `${i > 0 ? "&" : ""}${attrName}=${stream[keyName]}`)
    .join("");
}

async function getGameNames(liveStreams) {
  const gameIds = getUrlParametersAsString(liveStreams, "id", "game_id");
  const gamesUrl = BASE_URL + "games?" + gameIds;
  const gamesInfo = await doGetRequest(gamesUrl);
  console.log(gamesInfo);

  return gamesInfo.data.reduce((acc, curr) => {
    acc[curr.id] = { name: curr.name, boxArtUrl: curr.box_art_url };
    return acc;
  }, {});
}

async function getLiveStreams(fromId) {
  let allLiveStreams = [];
  let pagination = "";
  let followedStreams;
  do {
    const followedStreamsUrl = `${BASE_URL}users/follows?from_id=${fromId}&first=100${
      pagination ? "&after=" + pagination.cursor : ""
    }`;
    followedStreams = await doGetRequest(followedStreamsUrl);
    pagination = followedStreams.pagination;
    const liveStreamsUrl = getFollowedStreamsUrl(followedStreams.data);
    const liveStreams = await doGetRequest(liveStreamsUrl);
    allLiveStreams = allLiveStreams.concat(liveStreams.data);
  } while (followedStreams.total > 100 && followedStreams.data.length === 100);
  allLiveStreams.sort((a, b) => b.viewer_count - a.viewer_count);
  return allLiveStreams;
}

async function getData() {
  const fromId = await getUserId();
  if (fromId === null) {
    showErrorMessage();
    return;
  }
  document.getElementById("error").setAttribute("class", "hidden");

  const liveStreams = await getLiveStreams(fromId);
  const gameNames = await getGameNames(liveStreams);
  const liveStreamsGroupedByGameId = groupLiveStreamsById(liveStreams);
  const streamList = document.getElementById("dropdown-content");
  const gameContainerTemplate = document.getElementsByTagName("template")[0];

  const sortedGames = Object.keys(liveStreamsGroupedByGameId).sort((a, b) =>
    (gameNames[a].name || "").localeCompare(gameNames[b].name || "")
  );

  sortedGames.forEach(key => {
    const width = 60;
    const height = 80;

    const gameContainerClone = gameContainerTemplate.content.cloneNode(true);
    const gameTitleLink = gameContainerClone.querySelector("#game-title");
    gameTitleLink.innerText = gameNames[key].name;
    gameTitleLink.href = `https://www.twitch.tv/directory/game/${gameNames[key].name}`;

    const div = document.createElement("div");
    div.setAttribute("class", "game-category");

    const gameBoxLogo = gameContainerClone.querySelector("#box-logo");
    gameBoxLogo.src = `${gameNames[key].boxArtUrl
      .replace("{width}", width)
      .replace("{height}", height)}`;

    const gameBoxLogoLink = gameContainerClone.querySelector("#game-logo-link");
    gameBoxLogoLink.href = `https://www.twitch.tv/directory/game/${gameNames[key].name}`;

    liveStreamsGroupedByGameId[key].forEach(stream => {
      const gameCategoryDiv = gameContainerClone.querySelector(
        "#game-category"
      );
      const streamContainerDiv = document
        .getElementsByTagName("template")[1]
        .content.cloneNode(true);

      const streamLink = streamContainerDiv.querySelector("#stream-link");
      const trimmedUserName = stream.user_name.replace(/\s+/g, "");
      streamLink.innerHTML += stream.user_name;
      streamLink.href = `https://www.twitch.tv/${trimmedUserName}`;

      const viewerCountSpan = createSpanViewerCount(stream.viewer_count);
      streamContainerDiv.querySelector("#tooltiptext").textContent =
        stream.title;

      gameCategoryDiv.appendChild(streamContainerDiv);
      gameCategoryDiv.appendChild(viewerCountSpan);
    });
    streamList.appendChild(gameContainerClone);
  });
  document
    .getElementById("dropdown-content")
    .setAttribute("class", "dropdown-content");
  document.getElementById("spinning-loader").setAttribute("class", "hidden");
}
getData();
