// =================================================================
//  INPUT (Fortsetzung)
// =================================================================
function getCanvasCoords(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}

function handlePointerDown(clientX, clientY) {
  if (!game || game.over) return;
  const { x, y } = getCanvasCoords(clientX, clientY);
  game.pointerX = x;
  game.pointerY = y;

  if (game.selectedCard !== null) {
    // Versuche Karte zu platzieren
    const placed = tryPlacePlayerCard(game, game.selectedCard, x, y);
    if (placed) {
      renderCardBar(game);
      updateElixirBar(game);
    }
  }
}

function handlePointerMove(clientX, clientY) {
  if (!game || game.over) return;
  const { x, y } = getCanvasCoords(clientX, clientY);
  game.pointerX = x;
  game.pointerY = y;
}

// Maus-Events
canvas.addEventListener('mousedown', (e) => handlePointerDown(e.clientX, e.clientY));
canvas.addEventListener('mousemove', (e) => handlePointerMove(e.clientX, e.clientY));
canvas.addEventListener('mouseleave', () => {
  if (game) { game.pointerX = null; game.pointerY = null; }
});

// Touch-Events
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const t = e.touches[0];
  if (t) handlePointerDown(t.clientX, t.clientY);
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const t = e.touches[0];
  if (t) handlePointerMove(t.clientX, t.clientY);
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  // optional: nichts weiter nötig
}, { passive: false });

// =================================================================
//  GAME LOOP
// =================================================================
let rafId = null;

function gameLoop(timestamp) {
  if (!game) return;

  if (!game.lastTime) game.lastTime = timestamp;
  let dt = (timestamp - game.lastTime) / 1000;
  game.lastTime = timestamp;

  // Clamp dt (z. B. bei Tab-Wechsel)
  dt = Math.min(dt, 0.05);

  if (!game.over) {
    updateGame(game, dt);

    // Elixir & Hand UI aktualisieren
    updateElixirBar(game);

    // Handkarten können sich durch Verbrauch ändern -> neu rendern
    // (nur wenn sich etwas geändert hat, um Flackern zu vermeiden)
    if (game._handDirty) {
      renderCardBar(game);
      game._handDirty = false;
    }
  }

  renderGame(game);
  rafId = requestAnimationFrame(gameLoop);
}

function startGame() {
  // Vorherigen Loop stoppen
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }

  game = createGameState();
  initHands(game);
  game.lastTime = 0;
  game._handDirty = true;

  // UI zurücksetzen
  $('gameOver').classList.remove('active');
  renderCardBar(game);
  updateElixirBar(game);
  showScreen('gameScreen');

  rafId = requestAnimationFrame(gameLoop);
}

function stopGame() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  game = null;
}

// =================================================================
//  MENÜ-VERDRAHTUNG
// =================================================================
function setupMenu() {
  // Play-Button
  $('playBtn').addEventListener('click', () => {
    startGame();
  });

  // Shop öffnen / schließen
  $('shopBtn').addEventListener('click', () => {
    renderShop();
    openModal('shopModal');
  });
  $('shopClose').addEventListener('click', () => closeModal('shopModal'));

  // Arenen öffnen / schließen
  $('arenaBtn').addEventListener('click', () => {
    renderArenas();
    openModal('arenaModal');
  });
  $('arenaClose').addEventListener('click', () => closeModal('arenaModal'));

  // Stats öffnen / schließen
  $('statsBtn').addEventListener('click', () => {
    renderStats();
    openModal('statsModal');
  });
  $('statsClose').addEventListener('click', () => closeModal('statsModal'));

  // Zurück aus dem Spiel
  $('backBtn').addEventListener('click', () => {
    stopGame();
    updateHomeStats();
    showScreen('homeScreen');
  });

  // Nach Spielende: Weiter-Button
  $('continueBtn').addEventListener('click', () => {
    $('gameOver').classList.remove('active');
    stopGame();
    updateHomeStats();
    showScreen('homeScreen');
  });

  // Nochmal-Button
  $('rematchBtn').addEventListener('click', () => {
    $('gameOver').classList.remove('active');
    startGame();
  });

  // Modal-Hintergrund-Klick schließt Modal
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
  });
}

// =================================================================
//  INIT
// =================================================================
function init() {
  updateHomeStats();
  setupMenu();
  showScreen('homeScreen');

  // Verhindere Scrollen / Gummiband auf Mobile beim Canvas
  document.addEventListener('touchmove', (e) => {
    if (game && !game.over) e.preventDefault();
  }, { passive: false });
}

document.addEventListener('DOMContentLoaded', init);
