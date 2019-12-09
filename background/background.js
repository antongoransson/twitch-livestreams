/* global TWITCH_API */
/* exported getSession */
const LOCAL_STORAGE = browser.storage.local;
const BROWSER_ACTION = browser.browserAction;

BROWSER_ACTION.setBadgeText({ text: `${0}` });
BROWSER_ACTION.setBadgeBackgroundColor({ color: "#252525" });
BROWSER_ACTION.setBadgeTextColor({ color: "white" });

async function getGames(liveStreams) {
  let { gamesInfo: savedGamesInfo } = await LOCAL_STORAGE.get("gamesInfo");
  savedGamesInfo = JSON.parse(savedGamesInfo || "{}");
  const unknownGames = liveStreams.filter(
    ({ game_id }) => !savedGamesInfo[game_id]
  );
  if (unknownGames.length === 0) {
    return savedGamesInfo;
  }
  const groupedGamesInfo = await TWITCH_API.getGames(unknownGames);
  const unknownGame = {
    name: "Unknown Game",
    boxArtUrl:
      "https://static-cdn.jtvnw.net/ttv-static/404_boxart-{width}x{height}.jpg"
  };
  const allGamesInfo = {
    ...savedGamesInfo,
    ...groupedGamesInfo,
    0: unknownGame
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
    nbrLive: liveStreams.length
  };
}

async function getUserId() {
  const { twitchUsername, twitchUserId } = await LOCAL_STORAGE.get();
  if (twitchUsername === undefined) {
    return null;
  }
  session.userName = twitchUsername;
  if (twitchUserId !== null) {
    session.userId = twitchUserId;
    return twitchUserId;
  }
  const userId = await TWITCH_API.getUserId(twitchUsername);
  if (userId !== null) {
    LOCAL_STORAGE.set({ twitchUserId: userId });
    session.userId = userId;
  }
  return userId;
}

async function getFollowedStreams() {
  const fromId = await getUserId();
  if (fromId === null) {
    session = { ...initialState };
    BROWSER_ACTION.setBadgeText({ text: `${0}` });
    return null;
  }
  const allFollowedStreams = await TWITCH_API.getFollowedStreams(fromId);
  session.followedStreams = allFollowedStreams;
  return allFollowedStreams;
}

async function getLiveFollowedStreams() {
  const allFollowedStreams = session.followedStreams;
  const liveFollowedStreams = await TWITCH_API.getLiveFollowedStreams(
    allFollowedStreams
  );
  return liveFollowedStreams;
}

async function getLiveStreams() {
  const fromId = await getUserId();
  if (fromId === null) {
    return null;
  }
  const { liveStreams, gameNames, nbrLive } = await getLiveStreamsInfo(fromId);
  BROWSER_ACTION.setBadgeText({ text: `${nbrLive}` });
  session.liveFollowedStreams = liveStreams;
  session.gameNames = gameNames;
  return session;
}

function getAllData() {
  return getFollowedStreams().then(() => getLiveStreams());
}

const initialState = {
  followedStreams: [],
  gameNames: [],
  liveFollowedStreams: [],
  userId: null,
  userName: ""
};

let session = {
  ...initialState
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
