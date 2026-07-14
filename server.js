const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const WebSocket = require('ws');

const PORT = Number(process.env.PORT || 3000);
const ROOT_DIR = __dirname;
const CLIENT_DIR = path.join(ROOT_DIR, 'client');
const MUSIC_DIR = path.join(ROOT_DIR, 'music');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac']);
const rooms = new Map();

fs.mkdirSync(MUSIC_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4',
  '.aac': 'audio/aac', '.flac': 'audio/flac', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
};

function send(socket, payload) {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload));
}
function broadcast(room, payload) { room.players.forEach((player) => send(player.socket, payload)); }
function shuffle(values) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function makeRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do code = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  while (rooms.has(code));
  return code;
}
function makePlayerId() { return `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }
function cleanName(value) { return String(value || '').trim().slice(0, 20) || 'Jugador'; }

function listAudioFiles(directory, base = directory) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listAudioFiles(absolute, base));
    else if (AUDIO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) files.push(path.relative(base, absolute));
  }
  return files;
}

function tidyText(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[-–—,;\s]+|[-–—,;\s]+$/g, '')
    .trim();
}

function cleanTitle(value) {
  return tidyText(value)
    .replace(/^\d{1,4}\s*[.\-_–—]\s*/, '')
    .replace(/^\d{1,3}\s+/, '')
    .replace(/\s*\[(?:official|audio|video|lyrics?|remaster(?:ed)?)[^\]]*\]\s*$/i, '')
    .replace(/\s*\((?:official\s+video|official\s+audio|lyrics?|remaster(?:ed)?(?:\s+\d{4})?)\)\s*$/i, '')
    .trim();
}

function usefulFolderArtist(folders) {
  const ignored = /^(music|musica|música|audio|mp3|disc|disk|cd|album|albums?|various|diversos|compilation|complet|complete|box set|soundtrack)$/i;
  for (let i = folders.length - 1; i >= 0; i -= 1) {
    const candidate = tidyText(folders[i]);
    if (candidate && !ignored.test(candidate) && !/^cd\s*\d+$/i.test(candidate) && !/^disc\s*\d+$/i.test(candidate)) return candidate;
  }
  return '';
}

function parseFilename(relativePath) {
  const extension = path.extname(relativePath);
  const original = path.basename(relativePath, extension);
  const folders = path.dirname(relativePath).split(path.sep).filter((part) => part && part !== '.');
  const category = folders[0] || 'Sense categoria';
  const folderArtist = usefulFolderArtist(folders.slice(1));

  let raw = tidyText(original);
  raw = raw.replace(/^\s*\d{1,4}\s*[.\-_–—]\s*/, '').replace(/^\s*\d{1,3}\s+/, '').trim();

  let artist = '';
  let title = '';
  const parts = raw.split(/\s+[-–—]\s+/).map(tidyText).filter(Boolean);
  const yearIndex = parts.findIndex((part) => /^(19|20)\d{2}$/.test(part));

  if (yearIndex > 0) {
    artist = tidyText(parts.slice(0, yearIndex).join(' - '));
    const afterYear = parts.slice(yearIndex + 1);
    let titleParts = afterYear;
    const trackIndex = afterYear.findIndex((part) => /^\d{1,3}$/.test(part));
    if (trackIndex >= 0 && trackIndex < afterYear.length - 1) titleParts = afterYear.slice(trackIndex + 1);
    title = cleanTitle(titleParts.join(' - ') || afterYear.at(-1));
  } else if (parts.length >= 2) {
    artist = tidyText(parts.shift());
    title = cleanTitle(parts.join(' - '));
  } else {
    const comma = raw.match(/^([^,]{2,80})\s*,\s*(.{2,})$/);
    const wideSpaces = raw.match(/^(.{2,}?)\s{2,}(.{2,})$/);
    const artistInParentheses = raw.match(/^(.+?)\s*\(([^()]{2,60})\)\s*$/);
    if (comma) {
      artist = tidyText(comma[1]);
      title = cleanTitle(comma[2]);
    } else if (wideSpaces) {
      title = cleanTitle(wideSpaces[1]);
      artist = tidyText(wideSpaces[2]);
    } else if (artistInParentheses && !/remaster|live|edit|version|mix/i.test(artistInParentheses[2])) {
      title = cleanTitle(artistInParentheses[1]);
      artist = tidyText(artistInParentheses[2]);
    } else {
      title = cleanTitle(raw);
      artist = folderArtist;
    }
  }

  if (artist && /^\d+$/.test(artist)) artist = '';
  return { original, category, artist: tidyText(artist), title: cleanTitle(title), folderArtist };
}


function isGenericArtist(value) {
  const normalized = tidyText(value).toLowerCase();
  return !normalized || /^(various artists?|varios artistas|diversos artistes|artistes diversos|v\.?a\.?|unknown artist|artista desconegut|sin artista|sense artista)$/i.test(normalized);
}

function chooseRealArtist(metadataCommon, fallbackArtist, title = '') {
  const candidates = [
    metadataCommon?.artist,
    ...(Array.isArray(metadataCommon?.artists) ? metadataCommon.artists : []),
    metadataCommon?.albumartist,
    fallbackArtist
  ].map(tidyText).filter(Boolean);

  return candidates.find((candidate) =>
    !isGenericArtist(candidate) &&
    candidate.toLowerCase() !== String(title || '').toLowerCase()
  ) || '';
}

async function parseTrack(relativePath, parseFile) {
  const fallback = parseFilename(relativePath);
  const absolutePath = path.join(MUSIC_DIR, relativePath);
  let metadataArtist = '';
  let metadataTitle = '';
  let album = '';
  let year = null;
  let genre = '';
  let duration = null;

  try {
    const metadata = await parseFile(absolutePath, { duration: true, skipCovers: true });
    metadataTitle = cleanTitle(metadata.common.title || '');
    metadataArtist = chooseRealArtist(metadata.common, fallback.artist, metadataTitle || fallback.title);
    album = tidyText(metadata.common.album || '');
    year = Number(metadata.common.year) || null;
    genre = Array.isArray(metadata.common.genre) ? tidyText(metadata.common.genre[0] || '') : tidyText(metadata.common.genre || '');
    duration = Number(metadata.format.duration) || null;
  } catch {
    // Un MP3 mal etiquetat continua sent usable gràcies al nom del fitxer.
  }

  const title = metadataTitle || fallback.title;
  const artist = !isGenericArtist(metadataArtist)
    ? metadataArtist
    : (!isGenericArtist(fallback.artist) ? fallback.artist : '');
  const hasArtist = Boolean(artist && artist.toLowerCase() !== title.toLowerCase());
  const hasTitle = Boolean(title);

  return {
    id: relativePath.replace(/\\/g, '/'),
    file: relativePath.replace(/\\/g, '/'),
    category: fallback.category,
    artist: hasArtist ? artist : '',
    title,
    album,
    year,
    genre,
    duration,
    hasArtist,
    hasTitle,
    valid: hasTitle,
    original: fallback.original,
    source: metadataArtist || metadataTitle ? 'id3' : 'filename'
  };
}

async function mapWithConcurrency(values, limit, mapper) {
  const results = new Array(values.length);
  let nextIndex = 0;
  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= values.length) return;
      results[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length || 1) }, worker));
  return results;
}

async function buildLibrary() {
  const { parseFile } = await import('music-metadata');
  const files = listAudioFiles(MUSIC_DIR);
  const parsed = await mapWithConcurrency(files, 12, (file) => parseTrack(file, parseFile));
  const valid = parsed.filter((track) => track.hasTitle);
  const full = valid.filter((track) => track.hasArtist);
  const titleOnly = valid.filter((track) => !track.hasArtist);
  const invalid = parsed.filter((track) => !track.hasTitle);

  const genericArtists = parsed.filter((track) => isGenericArtist(track.artist));
  const reportLines = [
    'MUSIC BATTLE - INFORME DE BIBLIOTECA',
    `Generat: ${new Date().toLocaleString('ca-ES')}`,
    `Fitxers trobats: ${parsed.length}`,
    `Cançons utilitzables: ${valid.length}`,
    `Amb artista i títol: ${full.length}`,
    `Només títol (no sortiran en preguntes d'artista): ${titleOnly.length}`,
    `Artista genèric o absent: ${genericArtists.length}`,
    `Fitxers exclosos: ${invalid.length}`,
    '',
    '=== NOMÉS TÍTOL / ARTISTA NO IDENTIFICAT ===',
    ...titleOnly.map((track) => track.file),
    '',
    '=== ARTISTA GENÈRIC O ABSENT ===',
    ...genericArtists.map((track) => `${track.file} | títol=${track.title || ''} | artista=${track.artist || ''}`),
    '',
    '=== EXCLOSOS / TÍTOL NO IDENTIFICAT ===',
    ...invalid.map((track) => track.file)
  ];

  fs.writeFileSync(path.join(DATA_DIR, 'library-report.txt'), reportLines.join(os.EOL), 'utf8');
  fs.writeFileSync(path.join(DATA_DIR, 'library.json'), JSON.stringify(valid, null, 2), 'utf8');
  return { valid, full, titleOnly, invalid };
}

