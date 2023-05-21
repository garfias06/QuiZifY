const { release } = require('process');
const sequelize = require('../config/connection');
const Artist = require('../models/artist');
const Song = require('../models/song');
const User = require('../models/user');
const userData = require('./userData.json');

const fetch = require('isomorphic-fetch');

// Fetch Artist Data
async function fetchArtistsFromAPI() {
  try {
    const response = await fetch('https://api.deezer.com/chart/0/artists?limit=40');
    const data = await response.json();

    const artists = data.data.map((artist) => ({
      id: artist.id,
      name: artist.name,
      picture: artist.picture,
      link: artist.link,
    }));
    console.log('Artists:', artists);
    return artists;
  } catch (err) {
    console.error('Error fetching artists:', err);
    throw new Error('Failed to fetch artists from API');
  }
}

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

// Fetch Songs
async function fetchSongDate(trackId) {
  const response = await fetch(`https://api.deezer.com/track/${trackId}`);
  const data = await response.json();

  if (!data) {
    console.error(`No songs found for track with id ${trackId}`);
    return null;
  }

  const releaseDate = data.release_date || '';

  return releaseDate;
}

async function fetchSongsFromAPI(artistId) {
  try {
    const response = await fetch(`https://api.deezer.com/artist/${artistId}/top?limit=1`);
    const data = await response.json();

    if (!Array.isArray(data.data) || data.data.length === 0) {
      console.error(`No songs found for artist with id ${artistId}`);
      return null;
    }

    const trackId = data.data[0].id;
    const previewTrackUrl = data.data[0].preview;
    console.log('Preview Track URL:', previewTrackUrl);
    const releaseDate = await fetchSongDate(trackId);

    const song = {
      id: trackId,
      title: data.data[0].title || '',
      release_date: releaseDate || '',
      preview_track_url: previewTrackUrl,
    };
    console.log('Song:', song);
    return song;
  } catch (err) {
    console.error('Error fetching songs:', err);
    throw new Error('Failed to fetch songs from API');
  }
}

// Function to seed Artist and Song
const seedDatabase = async () => {
  const artistData = await fetchArtistsFromAPI();
  const artists = await Artist.bulkCreate(artistData, { returning: true });

  for (let artist of artists) {
    const songData = await fetchSongsFromAPI(artist.id);

    if (songData) {
      const song = {
        id: songData.id,
        title: songData.title,
        release_date: songData.release_date,
        preview_track_url: songData.preview_track_url,
        artist_id: artist.id,
      };


      await Song.create(song);
    }
  }
};

// function to seed database
const syncAndSeedDatabase = async () => {

  await sequelize.sync({ force: true });

  await User.bulkCreate(userData);

  await seedDatabase();
};

syncAndSeedDatabase();