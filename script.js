/*
 * BurnVinyl App
 *
 * This script powers the BurnVinyl single‑page application. It
 * combines features from the provided mockups with additional
 * functionality: authenticating with Spotify or Apple Music,
 * searching and creating playlists, burning tracks to vinyl via
 * Bluetooth, managing Wi‑Fi on a Raspberry Pi device, and
 * shopping for burning essentials. The app manages state in
 * memory and uses the Web Bluetooth API and MusicKit SDK. To
 * enable Spotify or Apple functionality you must provide your
 * own client credentials (see constants below).
 */

// ===================== CONFIGURATION ===================== //
// Replace these with your own credentials. Without valid
// credentials the respective login flows will not work.
const SPOTIFY_CLIENT_ID = 'YOUR_SPOTIFY_CLIENT_ID';
// Redirect URI should match the location where this page is served.
const SPOTIFY_REDIRECT_URI = window.location.origin + window.location.pathname;
const SPOTIFY_SCOPES = 'user-read-private user-read-email';

const APPLE_DEVELOPER_TOKEN = 'YOUR_APPLE_DEVELOPER_TOKEN';
// ========================================================== //

// Global application state
const state = {
  user: null,
  playlists: [],
  songs: [],
  friends: [],
  feedEvents: [],
  storeItems: [],
  cart: [],
  currentPlaylist: null,
  addingToPlaylist: null,
  currentBurn: null,
  spotify: null, // will hold {accessToken}
  apple: null,   // will hold {userToken}
};

// Helper to generate unique IDs
const generateId = () => '_' + Math.random().toString(36).substr(2, 9);

// =============== DOM REFERENCES =============== //
const screens = {
  login: document.getElementById('login-screen'),
  home: document.getElementById('home-screen'),
  search: document.getElementById('search-screen'),
  createPlaylist: document.getElementById('create-playlist-screen'),
  playlist: document.getElementById('playlist-screen'),
  burnOverlay: document.getElementById('burn-overlay'),
  burnComplete: document.getElementById('burn-complete-screen'),
  order: document.getElementById('order-screen'),
  library: document.getElementById('library-screen'),
  feed: document.getElementById('feed-screen'),
  store: document.getElementById('store-screen'),
  cart: document.getElementById('cart-screen'),
  friend: document.getElementById('friend-screen'),
  groupBurn: document.getElementById('group-burn-screen'),
  device: document.getElementById('device-screen'),
  burnOptions: document.getElementById('burn-options-modal'),
  checkout: document.getElementById('checkout-screen'),
};

const navBar = document.getElementById('nav-bar');
const navItems = navBar.querySelectorAll('.nav-item');
const plusBtn = document.getElementById('plus-btn');

// Home
const artistPlaylistsRow = document.getElementById('artist-playlists');
const friendBurnsRow = document.getElementById('friend-burns');
const homeSearch = document.getElementById('home-search');

// Search
const searchInput = document.getElementById('search-input');
const searchContent = document.getElementById('search-content');

// Create playlist
const coverPreview = document.getElementById('cover-preview');
const changeCoverBtn = document.getElementById('change-cover');
const playlistNameInput = document.getElementById('playlist-name');
const createPlaylistBtn = document.getElementById('create-playlist-btn');

// Playlist
const playlistTitle = document.getElementById('playlist-title');
const playlistCover = document.getElementById('playlist-cover');
const playlistNameDisplay = document.getElementById('playlist-name-display');
const playlistCreatorDisplay = document.getElementById('playlist-creator');
const playlistSongCount = document.getElementById('playlist-songcount');
const playlistSongsList = document.getElementById('playlist-songs');
const addSongBtn = document.getElementById('add-song-btn');
const burnPlaylistBtn = document.getElementById('burn-playlist-btn');

// Burn overlay & complete
const tapBurnBtn = document.getElementById('tap-burn-btn');
const burnCompleteTitle = document.getElementById('burn-complete-title');
const toggleShare = document.getElementById('toggle-share');
const toggleArtwork = document.getElementById('toggle-artwork');
const burnCompleteBtn = document.getElementById('burn-complete-btn');

// Order
const orderConfirmBtn = document.getElementById('order-confirm-btn');

// Library
const libraryContent = document.getElementById('library-content');
const libraryTabPlaylists = document.getElementById('library-tab-playlists');
const libraryTabBurns = document.getElementById('library-tab-burns');

// Feed
const feedContent = document.getElementById('feed-content');

// Store
const storeContent = document.getElementById('store-content');
const cartBar = document.getElementById('cart-bar');
const cartCount = document.getElementById('cart-count');
const openCartBtn = document.getElementById('open-cart');

// Cart
const cartContent = document.getElementById('cart-content');
const checkoutBtn = document.getElementById('checkout-btn');

// Checkout page inputs
const checkoutNameInp = document.getElementById('checkout-name');
const checkoutEmailInp = document.getElementById('checkout-email');
const checkoutStreetInp = document.getElementById('checkout-street');
const checkoutCityInp = document.getElementById('checkout-city');
const checkoutStateInp = document.getElementById('checkout-state');
const checkoutZipInp = document.getElementById('checkout-zip');
const checkoutSubmitBtn = document.getElementById('checkout-submit');

// Friend profile
const friendNameHeader = document.getElementById('friend-name');
const friendContent = document.getElementById('friend-content');

// Group burn
const friendSearchInput = document.getElementById('friend-search');
const friendListContainer = document.getElementById('friend-list');
const groupBurnBtn = document.getElementById('group-burn-btn');