let libraryState = { valid: [], full: [], titleOnly: [], invalid: [] };
function library() { return libraryState.valid; }
function categoryStats() {
  const counts = new Map();
  for (const track of library()) counts.set(track.category, (counts.get(track.category) || 0) + 1);
  return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ca')).map(([name, count]) => ({ name, count }));
}

function publicPlayers(room) {
  return room.players.map((player, index) => ({
    id: player.id,
    name: player.name,
    playerNumber: index + 1,
    score: player.score,
    connected: player.socket?.readyState === WebSocket.OPEN,
    stats: {
      correct: player.correct,
      answered: player.answered,
      bestStreak: player.bestStreak,
      fastestMs: Number.isFinite(player.fastestMs) ? player.fastestMs : null,
      totalResponseMs: player.totalResponseMs
    }
  }));
}
function resetPlayer(player) {
  player.score = 0;
  player.correct = 0;
  player.answered = 0;
  player.streak = 0;
  player.bestStreak = 0;
  player.fastestMs = Infinity;
  player.totalResponseMs = 0;
}

function normalizeConfig(input = {}) {
  const allCategories = new Set(categoryStats().map((item) => item.name));
  const categories = Array.isArray(input.categories)
    ? [...new Set(input.categories.filter((category) => allCategories.has(category)))]
    : [];
  const questionTypes = Array.isArray(input.questionTypes)
    ? [...new Set(input.questionTypes.filter((type) => ['artist', 'title', 'album', 'year', 'decade', 'genre'].includes(type)))]
    : [];
  return {
    categories,
    questionTypes,
    questionCount: [10, 20, 30].includes(Number(input.questionCount)) ? Number(input.questionCount) : 10,
    roundSeconds: [5, 8, 10].includes(Number(input.roundSeconds)) ? Number(input.roundSeconds) : 10
  };
}

