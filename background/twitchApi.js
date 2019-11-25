
/* exported TWITCH_API */

const BASE_URL = "https://api.twitch.tv/helix/";
async function doGetRequest(url) {
  const headers = new Headers({
    "Client-ID": "rw3b9oz0ukowvdsvu58g335gqh8q1g"
  });
  const res = await fetch(url, { headers }).then(res => res.json());
  return res;
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

const TWITCH_API = {
  getGames: async function(unknownGames) {
    const gameIds = getUrlParametersAsString(unknownGames, "id", "game_id");
    const gamesUrl = `${BASE_URL}games?${gameIds}`;
    const gamesInfo = await doGetRequest(gamesUrl);

    const groupedGamesById = gamesInfo.data.reduce((acc, curr) => {
      acc[curr.id] = { name: curr.name, boxArtUrl: curr.box_art_url };
      return acc;
    }, {});
    return groupedGamesById;
  },

  getFollowedStreams: async function(fromId) {
    let allFollowedStreams = [];
    let pagination = "";
    let followedStreams;
    do {
      const followedStreamsUrl = `${BASE_URL}users/follows?from_id=${fromId}&first=100${
        pagination ? "&after=" + pagination.cursor : ""
      }`;
      followedStreams = await doGetRequest(followedStreamsUrl);
      pagination = followedStreams.pagination;
      allFollowedStreams = allFollowedStreams.concat(followedStreams.data);
    } while (
      followedStreams.total > 100 &&
      followedStreams.data.length === 100
    );
    return allFollowedStreams;
  },

  getLiveFollowedStreams: async function(allFollowedStreams) {
    const MAX_SIZE = 100;
    let currStartIndex = 0;
    let currEndIndex = MAX_SIZE;
    let followedStreams = allFollowedStreams.slice(
      currStartIndex,
      currEndIndex
    );
    let totalFollowedStreams = followedStreams.length;
    let allLiveFollowedStreams = [];
    while (totalFollowedStreams > 0) {
      const followedStreamsUrl = getFollowedStreamsUrl(followedStreams);
      const liveFollowedStreams = await doGetRequest(followedStreamsUrl);
      allLiveFollowedStreams.push(... liveFollowedStreams.data)
      totalFollowedStreams -= currEndIndex - currStartIndex;
      currStartIndex = currEndIndex;
      currEndIndex = Math.min(totalFollowedStreams, MAX_SIZE);
      followedStreams = allFollowedStreams.slice(currStartIndex, currEndIndex);
    }
    return allLiveFollowedStreams;
  },

  getUserId: async function(twitchUsername) {
    const getUserInfoUrl = `${BASE_URL}users?login=${twitchUsername}`;
    const userInfo = await doGetRequest(getUserInfoUrl);
    if (userInfo.data && userInfo.data.length > 0) {
      return userInfo.data[0].id;
    }
    return null;
  }
};
