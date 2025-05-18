<template>
  <div class="minigame-overlay-wrapper">
    <div class="maze-game-content-box">
      <h2>Labirintus Futam!</h2>
      <p class="instructions">Használd a nyílbillentyűket vagy a WASD gombokat a kijárat eléréséhez. Válaszolj a kérdésekre az ellenőrzőpontokon!</p>

      <div class="hud">
        <span>Idő: {{ mazeTimeLeft }}s</span>
        <span>Bónusz Szorzó: x{{ bonusMultiplier }}</span>
      </div>

      <button v-if="!gameStarted && !isMazeGameOver" @click="startGame" class="start-game-btn">
        Labirintus Indítása
      </button>

      <div v-if="gameStarted" class="maze-grid-container">
        <div class="maze-grid" :style="gridStyle">
          <div
              v-for="(row, rowIndex) in maze"
              :key="`row-${rowIndex}`"
              class="maze-row"
          >
            <div
                v-for="(cell, colIndex) in row"
                :key="`cell-${rowIndex}-${colIndex}`"
                :class="getCellClass(cell, rowIndex, colIndex)"
                class="maze-cell"
            >
              <span v-if="cell === 3" class="maze-icon">🏁</span>

              <template v-if="cell === 4">
                <div v-if="!isCheckpointSolved(rowIndex, colIndex)"
                     class="checkpoint-coin-sprite"
                     :style="checkpointCoinSpriteStyle">
                </div>
                <span v-if="isCheckpointSolved(rowIndex, colIndex)" class="maze-icon">✅</span>
              </template>
            </div>
          </div>
          <div
              v-if="gameStarted && !isMazeGameOver"
              class="player"
              :style="playerStyle"
          ></div>
        </div>
      </div>

      <div v-if="currentCheckpointQuestion" class="checkpoint-modal">
        <h3>Fejtörő!</h3>
        <p>{{ currentCheckpointQuestion.question }}</p>
        <input type="text" v-model="checkpointAnswer" @keyup.enter="submitCheckpointAnswer" placeholder="Válaszod" />
        <button @click="submitCheckpointAnswer">Válasz Beküldése</button>
        <p v-if="checkpointFeedback" class="checkpoint-feedback" :class="{ correct: checkpointFeedback.includes('Helyes'), incorrect: checkpointFeedback.includes('Helytelen') }">{{ checkpointFeedback }}</p>
      </div>

      <div v-if="isMazeGameOver" class="game-over-summary">
        <h3>{{ isMazeWon ? 'Sikeresen Kijutottál!' : 'Lejárt az Idő!' }}</h3>
        <p>{{ finalBonusPoints }} bónuszpontot szereztél!</p>
        <button @click="closeMinigame" class="continue-button">Vissza a Főjátékhoz</button>
      </div>
    </div>
  </div>
</template>

<script setup>
// Vue és egyéb szükséges modulok importálása
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';

// Sprite sheet-ek importálása az assets mappából
// Győződj meg róla, hogy az elérési utak helyesek a te projektstruktúrádhoz képest!
import knightSpriteSheet from '@/assets/knight.png'; // Lovag sprite
import coinSpriteSheet from '@/assets/coin.png';   // Érme sprite

// Eseménykibocsátó definiálása a szülő komponens (GameScreen) felé
const emit = defineEmits(['minigame-complete']);

// --- Labirintus Definíciók ---
// MAZE_LEVEL_1: A labirintus szerkezete. 0: út, 1: fal, 2: start, 3: cél, 4: ellenőrzőpont
const MAZE_LEVEL_1 = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 2, 0, 1, 0, 0, 0, 0, 4, 1],
  [1, 1, 0, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 1, 0, 1],
  [1, 0, 1, 1, 1, 1, 0, 1, 4, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  [1, 1, 1, 0, 1, 0, 1, 1, 0, 1],
  [1, 4, 0, 0, 1, 0, 0, 1, 0, 3],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];
// CHECKPOINT_QUESTIONS: Az ellenőrzőpontokhoz tartozó kérdések, válaszok és pozíciók
const CHECKPOINT_QUESTIONS = [
  { id: 'cp1', question: "Mennyi 7 x 6?", answer: "42", at: {r: 1, c: 8} },
  { id: 'cp2', question: "Négyzet területe, ha oldala 5 egység?", answer: "25", at: {r: 4, c: 8}},
  { id: 'cp3', question: "3 alma + 2 alma = ?", answer: "5", at: {r: 7, c: 1}},
];