// Burn options modal
const burnOptionsModal = document.getElementById('burn-options-modal');

// Device connectivity elements
const bleConnectBtn = document.getElementById('bleConnectBtn');
const bleDisconnectBtn = document.getElementById('bleDisconnectBtn');
const bleModeSel = document.getElementById('bleMode');
const statusBtn = document.getElementById('statusBtn');
const startPollBtn = document.getElementById('startPollBtn');
const stopPollBtn = document.getElementById('stopPollBtn');
const bleLog = document.getElementById('bleLog');
const bleAdvancedHeader = document.getElementById('bleAdvancedHeader');
const bleAdvancedContent = document.getElementById('bleAdvancedContent');

const wifiScanBtn = document.getElementById('wifiScanBtn');
const wifiStatusBtn = document.getElementById('wifiStatusBtn');
const wifiOffBtn = document.getElementById('wifiOffBtn');
const wifiSsidSel = document.getElementById('wifiSsid');
const wifiPassInp = document.getElementById('wifiPass');
const wifiJoinBtn = document.getElementById('wifiJoinBtn');
const wifiStateSpan = document.getElementById('wifiState');
const wifiIpSpan = document.getElementById('wifiIp');

// =============== NAVIGATION =============== //
function showScreen(name) {
  Object.keys(screens).forEach(key => {
    screens[key].classList.add('hidden');
  });
  // Hide modal overlay by default
  burnOptionsModal.classList.add('hidden');
  // Show nav bar except on login and modal screens
  if (name === 'login' || name === 'burnOverlay' || name === 'burnComplete' || name === 'burnOptions') {
    navBar.classList.add('hidden');
  } else {
    navBar.classList.remove('hidden');
  }
  // Control visibility of floating burn button per screen
  const showPlus = ['home','feed','library'].includes(name);
  plusBtn.style.display = showPlus ? 'flex' : 'none';
  screens[name].classList.remove('hidden');
  // Update nav active states
  ['home','feed','library','store','device'].forEach(itemName => {
    navItems.forEach(item => {
      if (item.dataset.target === name) {
        item.classList.add('active');
      } else if (item.dataset.target === itemName) {
        item.classList.remove('active');
      }
    });
  });
}

// =============== SAMPLE DATA =============== //
function randomGradient() {
  const colors = ['#ff3b30', '#ff9500', '#ffcc00', '#4cd964', '#5ac8fa', '#0579ff', '#5856d6', '#ff2d55'];
  const c1 = colors[Math.floor(Math.random() * colors.length)];
  let c2;
  do {
    c2 = colors[Math.floor(Math.random() * colors.length)];
  } while (c2 === c1);
  return `linear-gradient(135deg, ${c1}, ${c2})`;
}

function initSampleData() {
  // Sample songs used when no search results are yet available
  state.songs = [
    { id: generateId(), title: 'Midnight Groove', artist: 'DJ SOKY', duration: '3:24' },
    { id: generateId(), title: 'Neon Lights', artist: 'DJ SOKY', duration: '4:10' },
    { id: generateId(), title: 'Golden Hour', artist: 'Ari N', duration: '2:58' },
  ];
  state.playlists = [];
  state.friends = [
    { id: generateId(), name: 'Alex', avatar: null, burnt: [], isFriend: true },
    { id: generateId(), name: 'Sam', avatar: null, burnt: [], isFriend: true },
  ];
  state.feedEvents = [];
  state.storeItems = [
    { id: generateId(), name: 'Burn Record', description: 'High‑quality blank vinyl record to hold your burnt playlist.', price: 15 },
    { id: generateId(), name: 'Burner', description: 'The hardware you need to burn your playlists onto vinyl.', price: 200 },
    { id: generateId(), name: 'Artwork Print', description: 'Premium print of your playlist cover art.', price: 40 },
  ];
}

// =============== RENDER FUNCTIONS =============== //
function renderHome() {
  artistPlaylistsRow.innerHTML = '';
  friendBurnsRow.innerHTML = '';
  // Show playlists by artists and curators
  const artists = state.playlists.filter(p => p.type === 'artist' || p.type === 'curator');
  artists.forEach(pl => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.background = pl.cover;
    card.innerHTML = `<h3>${pl.name}</h3><p>by ${pl.creator}</p>`;
    card.addEventListener('click', () => openPlaylist(pl.id));
    artistPlaylistsRow.appendChild(card);
  });
  // Friend burns
  state.feedEvents.forEach(event => {
    if (event.action === 'burnt') {
      const pl = state.playlists.find(p => p.id === event.playlistId);
      if (pl) {
        const card = document.createElement('div');
        card.className = 'card';
        card.style.background = pl.cover;
        card.innerHTML = `<h3>${pl.name}</h3><p>${event.user} burnt</p>`;
        card.addEventListener('click', () => openPlaylist(pl.id));
        friendBurnsRow.appendChild(card);
      }
    }
  });
}

