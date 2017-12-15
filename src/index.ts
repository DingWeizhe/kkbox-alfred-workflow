import * as request from "request-promise";
import * as fs from "fs";

async function getPicture(identify, url) {
  if (!fs.existsSync(`picture/${identify}`)) {
    fs.writeFileSync(`picture/${identify}`, await request.get(url, { encoding: null }));
  }
  return true;
}

async function main() {
  let access_token;
  let token;
  try {
    token = JSON.parse(fs.readFileSync("access_token", "utf-8"));
    if (token.expires_in > +new Date()) throw Error("expires");

  } catch (e) {
    token = (await request.post("https://account.kkbox.com/oauth2/token", {
      headers: {
        "Authorization": "Basic NzU0M2Y1OTk4MTNlZWMyNDA3ODkzZWU0YWQzYjYwZTA6MTRhNzlmODRhODUxODJlNzE1OGVkYTQxOWMxYzQwZmI=",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      json: true
    }));
    fs.writeFileSync("access_token", JSON.stringify({ access_token: token.access_token, expires_in: token.expires_in + new Date() }));
  }
  access_token = token.access_token;

  let data = await request.get("https://api.kkbox.com/v1.1/search?q=" + encodeURIComponent(process.argv[2]) + "&territory=TW", {
    headers: {
      "Authorization": "Bearer " + access_token
    },
    json: true
  });

  let tracks = data.tracks.data.slice(0, 4);
  let playlists = data.playlists.data.slice(0, 3);
  let albums = data.albums.data.slice(0, 1);
  let artists = data.artists.data.slice(0, 1);

  await Promise.all([]
    .concat(
    artists.map(artist => getPicture(artist.id, artist.images[0].url)),
    albums.map(album => getPicture(album.id, album.images[0].url)),
    playlists.map(playlist => getPicture(playlist.id, playlist.images[0].url)),
    tracks.map(async track => getPicture(track.album.id, track.album.images[0].url))
    ));

  tracks = tracks.map(track => ({
    "title": track.name,
    "subtitle": '[歌曲] ' + track.album.artist.name + " " + track.album.name,
    "arg": track.url,
    "icon": {
      "path": 'picture/' + track.album.id
    }
  }));

  playlists = playlists
    .map(playlist => ({
      "title": playlist.title,
      "subtitle": '[播放清單] ' + playlist.description,
      "arg": playlist.url,
      "icon": {
        "path": 'picture/' + playlist.id
      }
    }));

  artists = artists
    .map(artist => ({
      "title": artist.name,
      "subtitle": '[歌手] ' + artist.name,
      "arg": artist.url,
      "icon": {
        "path": 'picture/' + artist.id
      }
    }));


  albums = albums.map(album => ({
    "title": album.name,
    "subtitle": '[專輯] ' + album.name,
    "arg": album.url,
    "icon": {
      "path": 'picture/' + album.id
    }
  }))

  console.log(JSON.stringify({
    items: [
      ...playlists,
      ...tracks,
      ...albums,
      // ...artists
    ]
  }));
}


main().catch(e => console.log(JSON.stringify({
  items: [
    {
      "title": "ERROR" + e,
    }
  ]
})));