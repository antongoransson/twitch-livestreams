/* exported ElementCreator */
const BOX_ART_WIDTH = 60;
const BOX_ART_HEIGHT = 80;

function getTimeDiffUntilNowString(date) {
  const currentTime = new Date().getTime();
  const timeDiff = new Date(currentTime - new Date(date).getTime());
  const numberHoursLive = String(timeDiff.getUTCHours()).padStart(2, "0");
  const numberMinutesive = String(timeDiff.getUTCMinutes()).padStart(2, "0");
  const numberSecondsLive = String(timeDiff.getUTCSeconds()).padStart(2, "0");
  return `${numberHoursLive}:${numberMinutesive}:${numberSecondsLive}`;
}

const ElementCreator = {
  createGameTitleLink: function (gameContainer, gameName, gameUrl) {
    const gameTitleLink = gameContainer.querySelector("[name=game-title]");
    gameTitleLink.textContent = gameName;
    gameTitleLink.setAttribute("title", gameName);
    gameTitleLink.setAttribute("href", gameUrl);
    return gameTitleLink;
  },
  createBoxArtLogo: function (gameContainer, boxArtUrl, gameName) {
    const gameBoxLogo = gameContainer.querySelector("[name=box-logo]");
    boxArtUrl = boxArtUrl
      .replace("{width}", BOX_ART_WIDTH)
      .replace("{height}", BOX_ART_HEIGHT);
    gameBoxLogo.setAttribute("src", boxArtUrl);
    gameBoxLogo.setAttribute("title", gameName);
    return gameBoxLogo;
  },
  createStreamThumbnail: function (streamContainer, stream) {
    const thumbnail = streamContainer.querySelector(
      "[name=streamer-thumbnail]"
    );
    const thumbnailUrl = stream.thumbnail_url
      .replace("{width}", 160)
      .replace("{height}", 100);
    thumbnail.setAttribute("src", thumbnailUrl);
    thumbnail.setAttribute("title", stream.user_name);
    return thumbnail;
  },
  createTooltip: function (streamContainer, stream) {
    streamContainer.querySelector("[name=tooltip-stream-title]").textContent =
      stream.title;
    streamContainer.querySelector(
      "[name=tooltip-stream-started-at]"
    ).textContent = getTimeDiffUntilNowString(stream.started_at);
    streamContainer.querySelector("[name=tooltiptext]").dataset.startedAt =
      stream.started_at;
  },
  createStreamLink: function (streamContainer, stream) {
    const streamLink = streamContainer.querySelector("[name=stream-link]");
    const trimmedUserName = stream.user_name.replace(/\s+/g, "");
    streamLink.childNodes[0].textContent = stream.user_name;
    streamLink.setAttribute("href", `https://www.twitch.tv/${trimmedUserName}`);
    return streamLink;
  },
  createViewCount: function (streamContainer, stream) {
    const viewCount = streamContainer.querySelector("[name=stream-view-count]");
    viewCount.textContent = stream.viewer_count;
    return viewCount;
  },
};
