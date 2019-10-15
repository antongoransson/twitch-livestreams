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
  const storage = await browser.storage.local.get();
  const response = await doGetRequest(url + storage.twitchUsername);
  if (response.data && response.data.length > 0) {
    return response.data[0].id;
  }
  return null;
}

function getFollowingStreamsURLString(data) {
  return (
    "https://api.twitch.tv/helix/streams?" +
    data
      .map(stream => `&user_id=${stream.to_id}`)
      .join("")
      .substring(1)
  );
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

async function getGameNames(liveStreams) {
  const repsonse = await doGetRequest(
    "https://api.twitch.tv/helix/games?" +
      liveStreams
        .map(stream => `&id=${stream.game_id}`)
        .join("")
        .substring(1)
  );
  return repsonse.data.reduce((acc, curr) => {
    acc[curr.id] = curr.name;
    return acc;
  }, {});
}

async function getData() {
  const fromId = await getUserId();
  if (fromId === null) {
    document.getElementById("error").setAttribute("class", "");
    document
      .getElementById("error")
      .appendChild(
        document.createTextNode(
          "Make sure you have put the correct username in the extension settings"
        )
      );
    return;
  }
  document.getElementById("error").setAttribute("class", "hidden");
  let response = await doGetRequest(
    `https://api.twitch.tv/helix/users/follows?from_id=${fromId}&first=100`
  );
  let { data, pagination } = response;
  let requestString = getFollowingStreamsURLString(data);

  let liveStreams = await doGetRequest(requestString);

  if (response.total > 100) {
    response = await doGetRequest(
      "https://api.twitch.tv/helix/users/follows?from_id=31127228&first=100&after=" +
        pagination.cursor
    );
    requestString = getFollowingStreamsURLString(response.data);
    let liveStreams2 = await doGetRequest(requestString);
    liveStreams = [...liveStreams.data, ...liveStreams2.data];
  }
  liveStreams.sort((a, b) => b.viewer_count - a.viewer_count);

  const liveStreamsGroupedByGameId = groupLiveStreamsById(liveStreams);
  const gameNames = await getGameNames(liveStreams);
  const element = document.getElementById("dropdown-content");

  let sortedGames = Object.keys(liveStreamsGroupedByGameId).sort((a, b) =>
    (gameNames[a] || "").localeCompare(gameNames[b] || "")
  );

  sortedGames.forEach(key => {
    const textSpan = document.createElement("span");
    textSpan.setAttribute("class", "game-title");
    textSpan.appendChild(document.createTextNode(gameNames[key]));
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
      //div.append([link, span]);
    });
    element.appendChild(div);
  });
}

// document.addEventListener("DOMContentLoaded", function() {
//   browser.runtime
//     .sendMessage({
//       type: "getText"
//     })
//     .then(function(data) {
//       console.log(data);
//       const { gameNames, sortedGames, liveStreamsGroupedByGameId } = data;
//       const element = document.getElementById("dropdown-content");
//       sortedGames.forEach(key => {
//         const textSpan = document.createElement("span");
//         textSpan.setAttribute("class", "game-title");
//         textSpan.appendChild(document.createTextNode(gameNames[key]));
//         const div = document.createElement("div");
//         div.setAttribute("class", "game-category");
//         div.appendChild(textSpan);
//         liveStreamsGroupedByGameId[key].forEach(stream => {
//           const link = createStreamLink(stream);
//           div.appendChild(link);
//           const span = document.createElement("span");
//           span.appendChild(document.createTextNode(stream.viewer_count));
//           span.setAttribute("class", "stream-view-count");
//           div.appendChild(span);
//           //div.append([link, span]);
//         });
//         element.appendChild(div);
//       });
//     });
// });
getData();
