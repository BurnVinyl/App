/*
 * Burn Music App
 *
 * This script powers the single-page application that emulates
 * the design and interactions from the provided mockups. It creates
 * a simple state machine to manage navigation between views, stores
 * sample data for songs, playlists, friends and store items, and
 * implements the major flows: login, home feed, search, playlist
 * creation, burning, library management, social feed, store and
 * cart, friend profiles and group burn. The app is purely client
 * side and uses no external backend.
 */

// Global application state
const state = {
  user: null,
  playlists: [],
  songs: [],
  friends: [],
  feedEvents: [],
  storeItems: [],
  cart: [],
  currentPlaylist: null, // the playlist currently being viewed
  addingToPlaylist: null, // playlist id for which we are adding songs
  currentBurn: null, // id of playlist or song being burnt
};

// Helper to generate unique IDs
const generateId = () => '_' + Math.random().toString(36).substr(2, 9);

// DOM references
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
  burnOptions: document.getElementById('burn-options-modal'),
};

const navBar = document.getElementById('nav-bar');
const navItems = navBar.querySelectorAll('.nav-item');
const plusBtn = document.getElementById('plus-btn');

// Sections inside screens
const artistPlaylistsRow = document.getElementById('artist-playlists');
const friendBurnsRow = document.getElementById('friend-burns');
const searchInput = document.getElementById('search-input');
const searchContent = document.getElementById('search-content');
const homeSearch = document.getElementById('home-search');

// Create Playlist elements
const coverPreview = document.getElementById('cover-preview');
const changeCoverBtn = document.getElementById('change-cover');
const playlistNameInput = document.getElementById('playlist-name');
const createPlaylistBtn = document.getElementById('create-playlist-btn');

// Playlist detail elements
const playlistTitle = document.getElementById('playlist-title');
const playlistCover = document.getElementById('playlist-cover');
const playlistNameDisplay = document.getElementById('playlist-name-display');
const playlistCreatorDisplay = document.getElementById('playlist-creator');
const playlistSongCount = document.getElementById('playlist-songcount');
const playlistSongsList = document.getElementById('playlist-songs');
const addSongBtn = document.getElementById('add-song-btn');
const burnPlaylistBtn = document.getElementById('burn-playlist-btn');

// Burn overlay and complete elements
const tapBurnBtn = document.getElementById('tap-burn-btn');
const burnCompleteTitle = document.getElementById('burn-complete-title');
const toggleShare = document.getElementById('toggle-share');
const toggleArtwork = document.getElementById('toggle-artwork');
const burnCompleteBtn = document.getElementById('burn-complete-btn');

// Order elements
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

// Friend profile
const friendNameHeader = document.getElementById('friend-name');
const friendContent = document.getElementById('friend-content');

// Group burn
const friendSearchInput = document.getElementById('friend-search');
const friendListContainer = document.getElementById('friend-list');
const groupBurnBtn = document.getElementById('group-burn-btn');

// Burn options modal
const burnOptionsModal = document.getElementById('burn-options-modal');