function buildOptions(correct, values) {
  const unique = [...new Set(values.filter(Boolean))].filter((value) => value !== correct);
  return shuffle([correct, ...shuffle(unique).slice(0, 3)]);
}

const recentTrackIds = [];
const recentArtistKeys = [];

function artistKey(track) {
  const artist = tidyText(track?.artist || '');
  return isGenericArtist(artist) ? '' : artist.toLowerCase();
}

function rememberRounds(rounds) {
  for (const round of rounds) {
    recentTrackIds.push(round.trackId);
    if (round.artistKey) recentArtistKeys.push(round.artistKey);
  }

  while (recentTrackIds.length > 700) recentTrackIds.shift();
  while (recentArtistKeys.length > 180) recentArtistKeys.shift();
}

function questionValue(track, type) {
  if (type === 'artist') return isGenericArtist(track.artist) ? '' : track.artist;
  if (type === 'title') return track.title;
  if (type === 'album') return track.album;
  if (type === 'year') return track.year ? String(track.year) : '';
  if (type === 'decade') return track.year ? `${Math.floor(track.year / 10) * 10}` : '';
  if (type === 'genre') return track.genre;
  return '';
}


function decadeOf(track) {
  return track?.year ? Math.floor(Number(track.year) / 10) * 10 : null;
}

function sameText(a, b) {
  return tidyText(a).toLowerCase() === tidyText(b).toLowerCase();
}

function distractorTracks(track, pool, type) {
  const correct = questionValue(track, type);
  const usable = pool.filter((candidate) => {
    if (candidate.id === track.id) return false;
    const value = questionValue(candidate, type);
    return Boolean(value) && !sameText(value, correct);
  });

  const result = [];
  const seenValues = new Set();

  const addGroup = (group) => {
    for (const candidate of shuffle(group)) {
      const value = questionValue(candidate, type);
      const key = tidyText(value).toLowerCase();
      if (!key || seenValues.has(key)) continue;
      seenValues.add(key);
      result.push(candidate);
    }
  };

  if (track.genre) {
    addGroup(usable.filter((candidate) =>
      candidate.genre && sameText(candidate.genre, track.genre)
    ));
  }

  if (result.length < 3 && track.category) {
    addGroup(usable.filter((candidate) =>
      candidate.category && sameText(candidate.category, track.category)
    ));
  }

  const decade = decadeOf(track);
  if (result.length < 3 && decade !== null) {
    addGroup(usable.filter((candidate) => decadeOf(candidate) === decade));
  }

  if (result.length < 3) addGroup(usable);
  return result;
}

function buildContextualOptions(track, type, pool) {
  const correct = questionValue(track, type);
  const distractors = distractorTracks(track, pool, type)
    .map((candidate) => questionValue(candidate, type))
    .filter(Boolean)
    .slice(0, 3);

  return shuffle([correct, ...distractors]);
}