// --- Minijáték Reaktív Állapotai ---
const maze = ref([]); // A labirintus adatszerkezete
const playerPosition = reactive({ r: 0, c: 0 }); // Játékos pozíciója (sor, oszlop)
const mazeTimeLeft = ref(90); // Hátralévő idő a minijátékban
const bonusMultiplier = ref(1); // Bónusz szorzó
const isMazeGameOver = ref(false); // Igaz, ha a minijátéknak vége
const isMazeWon = ref(false); // Igaz, ha a játékos nyert
const gameStarted = ref(false); // Igaz, ha a minijáték elindult
const finalBonusPoints = ref(0); // A minijáték végén szerzett pontok
const checkpoints = ref([]); // Az ellenőrzőpontok listája és állapota
const currentCheckpointQuestion = ref(null); // Az aktuális ellenőrzőponti kérdés objektuma
const checkpointAnswer = ref(''); // A játékos válasza a kérdésre
const checkpointFeedback = ref(''); // Visszajelzés a válaszról
let minigameTimerInterval = null; // A minijáték időzítőjének ID-ja
const CELL_SIZE = 30; // Egy labirintuscella mérete pixelben

// --- Játékos (Lovag) Sprite Animáció Konfigurációja ---
const PLAYER_SPRITE_IMAGE_URL = knightSpriteSheet; // Importált lovag sprite sheet
const PLAYER_SPRITE_FRAME_WIDTH = 16;  // Egy képkocka szélessége a lovag sprite sheet-en (ellenőrizd!)
const PLAYER_SPRITE_FRAME_HEIGHT = 16; // Egy képkocka magassága (ellenőrizd!)
const PLAYER_ANIMATION_SPEED_MS = 150; // Animáció sebessége (ms/képkocka)
const PLAYER_DISPLAY_SCALE_FACTOR = 1.75; // Megjelenítési méret szorzója (pl. 1.75 * 16px = 28px)

// Lovag animációinak konfigurációja.
// FONTOS: Ellenőrizd és igazítsd ezeket az értékeket (yOffset, frameCount) a TE `knight.png` FÁJLODHOZ!
// A jelenlegi 'down' és 'up' frameCount: 1, ami statikus pózt jelent vertikális mozgásnál.
// A 'left' a 'right' tükrözöttje lesz. Minden animáció az yOffset: 75 sort használja.
const SPRITE_ANIMATIONS = {
  down:      { yOffset: 75,  frameCount: 1 },
  left:      { yOffset: 75,  frameCount: 6 }, // Tükrözve lesz
  right:     { yOffset: 75,  frameCount: 6 }, // Alap a vízszintes mozgáshoz
  up:        { yOffset: 75,  frameCount: 1 },
  idleDown:  { yOffset: 75,  frameCount: 1 },
  idleLeft:  { yOffset: 75,  frameCount: 1 }, // Tükrözve lesz
  idleRight: { yOffset: 75,  frameCount: 1 },
  idleUp:    { yOffset: 75,  frameCount: 1 },
};
const playerDirection = ref('idleDown'); // Játékos aktuális iránya
const playerCurrentFrame = ref(0);    // Játékos animációjának aktuális képkockája
let playerAnimationIntervalId = null; // Játékos animáció időzítő ID

// --- Érme (Ellenőrzőpont) Sprite Animáció Konfigurációja ---
// FONTOS: Ellenőrizd ezeket az értékeket a TE `coin.png` fájlodhoz!
const COIN_SPRITE_IMAGE_URL = coinSpriteSheet; // Importált érme sprite sheet
const COIN_SPRITE_FRAME_WIDTH = 16;    // Becsült szélessége egy érme képkockának
const COIN_SPRITE_FRAME_HEIGHT = 16;   // Becsült magassága
const COIN_SPRITE_FRAMES_COUNT = 10;   // Becsült képkockaszám az érme animációban
const COIN_ANIMATION_SPEED_MS = 100;   // Érme animáció sebessége
const activeCoinFrame = ref(0);       // Aktuális képkocka az összes (megoldatlan) érme animációhoz
let coinAnimationIntervalId = null;   // Érme animáció időzítő ID

// --- Számított Tulajdonságok (Computed Properties) ---
// Dinamikus stílus a labirintus rácsához
const gridStyle = computed(() => {
  if (!maze.value.length || !maze.value[0]?.length) { return { display: 'none' }; } // Ha nincs labirintus adat, ne jelenjen meg
  return {
    display: 'grid',
    gridTemplateRows: `repeat(${maze.value.length}, ${CELL_SIZE}px)`,
    gridTemplateColumns: `repeat(${maze.value[0].length}, ${CELL_SIZE}px)`,
  };
});