// Utility to hide all screens and show nav
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
  if (name === 'home' || name === 'feed' || name === 'library' || name === 'store') {
    navItems.forEach(item => {
      if (item.dataset.target === name) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }
}

// Initialize sample data for demonstration
function initData() {
  // Sample songs
  state.songs = [
    { id: generateId(), title: 'Midnight Groove', artist: 'DJ SOKY', duration: '3:24' },
    { id: generateId(), title: 'Neon Lights', artist: 'DJ SOKY', duration: '4:10' },
    { id: generateId(), title: 'Golden Hour', artist: 'Ari N', duration: '2:58' },
    { id: generateId(), title: 'Disco Funk', artist: 'The Groovers', duration: '3:51' },
    { id: generateId(), title: 'House Party', artist: 'Beat Makers', duration: '4:32' },
    { id: generateId(), title: 'Jazz Fusion', artist: 'Sax & Co.', duration: '3:17' },
    { id: generateId(), title: 'Lo-Fi Dreams', artist: 'Chillwave', duration: '2:45' },
    { id: generateId(), title: 'Hip Hop Beats', artist: 'Rhythm Nation', duration: '3:03' },
    { id: generateId(), title: 'Smooth Ride', artist: 'DJ SOKY', duration: '3:42' },
    { id: generateId(), title: 'Sunset Vibes', artist: 'Ari N', duration: '4:05' },
  ];
  // Sample playlists (two from artists & curators)
  state.playlists = [
    {
      id: generateId(),
      name: 'Chill House',
      creator: 'DJ SOKY',
      cover: randomGradient(),
      songs: [state.songs[0].id, state.songs[1].id, state.songs[4].id],
      burntCount: 5,
      isBurnt: false,
      type: 'artist',
    },
    {
      id: generateId(),
      name: 'Jazz & Coffee',
      creator: 'Curated',
      cover: randomGradient(),
      songs: [state.songs[2].id, state.songs[5].id, state.songs[6].id],
      burntCount: 8,
      isBurnt: true,
      type: 'curator',
    },
  ];
  // Sample friends
  state.friends = [
    { id: generateId(), name: 'Alex', avatar: null, burnt: [state.playlists[1].id], isFriend: true },
    { id: generateId(), name: 'Sam', avatar: null, burnt: [], isFriend: true },
    { id: generateId(), name: 'Jordan', avatar: null, burnt: [state.playlists[0].id], isFriend: true },
  ];
  // Generate sample feed events
  state.feedEvents = [
    { id: generateId(), user: state.friends[0].name, action: 'burnt', playlistId: state.playlists[1].id, timestamp: '2h' },
    { id: generateId(), user: state.friends[2].name, action: 'burnt', playlistId: state.playlists[0].id, timestamp: '5h' },
  ];
  // Sample store items
  state.storeItems = [
    { id: generateId(), name: 'Burn Record', description: 'High-quality blank vinyl record to hold your burnt playlist.', price: 15 },
    { id: generateId(), name: 'Burner', description: 'The hardware you need to burn your playlists onto vinyl.', price: 200 },
    { id: generateId(), name: 'Artwork Print', description: 'Premium print of your playlist cover art.', price: 40 },
  ];
}

// Generate a random gradient string for covers
function randomGradient() {
  const colors = ['#ff3b30', '#ff9500', '#ffcc00', '#4cd964', '#5ac8fa', '#0579ff', '#5856d6', '#ff2d55'];
  const c1 = colors[Math.floor(Math.random() * colors.length)];
  let c2;
  do {
    c2 = colors[Math.floor(Math.random() * colors.length)];
  } while (c2 === c1);
  return `linear-gradient(135deg, ${c1}, ${c2})`;
}

// Render home feed
function renderHome() {
  // Clear existing content
  artistPlaylistsRow.innerHTML = '';
  friendBurnsRow.innerHTML = '';
  // Display playlists by artists/curators
  const artistPlaylists = state.playlists.filter(p => p.type === 'artist' || p.type === 'curator');
  artistPlaylists.forEach(pl => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.background = pl.cover;
    card.innerHTML = `<h3>${pl.name}</h3><p>by ${pl.creator}</p>`;
    card.addEventListener('click', () => {
      openPlaylist(pl.id);
    });
    artistPlaylistsRow.appendChild(card);
  });
  // Friend burns section
  state.feedEvents.forEach(event => {
    if (event.action === 'burnt') {
      const pl = state.playlists.find(p => p.id === event.playlistId);
      if (pl) {
        const card = document.createElement('div');
        card.className = 'card';
        card.style.background = pl.cover;
        card.innerHTML = `<h3>${pl.name}</h3><p>${event.user} burnt</p>`;
        card.addEventListener('click', () => {
          openPlaylist(pl.id);
        });
        friendBurnsRow.appendChild(card);
      }
    }
  });
}