function questionPrompt(type) {
  return {
    artist: 'Qui interpreta aquesta cançó?',
    title: 'Quin és el títol?',
    album: 'De quin disc és?',
    year: 'De quin any és?',
    decade: 'De quina dècada és?',
    genre: 'Quin gènere és?'
  }[type] || 'Quina és la resposta?';
}

function availableQuestionTypes(pool) {
  return ['artist', 'title', 'album', 'year', 'decade', 'genre'].filter((type) => {
    const values = new Set(pool.map((track) => questionValue(track, type)).filter(Boolean));
    return values.size >= 4;
  });
}

function createRounds(config) {
  const basePool = config.categories.length
    ? library().filter((track) => config.categories.includes(track.category))
    : library();

  const usableTypes = availableQuestionTypes(basePool);
  const selectedTypes = config.questionTypes.length
    ? config.questionTypes.filter((type) => usableTypes.includes(type))
    : usableTypes;

  if (!selectedTypes.length) {
    throw new Error('No hi ha prou dades per crear preguntes amb aquesta selecció.');
  }

  const recentTracks = new Set(recentTrackIds);
  const recentArtists = new Set(recentArtistKeys);
  const usedTracks = new Set();
  const usedArtistsThisGame = new Set();
  const rounds = [];

  for (let index = 0; index < config.questionCount; index += 1) {
    const type = selectedTypes[Math.floor(Math.random() * selectedTypes.length)];
    const fullPool = basePool.filter((track) => questionValue(track, type));

    const eligible = fullPool.filter((track) => !usedTracks.has(track.id));
    const trackPool = eligible.length ? eligible : fullPool;

    // Agrupem per artista perquè un grup amb 20 cançons no tingui
    // 20 vegades més probabilitats que un grup amb una sola cançó.
    const artistGroups = new Map();
    const noArtist = [];

    for (const candidate of trackPool) {
      const key = artistKey(candidate);
      if (!key) {
        noArtist.push(candidate);
        continue;
      }
      if (!artistGroups.has(key)) artistGroups.set(key, []);
      artistGroups.get(key).push(candidate);
    }

    let artistKeys = [...artistGroups.keys()];

    // Prioritat absoluta: artistes que no han sortit ni en aquesta partida
    // ni durant les últimes 180 preguntes del servidor.
    let preferredArtists = artistKeys.filter((key) =>
      !usedArtistsThisGame.has(key) && !recentArtists.has(key)
    );

    if (!preferredArtists.length) {
      preferredArtists = artistKeys.filter((key) => !usedArtistsThisGame.has(key));
    }
    if (!preferredArtists.length) {
      preferredArtists = artistKeys.filter((key) => !recentArtists.has(key));
    }
    if (!preferredArtists.length) preferredArtists = artistKeys;

    let candidates = [];
    if (preferredArtists.length) {
      const chosenArtist = preferredArtists[Math.floor(Math.random() * preferredArtists.length)];
      candidates = artistGroups.get(chosenArtist).filter((track) => !recentTracks.has(track.id));
      if (!candidates.length) candidates = artistGroups.get(chosenArtist);
    } else {
      candidates = noArtist.filter((track) => !recentTracks.has(track.id));
      if (!candidates.length) candidates = noArtist;
    }

    if (!candidates.length) candidates = trackPool.filter((track) => !recentTracks.has(track.id));
    if (!candidates.length) candidates = trackPool;

    const track = candidates[Math.floor(Math.random() * candidates.length)];
    if (!track) {
      index -= 1;
      continue;
    }

    usedTracks.add(track.id);
    const key = artistKey(track);
    if (key) usedArtistsThisGame.add(key);

    const correct = questionValue(track, type);
    const options = buildContextualOptions(track, type, fullPool);
    if (options.length < 4) {
      index -= 1;
      continue;
    }

    const duration = Number(track.duration) || 0;
    const safeMin = duration > 40 ? Math.max(5, duration * 0.12) : 0;
    const safeMax = duration > config.roundSeconds + 8
      ? Math.max(safeMin, duration - config.roundSeconds - Math.max(4, duration * 0.08))
      : 0;
    const fragmentStart = safeMax > safeMin
      ? safeMin + Math.random() * (safeMax - safeMin)
      : 0;

    rounds.push({
      number: rounds.length + 1,
      type,
      prompt: questionPrompt(type),
      audioUrl: `/music/${encodeURI(track.file).replace(/#/g, '%23')}`,
      options,
      correctIndex: options.indexOf(correct),
      answer: correct,
      artist: track.artist,
      title: track.title,
      fragmentStart,
      trackId: track.id,
      artistKey: key
    });
  }

  rememberRounds(rounds);
  return rounds;
}