// Dinamikus stílus a játékos megjelenítéséhez (pozíció, sprite frame, méretezés, tükrözés)
const playerStyle = computed(() => {
  const currentDirectionKey = playerDirection.value;
  const animConfig = SPRITE_ANIMATIONS[currentDirectionKey];

  if (!animConfig) { // Hibakezelés, ha az irányhoz nincs animáció konfigurálva
    console.warn('Érvénytelen játékosirány az animációhoz:', currentDirectionKey);
    return { /* Alapértelmezett stílus hiba esetére */
      position: 'absolute',
      top: `${playerPosition.r * CELL_SIZE + (CELL_SIZE - PLAYER_SPRITE_FRAME_HEIGHT) / 2}px`,
      left: `${playerPosition.c * CELL_SIZE + (CELL_SIZE - PLAYER_SPRITE_FRAME_WIDTH) / 2}px`,
      width: `${PLAYER_SPRITE_FRAME_WIDTH}px`, height: `${PLAYER_SPRITE_FRAME_HEIGHT}px`,
      backgroundColor: 'rgba(255,0,0,0.5)', transform: `scale(${PLAYER_DISPLAY_SCALE_FACTOR})`,
      transformOrigin: 'center', zIndex: 5, pointerEvents: 'none',
      transition: 'top 0.07s linear, left 0.07s linear',
    };
  }

  let horizontalFlipScale = 1; // Alapértelmezetten nincs tükrözés
  if (currentDirectionKey.includes('left')) { // Ha az irány 'left' vagy 'idleLeft'
    horizontalFlipScale = -1; // Vízszintes tükrözés
  }

  const frameXPosition = playerCurrentFrame.value * PLAYER_SPRITE_FRAME_WIDTH; // X pozíció a sprite sheet-en
  const frameYPosition = animConfig.yOffset; // Y pozíció (sor) a sprite sheet-en

  return {
    position: 'absolute', // Abszolút pozicionálás a .maze-grid-hez képest
    // A sprite középre igazítása a cellán belül (figyelembe véve a sprite eredeti méretét)
    top: `${playerPosition.r * CELL_SIZE + (CELL_SIZE - PLAYER_SPRITE_FRAME_HEIGHT) / 2}px`,
    left: `${playerPosition.c * CELL_SIZE + (CELL_SIZE - PLAYER_SPRITE_FRAME_WIDTH) / 2}px`,
    // A div mérete megegyezik a sprite egy képkockájának eredeti méretével
    width: `${PLAYER_SPRITE_FRAME_WIDTH}px`,
    height: `${PLAYER_SPRITE_FRAME_HEIGHT}px`,
    backgroundImage: `url(${PLAYER_SPRITE_IMAGE_URL})`, // Háttérkép a sprite sheet
    backgroundPosition: `-${frameXPosition}px -${frameYPosition}px`, // A megfelelő képkocka kiválasztása
    backgroundRepeat: 'no-repeat', // Ne ismétlődjön a háttérkép
    transform: `scale(${PLAYER_DISPLAY_SCALE_FACTOR}) scaleX(${horizontalFlipScale})`, // Méretezés és tükrözés
    transformOrigin: 'center', // A transzformációk középpontja
    transition: 'top 0.07s linear, left 0.07s linear', // Finom mozgás a cellák között
    zIndex: 5, // Rétegsorrend (a cellák felett legyen)
    pointerEvents: 'none', // Ne akadályozza az egér eseményeket alatta
    imageRendering: 'pixelated', // Élesebb megjelenítés pixelgrafikánál nagyításkor
  };
});

// Dinamikus stílus az ellenőrzőpont érme animációjához
const checkpointCoinSpriteStyle = computed(() => {
  const frameXPosition = activeCoinFrame.value * COIN_SPRITE_FRAME_WIDTH;
  const frameYPosition = 0; // Feltételezzük, hogy az érme animáció egyetlen vízszintes sorban van
  return {
    width: `${COIN_SPRITE_FRAME_WIDTH}px`,
    height: `${COIN_SPRITE_FRAME_HEIGHT}px`,
    backgroundImage: `url(${COIN_SPRITE_IMAGE_URL})`,
    backgroundPosition: `-${frameXPosition}px -${frameYPosition}px`,
    backgroundRepeat: 'no-repeat',
    imageRendering: 'pixelated',
  };
});

