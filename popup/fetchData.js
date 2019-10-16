async function doGetRequest(url) {
  const headers = new Headers({
    "Client-ID": "rw3b9oz0ukowvdsvu58g335gqh8q1g"
  });
  const response = await fetch(url, { headers });
  const json = await response.json();
  return json;
}

async function getUserId() {
  const url = "https://api.twitch.tv/helix/users?login=";
  const { twitchUsername } = await browser.storage.local.get();
  if (twitchUsername === undefined) {
    return null;
  }
  const userInfo = await doGetRequest(url + twitchUsername);
  if (userInfo.data && userInfo.data.length > 0) {
    return userInfo.data[0].id;
  }
  return null;
}

function getFollowedStreamsUrl(data) {
  const streamIds = getUrlParametersAsString(data, "user_id", "to_id");
  return "https://api.twitch.tv/helix/streams?" + streamIds;
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

function createStreamLink(stream) {
  const link = document.createElement("a");
  link.setAttribute("href", "https://www.twitch.tv/" + stream.user_name);
  link.setAttribute("class", "stream-link");
  link.appendChild(document.createTextNode(stream.user_name));
  return link;
}

function createSpanGameTitle(gameName) {
  const textSpan = document.createElement("span");
  textSpan.setAttribute("class", "game-title");
  textSpan.appendChild(document.createTextNode(gameName));
  return textSpan;
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
  const gamesUrl = "https://api.twitch.tv/helix/games?" + gameIds;
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
    const followedStreamsUrl = `https://api.twitch.tv/helix/users/follows?from_id=${fromId}&first=100${
      pagination ? "&after=" + pagination.cursor : ""
    }`;
    followedStreams = await doGetRequest(followedStreamsUrl);
    pagination = followedStreams.pagination;
    const liveStreamsUrl = getFollowedStreamsUrl(followedStreams.data);
    const liveStreams = await doGetRequest(liveStreamsUrl);
    allLiveStreams = [...allLiveStreams, ...liveStreams.data];
  } while (
    followedStreams.total > 100 &&
    followedStreams.data &&
    followedStreams.data.length === 100
  );

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
  const liveStreamsGroupedByGameId = groupLiveStreamsById(liveStreams);
  const gameNames = await getGameNames(liveStreams);
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
      const link = createStreamLink(stream);
      div.appendChild(link);
      const span = document.createElement("span");
      span.appendChild(document.createTextNode(stream.viewer_count));
      span.setAttribute("class", "stream-view-count");
      div.appendChild(span);
    });
    streamList.appendChild(div);
  });
  document.getElementById("spinning-loader").setAttribute("class", "hidden");
}
getData();
