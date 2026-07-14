let socket = null;
let reconnectTimer = null;
let reconnectAttempts = 0;
let manualClose = false;
const $ = (id) => document.getElementById(id);
const screens = [...document.querySelectorAll('.screen')];
const answerButtons = [...document.querySelectorAll('.answer-button')];

function storageGet(type, key) {
  try { return window[type].getItem(key); }
  catch { return null; }
}
function storageSet(type, key, value) {
  try { window[type].setItem(key, value); return true; }
  catch { return false; }
}
function storageRemove(type, key) {
  try { window[type].removeItem(key); }
  catch {}
}

let myId = null;
let roomCode = null;
let players = [];
let creatorId = null;
let selectedAnswer = null;
let timerInterval = null;
let audioStopTimer = null;
let preparedAudio = null;
let leaveGameConfirmUntil = 0;
let categoryData = [];
let availableQuestionTypes = ['artist', 'title'];
let audioUnlocked = false;
let pendingRoomAction = null;
let pendingRoundData = null;
let audioContext = null;

const savedConfig = (() => {
  try { return JSON.parse(storageGet('localStorage', 'musicBattleConfig') || '{}'); }
  catch { return {}; }
})();

let configState = {
  categories: Array.isArray(savedConfig.categories) ? savedConfig.categories : [],
  questionTypes: Array.isArray(savedConfig.questionTypes) ? savedConfig.questionTypes : [],
  questionCount: [10, 20, 30].includes(savedConfig.questionCount) ? savedConfig.questionCount : 10,
  roundSeconds: [5, 8, 10].includes(savedConfig.roundSeconds) ? savedConfig.roundSeconds : 10
};

const show = (id) => screens.forEach((screen) => screen.classList.toggle('active', screen.id === id));
const player = (number) => players.find((item) => item.playerNumber === number);

const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=';

function showAudioUnlock(action = null) {
  pendingRoomAction = action || pendingRoomAction;
  const panel = $('audioUnlock');
  panel.hidden = false;
  requestAnimationFrame(() => panel.classList.add('show'));
}

function hideAudioUnlock() {
  const panel = $('audioUnlock');
  panel.classList.remove('show');
  setTimeout(() => { panel.hidden = true; }, 180);
}

async function unlockAudio() {
  if (audioUnlocked) {
    try { if (audioContext && audioContext.resume) await audioContext.resume(); } catch {}
    return true;
  }

  const audio = $('audioPlayer');
  const previous = {
    src: audio.getAttribute('src') || '',
    currentTime: audio.currentTime || 0,
    volume: audio.volume,
    muted: audio.muted
  };

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      if (!audioContext) audioContext = new AudioContextClass();
      await audioContext.resume();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      gain.gain.value = 0.00001;
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.03);
    }

    audio.pause();
    audio.src = SILENT_WAV;
    audio.muted = false;
    audio.volume = 0.01;
    audio.load();
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
    audioUnlocked = true;
    storageSet('localStorage', 'musicBattleAudioUnlocked', '1');
    return true;
  } catch (error) {
    console.warn('No s’ha pogut activar l’àudio:', error);
    audioUnlocked = false;
    return false;
  } finally {
    audio.pause();
    audio.muted = previous.muted;
    audio.volume = previous.volume;
    if (previous.src) {
      audio.src = previous.src;
      try { audio.currentTime = previous.currentTime; } catch {}
    } else {
      audio.removeAttribute('src');
      audio.load();
    }
  }
}

async function runWithAudio(action) {
  const ok = await unlockAudio();
  if (!ok) {
    showAudioUnlock(action);
    return false;
  }
  hideAudioUnlock();
  if (action) action();
  return true;
}

function notify(text) {
  const toast = $('toast');
  toast.textContent = text;
  toast.classList.add('show');
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toast.classList.remove('show'), 1800);
}

function send(type, payload = {}) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    notify('No hi ha connexió amb el servidor');
    return false;
  }
  socket.send(JSON.stringify({ type, ...payload }));
  return true;
}