// --- Animáció Vezérlő Függvények ---
// Játékos animációs ciklusának elindítása
function startPlayerAnimationLoop() {
  stopPlayerAnimationLoop(); // Előző ciklus leállítása, ha volt
  playerAnimationIntervalId = setInterval(() => {
    // Ha a játék nem aktív (szünetel, vége, kérdés aktív), idle állapotba váltás
    if (!gameStarted.value || isMazeGameOver.value || currentCheckpointQuestion.value) {
      const currentDirectionBase = playerDirection.value.replace('idle', '').toLowerCase(); // Pl. 'down', 'up'
      const idleState = `idle${currentDirectionBase.charAt(0).toUpperCase() + currentDirectionBase.slice(1)}`; // Pl. 'idleDown'
      if (SPRITE_ANIMATIONS[idleState] && playerDirection.value !== idleState) { // Ha van specifikus idle és még nem abban van
        playerDirection.value = idleState; playerCurrentFrame.value = 0;
      } else if (!SPRITE_ANIMATIONS[idleState] && playerDirection.value !== 'idleDown') { // Ha nincs, alapértelmezett idleDown
        playerDirection.value = 'idleDown'; playerCurrentFrame.value = 0;
      } return; // Ne lépjen tovább a képkocka, ha nem aktív a játékos mozgása
    }
    // Ha a játék aktív és a játékos nem tétlen állapotban van (azaz mozog)
    if (!playerDirection.value.startsWith('idle')) {
      const animConfig = SPRITE_ANIMATIONS[playerDirection.value];
      if (animConfig && animConfig.frameCount > 1) { // Ha van több képkockás animáció
        playerCurrentFrame.value = (playerCurrentFrame.value + 1) % animConfig.frameCount; // Képkocka léptetése ciklikusan
      }
    }
  }, PLAYER_ANIMATION_SPEED_MS);
}
// Játékos animációs ciklusának leállítása és idle állapot beállítása
function stopPlayerAnimationLoop() {
  if (playerAnimationIntervalId) { clearInterval(playerAnimationIntervalId); playerAnimationIntervalId = null; }
  const currentDirectionBase = playerDirection.value.replace('idle', '').toLowerCase();
  const idleState = `idle${currentDirectionBase.charAt(0).toUpperCase() + currentDirectionBase.slice(1)}`;
  if (SPRITE_ANIMATIONS[idleState]) { playerDirection.value = idleState; }
  else { playerDirection.value = 'idleDown'; } // Alapértelmezett idle
  playerCurrentFrame.value = 0; // Vissza az első (idle) képkockára
}
// Érme animációs ciklusának elindítása
function startCoinAnimationLoop() {
  if (coinAnimationIntervalId) clearInterval(coinAnimationIntervalId);
  coinAnimationIntervalId = setInterval(() => {
    if (gameStarted.value && !isMazeGameOver.value) { // Csak ha a játék aktívan fut
      activeCoinFrame.value = (activeCoinFrame.value + 1) % COIN_SPRITE_FRAMES_COUNT; // Érme képkocka léptetése
    }
  }, COIN_ANIMATION_SPEED_MS);
}
// Érme animációs ciklusának leállítása
function stopCoinAnimationLoop() {
  if (coinAnimationIntervalId) { clearInterval(coinAnimationIntervalId); coinAnimationIntervalId = null; }
}