function roomState(room) {
  broadcast(room, {
    type: 'room_state',
    roomCode: room.code,
    players: publicPlayers(room),
    ready: room.players.length === 2,
    creatorId: room.players[0]?.id || null,
    config: room.config,
    phase: room.phase
  });
}

function removePlayerFromRoom(room, playerId, notifyOthers = true) {
  const player = room?.players.find((item) => item.id === playerId);
  if (!room || !player) return;
  clearTimeout(player.disconnectTimer);
  room.players = room.players.filter((item) => item.id !== playerId);
  clearTimeout(room.roundTimer);
  clearTimeout(room.nextTimer);
  clearTimeout(room.prepareTimer);
  if (!room.players.length) { rooms.delete(room.code); return; }
  room.phase = 'lobby';
  room.rounds = [];
  room.currentRound = -1;
  room.answers = new Map();
  room.players.forEach(resetPlayer);
  if (notifyOthers) broadcast(room, { type: 'player_left' });
  roomState(room);
}

function leaveRoom(socket) {
  const room = rooms.get(socket.roomCode);
  if (!room) return;
  removePlayerFromRoom(room, socket.playerId, true);
  socket.roomCode = null;
}

function temporarilyDisconnect(socket) {
  const room = rooms.get(socket.roomCode);
  if (!room) return;
  const player = room.players.find((item) => item.id === socket.playerId);
  if (!player || player.socket !== socket) return;
  player.socket = null;
  clearTimeout(player.disconnectTimer);
  player.disconnectTimer = setTimeout(() => removePlayerFromRoom(room, player.id, true), 20000);
  roomState(room);
}

function resumeRoom(socket, message) {
  const code = String(message.roomCode || '').trim().toUpperCase();
  const playerId = String(message.playerId || '');
  const room = rooms.get(code);
  const player = room?.players.find((item) => item.id === playerId);
  if (!room || !player) return send(socket, { type: 'resume_failed' });
  clearTimeout(player.disconnectTimer);
  player.disconnectTimer = null;
  player.socket = socket;
  socket.playerId = player.id;
  socket.roomCode = room.code;
  send(socket, { type: 'resumed', playerId: player.id, roomCode: room.code, phase: room.phase });
  roomState(room);
}

function createRoom(socket, message) {
  leaveRoom(socket);
  const player = { id: socket.playerId, name: cleanName(message.playerName), socket, disconnectTimer: null };
  resetPlayer(player);
  const room = {
    code: makeRoomCode(), players: [player], config: normalizeConfig(message.config), phase: 'lobby',
    rounds: [], currentRound: -1, answers: new Map(), roundStartedAt: 0, roundRevealed: false, roundTimer: null, nextTimer: null, prepareTimer: null, readyPlayers: new Set(), gameAudioReady: new Set(), countdownNotBefore: 0, countdownTimer: null
  };
  rooms.set(room.code, room);
  socket.roomCode = room.code;
  send(socket, { type: 'room_created', roomCode: room.code });
  roomState(room);
}

function joinRoom(socket, message) {
  leaveRoom(socket);
  const code = String(message.roomCode || '').trim().toUpperCase();
  const room = rooms.get(code);
  if (!room) return send(socket, { type: 'error', message: 'La sala no existeix.' });
  if (room.players.length >= 2) return send(socket, { type: 'error', message: 'La sala ja és plena.' });
  if (room.phase !== 'lobby' && room.phase !== 'results') return send(socket, { type: 'error', message: 'La partida ja ha començat.' });
  const player = { id: socket.playerId, name: cleanName(message.playerName), socket, disconnectTimer: null };
  resetPlayer(player);
  room.players.push(player);
  socket.roomCode = code;
  send(socket, { type: 'room_joined', roomCode: code });
  roomState(room);
}

function updateConfig(socket, message) {
  const room = rooms.get(socket.roomCode);
  if (!room || !room.players.some((player) => player.id === socket.playerId) || room.phase !== 'lobby') return;
  room.config = normalizeConfig(message.config);
  roomState(room);
}

