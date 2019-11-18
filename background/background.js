const BASE_URL = "https://api.twitch.tv/helix/";
const LOCAL_STORAGE = browser.storage.local;
const BROWSER_ACTION = browser.browserAction;

function getFollowedStreamsUrl(data) {
  const streamIds = getUrlParametersAsString(data, "user_id", "to_id");
  return `${BASE_URL}streams?${streamIds}`;
}

function getUrlParametersAsString(liveStreams, attrName, keyName) {
  return liveStreams
    .map((stream, i) => `${i > 0 ? "&" : ""}${attrName}=${stream[keyName]}`)
    .join("");
}

async function doGetRequest(url) {
  const headers = new Headers({
    "Client-ID": "rw3b9oz0ukowvdsvu58g335gqh8q1g"
  });
  const response = await fetch(url, { headers }).then(res => res.json());
  return response;
}

async function getGameNames(liveStreams) {
  let { gamesInfo: savedGamesInfo } = await LOCAL_STORAGE.get("gamesInfo");
  let unknownGames = liveStreams;
  if (savedGamesInfo) {
    savedGamesInfo = JSON.parse(savedGamesInfo);
    unknownGames = liveStreams.filter(
      ({ game_id }) => !savedGamesInfo[game_id]
    );
    if (unknownGames.length === 0) {
      return savedGamesInfo;
    }
  }

  const gameIds = getUrlParametersAsString(unknownGames, "id", "game_id");
  const gamesUrl = `${BASE_URL}games?${gameIds}`;
  const gamesInfo = await doGetRequest(gamesUrl);

  const groupedGamesInfo = gamesInfo.data.reduce((acc, curr) => {
    acc[curr.id] = { name: curr.name, boxArtUrl: curr.box_art_url };
    return acc;
  }, {});

  const unknownGame = {
    name: "Unknown Game",
    boxArtUrl:
      "https://static-cdn.jtvnw.net/ttv-static/404_boxart-{width}x{height}.jpg"
  };
  const allGamesInfo = {
    ...(savedGamesInfo || {}),
    ...groupedGamesInfo,
    0: unknownGame
  };
  LOCAL_STORAGE.set({ gamesInfo: JSON.stringify(allGamesInfo) });
  return allGamesInfo;
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
  const liveStreamsGroupedByGameId = liveStreams.reduce((acc, curr) => {
    acc[curr.game_id] = [...(acc[curr.game_id] || []), curr];
    return acc;
  }, {});
  return { liveStreams: liveStreamsGroupedByGameId, gameNames };
}

async function getUserId() {
  const { twitchUsername, twitchUserId } = await LOCAL_STORAGE.get();
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
    LOCAL_STORAGE.set({ twitchUserId: userId });
    return userId;
  }
  return null;
}

async function fetchLiveStreams() {
  const fromId = await getUserId();
  if (fromId === null) {
    return null;
  }
  const { liveStreams, gameNames } = await getLiveStreamsInfo(fromId);

  BROWSER_ACTION.setBadgeText({ text: `${Object.keys(liveStreams).length}` });
  BROWSER_ACTION.setBadgeBackgroundColor({ color: "Darkgrey" });
  BROWSER_ACTION.setBadgeTextColor({ color: "white" });
  session = { liveStreams, gameNames };
}

let session = {};

function getSession() {
  return session;
}

fetchLiveStreams();
setInterval(fetchLiveStreams, 60 * 2 * 1000);