// --- Alapvető Minijáték Funkciók ---
// Ellenőrzi, hogy egy adott ellenőrzőpont meg lett-e oldva
const isCheckpointSolved = (r, c) => {
  const cp = checkpoints.value.find(p => p.r === r && p.c === c);
  return cp ? cp.solved : false;
};
// Labirintus inicializálása: betölti a pályát, megtalálja a start pozíciót, beállítja az ellenőrzőpontokat
const initializeMaze = () => {
  const mazeDefinition = JSON.parse(JSON.stringify(MAZE_LEVEL_1)); // Mély másolás, hogy az eredeti ne módosuljon
  maze.value = mazeDefinition;
  let startFound = false;
  for (let r = 0; r < maze.value.length; r++) {
    for (let c = 0; c < maze.value[r].length; c++) {
      if (maze.value[r][c] === 2) { // 2-es jelöli a start pozíciót
        playerPosition.r = r; playerPosition.c = c;
        startFound = true; break;
      }
    } if (startFound) break;
  }
  if (!startFound) console.error("Start pozíció (2) nem található a MAZE_LEVEL_1-ben!");
  // Ellenőrzőpontok inicializálása a kérdésekkel
  checkpoints.value = CHECKPOINT_QUESTIONS.map(q => ({
    id: q.id, r: q.at.r, c: q.at.c, question: q.question,
    answerText: q.answer.toString().trim().toLowerCase(), solved: false, active: false
  }));
};
// CSS osztályokat ad vissza egy cellához a típusa alapján
const getCellClass = (cellType, r, c) => {
  let classes = ['maze-cell-type-' + cellType]; // Általános típus osztály (pl. .maze-cell-type-1)
  if (cellType === 1) classes.push('wall');          // Fal
  else if (cellType === 0) classes.push('path');     // Út
  else if (cellType === 2) classes.push('path', 'start-cell'); // Start (ami egyben út is)
  else if (cellType === 3) classes.push('path', 'exit');      // Cél (ami egyben út is)
  else if (cellType === 4) { // Ellenőrzőpont (ami egyben út is)
    classes.push('path', 'checkpoint-cell');
    if (isCheckpointSolved(r, c)) classes.push('checkpoint-solved'); // Ha megoldott
  } else classes.push('unknown-cell'); // Ismeretlen cellatípus (hibakereséshez)
  return classes.join(' '); // Visszaadja az osztályokat stringként, szóközzel elválasztva
};
// Billentyűlenyomások kezelése a játékos mozgatásához
const handleKeydown = (event) => {
  // Ne fusson, ha a játék nem aktív, vége van, vagy egy ellenőrzőponti kérdés aktív
  if (!gameStarted.value || isMazeGameOver.value || currentCheckpointQuestion.value) return;

  let newR = playerPosition.r; let newC = playerPosition.c; // Jelenlegi pozíció másolása
  let attemptedDirection = playerDirection.value.replace('idle','').toLowerCase(); // Alapértelmezett irány kinyerése
  let keyProcessed = false; // Jelzi, hogy mozgató billentyű volt-e lenyomva

  // Billentyű alapján új pozíció és irány meghatározása
  switch (event.key) {
    case 'ArrowUp': case 'w': case 'W': newR--; attemptedDirection = 'up'; keyProcessed = true; break;
    case 'ArrowDown': case 's': case 'S': newR++; attemptedDirection = 'down'; keyProcessed = true; break;
    case 'ArrowLeft': case 'a': case 'A': newC--; attemptedDirection = 'left'; keyProcessed = true; break;
    case 'ArrowRight': case 'd': case 'D': newC++; attemptedDirection = 'right'; keyProcessed = true; break;
    default: return; // Ha nem mozgató billentyű, kilépés
  }
  event.preventDefault(); // Böngésző alapértelmezett görgetésének megakadályozása a nyilakkal

  // Ha mozgató billentyű volt, és az irány változott vagy tétlen állapotból indult, frissítjük az irányt és a képkockát
  if (keyProcessed) {
    if (playerDirection.value !== attemptedDirection || playerDirection.value.startsWith('idle')) {
      playerDirection.value = attemptedDirection; // Beállítjuk a mozgásirányt (pl. 'up', 'down')
      playerCurrentFrame.value = 0; // Animáció visszaállítása az első képkockára
    }
  }

  // Ellenőrizzük, hogy az új pozíció érvényes-e (pályán belül van és nem fal)
  if ( newR >= 0 && newR < maze.value.length &&
      newC >= 0 && newC < maze.value[0].length &&
      maze.value[newR][newC] !== 1 ) { // Ha nem fal
    playerPosition.r = newR; playerPosition.c = newC; // Játékos pozíciójának frissítése
    checkForGameEvents(); // Események ellenőrzése az új pozíción
  } else { // Ha falnak ütközött vagy a pálya szélére ért
    // Beállítjuk a játékost az ütközés irányába néző tétlen (idle) állapotba
    const idleState = `idle${attemptedDirection.charAt(0).toUpperCase() + attemptedDirection.slice(1)}`;
    if(SPRITE_ANIMATIONS[idleState]) { playerDirection.value = idleState; }
    else { playerDirection.value = 'idleDown'; } // Alapértelmezett idle, ha nincs specifikus
    playerCurrentFrame.value = 0;
  }
};
// Események ellenőrzése a játékos aktuális pozícióján (kijárat, ellenőrzőpont)
const checkForGameEvents = () => {
  if (isMazeGameOver.value) return; // Ha már vége a játéknak, ne csináljon semmit
  // Hibakezelés, ha a játékos pozíciója valamiért érvénytelen lenne
  if (!maze.value[playerPosition.r] || typeof maze.value[playerPosition.r][playerPosition.c] === 'undefined') return;

  const currentCellType = maze.value[playerPosition.r][playerPosition.c]; // Cella típusa az aktuális pozíción
  if (currentCellType === 3) endMinigame(true); // Ha a célban van, játék vége (győzelem)
  if (currentCellType === 4) { // Ha ellenőrzőponton van
    const cp = checkpoints.value.find(p => p.r === playerPosition.r && p.c === playerPosition.c);
    // Ha az ellenőrzőpont létezik, még nincs megoldva és nem aktív éppen, akkor aktiváljuk
    if (cp && !cp.solved && !cp.active) triggerCheckpoint(cp);
  }
};
// Ellenőrzőpont kérdésmodáljának aktiválása
const triggerCheckpoint = (checkpoint) => {
  if (minigameTimerInterval) clearInterval(minigameTimerInterval); minigameTimerInterval = null; // Időzítő leállítása
  checkpoint.active = true; // Ellenőrzőpont aktívvá tétele (nehogy újra aktiválódjon)
  currentCheckpointQuestion.value = { ...checkpoint }; // Kérdés adatainak beállítása a modálhoz
  checkpointAnswer.value = ''; checkpointFeedback.value = ''; // Válasz és visszajelzés ürítése
  stopPlayerAnimationLoop(); // Játékos animációjának szüneteltetése
};
// Ellenőrzőponti válasz feldolgozása
const submitCheckpointAnswer = () => {
  if (!currentCheckpointQuestion.value) return; // Ha nincs aktív kérdés, ne csináljon semmit

  const activeCPDetails = currentCheckpointQuestion.value;
  const originalCP = checkpoints.value.find(cp => cp.id === activeCPDetails.id); // Eredeti checkpoint objektum megkeresése

  // Válasz ellenőrzése (kisbetűs, whitespace nélküli összehasonlítás)
  if (checkpointAnswer.value.trim().toLowerCase() === activeCPDetails.answerText) { // Helyes válasz
    checkpointFeedback.value = "Helyes! Bónusz Szorzó Növelve!";
    bonusMultiplier.value *= 2; // Szorzó duplázása
    if (originalCP) originalCP.solved = true; // Ellenőrzőpont megoldottnak jelölése
  } else { // Helytelen válasz
    checkpointFeedback.value = `Helytelen. A helyes válasz: ${activeCPDetails.answerText}.`;
  }

  // Rövid késleltetés után a modál bezárása és a játék folytatása
  setTimeout(() => {
    if (originalCP) originalCP.active = false; // Checkpoint már nem aktív (kérdés szempontjából)
    currentCheckpointQuestion.value = null; // Modál bezárása
    if (!isMazeGameOver.value && gameStarted.value) { // Ha a játék még tart
      if (minigameTimerInterval) clearInterval(minigameTimerInterval); // Dupla időzítő elkerülése
      minigameTimerInterval = setInterval(countdown, 1000); // Időzítő újraindítása
      startPlayerAnimationLoop(); // Játékos animáció újraindítása
    }
  }, 2000); // 2 másodpercig látható a visszajelzés
};
// Minijáték elindítása
const startGame = () => {
  console.log("Labirintus Minijáték Elindítva!");
  // Kezdeti állapotok visszaállítása/beállítása
  initializeMaze();
  gameStarted.value = true; isMazeGameOver.value = false; isMazeWon.value = false;
  mazeTimeLeft.value = 90; bonusMultiplier.value = 1; currentCheckpointQuestion.value = null;
  checkpointAnswer.value = ''; checkpointFeedback.value = ''; finalBonusPoints.value = 0;
  playerDirection.value = 'idleDown'; playerCurrentFrame.value = 0; // Játékos animáció kezdőállapota
  activeCoinFrame.value = 0; // Érme animáció kezdő képkockája

  if (minigameTimerInterval) clearInterval(minigameTimerInterval); // Korábbi időzítő törlése
  minigameTimerInterval = setInterval(countdown, 1000); // Új időzítő indítása

  window.addEventListener('keydown', handleKeydown); // Billentyűzet figyelésének hozzáadása
  startPlayerAnimationLoop(); // Játékos animáció elindítása
  startCoinAnimationLoop();   // Érme animáció elindítása
};
// Visszaszámláló függvény
const countdown = () => {
  // Ne fusson, ha kérdés aktív, vagy a játék nem indult el/már vége
  if (currentCheckpointQuestion.value || !gameStarted.value || isMazeGameOver.value) return;
  mazeTimeLeft.value--; // Idő csökkentése
  if (mazeTimeLeft.value <= 0) { // Ha lejárt az idő
    mazeTimeLeft.value = 0; // Ne menjen mínuszba
    endMinigame(false); // Játék vége (vesztés)
  }
};
// Minijáték befejezése
const endMinigame = (won = false) => {
  if (isMazeGameOver.value) return; // Ne fusson le többször
  console.log("Labirintus Minijáték Vége!", won ? "Játékos Nyert" : "Játékos Vesztett/Idő Lejárt");
  isMazeGameOver.value = true; isMazeWon.value = won; // Állapotok beállítása

  clearInterval(minigameTimerInterval); minigameTimerInterval = null; // Időzítő törlése
  window.removeEventListener('keydown', handleKeydown); // Billentyűzet figyelés eltávolítása
  stopPlayerAnimationLoop(); stopCoinAnimationLoop(); // Animációk leállítása

  // Bónuszpontok kiszámítása
  const BASE_POINTS_ESCAPE = 50; let earnedPoints = 0;
  if (won) earnedPoints = BASE_POINTS_ESCAPE * bonusMultiplier.value; // Győzelem esetén
  checkpoints.value.forEach(cp => { if (cp.solved) earnedPoints += 10; }); // Megoldott ellenőrzőpontokért plusz pont
  finalBonusPoints.value = earnedPoints;
};
// Minijáték bezárása és eredmény visszaküldése a főjátéknak
const closeMinigame = () => {
  emit('minigame-complete', { success: isMazeWon.value, points: finalBonusPoints.value });
  // Alapállapotok visszaállítása, ha a komponenst újrahasználnák példányosítás nélkül
  gameStarted.value = false; isMazeGameOver.value = false; maze.value = [];
  stopPlayerAnimationLoop(); stopCoinAnimationLoop(); // Animációk biztos leállítása
};