function beginPreparedRound(room) {
  if (!room || room.phase !== 'preparing' || room.roundRevealed) return;

  const waitMs = Math.max(0, Number(room.countdownNotBefore || 0) - Date.now());
  if (waitMs > 0) {
    clearTimeout(room.countdownTimer);
    room.countdownTimer = setTimeout(() => beginPreparedRound(room), waitMs);
    return;
  }

  clearTimeout(room.prepareTimer);
  room.phase = 'playing';
  room.roundStartedAt = Date.now() + 900;
  const round = room.rounds[room.currentRound];

  broadcast(room, {
    type: 'round_started',
    roundNumber: round.number,
    fragmentStart: round.fragmentStart,
    startAt: room.roundStartedAt,
    seconds: room.config.roundSeconds
  });

  clearTimeout(room.roundTimer);
  const totalDelay = Math.max(0, room.roundStartedAt - Date.now()) + room.config.roundSeconds * 1000 + 250;
  room.roundTimer = setTimeout(() => revealRound(room), totalDelay);
}

function markRoundReady(socket, message) {
  const room = rooms.get(socket.roomCode);
  if (!room || room.phase !== 'preparing') return;
  const round = room.rounds[room.currentRound];
  if (!round || Number(message.roundNumber) !== round.number) return;
  if (!room.players.some((player) => player.id === socket.playerId)) return;
  room.readyPlayers.add(socket.playerId);
  if (room.readyPlayers.size >= room.players.length) beginPreparedRound(room);
}

function markRoundAudioFailed(socket, message) {
  const room = rooms.get(socket.roomCode);
  if (!room || !['preparing', 'playing'].includes(room.phase)) return;
  const round = room.rounds[room.currentRound];
  if (!round || Number(message.roundNumber) !== round.number) return;
  room.readyPlayers.delete(socket.playerId);
  clearTimeout(room.roundTimer);
  room.phase = 'preparing';
  broadcast(room, {
    type: 'audio_activation_required',
    playerId: socket.playerId,
    roundNumber: round.number
  });
}

function markGameAudioReady(socket) {
  const room = rooms.get(socket.roomCode);
  if (!room || room.phase !== 'audio_check') return;
  if (!room.players.some((player) => player.id === socket.playerId)) return;

  room.gameAudioReady.add(socket.playerId);

  if (room.gameAudioReady.size >= room.players.length) {
    room.phase = 'preparing';
    room.countdownNotBefore = Date.now() + 3200;
    broadcast(room, { type: 'game_started', players: publicPlayers(room), countdown: 3 });
    startRound(room);
  }
}

function startRound(room) {
  if (!room || !['playing', 'preparing'].includes(room.phase)) return;
  room.currentRound += 1;
  if (room.currentRound >= room.rounds.length) return finishGame(room);
  room.phase = 'preparing';
  room.answers = new Map();
  room.readyPlayers = new Set();
  room.roundRevealed = false;
  const round = room.rounds[room.currentRound];
  broadcast(room, {
    type: 'round_preparing',
    roundNumber: round.number,
    totalRounds: room.rounds.length,
    prompt: round.prompt,
    options: round.options,
    audioUrl: round.audioUrl,
    fragmentStart: round.fragmentStart,
    seconds: room.config.roundSeconds,
    players: publicPlayers(room)
  });
  clearTimeout(room.prepareTimer);
  room.prepareTimer = setTimeout(() => {
    if (room.phase === 'preparing') {
      broadcast(room, { type: 'round_waiting_for_audio', roundNumber: round.number });
    }
  }, 30000);
}

function startGame(socket) {
  const room = rooms.get(socket.roomCode);
  if (!room || !room.players.some((player) => player.id === socket.playerId)) return;
  if (room.players.length !== 2) return send(socket, { type: 'error', message: 'Falta el segon jugador.' });

  try {
    room.rounds = createRounds(room.config);
  } catch (error) {
    return send(socket, { type: 'error', message: error.message });
  }

  room.players.forEach(resetPlayer);
  room.currentRound = -1;
  room.phase = 'audio_check';
  room.gameAudioReady = new Set();
  room.countdownNotBefore = 0;

  broadcast(room, { type: 'game_audio_check' });
}

function revealRound(room) {
  clearTimeout(room.roundTimer);
  if (room.phase !== 'playing' || room.roundRevealed) return;
  room.roundRevealed = true;
  const round = room.rounds[room.currentRound];
  const results = room.players.map((player) => {
    const answer = room.answers.get(player.id);
    return {
      playerId: player.id,
      answerIndex: answer?.answerIndex ?? null,
      correct: Boolean(answer?.correct),
      points: answer?.points || 0,
      score: player.score,
      elapsedMs: answer?.elapsedMs ?? null
    };
  });
  broadcast(room, {
    type: 'round_result',
    correctIndex: round.correctIndex,
    results,
    players: publicPlayers(room)
  });
  clearTimeout(room.nextTimer);
  clearTimeout(room.prepareTimer);
  room.nextTimer = setTimeout(() => startRound(room), 3450);
}

