const LOCAL_STORAGE = browser.storage.local;
const BROWSER_ACTION = browser.browserAction;

async function getGames(liveStreams) {
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
  const groupedGamesInfo = await TWITCH_API.getGames(unknownGames);
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

async function getLiveStreamsInfo() {
  const liveStreams = await getLiveFollowedStreams();
  const gameNames = await getGames(liveStreams);
  const liveStreamsGroupedByGameId = liveStreams.reduce((acc, curr) => {
    acc[curr.game_id] = [...(acc[curr.game_id] || []), curr];
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
  session.liveFollowedStreams = liveFollowedStreams;
  return liveFollowedStreams;
}

async function getLiveStreams() {
  const fromId = await getUserId();
  if (fromId === null) {
    return null;
  }
  const { liveStreams, gameNames, nbrLive } = await getLiveStreamsInfo(fromId);

  BROWSER_ACTION.setBadgeText({ text: `${nbrLive}` });
  BROWSER_ACTION.setBadgeBackgroundColor({ color: "#252525" });
  BROWSER_ACTION.setBadgeTextColor({ color: "white" });
  session.liveFollowedStreams = liveStreams;
  session.gameNames = gameNames;
  return session;
}

let session = {
  followedStreams: [],
  gameNames: [],
  liveFollowedStreams: [],
  userId: null,
  userName: ""
};

function getSession() {
  return session;
}

(() => {
  getFollowedStreams().then(() => {
    getLiveStreams();
    setInterval(getFollowedStreams, 60 * 60 * 1000);
    setInterval(getLiveStreams, 60 * 2 * 1000);
  });
})();