// Render search content based on active provider
async function renderSearch(query = '') {
  searchContent.innerHTML = '';
  if (!query.trim()) {
    const hint = document.createElement('p');
    hint.style.color = 'var(--text-secondary)';
    hint.style.fontSize = '0.9rem';
    hint.textContent = 'Enter a search term to find songs';
    searchContent.appendChild(hint);
    return;
  }
  const results = [];
  // Determine provider
  if (state.spotify && state.spotify.accessToken) {
    // Search Spotify
    try {
      const data = await fetchSpotifySearch(query);
      results.push(...data);
    } catch (e) {
      console.error(e);
      const msg = document.createElement('p');
      msg.textContent = 'Spotify search failed.';
      msg.style.color = 'var(--danger)';
      searchContent.appendChild(msg);
      return;
    }
  } else if (state.apple && state.apple.userToken) {
    try {
      const data = await fetchAppleMusicSearch(query);
      results.push(...data);
    } catch (e) {
      console.error(e);
      const msg = document.createElement('p');
      msg.textContent = 'Apple Music search failed.';
      msg.style.color = 'var(--danger)';
      searchContent.appendChild(msg);
      return;
    }
  } else {
    // Fallback to sample songs
    results.push(...state.songs);
  }
  if (results.length === 0) {
    const msg = document.createElement('p');
    msg.textContent = 'No results.';
    msg.style.color = 'var(--text-secondary)';
    searchContent.appendChild(msg);
    return;
  }
  // Render each result as card and add to state songs if not already stored
  results.forEach(song => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.background = randomGradient();
    card.innerHTML = `<h3>${song.title || song.name}</h3><p>${song.artist || song.artistName}</p>`;
    const addBtn = document.createElement('div');
    addBtn.className = 'add-icon';
    addBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';
    addBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      addSongToCurrent(song.id || song.trackId);
    });
    card.appendChild(addBtn);
    card.addEventListener('click', () => {
      if (state.addingToPlaylist) {
        addSongToCurrent(song.id || song.trackId);
      } else {
        state.currentBurn = { type: 'song', id: song.id || song.trackId };
        showScreen('burnOverlay');
      }
    });
    searchContent.appendChild(card);

    // Add song to global songs list if not present
    const songId = song.id || song.trackId;
    if (songId && !state.songs.some(s => s.id === songId)) {
      const dur = (() => {
        if (song.duration) return song.duration;
        if (song.duration_ms) {
          const totalMs = song.duration_ms;
          const mins = Math.floor(totalMs / 60000);
          const secs = Math.floor((totalMs % 60000) / 1000);
          return `${mins}:${String(secs).padStart(2, '0')}`;
        }
        return '3:00';
      })();
      state.songs.push({
        id: songId,
        title: song.title || song.name,
        artist: song.artist || song.artistName,
        duration: dur,
      });
    }
  });
}

function addSongToCurrent(songId) {
  if (!state.addingToPlaylist) {
    state.currentBurn = { type: 'song', id: songId };
    showScreen('burnOverlay');
    return;
  }
  const playlist = state.playlists.find(p => p.id === state.addingToPlaylist);
  if (playlist && !playlist.songs.includes(songId)) {
    playlist.songs.push(songId);
    renderPlaylist(playlist);
    showToast('Added to playlist', 'success');
  }
}

function renderPlaylist(playlist) {
  state.currentPlaylist = playlist;
  playlistTitle.textContent = playlist.name;
  playlistCover.style.background = playlist.cover;
  playlistNameDisplay.textContent = playlist.name;
  playlistCreatorDisplay.textContent = `By ${playlist.creator}`;
  playlistSongCount.textContent = `${playlist.songs.length} song${playlist.songs.length !== 1 ? 's' : ''}`;
  playlistSongsList.innerHTML = '';
  playlist.songs.forEach(songId => {
    const song = state.songs.find(s => s.id === songId);
    if (song) {
      const item = document.createElement('div');
      item.className = 'card';
      item.style.background = randomGradient();
      item.style.width = '100%';
      item.style.height = 'auto';
      item.style.marginBottom = '12px';
      item.innerHTML = `<h3>${song.title}</h3><p>${song.artist}</p>`;
      playlistSongsList.appendChild(item);
    }
  });
}

function openPlaylist(id) {
  const playlist = state.playlists.find(p => p.id === id);
  if (playlist) {
    renderPlaylist(playlist);
    showScreen('playlist');
  }
}

function renderLibrary() {
  libraryContent.innerHTML = '';
  if (libraryTabPlaylists.classList.contains('active')) {
    state.playlists.forEach(pl => {
      const item = document.createElement('div');
      item.className = 'card';
      item.style.background = pl.cover;
      item.style.width = '100%';
      item.style.height = '80px';
      item.style.display = 'flex';
      item.style.alignItems = 'center';
      item.style.justifyContent = 'space-between';
      item.style.padding = '0 16px';
      item.innerHTML = `<div><h3>${pl.name}</h3><p>${pl.songs.length} songs · Burnt ${pl.burntCount || 0}</p></div><i class="fa-solid fa-chevron-right"></i>`;
      item.addEventListener('click', () => openPlaylist(pl.id));
      libraryContent.appendChild(item);
    });
  } else {
    const burnt = state.playlists.filter(pl => pl.isBurnt);
    if (burnt.length === 0) {
      const p = document.createElement('p');
      p.textContent = 'No burns yet. Burn a playlist to see it here.';
      p.style.color = 'var(--text-secondary)';
      libraryContent.appendChild(p);
    } else {
      burnt.forEach(pl => {
        const item = document.createElement('div');
        item.className = 'card';
        item.style.background = pl.cover;
        item.style.width = '100%';
        item.style.height = '80px';
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.justifyContent = 'space-between';
        item.style.padding = '0 16px';
        item.innerHTML = `<div><h3>${pl.name}</h3><p>Burnt playlist</p></div><i class="fa-solid fa-fire"></i>`;
        item.addEventListener('click', () => openPlaylist(pl.id));
        libraryContent.appendChild(item);
      });
    }
  }
}

