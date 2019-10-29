const BASE_URL = "https://api.twitch.tv/helix/";

function createGameContainer(gameName, boxArtUrl) {
  const width = 60;
  const height = 80;

  const gameContainerTemplate = document.getElementsByTagName("template")[0];
  const gameContainerClone = gameContainerTemplate.content.cloneNode(true);
  const gameTitleLink = gameContainerClone.querySelector("#game-title");
  const gameBoxLogo = gameContainerClone.querySelector("#box-logo");

  const gameUrl = `https://www.twitch.tv/directory/game/${gameName}`;

  gameTitleLink.innerText = gameName;
  gameTitleLink.href = gameUrl;

  gameBoxLogo.src = boxArtUrl
    .replace("{width}", width)
    .replace("{height}", height);

  gameContainerClone.querySelector("#game-logo-link").href = gameUrl;
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

function getFollowedStreamsUrl(data) {
  const streamIds = getUrlParametersAsString(data, "user_id", "to_id");
  return `${BASE_URL}streams?${streamIds}`;
}

function getUrlParametersAsString(liveStreams, attrName, keyName) {
  return liveStreams
    .map((stream, i) => `${i > 0 ? "&" : ""}${attrName}=${stream[keyName]}`)
    .join("");
}

function showErrorMessage() {
  document.getElementById("error").setAttribute("class", "");
  const errorText = document.createTextNode(
    "Make sure you have put the correct username in the extension settings"
  );
  document.getElementById("error").appendChild(errorText);
  document.getElementById("spinning-loader").setAttribute("class", "hidden");
}

async function doGetRequest(url) {
  const headers = new Headers({
    "Client-ID": "rw3b9oz0ukowvdsvu58g335gqh8q1g"
  });
  const response = await fetch(url, { headers });
  const json = await response.json();
  return json;
}

async function getGameNames(liveStreams) {
  let { gamesInfo: savedGamesInfo } = await browser.storage.local.get(
    "gamesInfo"
  );
  savedGamesInfo = JSON.parse(savedGamesInfo);
  const savedGamesIds = Object.keys(savedGamesInfo);
  const unknownGames = liveStreams.filter(
    stream => !savedGamesIds.includes(stream.game_id)
  );
  if (unknownGames.length === 0) {
    return savedGamesInfo;
  }

  const gameIds = getUrlParametersAsString(unknownGames, "id", "game_id");
  const gamesUrl = `${BASE_URL}games?${gameIds}`;
  const gamesInfo = await doGetRequest(gamesUrl);

  const groupedGamesInfo = gamesInfo.data.reduce((acc, curr) => {
    acc[curr.id] = { name: curr.name, boxArtUrl: curr.box_art_url };
    return acc;
  }, {});

  browser.storage.local.set({
    gamesInfo: JSON.stringify({ ...savedGamesInfo, ...groupedGamesInfo })
  });

  return groupedGamesInfo;
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

async function getLiveStreamsInfo(fromId) {
  const liveStreams = await getLiveStreams(fromId);
  const gameNames = await getGameNames(liveStreams);

  const liveStreamsGroupedByGameId = {};
  liveStreams.forEach(stream => {
    if (liveStreamsGroupedByGameId[stream.game_id]) {
      liveStreamsGroupedByGameId[stream.game_id].push(stream);
    } else {
      liveStreamsGroupedByGameId[stream.game_id] = [stream];
    }
  });
  return { liveStreams: liveStreamsGroupedByGameId, gameNames };
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

async function main() {
  const fromId = await getUserId();
  if (fromId === null) {
    showErrorMessage();
    return;
  }
  document.getElementById("error").setAttribute("class", "hidden");

  const { liveStreams, gameNames } = await getLiveStreamsInfo(fromId);
  const streamList = document.getElementById("dropdown-content");

  const sortedGames = Object.keys(liveStreams).sort((a, b) =>
    (gameNames[a].name || "").localeCompare(gameNames[b].name || "")
  );

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