function setPlayerCard(number, value) {
  const key = number === 1 ? 'One' : 'Two';
  $(`player${key}Name`).textContent = value && value.name ? value.name : 'Esperant...';
  $(`player${key}Status`).textContent = value ? 'Connectat' : 'No connectat';
  $(`player${key}Card`).classList.toggle('connected', Boolean(value));
}

function setScores(values = players, animate = false) {
  players = values;
  for (const number of [1, 2]) {
    const key = number === 1 ? 'One' : 'Two';
    const currentPlayer = player(number);
    const target = currentPlayer && currentPlayer.score ? currentPlayer.score : 0;
    const scoreEl = $(`gamePlayer${key}Score`);
    $(`gamePlayer${key}Name`).textContent = currentPlayer && currentPlayer.name ? currentPlayer.name : `Jugador ${number}`;
    if (!animate) {
      scoreEl.textContent = target;
      continue;
    }
    const start = Number(scoreEl.textContent) || 0;
    const started = performance.now();
    const duration = 450;
    const tick = (now) => {
      const ratio = Math.min(1, (now - started) / duration);
      scoreEl.textContent = Math.round(start + (target - start) * ratio);
      if (ratio < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

function applyChoiceState(containerId, selectedValues, disabled) {
  const container = $(containerId);
  if (!container) return;
  const hasSelection = selectedValues.length > 0;
  container.querySelectorAll('.choice').forEach((button) => {
    const isAny = button.dataset.value === '__any__';
    button.classList.toggle('selected', isAny ? !hasSelection : selectedValues.includes(button.dataset.value));
    button.disabled = disabled;
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function renderCategories(totalCount = 0) {
  const anyLabel = categoryData.length ? 'Qualsevol' : `Tota la biblioteca (${totalCount})`;
  const any = `<button class="choice any selected" data-value="__any__">${anyLabel}</button>`;
  const choices = categoryData.map((item) => `<button class="choice multi" data-value="${escapeHtml(item.name)}">${escapeHtml(item.name)} <small>${item.count}</small></button>`).join('');
  $('categoryChoices').innerHTML = any + choices;
  $('categoryChoices').querySelectorAll('.choice').forEach((button) => {
    button.onclick = () => toggleMultiChoice(button, 'categories');
  });
  applyChoiceState('categoryChoices', configState.categories, false);
}

function renderQuestionTypes() {
  document.querySelectorAll('#questionTypeChoices .choice.multi').forEach((button) => {
    const supported = availableQuestionTypes.includes(button.dataset.value);
    button.hidden = !supported;
    if (!supported) configState.questionTypes = configState.questionTypes.filter((type) => type !== button.dataset.value);
  });
  document.querySelectorAll('#questionTypeChoices .choice').forEach((button) => {
    button.onclick = () => toggleMultiChoice(button, 'questionTypes');
  });
}

function toggleMultiChoice(button, key) {
  const value = button.dataset.value;
  if (value === '__any__') {
    configState[key] = [];
  } else {
    const set = new Set(configState[key]);
    set.has(value) ? set.delete(value) : set.add(value);
    configState[key] = [...set];
  }
  syncConfig();
}

function selectSingle(key, value) {
  configState[key] = Number(value);
  syncConfig();
}

function syncConfig() {
  storageSet('localStorage', 'musicBattleConfig', JSON.stringify(configState));
  send('update_config', { config: configState });
}

function updateLobby(config = configState) {
  configState = { ...configState, ...config };
  storageSet('localStorage', 'musicBattleConfig', JSON.stringify(configState));
  setPlayerCard(1, player(1));
  setPlayerCard(2, player(2));
  $('roomCode').textContent = roomCode || '-----';
  applyChoiceState('questionTypeChoices', configState.questionTypes, false);
  applyChoiceState('categoryChoices', configState.categories, false);
  applyChoiceState('timeChoices', [String(configState.roundSeconds)], false);
  applyChoiceState('countChoices', [String(configState.questionCount)], false);
  const ready = players.length === 2;
  $('startGame').disabled = !ready;
  $('startGame').textContent = !ready ? 'Esperant rival' : 'Començar partida';
  $('lobbyMessage').textContent = !ready ? 'Esperant el segon jugador...' : 'Tots dos podeu configurar i començar.';
}


function randomizeConfig() {
  const availableTypes = [...availableQuestionTypes];
  const typeCount = Math.max(1, Math.min(3, Math.floor(Math.random() * 3) + 1));
  const shuffledTypes = [...availableTypes].sort(() => Math.random() - 0.5);

  let categories = [];
  if (categoryData.length && Math.random() < 0.7) {
    const maxCount = Math.min(3, categoryData.length);
    const categoryCount = Math.floor(Math.random() * maxCount) + 1;
    categories = [...categoryData]
      .sort(() => Math.random() - 0.5)
      .slice(0, categoryCount)
      .map((item) => item.name);
  }

  const times = [10, 8, 5];
  const counts = [10, 20, 30];
  configState = {
    ...configState,
    questionTypes: shuffledTypes.slice(0, typeCount),
    categories,
    roundSeconds: times[Math.floor(Math.random() * times.length)],
    questionCount: counts[Math.floor(Math.random() * counts.length)]
  };
  syncConfig();
  notify('Configuració aleatòria preparada');
}

function startTimer(seconds, startAt) {
  clearInterval(timerInterval);
  const update = () => {
    const remainingMs = Math.max(0, startAt + seconds * 1000 - Date.now());
    const remaining = Math.ceil(remainingMs / 1000);
    $('timer').textContent = remaining;
    $('timer').className = `timer ${remaining <= 3 ? 'danger' : remaining <= 5 ? 'warning' : ''}`;
    if (remainingMs <= 0) clearInterval(timerInterval);
  };
  update();
  timerInterval = setInterval(update, 100);
}

async function prepareAudio(data) {
  pendingRoundData = data;
  if (!audioUnlocked) {
    $('gameMessage').textContent = 'Cal activar el so per continuar.';
    showAudioUnlock();
    return;
  }
  const audio = $('audioPlayer');
  clearTimeout(audioStopTimer);
  audio.pause();
  audio.src = data.audioUrl;
  audio.preload = 'metadata';
  audio.load();
  preparedAudio = null;
  $('gameMessage').textContent = 'Preparant fragment...';
  const gameCard = document.querySelector('.game-card');
  if (gameCard) gameCard.classList.add('preparing-audio');

  try {
    await new Promise((resolve, reject) => {
      if (audio.readyState >= 1) return resolve();
      const timer = setTimeout(() => reject(new Error('metadata timeout')), 20000);
      audio.addEventListener('loadedmetadata', () => { clearTimeout(timer); resolve(); }, { once: true });
      audio.addEventListener('error', () => { clearTimeout(timer); reject(new Error('audio error')); }, { once: true });
    });

    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    const maxStart = Math.max(0, duration - data.seconds - 1);
    const requestedStart = Number(data.fragmentStart) || 0;
    const startSecond = Math.min(maxStart, Math.max(0, requestedStart));

    if (Math.abs(audio.currentTime - startSecond) > 0.15) {
      await new Promise((resolve) => {
        let doneCalled = false;
        const done = () => {
          if (doneCalled) return;
          doneCalled = true;
          clearTimeout(timer);
          audio.removeEventListener('seeked', done);
          resolve();
        };
        const timer = setTimeout(done, 15000);
        audio.addEventListener('seeked', done, { once: true });
        try {
          audio.currentTime = startSecond;
        } catch {
          done();
        }
      });
    }

    await new Promise((resolve) => {
      if (audio.readyState >= 3) return resolve();
      const done = () => { clearTimeout(timer); resolve(); };
      const timer = setTimeout(done, 15000);
      audio.addEventListener('canplay', done, { once: true });
    });

    preparedAudio = { startSecond, seconds: data.seconds };
    send('round_ready', { roundNumber: data.roundNumber });
  } catch (error) {
    console.warn('Error preparant l’àudio:', error);
    $('gameMessage').textContent = 'No s’ha pogut carregar el fragment. Prem per tornar-ho a provar.';
    showAudioUnlock();
    send('round_audio_failed', { roundNumber: data.roundNumber });
  }
}

function startPreparedAudio(data) {
  const audio = $('audioPlayer');
  const startSecond = preparedAudio && preparedAudio.startSecond != null
    ? preparedAudio.startSecond
    : (Number(data.fragmentStart) || 0);
  const delay = Math.max(0, data.startAt - Date.now());
  setTimeout(async () => {
    try {
      if (Math.abs(audio.currentTime - startSecond) > 0.35) audio.currentTime = startSecond;
      await audio.play();
      $('gameMessage').textContent = 'Escolta i respon.';
      const gameCard = document.querySelector('.game-card');
      if (gameCard) gameCard.classList.remove('preparing-audio');
      startTimer(data.seconds, Date.now());
      audioStopTimer = setTimeout(() => audio.pause(), data.seconds * 1000 + 80);
    } catch (error) {
      console.warn('Reproducció bloquejada:', error);
      audioUnlocked = false;
      $('gameMessage').textContent = 'Toca “Activar so” per continuar.';
      const gameCard = document.querySelector('.game-card');
      if (gameCard) gameCard.classList.remove('preparing-audio');
      pendingRoundData = { ...pendingRoundData, ...data };
      showAudioUnlock();
      send('round_audio_failed', { roundNumber: data.roundNumber });
    }
  }, delay);
}

function prepareRound(data) {
  selectedAnswer = null;
  show('gameScreen');
  $('currentQuestionNumber').textContent = data.roundNumber;
  $('totalQuestions').textContent = data.totalRounds;
  $('questionText').textContent = data.prompt;
  $('gameMessage').textContent = 'Escolta i respon.';
  setScores(data.players);
  answerButtons.forEach((button, index) => {
    button.textContent = data.options[index];
    button.disabled = false;
    button.className = 'answer-button';
  });
  prepareAudio(data);
}

function runCountdown() {
  show('countdownScreen');
  let value = 3;
  $('countdownValue').textContent = value;
  const interval = setInterval(() => {
    value -= 1;
    if (value <= 0) {
      clearInterval(interval);
      $('countdownValue').textContent = 'GO!';
    } else {
      $('countdownValue').textContent = value;
    }
  }, 800);
}

answerButtons.forEach((button) => {
  button.onclick = () => {
    if (button.disabled) return;
    selectedAnswer = Number(button.dataset.index);
    answerButtons.forEach((item) => item.disabled = true);
    button.classList.add('selected');
    send('submit_answer', { answerIndex: selectedAnswer });
    $('gameMessage').textContent = 'Resposta guardada. Esperant el rival...';
  };
});

document.querySelectorAll('#timeChoices .choice').forEach((button) => {
  button.onclick = () => selectSingle('roundSeconds', button.dataset.value);
});
document.querySelectorAll('#countChoices .choice').forEach((button) => {
  button.onclick = () => selectSingle('questionCount', button.dataset.value);
});

fetch('/api/library')
  .then((response) => response.json())
  .then((data) => {
    categoryData = data.categories || [];
    availableQuestionTypes = data.questionTypes || ['artist', 'title'];
    renderQuestionTypes();
    renderCategories(data.count);
    $('libraryInfo').textContent = `${data.count} cançons · ${data.parsedArtists} artistes`;
  })
  .catch(() => $('libraryInfo').textContent = 'No s’ha pogut llegir la biblioteca');

function connectSocket() {
  clearTimeout(reconnectTimer);
  const wsUrl = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;
  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    reconnectAttempts = 0;
    $('connectionStatus').textContent = 'Connectat al servidor';
    $('connectionStatus').className = 'status connected';
    const savedPlayerId = storageGet('sessionStorage', 'musicBattlePlayerId');
    const savedRoomCode = storageGet('sessionStorage', 'musicBattleRoomCode');
    if (savedPlayerId && savedRoomCode) {
      socket.send(JSON.stringify({ type: 'resume_room', playerId: savedPlayerId, roomCode: savedRoomCode }));
    }
  };

  socket.onclose = () => {
    $('connectionStatus').textContent = 'Reconnectant...';
    $('connectionStatus').className = 'status disconnected';
    if (manualClose) return;
    const delay = Math.min(5000, 700 + reconnectAttempts * 700);
    reconnectAttempts += 1;
    reconnectTimer = setTimeout(connectSocket, delay);
  };

  socket.onerror = () => { try { socket.close(); } catch {} };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    switch (data.type) {
      case 'connected':
        if (!storageGet('sessionStorage', 'musicBattlePlayerId')) myId = data.playerId;
        break;
      case 'resumed':
        myId = data.playerId;
        roomCode = data.roomCode;
        storageSet('sessionStorage', 'musicBattlePlayerId', myId);
        storageSet('sessionStorage', 'musicBattleRoomCode', roomCode);
        notify('Connexió recuperada');
        break;
      case 'resume_failed':
        storageRemove('sessionStorage', 'musicBattlePlayerId');
        storageRemove('sessionStorage', 'musicBattleRoomCode');
        roomCode = null;
        myId = null;
        break;
      case 'room_created':
      case 'room_joined':
        roomCode = data.roomCode;
        storageSet('sessionStorage', 'musicBattlePlayerId', myId);
        storageSet('sessionStorage', 'musicBattleRoomCode', roomCode);
        show('lobbyScreen');
        break;
      case 'room_state':
        roomCode = data.roomCode;
        players = data.players;
        creatorId = data.creatorId;
        updateLobby(data.config);
        break;
      case 'player_left':
        notify('L’altre jugador ha sortit');
        break;
      case 'game_started':
        setScores(data.players);
        runCountdown();
        break;
      case 'round_preparing':
        prepareRound(data);
        break;
      case 'round_started':
        startPreparedAudio(data);
        break;
      case 'audio_activation_required':
        clearInterval(timerInterval);
        clearTimeout(audioStopTimer);
        $('audioPlayer').pause();
        $('gameMessage').textContent = data.playerId === myId
          ? 'Activa el so per continuar la partida.'
          : 'Esperant que el rival activi el so...';
        if (data.playerId === myId) showAudioUnlock();
        break;
      case 'round_waiting_for_audio':
        $('gameMessage').textContent = 'Esperant que els dos dispositius preparin el so...';
        break;
      case 'answer_status':
        if (data.answeredPlayerIds.length === 1 && !data.answeredPlayerIds.includes(myId)) {
          $('gameMessage').textContent = 'El rival ja ha respost!';
        } else if (data.answeredPlayerIds.length === 2) {
          $('gameMessage').textContent = 'Tots dos heu respost...';
        }
        break;
      case 'round_result': {
        clearInterval(timerInterval);
        clearTimeout(audioStopTimer);
        $('audioPlayer').pause();
        setScores(data.players, true);
        answerButtons.forEach((button, index) => {
          button.disabled = true;
          if (index === data.correctIndex) button.classList.add('correct');
          else if (index === selectedAnswer) button.classList.add('incorrect');
        });
        const mine = data.results.find((result) => result.playerId === myId);
        $('gameMessage').textContent = mine && mine.correct
          ? `Correcte! +${mine.points} punts`
          : !mine || mine.answerIndex == null ? 'Temps esgotat' : 'Incorrecte';
        break;
      }
      case 'game_finished':
        players = data.players;
        show('resultsScreen');
        $('winnerMessage').textContent = data.winnerText;
        for (const number of [1, 2]) {
          const value = player(number);
          const key = number === 1 ? 'One' : 'Two';
          const stats = value && value.stats ? value.stats : {};
          $(`finalPlayer${key}Name`).textContent = value && value.name ? value.name : `Jugador ${number}`;
          $(`finalPlayer${key}Score`).textContent = `${value && value.score ? value.score : 0} punts`;
          $(`finalPlayer${key}Stats`).textContent = `Precisió ${stats.accuracy || 0}% · Ratxa ${stats.bestStreak || 0} · Mitjana ${stats.averageMs ? `${(stats.averageMs / 1000).toFixed(2)} s` : '—'}`;
        }
        $('creatorResultActions').style.display = 'grid';
        $('guestResultMessage').style.display = 'none';
        break;
      case 'back_to_lobby':
        show('lobbyScreen');
        break;
      case 'room_left':
        storageRemove('sessionStorage', 'musicBattlePlayerId');
        storageRemove('sessionStorage', 'musicBattleRoomCode');
        location.reload();
        break;
      case 'error':
        notify(data.message);
        break;
    }
  };
}

connectSocket();

$('createRoom').onclick = () => {
  const playerName = $('playerName').value.trim();
  if (!playerName) return notify('Escriu el teu nom');
  storageSet('localStorage', 'musicBattleName', playerName);
  unlockAudio().catch(() => {});
  send('create_room', { playerName, config: configState });
};

$('joinRoom').onclick = () => {
  const playerName = $('playerName').value.trim();
  if (!playerName) return notify('Escriu el teu nom');
  // Safari només permet obrir prompt directament dins del toc de l’usuari.
  const code = prompt('Codi de la sala:');
  if (!code) return;
  storageSet('localStorage', 'musicBattleName', playerName);
  unlockAudio().catch(() => {});
  send('join_room', { playerName, roomCode: code });
};

$('copyCode').onclick = () => {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(roomCode).then(() => notify('Codi copiat')).catch(() => notify(roomCode));
  } else notify(roomCode);
};
$('randomConfig').onclick = randomizeConfig;
$('startGame').onclick = () => runWithAudio(() => send('start_game'));
$('leaveRoom').onclick = () => { storageRemove('sessionStorage', 'musicBattlePlayerId'); storageRemove('sessionStorage', 'musicBattleRoomCode'); send('leave_room'); };
$('rematch').onclick = () => send('rematch');
$('changeConfig').onclick = () => send('back_to_lobby');
$('backHome').onclick = () => { storageRemove('sessionStorage', 'musicBattlePlayerId'); storageRemove('sessionStorage', 'musicBattleRoomCode'); send('leave_room'); };
$('playerName').value = storageGet('localStorage', 'musicBattleName') || '';


$('activateAudio').onclick = async () => {
  const ok = await unlockAudio();
  if (!ok) {
    notify('No s’ha pogut activar el so. Revisa el volum i torna-ho a provar.');
    return;
  }
  hideAudioUnlock();

  const action = pendingRoomAction;
  pendingRoomAction = null;
  if (action) {
    action();
    return;
  }

  if (pendingRoundData) {
    const data = pendingRoundData;
    pendingRoundData = null;
    prepareAudio(data);
  }
};

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && audioUnlocked && audioContext && audioContext.resume) audioContext.resume().catch(() => {});
});

$('leaveGame').onclick = () => {
  const now = Date.now();
  if (now > leaveGameConfirmUntil) {
    leaveGameConfirmUntil = now + 3500;
    $('leaveGame').textContent = 'Confirmar sortida';
    notify('Torna a prémer per abandonar la partida');
    setTimeout(() => { if (Date.now() > leaveGameConfirmUntil) $('leaveGame').textContent = 'Sortir'; }, 3600);
    return;
  }
  storageRemove('sessionStorage', 'musicBattlePlayerId');
  storageRemove('sessionStorage', 'musicBattleRoomCode');
  send('leave_room');
};