function renderFeed() {
  feedContent.innerHTML = '';
  state.feedEvents.forEach(event => {
    const pl = state.playlists.find(p => p.id === event.playlistId);
    const card = document.createElement('div');
    card.className = 'card';
    card.style.background = pl ? pl.cover : randomGradient();
    card.style.width = '100%';
    card.style.height = 'auto';
    card.style.marginBottom = '12px';
    let actionText = event.action;
    card.innerHTML = `<h3>${event.user} ${actionText}</h3><p>${pl ? pl.name : ''} · ${event.timestamp}</p>`;
    card.addEventListener('click', () => {
      if (pl) openPlaylist(pl.id);
    });
    feedContent.appendChild(card);
  });
}

function renderStore() {
  storeContent.innerHTML = '';
  state.storeItems.forEach(item => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.width = '100%';
    card.style.height = 'auto';
    card.style.marginBottom = '12px';
    card.style.background = randomGradient();
    card.innerHTML = `<h3>${item.name}</h3><p>${item.description}</p><p>$${item.price.toFixed(2)}</p>`;
    const addBtn = document.createElement('div');
    addBtn.className = 'add-icon';
    addBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';
    addBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      addToCart(item);
    });
    card.appendChild(addBtn);
    storeContent.appendChild(card);
  });
  updateCartCount();
}

function addToCart(item) {
  state.cart.push(item);
  updateCartCount();
  showToast(`${item.name} added to cart`, 'success');
}

function updateCartCount() {
  cartCount.textContent = state.cart.length;
}

function renderCart() {
  cartContent.innerHTML = '';
  if (state.cart.length === 0) {
    const p = document.createElement('p');
    p.textContent = 'Your cart is empty.';
    p.style.color = 'var(--text-secondary)';
    cartContent.appendChild(p);
    checkoutBtn.style.display = 'none';
  } else {
    state.cart.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'cart-item';
      row.innerHTML = `<p>${item.name} - $${item.price.toFixed(2)}</p>`;
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-btn';
      removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
      removeBtn.addEventListener('click', () => {
        state.cart.splice(index, 1);
        renderCart();
        updateCartCount();
      });
      row.appendChild(removeBtn);
      cartContent.appendChild(row);
    });
    const total = state.cart.reduce((sum, item) => sum + item.price, 0);
    const totalRow = document.createElement('div');
    totalRow.className = 'cart-item';
    totalRow.innerHTML = `<p><strong>Total</strong></p><p><strong>$${total.toFixed(2)}</strong></p>`;
    cartContent.appendChild(totalRow);
    checkoutBtn.style.display = 'block';
  }
}

function renderFriend(friend) {
  friendNameHeader.textContent = friend.name;
  friendContent.innerHTML = '';
  const h3 = document.createElement('h3');
  h3.textContent = 'Burnt Playlists';
  friendContent.appendChild(h3);
  if (friend.burnt.length === 0) {
    const p = document.createElement('p');
    p.textContent = 'No burns yet.';
    p.style.color = 'var(--text-secondary)';
    friendContent.appendChild(p);
  } else {
    friend.burnt.forEach(pid => {
      const pl = state.playlists.find(p => p.id === pid);
      if (pl) {
        const item = document.createElement('div');
        item.className = 'card';
        item.style.background = pl.cover;
        item.style.width = '100%';
        item.style.height = 'auto';
        item.style.marginBottom = '12px';
        item.innerHTML = `<h3>${pl.name}</h3><p>By ${pl.creator}</p>`;
        item.addEventListener('click', () => openPlaylist(pl.id));
        friendContent.appendChild(item);
      }
    });
  }
}

function renderGroupBurnList(query = '') {
  friendListContainer.innerHTML = '';
  const filtered = state.friends.filter(f => f.name.toLowerCase().includes(query.toLowerCase()));
  filtered.forEach(friend => {
    const item = document.createElement('div');
    item.className = 'friend-item';
    const info = document.createElement('div');
    info.style.display = 'flex';
    info.style.alignItems = 'center';
    const avatar = document.createElement('div');
    avatar.style.width = '40px';
    avatar.style.height = '40px';
    avatar.style.borderRadius = '50%';
    avatar.style.background = randomGradient();
    avatar.style.marginRight = '12px';
    info.appendChild(avatar);
    const nameSpan = document.createElement('span');
    nameSpan.textContent = friend.name;
    info.appendChild(nameSpan);
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !!friend.selected;
    checkbox.addEventListener('change', () => {
      friend.selected = checkbox.checked;
    });
    item.appendChild(info);
    item.appendChild(checkbox);
    friendListContainer.appendChild(item);
  });
}

// =============== AUTHENTICATION =============== //

// Spotify PKCE helpers
function generateCodeVerifier(length) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