// --- Vue Életciklus Hook-ok ---
// Komponens csatolásakor (mounted)
onMounted(() => {
  // A játék nem indul automatikusan, a "Labirintus Indítása" gombra vár.
  // Automatikus indításhoz tesztelés céljából: startGame();
});
// Komponens eltávolításakor (unmounted)
onUnmounted(() => {
  // Időzítők és eseményfigyelők eltávolítása a memóriaszivárgás elkerülése érdekében
  clearInterval(minigameTimerInterval);
  window.removeEventListener('keydown', handleKeydown);
  stopPlayerAnimationLoop();
  stopCoinAnimationLoop();
});
</script>

<style scoped>
/* Overlay a minijátékhoz, hogy a főjáték fölött jelenjen meg */
.minigame-overlay-wrapper {
  position: fixed; /* Rögzített pozíció a képernyőhöz képest */
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.75); /* Sötét, áttetsző háttér */
  display: flex; /* Flexbox a tartalom középre igazításához */
  justify-content: center; /* Vízszintes középre igazítás */
  align-items: center; /* Függőleges középre igazítás */
  z-index: 1000; /* Magas z-index, hogy minden más felett legyen */
  padding: 15px; /* Belső margó, hogy kisebb képernyőn ne érjen a széléhez a tartalom */
  box-sizing: border-box; /* A padding beleszámít a teljes méretbe */
}

