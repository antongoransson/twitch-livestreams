# twitch-livestreams

Browser extension to get live followed streams on Twitch

## Installation

1. Clone the repository.
2. Run `npm install`
3. Create a file named "env.js" in the "background" folder.
4. Define a variable named "CLIENT_ID" in "env.js", this is the client ID used to communicate with the Twitch API.
5. You can get your client ID [here](https://dev.twitch.tv/console/).
6. Ex. background/env.js:

```
/* exported CLIENT_ID */
const CLIENT_ID="YOUR_SECRET_CLIENT_ID";
```

7. To run the extension use the npm script "firefox.

```
npm run firefox
```