// Render search screen content
function renderSearch(query = '') {
  searchContent.innerHTML = '';
  const title = document.createElement('h3');
  if (query.trim() === '') {
    title.textContent = 'Songs for you';
    searchContent.appendChild(title);
    const row = document.createElement('div');
    row.className = 'card-row';
    // Show first 5 songs as recommendations
    state.songs.slice(0, 5).forEach(song => {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.background = randomGradient();
      card.innerHTML = `<h3>${song.title}</h3><p>${song.artist}</p>`;
      const addBtn = document.createElement('div');
      addBtn.className = 'add-icon';
      addBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';
      addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        addSongToCurrent(song.id);
      });
      card.appendChild(addBtn);
      card.addEventListener('click', () => {
        if (state.addingToPlaylist) {
          addSongToCurrent(song.id);
        } else {
          state.currentBurn = { type: 'song', id: song.id };
          showScreen('burnOverlay');
        }
      });
      row.appendChild(card);
    });
    searchContent.appendChild(row);
    // Popular songs section
    const title2 = document.createElement('h3');
    title2.textContent = 'Popular songs';
    searchContent.appendChild(title2);
    const row2 = document.createElement('div');
    row2.className = 'card-row';
    state.songs.slice(5).forEach(song => {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.background = randomGradient();
      card.innerHTML = `<h3>${song.title}</h3><p>${song.artist}</p>`;
      const addBtn = document.createElement('div');
      addBtn.className = 'add-icon';
      addBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';
      addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        addSongToCurrent(song.id);
      });
      card.appendChild(addBtn);
      card.addEventListener('click', () => {
        if (state.addingToPlaylist) {
          addSongToCurrent(song.id);
        } else {
          state.currentBurn = { type: 'song', id: song.id };
          showScreen('burnOverlay');
        }
      });
      row2.appendChild(card);
    });
    searchContent.appendChild(row2);
  } else {
    title.textContent = `Results for "${query}"`;
    searchContent.appendChild(title);
    // Filter songs by query
    const results = state.songs.filter(song => song.title.toLowerCase().includes(query.toLowerCase()) || song.artist.toLowerCase().includes(query.toLowerCase()));
    if (results.length === 0) {
      const p = document.createElement('p');
      p.textContent = 'No results found.';
      searchContent.appendChild(p);
    } else {
      results.forEach(song => {
        const item = document.createElement('div');
        item.className = 'card';
        item.style.background = randomGradient();
        item.innerHTML = `<h3>${song.title}</h3><p>${song.artist}</p>`;
        const addBtn = document.createElement('div');
        addBtn.className = 'add-icon';
        addBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';
        addBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          addSongToCurrent(song.id);
        });
        item.appendChild(addBtn);
        item.addEventListener('click', () => {
          if (state.addingToPlaylist) {
            addSongToCurrent(song.id);
          } else {
            state.currentBurn = { type: 'song', id: song.id };
            showScreen('burnOverlay');
          }
        });
        searchContent.appendChild(item);
      });
    }
  }
}

// Add song to current playlist when addingToPlaylist is set
function addSongToCurrent(songId) {
  if (!state.addingToPlaylist) {
    // If not adding to a playlist, treat as single burn
    state.currentBurn = { type: 'song', id: songId };
    showScreen('burnOverlay');
    return;
  }
  const playlist = state.playlists.find(p => p.id === state.addingToPlaylist);
  if (playlist && !playlist.songs.includes(songId)) {
    playlist.songs.push(songId);
    renderPlaylist(playlist);
    // show a quick toast-like notification
    const toast = document.createElement('div');
    toast.textContent = 'Added to playlist';
    toast.className = 'toast';
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 1500);
  }
}

// Render playlist detail screen
function renderPlaylist(playlist) {
  state.currentPlaylist = playlist;
  playlistTitle.textContent = playlist.name;
  playlistCover.style.background = playlist.cover;
  playlistNameDisplay.textContent = playlist.name;
  playlistCreatorDisplay.textContent = `By ${playlist.creator}`;
  playlistSongCount.textContent = `${playlist.songs.length} song${playlist.songs.length !== 1 ? 's' : ''}`;
  // render song list
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

// Navigate to playlist screen by id
function openPlaylist(id) {
  const playlist = state.playlists.find(p => p.id === id);
  if (playlist) {
    renderPlaylist(playlist);
    showScreen('playlist');
  }
}

// Render library screen
function renderLibrary() {
  libraryContent.innerHTML = '';
  if (libraryTabPlaylists.classList.contains('active')) {
    // Show user playlists
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
      item.style.marginBottom = '12px';
      item.innerHTML = `<div><h3>${pl.name}</h3><p>${pl.songs.length} songs · Burnt ${pl.burntCount}</p></div><i class="fa-solid fa-chevron-right"></i>`;
      item.addEventListener('click', () => openPlaylist(pl.id));
      libraryContent.appendChild(item);
    });
  } else {
    // Show burn collection (burnt playlists)
    const burnt = state.playlists.filter(pl => pl.isBurnt);
    if (burnt.length === 0) {
      const p = document.createElement('p');
      p.textContent = 'No burns yet. Burn a playlist to see it here.';
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
        item.style.marginBottom = '12px';
        item.innerHTML = `<div><h3>${pl.name}</h3><p>Burnt playlist</p></div><i class="fa-solid fa-fire"></i>`;
        item.addEventListener('click', () => openPlaylist(pl.id));
        libraryContent.appendChild(item);
      });
    }
  }
}