/* A labirintus játék tényleges tartalmát tartalmazó doboz */
.maze-game-content-box {
  background-color: #ffffff; /* Háttérszín (CSS változóból: var(--color-card-bg)) */
  padding: 20px 25px; /* Belső margó */
  border-radius: 15px; /* Lekerekített sarkok */
  box-shadow: 0 8px 25px rgba(0,0,0,0.35); /* Árnyék */
  border: 3px solid #0077cc; /* Keret (CSS változóból: var(--color-text-question)) */
  width: auto; /* Szélesség a tartalomhoz igazodik */
  max-width: 95vw; /* Maximális szélesség a viewport 95%-a */
  max-height: 90vh; /* Maximális magasság a viewport 90%-a */
  overflow-y: auto; /* Függőleges görgetősáv, ha a tartalom magasabb */
  text-align: center; /* Szöveg középre igazítása */
  display: flex; /* Flexbox a belső elemek igazításához */
  flex-direction: column; /* Elemek függőlegesen */
  align-items: center; /* Vízszintes középre igazítás (pl. gombok) */
  font-family: Arial, sans-serif; /* Alapértelmezett betűtípus (CSS változóból: var(--font-family-primary)) */
}

/* Instrukciók szövegének stílusa */
.instructions { margin-bottom: 15px; font-size: 0.9em; color: #555; max-width: 400px; }

/* Start és "Continue Main Game" gombok közös stílusa */
.start-game-btn, .continue-button {
  padding: 12px 25px; font-size: 1.1em; font-weight: bold; color: white;
  background-color: #007bff; /* Háttérszín (CSS változóból: var(--color-button-primary-bg)) */
  border: none; border-radius: 25px; cursor: pointer;
  margin-bottom: 1rem; transition: background-color 0.3s ease, transform 0.1s ease;
  text-transform: uppercase; box-shadow: 0 3px 5px rgba(0,0,0,0.15);
}
/* Gombok hover állapota */
.start-game-btn:hover, .continue-button:hover {
  background-color: #0056b3; /* Sötétebb háttér (CSS változóból: var(--color-button-primary-hover-bg)) */
  transform: translateY(-1px); /* Kis emelkedés */
}

/* HUD (Head-Up Display) stílusai: Idő és Szorzó */
.hud {
  display: flex; justify-content: space-around; width: 100%; max-width: 350px;
  margin-bottom: 1rem; font-weight: bold; color: #333; background-color: #e9ecef;
  padding: 0.5rem; border-radius: 8px;
}

/* Labirintus rácsot tartalmazó konténer (középre igazításhoz) */
.maze-grid-container { display: flex; justify-content: center; margin-bottom: 1rem; }

/* Maga a labirintus rács */
.maze-grid {
  position: relative; /* Abszolút pozicionált játékoshoz */
  width: fit-content; /* Méret a tartalomhoz igazodik */
  border: 2px solid #adb5bd; /* Keret */
  background-color: #fafafa; /* Rács háttere (ahol nincs út vagy fal) */
  /* A display:grid és a rács méretei a :style="gridStyle" kötésből jönnek */
}

/* Labirintus sorok (display: contents segítségével a cellák közvetlenül a gridbe kerülnek) */
.maze-row { display: contents; }

/* Egyetlen labirintus cella stílusa */
.maze-cell {
  width: 30px; /* CELL_SIZE */
  height: 30px; /* CELL_SIZE */
  box-sizing: border-box; /* Border beleszámít a méretbe */
  display: flex; /* Tartalom (ikonok, érme) középre igazításához */
  align-items: center;
  justify-content: center;
  font-size: 16px; /* Ikonok méretéhez */
}

/* Fal cella stílusa */
.wall { background-color: #343a40; }
/* Út cella stílusa */
.path { background-color: #e9ecef; }
/* Start cella egyedi stílusa (felülírja a .path-t) */
.start-cell { background-color: #90ee90; }
/* Cél cella egyedi stílusa */
.exit { background-color: #28a745; color: white; /* Ikon színe */ }
/* Ellenőrzőpont cella alap stílusa */
.checkpoint-cell { background-color: #ffc107; /* Sárga */ }
/* Megoldott ellenőrzőpont cella stílusa */
.checkpoint-cell.checkpoint-solved { background-color: #8bc34a; /* Világoszöld */ }
/* Ikonok a cellákban (cél, megoldott ellenőrzőpont) */
.maze-icon { font-size: 18px; line-height: 1; }

/* Játékos (lovag) stílusa - a legtöbb vizuális tulajdonság a :style="playerStyle" kötésből jön */
.player { /* Itt csak olyan alapvető dolgok kellenek, amik nem dinamikusak, vagy ha a :style nem fed le mindent. */ }

/* Ellenőrzőpont érme sprite stílusa - a legtöbb vizuális tulajdonság a :style="checkpointCoinSpriteStyle" kötésből jön */
.checkpoint-coin-sprite { /* Hasonlóan a .player-hez, ez egy jelölő, vagy alapértelmezett stílusok helye. */ }

/* Ellenőrzőpont kérdésmodáljának stílusai */
.checkpoint-modal {
  position: fixed; /* Fixen középen marad görgetéskor is */
  top: 50%; left: 50%; transform: translate(-50%, -50%); /* Pontos középre igazítás */
  background-color: white; padding: 25px 30px; border-radius: 12px;
  box-shadow: 0 5px 20px rgba(0,0,0,0.4); z-index: 1010; /* Legyen a minigame overlay felett */
  width: 90%; max-width: 400px; text-align: center; border: 2px solid #0077cc;
}
.checkpoint-modal h3 { margin-top: 0; margin-bottom: 15px; color: #0077cc; font-size: 1.5em; }
.checkpoint-modal p { font-size: 1.1em; margin-bottom: 15px; }
.checkpoint-modal input { width: calc(100% - 22px); padding: 10px; margin-bottom: 15px; border: 2px solid #ccc; border-radius: 8px; font-size: 1em; box-sizing: border-box; }
.checkpoint-modal input:focus { border-color: #0077cc; outline: none; }
.checkpoint-modal button { font-family: inherit; padding: 10px 20px; font-size: 1em; font-weight: bold; color: white; background-color: #28a745; border: none; border-radius: 20px; cursor: pointer; text-transform: uppercase; }
.checkpoint-modal button:hover { background-color: #218838; }
.checkpoint-feedback { margin-top: 15px; font-weight: bold; font-size: 1em; }
.checkpoint-feedback.correct { color: #28a745; } /* Helyes válasz visszajelzés színe */
.checkpoint-feedback.incorrect { color: #dc3545; } /* Helytelen válasz visszajelzés színe */

/* Játék vége összegző panel stílusai */
.game-over-summary {
  margin-top: 20px; padding: 20px; background-color: #f8f9fa;
  border: 1px solid #dee2e6; border-radius: 8px; width: 100%; /* Kitölti a szülő dobozát */
  max-width: 400px; /* De ne legyen túl széles */
  box-sizing: border-box;
}
.game-over-summary h3 { margin-top: 0; color: #ffc107; font-size: 1.6em; }
.game-over-summary p { font-size: 1.1em; color: #333; margin: 8px 0; }
</style>