function submitAnswer(socket, message) {
  const room = rooms.get(socket.roomCode);
  if (!room || room.phase !== 'playing' || Date.now() < room.roundStartedAt || room.answers.has(socket.playerId)) return;
  const player = room.players.find((item) => item.id === socket.playerId);
  const round = room.rounds[room.currentRound];
  const answerIndex = Number(message.answerIndex);
  if (!player || !Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex > 3) return;
  const elapsedMs = Math.max(0, Date.now() - room.roundStartedAt);
  const correct = answerIndex === round.correctIndex;
  player.answered += 1;
  player.totalResponseMs += elapsedMs;
  player.fastestMs = Math.min(player.fastestMs, elapsedMs);
  let points = 0;
  if (correct) {
    player.correct += 1;
    player.streak += 1;
    player.bestStreak = Math.max(player.bestStreak, player.streak);
    const speedBonus = Math.max(0, Math.round((room.config.roundSeconds * 1000 - elapsedMs) / 100));
    const firstCorrect = ![...room.answers.values()].some((answer) => answer.correct);
    points = 100 + speedBonus + (firstCorrect ? 40 : 0) + Math.min(80, (player.streak - 1) * 10);
    player.score += points;
  } else player.streak = 0;
  room.answers.set(socket.playerId, { answerIndex, correct, points, elapsedMs });
  send(socket, { type: 'answer_received', answerIndex });
  broadcast(room, { type: 'answer_status', answeredPlayerIds: [...room.answers.keys()] });
  if (room.answers.size === room.players.length) setTimeout(() => revealRound(room), 500);
}

function finishGame(room) {
  room.phase = 'results';
  const players = publicPlayers(room).map((player) => ({
    ...player,
    stats: {
      ...player.stats,
      accuracy: player.stats.answered ? Math.round(player.stats.correct / player.stats.answered * 100) : 0,
      averageMs: player.stats.answered ? Math.round(player.stats.totalResponseMs / player.stats.answered) : null
    }
  }));
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const winnerText = sorted[0].score === sorted[1].score ? 'Empat!' : `${sorted[0].name} guanya!`;
  broadcast(room, { type: 'game_finished', players, winnerText, config: room.config });
  roomState(room);
}

function backToLobby(socket) {
  const room = rooms.get(socket.roomCode);
  if (!room || !room.players.some((player) => player.id === socket.playerId)) return;
  clearTimeout(room.prepareTimer);
  room.phase = 'lobby';
  room.rounds = [];
  room.currentRound = -1;
  room.answers = new Map();
  room.players.forEach(resetPlayer);
  broadcast(room, { type: 'back_to_lobby' });
  roomState(room);
}

function handleMessage(socket, raw) {
  let message;
  try { message = JSON.parse(raw.toString()); }
  catch { return send(socket, { type: 'error', message: 'Missatge no vàlid.' }); }
  switch (message.type) {
    case 'create_room': return createRoom(socket, message);
    case 'join_room': return joinRoom(socket, message);
    case 'update_config': return updateConfig(socket, message);
    case 'start_game': return startGame(socket);
    case 'game_audio_ready': return markGameAudioReady(socket);
    case 'round_ready': return markRoundReady(socket, message);
    case 'round_audio_failed': return markRoundAudioFailed(socket, message);
    case 'submit_answer': return submitAnswer(socket, message);
    case 'rematch': return startGame(socket);
    case 'back_to_lobby': return backToLobby(socket);
    case 'resume_room': return resumeRoom(socket, message);
    case 'leave_room': leaveRoom(socket); return send(socket, { type: 'room_left' });
    default: return send(socket, { type: 'error', message: 'Ordre desconeguda.' });
  }
}