// Render feed events
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
    let actionText = '';
    if (event.action === 'burnt') actionText = 'burnt';
    else if (event.action === 'shared') actionText = 'shared';
    else actionText = event.action;
    card.innerHTML = `<h3>${event.user} ${actionText}</h3><p>${pl ? pl.name : ''} · ${event.timestamp}</p>`;
    card.addEventListener('click', () => {
      if (pl) openPlaylist(pl.id);
    });
    feedContent.appendChild(card);
  });
}

// Render store
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
  // show toast
  const toast = document.createElement('div');
  toast.textContent = `${item.name} added to cart`;
  toast.className = 'toast';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 1500);
}

function updateCartCount() {
  cartCount.textContent = state.cart.length;
}

// Render cart page
function renderCart() {
  cartContent.innerHTML = '';
  if (state.cart.length === 0) {
    const p = document.createElement('p');
    p.textContent = 'Your cart is empty.';
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

// Render friend profile
function renderFriend(friend) {
  friendNameHeader.textContent = friend.name;
  friendContent.innerHTML = '';
  const h3 = document.createElement('h3');
  h3.textContent = 'Burnt Playlists';
  friendContent.appendChild(h3);
  if (friend.burnt.length === 0) {
    const p = document.createElement('p');
    p.textContent = 'No burns yet.';
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

// Render group burn list
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

// Event listeners for login
function setupLogin() {
  document.getElementById('login-spotify').addEventListener('click', () => {
    login('Spotify User');
  });
  document.getElementById('login-apple').addEventListener('click', () => {
    login('Apple User');
  });
  document.getElementById('login-guest').addEventListener('click', () => {
    login('Guest');
  });
}

function login(name) {
  state.user = { name, id: generateId() };
  // After login, initialize data and show home
  initData();
  renderHome();
  renderFeed();
  renderStore();
  showScreen('home');
}

// Setup navigation bar clicks
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
      }
    });
  });
  plusBtn.addEventListener('click', () => {
    // Show burn options modal
    burnOptionsModal.classList.remove('hidden');
    navBar.classList.add('hidden');
  });
}

// Setup burn options modal
function setupBurnOptions() {
  const optionButtons = burnOptionsModal.querySelectorAll('.option-btn');
  optionButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      burnOptionsModal.classList.add('hidden');
      navBar.classList.remove('hidden');
      if (action === 'create-playlist') {
        // Navigate to create playlist
        state.addingToPlaylist = null;
        // Reset cover preview
        coverPreview.style.background = randomGradient();
        playlistNameInput.value = '';
        showScreen('createPlaylist');
      } else if (action === 'burn-playlists') {
        // go to library and prepare to burn existing playlist
        libraryTabPlaylists.classList.add('active');
        libraryTabBurns.classList.remove('active');
        renderLibrary();
        showScreen('library');
      } else if (action === 'burn-albums') {
        // Not implemented: show alert
        alert('Artist album burn flow is not implemented in this demo.');
      } else if (action === 'single-burn') {
        // Navigate to search page with no playlist context
        state.addingToPlaylist = null;
        searchInput.value = '';
        renderSearch();
        showScreen('search');
      } else if (action === 'group-burn') {
        // Navigate to group burn page
        friendSearchInput.value = '';
        state.friends.forEach(f => f.selected = false);
        renderGroupBurnList();
        showScreen('groupBurn');
      }
    });
  });
  // Close burn options
  document.getElementById('close-burn-options').addEventListener('click', () => {
    burnOptionsModal.classList.add('hidden');
    navBar.classList.remove('hidden');
  });
}

