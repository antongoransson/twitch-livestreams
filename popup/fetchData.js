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
  const { twitchUsername } = await browser.storage.local.get();
  if (twitchUsername === undefined) {
    return null;
  }
  const getUserInfoUrl = `${BASE_URL}users?login=${twitchUsername}`;
  const userInfo = await doGetRequest(getUserInfoUrl);
  if (userInfo.data && userInfo.data.length > 0) {
    return userInfo.data[0].id;
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
  const textSpan = document.createElement("span");
  textSpan.setAttribute("class", "game-title");
  textSpan.appendChild(document.createTextNode(gameName));
  return textSpan;
}

function createSpanViewerCount(viewerCount) {
  const span = document.createElement("span");
  span.appendChild(document.createTextNode(viewerCount));
  span.setAttribute("class", "stream-view-count");
  return span;
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
  return gamesInfo.data.reduce((acc, curr) => {
    acc[curr.id] = curr.name;
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

  const sortedGames = Object.keys(liveStreamsGroupedByGameId).sort((a, b) =>
    (gameNames[a] || "").localeCompare(gameNames[b] || "")
  );

  sortedGames.forEach(key => {
    const textSpan = createSpanGameTitle(gameNames[key]);
    const div = document.createElement("div");
    div.setAttribute("class", "game-category");
    div.appendChild(textSpan);
    liveStreamsGroupedByGameId[key].forEach(stream => {
      const streamContainerDiv = createStreamContainerDiv();
      const link = createStreamLink(stream.user_name);
      const viewerCountSpan = createSpanViewerCount(stream.viewer_count);
      const toolTipText = createToolTipText(stream.title);
      link.appendChild(toolTipText);
      streamContainerDiv.appendChild(link);
      div.appendChild(streamContainerDiv);
      div.appendChild(viewerCountSpan);
    });
    streamList.appendChild(div);
  });
  document.getElementById("spinning-loader").setAttribute("class", "hidden");
}
getData();