function safeServe(baseDir, requestedPath, request, response) {
  let decoded;
  try { decoded = decodeURIComponent(requestedPath); }
  catch { response.writeHead(400); return response.end('Ruta no vàlida'); }

  const target = path.resolve(baseDir, decoded.replace(/^\/+/, ''));
  const root = path.resolve(baseDir);

  if (!target.startsWith(root + path.sep) && target !== root) {
    response.writeHead(403);
    return response.end('Accés denegat');
  }

  fs.stat(target, (error, stats) => {
    if (error || !stats.isFile()) {
      response.writeHead(404);
      return response.end('Fitxer no trobat');
    }

    const extension = path.extname(target).toLowerCase();
    const contentType = MIME_TYPES[extension] || 'application/octet-stream';
    const isAudio = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'].includes(extension);
    const rangeHeader = request.headers.range;

    if (isAudio && rangeHeader) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());

      if (!match) {
        response.writeHead(416, {
          'Content-Range': `bytes */${stats.size}`,
          'Accept-Ranges': 'bytes'
        });
        return response.end();
      }

      let start = match[1] ? Number(match[1]) : 0;
      let end = match[2] ? Number(match[2]) : stats.size - 1;

      if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || start >= stats.size) {
        response.writeHead(416, {
          'Content-Range': `bytes */${stats.size}`,
          'Accept-Ranges': 'bytes'
        });
        return response.end();
      }

      end = Math.min(end, stats.size - 1);
      const chunkSize = end - start + 1;

      response.writeHead(206, {
        'Content-Type': contentType,
        'Content-Length': chunkSize,
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=3600'
      });

      return fs.createReadStream(target, { start, end }).pipe(response);
    }

    response.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Accept-Ranges': isAudio ? 'bytes' : 'none',
      'Cache-Control': isAudio
        ? 'private, max-age=3600'
        : 'no-store, no-cache, must-revalidate'
    });

    fs.createReadStream(target).pipe(response);
  });
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  if (url.pathname === '/health') {
    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    return response.end(JSON.stringify({ ok: true, clientIndex: fs.existsSync(path.join(CLIENT_DIR, 'index.html')), songs: library().length }));
  }
  if (url.pathname === '/') {
    return safeServe(CLIENT_DIR, 'index.html', request, response);
  }
  if (url.pathname === '/api/library') {
    const artists = new Set(library().map((track) => track.artist));
    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    return response.end(JSON.stringify({
      count: library().length,
      excluded: libraryState.invalid.length,
      parsedArtists: artists.size,
      titleOnly: libraryState.titleOnly.length,
      categories: categoryStats().filter((item) => item.name !== 'Sense categoria'),
      uncategorizedCount: categoryStats().find((item) => item.name === 'Sense categoria')?.count || 0,
      questionTypes: availableQuestionTypes(library())
    }));
  }
  if (url.pathname === '/api/rescan' && request.method === 'POST') {
    buildLibrary().then((state) => {
      libraryState = state;
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ ok: true, count: library().length, excluded: libraryState.invalid.length }));
    }).catch((error) => {
      response.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ ok: false, message: error.message }));
    });
    return;
  }
  if (url.pathname.startsWith('/music/')) return safeServe(MUSIC_DIR, url.pathname.slice('/music/'.length), request, response);
  return safeServe(CLIENT_DIR, url.pathname, request, response);
});

const wss = new WebSocket.Server({ server });
wss.on('connection', (socket) => {
  socket.playerId = makePlayerId();
  socket.roomCode = null;
  socket.isAlive = true;
  send(socket, { type: 'connected', playerId: socket.playerId });
  socket.on('pong', () => { socket.isAlive = true; });
  socket.on('message', (raw) => handleMessage(socket, raw));
  socket.on('close', () => temporarilyDisconnect(socket));
  socket.on('error', () => {});
});

const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((socket) => {
    if (socket.isAlive === false) return socket.terminate();
    socket.isAlive = false;
    try { socket.ping(); } catch {}
  });
}, 25000);

wss.on('close', () => clearInterval(heartbeatInterval));

async function main() {
  try {
    console.log('Llegint etiquetes ID3 i noms dels fitxers...');
    libraryState = await buildLibrary();
  } catch (error) {
    console.error('No s’ha pogut construir la biblioteca:', error);
    process.exit(1);
  }

  console.log(`Arrel del projecte: ${ROOT_DIR}`);
  console.log(`Client index: ${path.join(CLIENT_DIR, 'index.html')} (${fs.existsSync(path.join(CLIENT_DIR, 'index.html')) ? 'OK' : 'NO TROBAT'})`);
  server.listen(PORT, '0.0.0.0', () => {
    const addresses = Object.values(os.networkInterfaces()).flat().filter((item) => item && item.family === 'IPv4' && !item.internal).map((item) => `http://${item.address}:${PORT}`);
    console.log('');
    console.log('=========================================');
    console.log(' MUSIC BATTLE');
    console.log(` ${library().length} cançons utilitzables`);
    console.log(` ${libraryState.full.length} amb artista i títol`);
    console.log(` ${libraryState.titleOnly.length} només per preguntes de títol`);
    console.log(` ${libraryState.invalid.length} fitxers exclosos`);
    console.log(` PC: http://localhost:${PORT}`);
    addresses.forEach((address) => console.log(` Xarxa local: ${address}`));
    console.log(' Informe: data\\library-report.txt');
    console.log('=========================================');
    console.log('');
  });
}

main();
