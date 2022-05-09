/* global TwitchApi */
/* exported getSession, authorize */
const LOCAL_STORAGE = browser.storage.local;
const BROWSER_ACTION = browser.browserAction;

BROWSER_ACTION.setBadgeText({ text: `${0}` });
BROWSER_ACTION.setBadgeBackgroundColor({ color: "#252525" });

let isAuthenticated = false;

async function authorize() {
  const { ACCESS_TOKEN } = await LOCAL_STORAGE.get("ACCESS_TOKEN");
  if (ACCESS_TOKEN === undefined) {
    const successfulAuthentication = await TwitchApi.authorize();
    isAuthenticated = successfulAuthentication;
  } else {
    TwitchApi.setAccessToken(ACCESS_TOKEN);
    isAuthenticated = true;
  }
  return isAuthenticated;
}

async function getGames(liveStreams) {
  let { gamesInfo: savedGamesInfo } = await LOCAL_STORAGE.get("gamesInfo");
  savedGamesInfo = JSON.parse(savedGamesInfo || "{}");
  const unknownGames = liveStreams.filter(
    ({ game_id }) => !savedGamesInfo[game_id]
  );
  if (unknownGames.length === 0) {
    return savedGamesInfo;
  }
  const groupedGamesInfo = await TwitchApi.getGames(unknownGames);
  const unknownGame = {
    name: "Unknown Game",
    boxArtUrl:
      "https://static-cdn.jtvnw.net/ttv-static/404_boxart-{width}x{height}.jpg",
  };
  const allGamesInfo = {
    ...savedGamesInfo,
    ...groupedGamesInfo,
    0: unknownGame,
  };
  LOCAL_STORAGE.set({ gamesInfo: JSON.stringify(allGamesInfo) });
  return allGamesInfo;
}

async function getLiveStreamsInfo() {
  const liveStreams = await getLiveFollowedStreams();
  const gameNames = await getGames(liveStreams);
  const liveStreamsGroupedByGameId = liveStreams.reduce((acc, curr) => {
    acc[curr.game_id || 0] = [...(acc[curr.game_id] || []), curr];
    return acc;
  }, {});
  return {
    liveStreams: liveStreamsGroupedByGameId,
    gameNames,
    nbrLive: liveStreams.length,
  };
}

async function getUserId() {
  let twitchUserId = session.userId;
  if (!twitchUserId) {
    const { localTwitchUserId } = await LOCAL_STORAGE.get("twitchUserId");
    twitchUserId = localTwitchUserId;
  }
  if (!twitchUserId) {
    twitchUserId = await TwitchApi.getUserId();
  }
  session.userId = twitchUserId;
  LOCAL_STORAGE.set({ twitchUserId });
  return twitchUserId;
}

async function getFollowedStreams() {
  const fromId = await getUserId();
  if (!fromId) {
    session = { ...initialState };
    BROWSER_ACTION.setBadgeText({ text: `${0}` });
    return null;
  }
  const allFollowedStreams = await TwitchApi.getFollowedStreams(fromId);
  session.followedStreams = allFollowedStreams;
  return allFollowedStreams;
}

async function getLiveFollowedStreams() {
  const allFollowedStreams = session.followedStreams;
  const liveFollowedStreams = await TwitchApi.getLiveFollowedStreams(
    allFollowedStreams
  );
  return liveFollowedStreams;
}

async function getLiveStreams() {
  const fromId = await getUserId();
  if (!fromId) {
    return null;
  }
  const { liveStreams, gameNames, nbrLive } = await getLiveStreamsInfo(fromId);
  BROWSER_ACTION.setBadgeText({ text: `${nbrLive}` });
  session.liveFollowedStreams = liveStreams;
  session.gameNames = gameNames;
  return session;
}

async function getLocalSettings() {
  const { showGameBoxArt = true, showStreamThumbnails = true } =
    await LOCAL_STORAGE.get();
  session.showGameBoxArt = showGameBoxArt;
  session.showStreamThumbnails = showStreamThumbnails;
}

async function getAllData() {
  const { ACCESS_TOKEN } = await LOCAL_STORAGE.get("ACCESS_TOKEN");
  if (ACCESS_TOKEN) {
    TwitchApi.setAccessToken(ACCESS_TOKEN);
    isAuthenticated = true;
  }
  getLocalSettings();
  return getFollowedStreams().then(() => getLiveStreams());
}

const initialState = {
  followedStreams: [],
  gameNames: [],
  liveFollowedStreams: [],
  userId: null,
  userName: "",
};

let session = {
  ...initialState,
};

function getSession() {
  return session;
}

(() => {
  getAllData().then(() => {
    setInterval(getFollowedStreams, 60 * 60 * 1000);
    setInterval(getLiveStreams, 60 * 2 * 1000);
  });
})();