// Setup search page events
function setupSearchPage() {
  // Cancel button returns to home or playlist add context
  document.getElementById('search-cancel').addEventListener('click', () => {
    if (state.addingToPlaylist) {
      showScreen('playlist');
    } else {
      showScreen('home');
    }
  });
  searchInput.addEventListener('input', () => {
    const q = searchInput.value;
    renderSearch(q);
  });
  // Make home search clickable to open search screen
  homeSearch.addEventListener('click', () => {
    // Without query, search page shows categories
    state.addingToPlaylist = null;
    searchInput.value = '';
    renderSearch();
    showScreen('search');
  });
}

// Setup create playlist page
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
      creator: state.user.name,
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

// Setup playlist page events
function setupPlaylistPage() {
  addSongBtn.addEventListener('click', () => {
    // Set addingToPlaylist to current playlist
    state.addingToPlaylist = state.currentPlaylist.id;
    searchInput.value = '';
    renderSearch();
    showScreen('search');
  });
  burnPlaylistBtn.addEventListener('click', () => {
    // Start burn overlay
    state.currentBurn = { type: 'playlist', id: state.currentPlaylist.id };
    showScreen('burnOverlay');
  });
}

// Setup burn overlay and complete events
function setupBurnFlow() {
  tapBurnBtn.addEventListener('click', () => {
    // After tapping, show burn complete options
    if (state.currentBurn) {
      // For playlist, mark burnt count and isBurnt
      if (state.currentBurn.type === 'playlist') {
        const pl = state.playlists.find(p => p.id === state.currentBurn.id);
        if (pl) {
          pl.burntCount += 1;
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
    // If share toggle is on, add to feed
    if (toggleShare.checked && state.currentBurn) {
      let plName = '';
      if (state.currentBurn.type === 'playlist') {
        const pl = state.playlists.find(p => p.id === state.currentBurn.id);
        if (pl) plName = pl.name;
      } else {
        const song = state.songs.find(s => s.id === state.currentBurn.id);
        if (song) plName = song.title;
      }
      state.feedEvents.unshift({ id: generateId(), user: state.user.name, action: 'burnt', playlistId: state.currentBurn.id, timestamp: 'just now' });
    }
    // If artwork order toggle is on, navigate to order page
    if (toggleArtwork.checked) {
      // show order page
      showScreen('order');
    } else {
      // return to home
      renderHome();
      showScreen('home');
    }
  });
  // Order confirmation
  orderConfirmBtn.addEventListener('click', () => {
    // Save order (here we just show a message)
    alert('Thank you! Your artwork order has been placed.');
    renderHome();
    showScreen('home');
  });
}

// Setup library tabs
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

// Setup cart open and checkout
function setupCart() {
  openCartBtn.addEventListener('click', () => {
    renderCart();
    showScreen('cart');
  });
  checkoutBtn.addEventListener('click', () => {
    alert('Purchase complete!');
    state.cart = [];
    renderCart();
    updateCartCount();
    showScreen('store');
  });
}

// Setup friend feed clicks to open friend profile
function setupFeedInteractions() {
  feedContent.addEventListener('click', (e) => {
    const card = e.target.closest('.card');
    if (!card) return;
    // Determine friend based on event user
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

// Setup group burn interactions
function setupGroupBurn() {
  friendSearchInput.addEventListener('input', () => {
    renderGroupBurnList(friendSearchInput.value);
  });
  groupBurnBtn.addEventListener('click', () => {
    // Determine selected friends
    const selected = state.friends.filter(f => f.selected);
    if (selected.length === 0) {
      alert('Select at least one friend.');
      return;
    }
    // Add event to feed: group burn
    state.feedEvents.unshift({ id: generateId(), user: state.user.name, action: 'burnt', playlistId: null, timestamp: 'just now', group: selected.map(f => f.name) });
    alert('Group burn complete!');
    renderFeed();
    showScreen('feed');
  });
}

// Setup global back buttons (data-back attributes)
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
      } else {
        // fallback to home
        renderHome();
        showScreen('home');
      }
    });
  });
}

// Initialize application
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
  setupFeedInteractions();
  setupGroupBurn();
  setupBackButtons();
  // Initially show login screen
  showScreen('login');
}

// Wait for DOM
document.addEventListener('DOMContentLoaded', init);