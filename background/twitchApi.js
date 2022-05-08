/* exported TwitchApi */
/* global CLIENT_ID, LOCAL_STORAGE */

const BASE_URL = "https://api.twitch.tv/helix/";
let ACCESS_TOKEN;
async function doGetRequest(url) {
  try {
    const headers = new Headers({
      "Client-ID": CLIENT_ID,
      "Authorization": `Bearer ${ACCESS_TOKEN}`
    });
    const res = await fetch(url, { headers }).then(res => res.json());
    if (res.status === 401) {
      LOCAL_STORAGE.set({ ACCESS_TOKEN: undefined });
    }
    return res;
  } catch (error) {
    console.error(error);
  }
}

function getFollowedStreamsUrl(data) {
  const streamIds = getUrlParametersAsString(data, "user_id", "to_id");
  return `${BASE_URL}streams?${streamIds}&first=100`;
}

function getUrlParametersAsString(liveStreams, attrName, keyName) {
  return liveStreams
    .map((stream, i) => `${i > 0 ? "&" : ""}${attrName}=${stream[keyName]}`)
    .join("");
}

const TwitchApi = {
  authorize: async function () {
    const redirectUrl = browser.identity.getRedirectURL()
    const url = `https://id.twitch.tv/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${redirectUrl}&response_type=token&force_verify=true`
    try {
      const res = await browser.identity.launchWebAuthFlow({ url, interactive: true })
      ACCESS_TOKEN = res.split("access_token=")[1].split("&")[0]
      LOCAL_STORAGE.set({ ACCESS_TOKEN });
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  },

  getGames: async function (unknownGames) {
    const gameIds = getUrlParametersAsString(unknownGames, "id", "game_id");
    const gamesUrl = `${BASE_URL}games?${gameIds}`;
    const gamesInfo = await doGetRequest(gamesUrl);

    const groupedGamesById = gamesInfo.data.reduce((acc, curr) => {
      acc[curr.id || 0] = { name: curr.name, boxArtUrl: curr.box_art_url };
      return acc;
    }, {});
    return groupedGamesById;
  },

  getFollowedStreams: async function (fromId) {
    let allFollowedStreams = [];
    let pagination = "";
    let followedStreams;
    do {
      const followedStreamsUrl = `${BASE_URL}users/follows?from_id=${fromId}&first=100${pagination ? "&after=" + pagination.cursor : ""
        }`;
      followedStreams = await doGetRequest(followedStreamsUrl);
      pagination = followedStreams.pagination;
      allFollowedStreams.push(...followedStreams.data);
    } while (
      followedStreams.total > 100 &&
      followedStreams.data.length === 100
    );
    return allFollowedStreams;
  },

  getLiveFollowedStreams: async function (allFollowedStreams) {
    const MAX_SIZE = 100;
    let start = 0;
    let end = MAX_SIZE;
    let followedStreams = allFollowedStreams.slice(start, end);
    let totalFollowedStreams = allFollowedStreams.length;
    let allLiveFollowedStreams = [];
    while (totalFollowedStreams > 0) {
      const followedStreamsUrl = getFollowedStreamsUrl(followedStreams);
      const liveFollowedStreams = await doGetRequest(followedStreamsUrl);
      allLiveFollowedStreams.push(...liveFollowedStreams.data);
      totalFollowedStreams -= end - start;
      start = end;
      end = start + Math.min(totalFollowedStreams, MAX_SIZE);
      followedStreams = allFollowedStreams.slice(start, end);
    }
    allLiveFollowedStreams.sort((a, b) => b.viewer_count - a.viewer_count)
    return allLiveFollowedStreams;
  },

  getUserId: async function () {
    const getUserInfoUrl = `${BASE_URL}users`;
    const userInfo = await doGetRequest(getUserInfoUrl);
    if (userInfo.data && userInfo.data.length > 0) {
      return userInfo.data[0].id;
    }
    return null;
  },

  setAccessToken: function (accessToken) {
    ACCESS_TOKEN = accessToken;
  }
};