async function generateCodeChallenge(codeVerifier) {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function redirectToSpotify() {
  if (!SPOTIFY_CLIENT_ID || SPOTIFY_CLIENT_ID === 'YOUR_SPOTIFY_CLIENT_ID') {
    alert('Spotify client ID not set. Edit script.js to add your client ID.');
    return;
  }
  const verifier = generateCodeVerifier(128);
  const challenge = await generateCodeChallenge(verifier);
  localStorage.setItem('spotify_verifier', verifier);
  const params = new URLSearchParams();
  params.append('client_id', SPOTIFY_CLIENT_ID);
  params.append('response_type', 'code');
  params.append('redirect_uri', SPOTIFY_REDIRECT_URI);
  params.append('scope', SPOTIFY_SCOPES);
  params.append('code_challenge_method', 'S256');
  params.append('code_challenge', challenge);
  // Indicate provider to handle in callback
  params.append('state', 'spotify');
  window.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

async function getSpotifyAccessToken(code) {
  const verifier = localStorage.getItem('spotify_verifier');
  const body = new URLSearchParams();
  body.append('client_id', SPOTIFY_CLIENT_ID);
  body.append('grant_type', 'authorization_code');
  body.append('code', code);
  body.append('redirect_uri', SPOTIFY_REDIRECT_URI);
  body.append('code_verifier', verifier);
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data.access_token;
}

async function fetchSpotifySearch(q) {
  const token = state.spotify?.accessToken;
  if (!token) return [];
  const url = `https://api.spotify.com/v1/search?type=track&limit=20&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data.tracks.items.map(item => ({
    id: item.id,
    title: item.name,
    artist: item.artists.map(a => a.name).join(', '),
    duration: `${Math.floor(item.duration_ms/60000)}:${String(Math.floor((item.duration_ms%60000)/1000)).padStart(2,'0')}`
  }));
}

// Apple Music functions
function configureMusicKit() {
  if (!APPLE_DEVELOPER_TOKEN || APPLE_DEVELOPER_TOKEN === 'YOUR_APPLE_DEVELOPER_TOKEN') {
    alert('Apple developer token not set. Edit script.js to add your token.');
    return;
  }
  MusicKit.configure({
    developerToken: APPLE_DEVELOPER_TOKEN,
    app: { name: 'BurnVinyl', build: '1.0' },
  });
}

async function authorizeApple() {
  configureMusicKit();
  const music = MusicKit.getInstance();
  const token = await music.authorize();
  state.apple = { userToken: token };
  afterLogin();
}

async function fetchAppleMusicSearch(q) {
  const music = MusicKit.getInstance();
  if (!state.apple?.userToken) return [];
  const data = await music.api.search(q, { types: ['songs'], limit: 20 });
  return data.songs.data.map(item => ({
    id: item.id,
    title: item.attributes.name,
    artist: item.attributes.artistName,
    duration: item.attributes.durationInMillis ? `${Math.floor(item.attributes.durationInMillis/60000)}:${String(Math.floor((item.attributes.durationInMillis%60000)/1000)).padStart(2,'0')}` : '3:00'
  }));
}

// Fetch Spotify user profile to personalize the app
async function fetchSpotifyProfile() {
  const token = state.spotify?.accessToken;
  if (!token) return null;
  try {
    const res = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch (e) {
    console.error('Failed to fetch Spotify profile', e);
    return null;
  }
}

// Handle auth callback when page loads
async function handleAuthCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const stateParam = urlParams.get('state');
  if (code && stateParam === 'spotify') {
    try {
      const token = await getSpotifyAccessToken(code);
      state.spotify = { accessToken: token };
      // Remove code and state from URL
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
      await afterLogin();
    } catch (e) {
      console.error(e);
      alert('Spotify authentication failed');
      showScreen('login');
    }
  }
}

async function afterLogin() {
  // Personalize user after authentication
  if (state.spotify && state.spotify.accessToken) {
    const profile = await fetchSpotifyProfile();
    if (profile) {
      state.user = {
        name: profile.display_name || profile.id || 'Spotify User',
        email: profile.email || ''
      };
    } else {
      state.user = { name: 'Spotify User' };
    }
  } else if (state.apple && state.apple.userToken) {
    // Apple MusicKit does not expose user names via the client SDK.
    state.user = { name: 'Apple Music User' };
  } else {
    state.user = { name: 'User' };
  }
  // Initialize sample data after login
  initSampleData();
  renderHome();
  renderFeed();
  renderStore();
  showScreen('home');
}

// =============== TOAST UTILITY =============== //
function showToast(msg, type = 'info') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = `toast show ${type}`;
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// =============== DEVICE CONNECTIVITY =============== //
const UART_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const UART_RX_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
const UART_TX_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

const ble = {
  device: null,
  server: null,
  svc: null,
  rx: null,
  tx: null,
  connected: false,
  notifyBuf: '',
  pollTimer: null,
  lastStatus: { ready: false, lock: false, posMs: 0, rate: 1.0 },
};
let wifiNets = [];

function logBle(msg) {
  if (!bleLog) return;
  const entry = document.createElement('div');
  entry.textContent = msg;
  bleLog.insertBefore(entry, bleLog.firstChild);
}

function showDlUI(show) {
  // Not implemented in this app
}
function setDlProgress() {
  // Not implemented
}

function setBleUi(connected) {
  bleConnectBtn.disabled = connected;
  bleDisconnectBtn.disabled = !connected;
  statusBtn.disabled = !connected;
  startPollBtn.disabled = !connected;
  stopPollBtn.disabled = !connected;
  wifiScanBtn.disabled = !connected;
  wifiStatusBtn.disabled = !connected;
  wifiOffBtn.disabled = !connected;
  wifiSsidSel.disabled = !connected;
  wifiPassInp.disabled = !connected;
  wifiJoinBtn.disabled = !connected;
}

function setVinylPill() {
  // Not implemented; the provided UI has a pill element but not integrated here
}

function safeAlertBleError(e) {
  console.error('BLE error:', e);
  showToast(`BLE Error: ${e?.message || String(e)}`, 'error');
}

function onBleText(text) {
  ble.notifyBuf += text;
  let idx;
  while ((idx = ble.notifyBuf.indexOf('\n')) >= 0) {
    const line = ble.notifyBuf.slice(0, idx).trim();
    ble.notifyBuf = ble.notifyBuf.slice(idx + 1);
    if (!line) continue;
    if (line.startsWith('WIFI_NET ')) {
      const payload = line.slice(9);
      const [ssid, sig] = payload.split('|');
      const signal = parseInt(sig || '0', 10) || 0;
      if (ssid && ssid.trim()) {
        const s = ssid.trim();
        const i = wifiNets.findIndex(x => x.ssid === s);
        if (i >= 0) wifiNets[i].signal = Math.max(wifiNets[i].signal, signal);
        else wifiNets.push({ ssid: s, signal });
      }
    } else if (line === 'WIFI_SCAN_DONE') {
      wifiNets.sort((a, b) => b.signal - a.signal);
      wifiRenderNets();
      logBle('Wi‑Fi scan complete');
      showToast(`Found ${wifiNets.length} networks`, 'success');
    } else if (line.startsWith('WIFI_STATE ')) {
      wifiSetState(line.slice(11).trim(), wifiIpSpan.textContent === '-' ? '' : wifiIpSpan.textContent);
    } else if (line.startsWith('WIFI_IP ')) {
      wifiSetState(wifiStateSpan.textContent, line.slice(8).trim());
    } else if (line.startsWith('WIFI_ERR ')) {
      showToast('Wi‑Fi error: ' + line.slice(9), 'error');
    }
    logBle(line);
  }
}

async function bleWriteLine(line) {
  if (!ble.connected || !ble.rx) throw new Error('Not connected');
  if (!line.endsWith('\n')) line += '\n';
  const data = new TextEncoder().encode(line);
  if (ble.rx.writeValue) await ble.rx.writeValue(data);
  else await ble.rx.writeValueWithoutResponse(data);
}

function stopPoll() {
  if (ble.pollTimer) clearInterval(ble.pollTimer);
  ble.pollTimer = null;
}

function cleanupBleState() {
  stopPoll();
  ble.connected = false;
  ble.server = null;
  ble.svc = null;
  ble.rx = null;
  ble.tx = null;
  setBleUi(false);
  wifiRenderNets();
  wifiSetState('unknown', '-');
}

async function bleConnect() {
  if (!window.isSecureContext) return showToast('Must be HTTPS', 'error');
  if (!navigator.bluetooth) return showToast('WebBluetooth not available', 'error');
  bleConnectBtn.disabled = true;
  try {
    logBle('Requesting device...');
    showToast('Opening Bluetooth picker...', 'info');
    const mode = bleModeSel.value;
    if (mode === 'name') {
      ble.device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: 'DVS' }],
        optionalServices: [UART_SERVICE_UUID],
      });
    } else {
      ble.device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [UART_SERVICE_UUID] }],
        optionalServices: [UART_SERVICE_UUID],
      });
    }
    ble.device.addEventListener('gattserverdisconnected', () => {
      logBle('GATT disconnected');
      showToast('Bluetooth disconnected', 'error');
      cleanupBleState();
    });
    logBle('Connecting to GATT...');
    ble.server = await ble.device.gatt.connect();
    logBle('Getting UART service...');
    ble.svc = await ble.server.getPrimaryService(UART_SERVICE_UUID);
    logBle('Getting characteristics...');
    ble.rx = await ble.svc.getCharacteristic(UART_RX_UUID);
    ble.tx = await ble.svc.getCharacteristic(UART_TX_UUID);
    logBle('Enabling notifications...');
    await ble.tx.startNotifications();
    ble.tx.addEventListener('characteristicvaluechanged', (ev) => {
      const v = ev.target.value;
      const bytes = new Uint8Array(v.buffer);
      onBleText(new TextDecoder().decode(bytes));
    });
    ble.connected = true;
    setBleUi(true);
    logBle('✅ BLE connected');
    showToast('Connected to Pi!', 'success');
  } catch (e) {
    safeAlertBleError(e);
  } finally {
    bleConnectBtn.disabled = ble.connected;
  }
}

async function bleDisconnect() {
  try {
    stopPoll();
    if (ble.device?.gatt?.connected) ble.device.gatt.disconnect();
  } catch {}
  cleanupBleState();
  logBle('BLE disconnected');
  showToast('Disconnected', 'info');
}

// Wi‑Fi helpers
function wifiRenderNets() {
  wifiSsidSel.innerHTML = '';
  if (!wifiNets.length) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '(no networks — tap Scan)';
    wifiSsidSel.appendChild(opt);
    return;
  }
  const opt0 = document.createElement('option');
  opt0.value = '';
  opt0.textContent = '(choose a network)';
  wifiSsidSel.appendChild(opt0);
  wifiNets.forEach(n => {
    const opt = document.createElement('option');
    opt.value = n.ssid;
    opt.textContent = `${n.ssid} (${n.signal}%)`;
    wifiSsidSel.appendChild(opt);
  });
}

function wifiSetState(state, ip = '') {
  wifiStateSpan.textContent = state || 'unknown';
  wifiIpSpan.textContent = ip || '-';
}

async function wifiScan() {
  if (!ble.connected) return showToast('Connect to Pi first', 'error');
  wifiNets = [];
  wifiRenderNets();
  wifiSetState('scanning', '');
  await bleWriteLine('WIFI_SCAN');
  showToast('Scanning for networks...', 'info');
}

async function wifiJoin() {
  if (!ble.connected) return showToast('Connect to Pi first', 'error');
  const ssid = wifiSsidSel.value;
  const pwd = wifiPassInp.value;
  if (!ssid) return showToast('Choose a network first', 'error');
  wifiSetState('connecting', '');
  await bleWriteLine(`WIFI_JOIN ${ssid}|${pwd}`);
  showToast(`Connecting to ${ssid}...`, 'info');
}

async function wifiStatus() {
  if (!ble.connected) return showToast('Connect to Pi first', 'error');
  await bleWriteLine('WIFI_STATUS');
}

async function wifiOff() {
  if (!ble.connected) return showToast('Connect to Pi first', 'error');
  await bleWriteLine('WIFI_OFF');
  showToast('Turning Wi‑Fi off...', 'info');
}

// Toggle collapsible content
function setupCollapsibles() {
  bleAdvancedHeader.addEventListener('click', () => {
    bleAdvancedHeader.classList.toggle('collapsed');
    bleAdvancedContent.classList.toggle('collapsed');
  });
}

// =============== EVENT SETUP =============== //
function setupLogin() {
  document.getElementById('login-spotify').addEventListener('click', () => {
    redirectToSpotify();
  });
  document.getElementById('login-apple').addEventListener('click', () => {
    authorizeApple();
  });
}

function setupNavBar() {
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = item.dataset.target;
      if (target === 'home') {
        renderHome();
        showScreen('home');
      } else if (target === 'feed') {
        renderFeed();
        showScreen('feed');
      } else if (target === 'library') {
        libraryTabPlaylists.classList.add('active');
        libraryTabBurns.classList.remove('active');
        renderLibrary();
        showScreen('library');
      } else if (target === 'store') {
        renderStore();
        showScreen('store');
      } else if (target === 'device') {
        showScreen('device');
      }
    });
  });
  plusBtn.addEventListener('click', () => {
    burnOptionsModal.classList.remove('hidden');
    navBar.classList.add('hidden');
  });
}

function setupBurnOptions() {
  const optionButtons = burnOptionsModal.querySelectorAll('.option-btn');
  optionButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      burnOptionsModal.classList.add('hidden');
      navBar.classList.remove('hidden');
      if (action === 'create-playlist') {
        state.addingToPlaylist = null;
        coverPreview.style.background = randomGradient();
        playlistNameInput.value = '';
        showScreen('createPlaylist');
      } else if (action === 'burn-playlists') {
        libraryTabPlaylists.classList.add('active');
        libraryTabBurns.classList.remove('active');
        renderLibrary();
        showScreen('library');
      } else if (action === 'burn-albums') {
        alert('Artist album burn flow is not implemented.');
      } else if (action === 'single-burn') {
        state.addingToPlaylist = null;
        searchInput.value = '';
        renderSearch();
        showScreen('search');
      } else if (action === 'group-burn') {
        friendSearchInput.value = '';
        state.friends.forEach(f => f.selected = false);
        renderGroupBurnList();
        showScreen('groupBurn');
      }
    });
  });
  document.getElementById('close-burn-options').addEventListener('click', () => {
    burnOptionsModal.classList.add('hidden');
    navBar.classList.remove('hidden');
  });
}

function setupSearchPage() {
  document.getElementById('search-cancel').addEventListener('click', () => {
    if (state.addingToPlaylist) {
      showScreen('playlist');
    } else {
      showScreen('home');
    }
  });
  searchInput.addEventListener('input', () => {
    renderSearch(searchInput.value);
  });
  homeSearch.addEventListener('click', () => {
    state.addingToPlaylist = null;
    searchInput.value = '';
    renderSearch();
    showScreen('search');
  });
}

function setupCreatePlaylist() {
  changeCoverBtn.addEventListener('click', () => {
    coverPreview.style.background = randomGradient();
  });
  createPlaylistBtn.addEventListener('click', () => {
    const name = playlistNameInput.value.trim();
    if (!name) {
      alert('Please enter a playlist name.');
      return;
    }
    const newPlaylist = {
      id: generateId(),
      name,
      creator: state.user?.name || 'You',
      cover: coverPreview.style.background || randomGradient(),
      songs: [],
      burntCount: 0,
      isBurnt: false,
      type: 'user',
    };
    state.playlists.push(newPlaylist);
    openPlaylist(newPlaylist.id);
  });
}

function setupPlaylistPage() {
  addSongBtn.addEventListener('click', () => {
    state.addingToPlaylist = state.currentPlaylist.id;
    searchInput.value = '';
    renderSearch();
    showScreen('search');
  });
  burnPlaylistBtn.addEventListener('click', () => {
    state.currentBurn = { type: 'playlist', id: state.currentPlaylist.id };
    showScreen('burnOverlay');
  });
}

function setupBurnFlow() {
  tapBurnBtn.addEventListener('click', () => {
    if (state.currentBurn) {
      if (state.currentBurn.type === 'playlist') {
        const pl = state.playlists.find(p => p.id === state.currentBurn.id);
        if (pl) {
          pl.burntCount = (pl.burntCount || 0) + 1;
          pl.isBurnt = true;
        }
      }
    }
    toggleShare.checked = false;
    toggleArtwork.checked = false;
    burnCompleteTitle.textContent = 'Burnt!';
    showScreen('burnComplete');
  });
  burnCompleteBtn.addEventListener('click', () => {
    if (toggleShare.checked && state.currentBurn) {
      state.feedEvents.unshift({ id: generateId(), user: state.user?.name || 'You', action: 'burnt', playlistId: state.currentBurn.id, timestamp: 'just now' });
    }
    if (toggleArtwork.checked) {
      showScreen('order');
    } else {
      renderHome();
      showScreen('home');
    }
  });
  orderConfirmBtn.addEventListener('click', () => {
    alert('Thank you! Your artwork order has been placed.');
    renderHome();
    showScreen('home');
  });
}

function setupLibrary() {
  libraryTabPlaylists.addEventListener('click', () => {
    libraryTabPlaylists.classList.add('active');
    libraryTabBurns.classList.remove('active');
    renderLibrary();
  });
  libraryTabBurns.addEventListener('click', () => {
    libraryTabBurns.classList.add('active');
    libraryTabPlaylists.classList.remove('active');
    renderLibrary();
  });
}

function setupCart() {
  openCartBtn.addEventListener('click', () => {
    renderCart();
    showScreen('cart');
  });
  checkoutBtn.addEventListener('click', () => {
    // Show checkout screen and clear previous input
    checkoutNameInp.value = '';
    checkoutEmailInp.value = '';
    checkoutStreetInp.value = '';
    checkoutCityInp.value = '';
    checkoutStateInp.value = '';
    checkoutZipInp.value = '';
    showScreen('checkout');
  });
}

// Setup checkout submission
function setupCheckout() {
  if (!checkoutSubmitBtn) return;
  checkoutSubmitBtn.addEventListener('click', () => {
    const name = checkoutNameInp.value.trim();
    const email = checkoutEmailInp.value.trim();
    const street = checkoutStreetInp.value.trim();
    const city = checkoutCityInp.value.trim();
    const stateVal = checkoutStateInp.value.trim();
    const zip = checkoutZipInp.value.trim();
    if (!name || !email || !street || !city || !stateVal || !zip) {
      showToast('Please fill out all fields', 'error');
      return;
    }
    // Validate email basic pattern
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('Enter a valid email', 'error');
      return;
    }
    const total = state.cart.reduce((sum, item) => sum + item.price, 0);
    // Build order summary (no payment processing)
    const order = {
      id: generateId(),
      items: [...state.cart],
      total,
      shipping: { name, email, street, city, state: stateVal, zip },
      date: new Date().toISOString(),
    };
    // Save orders array in state (for demonstration)
    state.orders = state.orders || [];
    state.orders.push(order);
    // Clear cart
    state.cart = [];
    renderCart();
    updateCartCount();
    showToast('Order placed successfully!', 'success');
    // Return to store or home
    renderHome();
    showScreen('home');
  });
}

function setupFeedInteractions() {
  feedContent.addEventListener('click', (e) => {
    const card = e.target.closest('.card');
    if (!card) return;
    const title = card.querySelector('h3');
    if (!title) return;
    const [userName] = title.textContent.split(' ');
    const friend = state.friends.find(f => f.name === userName);
    if (friend) {
      renderFriend(friend);
      showScreen('friend');
    }
  });
}

function setupGroupBurn() {
  friendSearchInput.addEventListener('input', () => {
    renderGroupBurnList(friendSearchInput.value);
  });
  groupBurnBtn.addEventListener('click', () => {
    const selected = state.friends.filter(f => f.selected);
    if (selected.length === 0) {
      alert('Select at least one friend.');
      return;
    }
    state.feedEvents.unshift({ id: generateId(), user: state.user?.name || 'You', action: 'burnt', playlistId: null, timestamp: 'just now', group: selected.map(f => f.name) });
    alert('Group burn complete!');
    renderFeed();
    showScreen('feed');
  });
}

function setupDevice() {
  if (!bleConnectBtn) return;
  bleConnectBtn.addEventListener('click', () => bleConnect());
  bleDisconnectBtn.addEventListener('click', () => bleDisconnect());
  statusBtn.addEventListener('click', () => bleWriteLine('STATUS').catch(() => {}));
  startPollBtn.addEventListener('click', () => {
    stopPoll();
    ble.pollTimer = setInterval(() => {
      if (ble.connected) bleWriteLine('STATUS').catch(() => {});
    }, 300);
    logBle('Polling status...');
  });
  stopPollBtn.addEventListener('click', () => {
    stopPoll();
    logBle('Stopped polling');
  });
  wifiScanBtn.addEventListener('click', () => wifiScan());
  wifiJoinBtn.addEventListener('click', () => wifiJoin());
  wifiStatusBtn.addEventListener('click', () => wifiStatus());
  wifiOffBtn.addEventListener('click', () => wifiOff());
  setupCollapsibles();
}

function setupBackButtons() {
  document.querySelectorAll('.back-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const back = btn.dataset.back;
      if (back === 'home') {
        renderHome();
        showScreen('home');
      } else if (back === 'feed') {
        renderFeed();
        showScreen('feed');
      } else if (back === 'library') {
        renderLibrary();
        showScreen('library');
      } else if (back === 'store') {
        renderStore();
        showScreen('store');
      } else if (back === 'burn-complete') {
        showScreen('burnComplete');
      } else if (back === 'device') {
        showScreen('device');
      } else {
        renderHome();
        showScreen('home');
      }
    });
  });
}

// =============== INIT =============== //
function init() {
  setupLogin();
  setupNavBar();
  setupBurnOptions();
  setupSearchPage();
  setupCreatePlaylist();
  setupPlaylistPage();
  setupBurnFlow();
  setupLibrary();
  setupCart();
  setupCheckout();
  setupFeedInteractions();
  setupGroupBurn();
  setupDevice();
  setupBackButtons();
  handleAuthCallback();
  // Show login screen initially
  showScreen('login');
}

document.addEventListener('DOMContentLoaded', init);