<template>
  <div class="game-container">
    <div :class="{
      'game-content-active': !activeMinigameDetails && !offeringMinigameDetails,
      'game-content-paused': activeMinigameDetails || offeringMinigameDetails
    }">
      <div v-if="feedbackMessage" class="floating-feedback" :class="feedbackClass">
        {{ feedbackMessage }}
      </div>
      <div class="question-card">
        <h1>{{ level }}. Szint</h1> <p :key="questionRenderKey">{{ question }} = ?</p>
        <input
            type="number"
            v-model.number="answer"
            @keyup.enter="submitAnswer"
            placeholder="Válaszod"
            :disabled="isGameOver || !!activeMinigameDetails || !!offeringMinigameDetails"
        />
        <button @click="submitAnswer" :disabled="isGameOver || !!activeMinigameDetails || !!offeringMinigameDetails">
          Válasz Beküldése
        </button>
        <div class="progress-bar-container">
          <div class="progress-bar" :style="{ width: progress + '%' }"></div>
        </div>
        <p>Hátralévő idő: {{ timeLeft }}s</p>
        <p>Pontszám: {{ score }}</p>
        <div v-if="isGameOver && !isGameWon" class="game-over-message">
          <p>Vesztettél! Végső pontszámod: {{ score }}.</p>
          <button @click="resetGame">Újra Játszom</button>
        </div>
        <div v-if="isGameWon" class="game-over-message">
          <p>🎉 Gratulálok, Nyertél! Végső pontszámod: {{ score }} 🎉</p>
          <button @click="resetGame">Újra Játszom</button>
        </div>
      </div>
    </div>

    <div v-if="offeringMinigameDetails" class="minigame-offer-overlay">
      <div class="minigame-offer-modal">
        <h2>✨ Bónusz Kör! ✨</h2>
        <p v-if="offeringMinigameDetails.type === 'numberCollector'">
          Szeretnél a Szám Gyűjtögető minijátékkal extra pontokért játszani?
        </p>
        <p v-if="offeringMinigameDetails.type === 'maze'">
          Kipróbálod a Labirintus Kihívást bónuszpontokért és időért?
        </p>
        <div class="modal-buttons">
          <button @click="startSelectedMinigame" class="modal-button yes">Igen, Játsszunk!</button>
          <button @click="skipSelectedMinigame" class="modal-button no">Nem, Köszönöm</button>
        </div>
      </div>
    </div>

    <NumberCollectorGame
        v-if="activeMinigameDetails && activeMinigameDetails.type === 'numberCollector'"
        @minigame-complete="handleMinigameResult"
    />
    <MazeGame
        v-if="activeMinigameDetails && activeMinigameDetails.type === 'maze'"
        @minigame-complete="handleMinigameResult"
    />
  </div>
</template>

<script setup>
// Szükséges Vue és egyéb modulok importálása
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue';
import { useAuthStore } from '../stores/authStore'; // Authentikációs store
import NumberCollectorGame from '../components/NumberCollectorGame.vue'; // Számgyűjtögető minijáték komponens
import MazeGame from '../components/MazeGame.vue'; // Labirintus minijáték komponens

// --- Játék Konfigurációs Konstansok ---
const INITIAL_TIME_LEFT = 60;                       // Kezdeti idő másodpercben
const ANSWERS_NEEDED_TO_LEVEL_UP_INITIAL = 5;       // Kezdeti helyes válaszok száma a szintlépéshez
const ANSWERS_NEEDED_INCREMENT_PER_LEVEL = 2;       // Ennyivel nő a szintlépéshez szükséges válaszok száma szintenként
const BASE_SCORE_PER_CORRECT_ANSWER = 10;           // Egy helyes válaszért járó alap pontszám
const FEEDBACK_DURATION = 1500;                     // Visszajelző üzenetek megjelenítési ideje (ms)
const MAX_LEVELS = 4;                               // A játékban elérhető maximális szint
const CORRECT_ANSWERS_FOR_TIME_BONUS = 3;           // Hány helyes válasz után jár időbónusz
const TIME_BONUS_AMOUNT = 10;                       // Az időbónusz mértéke másodpercben

// --- Minijáték Konfiguráció ---
const MINIGAME_NUMBER_COLLECTOR_STREAK_THRESHOLD = 3; // Hány helyes válasz sorozat után ajánlható fel a Number Collector
// const MINIGAME_MAZE_LEVEL_TRIGGER = 1; // Ezt a konstanst felülírta a véletlenszerű minijáték indítás szintlépéskor

// ÚJ: Minijáték típusok és lista a véletlenszerű kiválasztáshoz szintlépéskor
const MINIGAME_TYPES = {
  MAZE: 'maze',
  NUMBER_COLLECTOR: 'numberCollector',
  // Ide vehetsz fel további minijáték típusokat, ha készítesz újakat
  // pl. PUZZLE: 'puzzle',
};

const AVAILABLE_MINIGAMES_ON_LEVEL_UP = [ // Ezekből választ véletlenszerűen szintlépéskor
  MINIGAME_TYPES.MAZE,
  MINIGAME_TYPES.NUMBER_COLLECTOR,
  // Ide add hozzá a többi MINIGAME_TYPES kulcsot, ha bekerülnek a véletlen poolba
];

// --- Pinia Store Használata ---
const authStore = useAuthStore(); // Authentikációs store példányosítása

// --- Reaktív Állapotok (Játékmenet) ---
const level = ref(1);                                 // Aktuális szint
const score = ref(0);                                 // Jelenlegi pontszám
const timeLeft = ref(INITIAL_TIME_LEFT);              // Hátralévő idő
const isGameOver = ref(false);                        // Jelzi, hogy a játéknak vége van-e (idő lejárt / rossz válasz)
const isGameWon = ref(false);                         // Jelzi, hogy a játékos megnyerte-e a játékot (elérte és teljesítette a MAX_LEVELS-t)
const question = ref('');                             // Aktuális matematikai kérdés stringként
const questionRenderKey = ref(0);                     // Kulcs a kérdés DOM elem frissítésének kényszerítéséhez (pl. animációhoz)
const answer = ref('');                               // A játékos által beírt válasz
const correctAnswersInLevel = ref(0);                 // Helyes válaszok száma az aktuális szinten
const answersNeededToLevelUp = ref(ANSWERS_NEEDED_TO_LEVEL_UP_INITIAL); // Szintlépéshez szükséges helyes válaszok
const correctAnswersForBonusStreak = ref(0);          // Helyes válaszok sorozata (időbónuszhoz, Number Collector-hoz)

// Visszajelző üzenetek állapota
const feedbackMessage = ref('');                      // A megjelenítendő üzenet
const feedbackClass = ref('');                        // Az üzenet CSS osztálya (pl. 'success', 'error')
let feedbackTimeout = null;                           // Időzítő a visszajelzés eltüntetéséhez
let timerInterval = null;                             // Időzítő a játékidő visszaszámlálásához

// --- Minijáték Állapotok ---
const offeringMinigameDetails = ref(null);            // Objektum: { type: string, name: string } vagy null; Ha nem null, minijáték ajánlat aktív
const activeMinigameDetails = ref(null);              // Objektum: { type: string, name: string } vagy null; Ha nem null, egy minijáték fut
let pausedTimeLeft = 0;                               // Tárolja a hátralévő időt, amíg a főjáték szünetel (minijáték miatt)

// --- Számított Tulajdonságok ---
// Kiszámítja a játékos haladását az aktuális szinten belül százalékban.
const progress = computed(() => {
  if (isGameWon.value) return 100; // Ha nyert, a haladás 100%
  if (answersNeededToLevelUp.value === 0) return 0; // Nullával való osztás elkerülése
  return (correctAnswersInLevel.value / answersNeededToLevelUp.value) * 100;
});

// --- Segédfüggvények ---
// Véletlenszerű egész szám generálása min és max között (zárt intervallum)
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
// Tömb elemeinek véletlenszerű összekeverése (Fisher-Yates algoritmus)
const shuffleArray = (array) => {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
};

// --- Alapvető Játéklogika ---
// Matematikai kérdés generálása az aktuális szint alapján
const generateQuestion = () => {
  console.log('--- generateQuestion FÜGGVÉNY HÍVVA ---');
  console.log('Aktuális szint:', level.value, 'Játék megnyerve:', isGameWon.value);

  if (isGameWon.value) { // Ha a játékos már nyert
    question.value = "Matekzseni Vagy!"; // Győzelmi üzenet
    questionRenderKey.value++; // Kulcs frissítése a Vue újrarajzolásához
    return;
  }

  let num1, num2, operation, tempAnswer;
  let questionStr = '';
  let operationChoices = [];

  // Kérdés generálása a szintnek megfelelően
  switch (level.value) {
    case 1: // 1. szint: egyszerű összeadás, kivonás (0-50)
      operation = Math.random() < 0.5 ? '+' : '-';
      if (operation === '+') {
        num1 = getRandomInt(0, 50);
        num2 = getRandomInt(0, 50 - num1); // Összeg ne legyen 50-nél nagyobb
      } else { // Kivonás
        num1 = getRandomInt(0, 50);
        num2 = getRandomInt(0, num1); // Eredmény ne legyen negatív
      }
      questionStr = `${num1} ${operation} ${num2}`;
      break;
    case 2: // 2. szint: összeadás, kivonás negatív számokkal is (-49 - 49)
      operation = Math.random() < 0.5 ? '+' : '-';
      num1 = getRandomInt(-49, 49);
      num2 = getRandomInt(-49, 49);
      questionStr = `${num1} ${operation} ${num2}`;
      break;
    case 3: // 3. szint: mind a négy alapművelet (szorzás/osztás 1-9 között)
      operationChoices = ['+', '-', '*', '/'];
      operation = shuffleArray(operationChoices)[0]; // Véletlenszerű művelet kiválasztása
      if (operation === '+' || operation === '-') {
        num1 = getRandomInt(-49, 49);
        num2 = getRandomInt(-49, 49);
      } else if (operation === '*') {
        num1 = getRandomInt(1, 9);
        num2 = getRandomInt(1, 9);
      } else { // Osztás (úgy, hogy egész legyen az eredmény)
        num2 = getRandomInt(1, 9);
        tempAnswer = getRandomInt(1, 9); // Véletlenszerű eredmény
        num1 = num2 * tempAnswer; // Kiszámoljuk az osztandót
      }
      questionStr = `${num1} ${operation} ${num2}`;
      break;
    case 4: // 4. szint (MAX_LEVELS): nehezebb műveletek
      operationChoices = ['+', '-', '*', '/'];
      operation = shuffleArray(operationChoices)[0];
      if (operation === '+' || operation === '-') {
        num1 = getRandomInt(-75, 75);
        num2 = getRandomInt(-75, 75);
      } else if (operation === '*') {
        if (Math.random() < 0.5) { // Kétféle szorzási nehézség
          num1 = getRandomInt(2, 12);
          num2 = getRandomInt(2, 12);
        } else {
          num1 = getRandomInt(2, 20);
          num2 = getRandomInt(2, 9);
        }
      } else { // Osztás
        num2 = getRandomInt(2, 12);
        tempAnswer = getRandomInt(2, 15);
        num1 = num2 * tempAnswer;
      }
      questionStr = `${num1} ${operation} ${num2}`;
      break;
    default: // Ha valamiért ismeretlen szintre kerülne (nem szabadna előfordulnia)
      console.error("Ismeretlen szint a generateQuestion-ben vagy a játék már megnyerve:", level.value);
      question.value = `Maximális Szint Elérve!`;
      questionRenderKey.value++;
      return;
  }
  console.log('Generált kérdés komponensei:', { num1, operation, num2, questionStr });
  // Hibakezelés, ha a kérdés string valamiért 'undefined'-et tartalmazna
  if (questionStr.includes("undefined")) {
    console.error("KRITIKUS HIBA: A questionStr 'undefined'-et tartalmaz a question.value beállítása előtt!", questionStr);
    question.value = "Hiba: Számolási?"; // Vészhelyzeti kérdés
  } else {
    question.value = questionStr;
  }
  questionRenderKey.value++; // Vue DOM frissítés kényszerítése (ha szükséges)
};

// Visszajelző üzenet megjelenítése adott ideig
const displayFeedback = (message, type) => {
  feedbackMessage.value = message;
  feedbackClass.value = type; // CSS osztály beállítása (success, error, info)
  if (feedbackTimeout) clearTimeout(feedbackTimeout); // Korábbi időzítő törlése, ha volt
  feedbackTimeout = setTimeout(() => { // Időzítő az üzenet eltüntetésére
    feedbackMessage.value = '';
    feedbackClass.value = '';
  }, FEEDBACK_DURATION);
};

// Végső pontszám elküldése a szerverre (ha a felhasználó be van jelentkezve)
const submitFinalScore = async (finalScore) => {
  if (!authStore.isAuthenticated || !authStore.token) { // Csak bejelentkezett felhasználóknak
    console.log('Felhasználó nincs authentikálva. Pontszám nincs elküldve.');
    displayFeedback('Jelentkezz be a pontszámod mentéséhez!', 'info');
    return;
  }
  console.log('Végső pontszám küldése:', finalScore);
  try {
    const response = await fetch('http://localhost:5000/api/scores', { // Backend API végpont
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}` // Authentikációs token küldése
      },
      body: JSON.stringify({ score: finalScore }), // Pontszám JSON formátumban
    });
    const data = await response.json();
    if (!response.ok) { // HTTP hiba ellenőrzése
      throw new Error(data.message || `HTTP hiba! Státusz: ${response.status}`);
    }
    console.log('Pontszám sikeresen elküldve:', data);
    // displayFeedback('Rekord mentve!', 'success'); // Opcionális visszajelzés
  } catch (error) {
    console.error('Pontszám küldése sikertelen:', error);
    displayFeedback(`Nem sikerült menteni a pontszámot: ${error.message}`, 'error');
  }
};

// --- Időzítő és Játék Vége Logika ---
// Fő játékidőzítő leállítása
const stopMainTimer = () => {
  clearInterval(timerInterval);
  timerInterval = null;
};
// Fő játékidőzítő elindítása
const startMainTimer = () => {
  if (timerInterval) stopMainTimer(); // Ha már fut, előbb leállítjuk
  // timeLeft.value itt már be van állítva (resetGame-ből vagy szüneteltetés után)
  timerInterval = setInterval(() => {
    // Csak akkor csökken az idő, ha nincs minijáték ajánlat/futás, nincs vége a játéknak és van még idő
    if (!offeringMinigameDetails.value && !activeMinigameDetails.value && !isGameOver.value && timeLeft.value > 0) {
      timeLeft.value--;
    } else if (timeLeft.value === 0 && !isGameOver.value && !activeMinigameDetails.value && !offeringMinigameDetails.value) {
      // Ha lejár az idő és nincs más aktív állapot
      handleGameOver("Lejárt az idő! Játék Vége!", 'error');
    }
  }, 1000); // Másodpercenként
};
// Játék vége állapot kezelése
const handleGameOver = (gameOverMessage, messageType = 'error') => {
  // Ha már vége a játéknak (de nem győzelem volt), ne fusson le újra
  if (isGameOver.value && !isGameWon.value) return;

  isGameOver.value = true; // Játék vége állapot beállítása (győzelemnél és vesztésnél is)
  stopMainTimer(); // Időzítő leállítása
  displayFeedback(gameOverMessage, messageType); // Visszajelzés megjelenítése
  submitFinalScore(score.value); // Pontszám elküldése
};

// --- Szintlépés és Válasz Ellenőrzés ---
// Szintlépés logikája
const levelUp = () => {
  console.log('levelUp FÜGGVÉNY HÍVVA. Jelenlegi szint növelés ELŐTT:', level.value);
  if (level.value < MAX_LEVELS) { // Csak akkor lép szintet, ha még nem érte el a maximumot
    level.value++;
    console.log('Új szint növelés UTÁN:', level.value);
    correctAnswersInLevel.value = 0; // Szinten belüli helyes válaszok nullázása
    // Szintlépéshez szükséges válaszok számának növelése, de csak ha még a MAX_LEVELS alatt vagyunk
    if (level.value <= MAX_LEVELS) {
      answersNeededToLevelUp.value += ANSWERS_NEEDED_INCREMENT_PER_LEVEL;
    }
    displayFeedback(`Szintlépés a ${level.value}. szintre!`, 'info');

    // --- MÓDOSÍTOTT: Véletlenszerű minijáték felajánlása minden szintlépéskor ---
    // Ellenőrizzük, hogy nincs-e már folyamatban vagy felajánlva egy minijáték
    if (!activeMinigameDetails.value && !offeringMinigameDetails.value) {
      if (AVAILABLE_MINIGAMES_ON_LEVEL_UP.length > 0) { // Ha van elérhető minijáték
        const randomIndex = Math.floor(Math.random() * AVAILABLE_MINIGAMES_ON_LEVEL_UP.length);
        const selectedMinigameType = AVAILABLE_MINIGAMES_ON_LEVEL_UP[randomIndex];

        let minigameName = 'Bónusz Játék'; // Alapértelmezett név
        if (selectedMinigameType === MINIGAME_TYPES.MAZE) {
          minigameName = 'Labirintus Kihívás';
        } else if (selectedMinigameType === MINIGAME_TYPES.NUMBER_COLLECTOR) {
          minigameName = 'Szám Gyűjtögető';
        }
        // Ide jöhetnek további nevek, ha több minijáték típus van

        console.log(`Szintlépés ${level.value}. szintre. Véletlenszerű minijáték felajánlása: ${selectedMinigameType}`);
        triggerMinigameOffer({ type: selectedMinigameType, name: minigameName });
      }
    }
    // --- MÓDOSÍTOTT RÉSZ VÉGE ---

    console.log('Minijáték ajánlat kísérlete után, offeringMinigameDetails:', offeringMinigameDetails.value);
    // Ha egy minijáték felajánlásra került, akkor még nem generálunk új matematikai kérdést.
    // A játék egy új kérdéssel folytatódik, miután a minijáték ajánlatot kezeltük (lejátszotta vagy kihagyta).
    if (!offeringMinigameDetails.value && !isGameWon.value) {
      console.log('Nincs minijáték felajánlva, új kérdés generálása az új szinthez.');
      generateQuestion();
    } else if (isGameWon.value) {
      // Ezt az esetet a lenti 'else if (!isGameWon.value)' blokk kezeli majd
    } else {
      console.log('Minijáték felajánlva, MÉG NEM generálunk matematikai kérdést.');
    }

  } else if (!isGameWon.value) { // Ha elérte a MAX_LEVELS-t és sikeresen teljesítette az ahhoz szükséges válaszokat
    isGameWon.value = true; // Játék megnyerve állapot beállítása
    generateQuestion(); // Ez most a győzelmi üzenetet fogja beállítani a question.value-ba
    handleGameOver('Gratulálok! Te vagy a Matek Bajnok!', 'success');
  }
};

// Válasz ellenőrzése
const checkAnswer = () => {
  // A Number Collector sorozat alapú indítója itt maradhat,
  // a triggerMinigameOffer() ellenőrzi, hogy ne legyen dupla ajánlat.
  if (isGameOver.value || answer.value === '' || isNaN(Number(answer.value))) {
    if (answer.value === '' || isNaN(Number(answer.value))) {
      displayFeedback('Kérlek, adj meg egy érvényes számot.', 'error');
    }
    return;
  }

  let correctAnswerCalculated;
  try {
    console.log('Kérdés kiértékelése a checkAnswer-ben:', question.value);
    // Ellenőrizzük, hogy a 'question.value' valóban egy kiértékelhető kérdés-e
    if (!question.value || question.value.includes("undefined") || question.value.includes("NaN") || question.value.includes("Error") || question.value.includes("Whiz") || question.value.includes("Champion")) {
      console.warn("Érvénytelen vagy nem kérdés string kiértékelési kísérlete:", question.value);
      if(!isGameWon.value && !isGameOver.value) generateQuestion(); // Próbáljunk újat generálni, ha a játék még nem ért véget
      return; // Ne dolgozzuk fel, ha nem kérdés
    }
    // A kérdés string kiértékelése (a ÷ és x karaktereket / és * karakterekre cseréljük)
    correctAnswerCalculated = Math.floor(eval(question.value.replace(/÷/g, '/').replace(/x/g, '*')));
  } catch (e) {
    console.error("Hiba a kérdés kiértékelésekor a checkAnswer-ben:", question.value, e);
    handleGameOver('Hiba a kérdés feldolgozásakor. Játék Vége.', 'error');
    return;
  }

  const userAnswerAsNumber = Number(answer.value);
  console.log('Felhasználó Válasza:', userAnswerAsNumber, 'Helyes Válasz:', correctAnswerCalculated);

  if (userAnswerAsNumber === correctAnswerCalculated) { // Helyes válasz
    score.value += BASE_SCORE_PER_CORRECT_ANSWER;
    correctAnswersInLevel.value++;
    correctAnswersForBonusStreak.value++;
    displayFeedback('Helyes!', 'success');

    if (correctAnswersForBonusStreak.value >= CORRECT_ANSWERS_FOR_TIME_BONUS) { // Időbónusz
      timeLeft.value += TIME_BONUS_AMOUNT;
      displayFeedback(`Idő Bónusz! +${TIME_BONUS_AMOUNT}s`, 'info');
      correctAnswersForBonusStreak.value = 0; // Sorozat nullázása időbónusz után
    }

    // Number Collector minijáték indítása sorozat alapján (ez megmaradhat a szintlépéses véletlen mellett)
    if (correctAnswersForBonusStreak.value > 0 &&
        correctAnswersForBonusStreak.value % MINIGAME_NUMBER_COLLECTOR_STREAK_THRESHOLD === 0 &&
        level.value < MAX_LEVELS && !isGameWon.value && // Játék folyamatban van-e
        !activeMinigameDetails.value && !offeringMinigameDetails.value) { // Csak ha nincs más minijáték aktív/felajánlva
      triggerMinigameOffer({ type: MINIGAME_TYPES.NUMBER_COLLECTOR, name: 'Szám Gyűjtögető' });
    }

    if (correctAnswersInLevel.value >= answersNeededToLevelUp.value) { // Szintlépés ellenőrzése
      if (level.value < MAX_LEVELS) { // Ha még nem érte el a max szintet
        levelUp();
      } else if (!isGameWon.value) { // Ha elérte a max szinthez szükséges válaszokat a max szinten
        isGameWon.value = true;
        generateQuestion(); // Győzelmi üzenet beállítása
        handleGameOver('Gratulálok! Te vagy a Matek Bajnok!', 'success');
      }
    } else if (!isGameWon.value && !offeringMinigameDetails.value) { // Ha nem volt szintlépés és nincs minijáték ajánlat
      generateQuestion(); // Új kérdés generálása
    }
  } else { // Helytelen válasz
    question.value = `${question.value} = ${correctAnswerCalculated}`; // Helyes válasz megmutatása
    questionRenderKey.value++;
    correctAnswersForBonusStreak.value = 0; // Sorozat nullázása
    handleGameOver(`Helytelen! A válasz ${correctAnswerCalculated} volt. Játék Vége!`, 'error');
  }
  answer.value = ''; // Válaszmező kiürítése
};


// --- Minijáték Kezelő Funkciók ---
// Minijáték ajánlatának indítása
const triggerMinigameOffer = (minigameConfig) => {
  // Csak akkor ajánlunk fel minijátékot, ha nincs már másik aktív/felajánlva, vagy ha a játék már véget ért
  if (activeMinigameDetails.value || offeringMinigameDetails.value || isGameOver.value) {
    console.log("Minijáték ajánlat kihagyva: egy másik minijáték aktív/felajánlva, vagy a játéknak vége.");
    return;
  }
  console.log(`Minijáték felajánlása: ${minigameConfig.name}`);
  stopMainTimer(); // Fő játékidőzítő szüneteltetése
  pausedTimeLeft = timeLeft.value; // Jelenlegi idő elmentése
  offeringMinigameDetails.value = minigameConfig; // Minijáték ajánlat állapotának beállítása (ez megjeleníti a modált)
};
// Kiválasztott minijáték elindítása (miután a felhasználó igent mondott az ajánlatra)
const startSelectedMinigame = () => {
  if (!offeringMinigameDetails.value) return; // Ha nincs aktív ajánlat, ne csináljon semmit
  activeMinigameDetails.value = { ...offeringMinigameDetails.value }; // Átmozgatjuk az ajánlottat az aktívba
  offeringMinigameDetails.value = null; // Ajánlat eltávolítása (modál bezárul)
  // A fő játékidőzítő továbbra is szünetel, amíg a minijáték fut
};
// Kiválasztott minijáték kihagyása
const skipSelectedMinigame = () => {
  console.log(`Kihagyott minijáték: ${offeringMinigameDetails.value?.name}`);
  offeringMinigameDetails.value = null; // Ajánlat eltávolítása
  timeLeft.value = pausedTimeLeft; // Idő visszaállítása a szüneteltetés előtti értékre
  pausedTimeLeft = 0; // Szüneteltetett idő nullázása
  if (!isGameOver.value && !isGameWon.value) { // Ha a főjáték még tart
    startMainTimer(); // Fő játékidőzítő újraindítása
    generateQuestion(); // Új kérdés generálása az aktuális szinthez
  }
};
// Minijáték eredményének kezelése (a minijáték komponens @minigame-complete eseményére)
const handleMinigameResult = (result) => {
  const completedMinigameName = activeMinigameDetails.value?.name || 'Minijáték';
  activeMinigameDetails.value = null; // Minijáték befejeződött, már nem aktív

  if (result.points) { // Ha a minijáték adott pontokat
    score.value += result.points;
    displayFeedback(`${completedMinigameName} kész! +${result.points} bónuszpont!`, 'info');
  } else {
    displayFeedback(`${completedMinigameName} kész!`, 'info');
  }

  timeLeft.value = pausedTimeLeft + (result.timeBonus || 0); // Idő frissítése (szüneteltetett + bónusz)
  pausedTimeLeft = 0; // Szüneteltetett idő nullázása

  // Főjáték folytatása
  if (!isGameOver.value && !isGameWon.value) {
    startMainTimer(); // Fő időzítő újraindítása
    // Minijáték után az aktuális szinthez generálunk kérdést.
    // Ha a minijáték szintlépéskor indult, a szint már növelve lett.
    generateQuestion();
  }
};

// --- Játék Újraindítása ---
const resetGame = () => {
  console.log("--- resetGame FÜGGVÉNY HÍVVA ---");
  // Alapértékek visszaállítása
  level.value = 1;
  score.value = 0;
  isGameOver.value = false;
  isGameWon.value = false;
  answer.value = '';
  correctAnswersInLevel.value = 0;
  answersNeededToLevelUp.value = ANSWERS_NEEDED_TO_LEVEL_UP_INITIAL;
  correctAnswersForBonusStreak.value = 0;
  feedbackMessage.value = '';
  feedbackClass.value = '';
  timeLeft.value = INITIAL_TIME_LEFT;

  // Minijáték állapotok nullázása
  offeringMinigameDetails.value = null;
  activeMinigameDetails.value = null;
  pausedTimeLeft = 0;

  stopMainTimer(); // Minden futó időzítő leállítása

  // Biztosítjuk, hogy a DOM frissüljön, mielőtt új játékot indítunk (ha ez releváns lenne)
  nextTick(() => {
    startMainTimer(); // Új játékidőzítő indítása
    generateQuestion(); // Első kérdés generálása
  });
};

// --- Életciklus Hook-ok és Válaszbeküldő Wrapper ---
// Komponens csatolásakor (mounted) elindítjuk/reseteljük a játékot
onMounted(() => {
  resetGame();
});
// Komponens eltávolításakor (unmounted) letisztítjuk az időzítőket
onUnmounted(() => {
  stopMainTimer();
  if (feedbackTimeout) clearTimeout(feedbackTimeout);
});

// Wrapper a checkAnswer köré, hogy a template-ből egyszerűbben hívható legyen,
// és csak akkor fusson le, ha a játék aktív és nincs minijáték ajánlat/futás.
const submitAnswer = () => {
  if (!isGameOver.value && !activeMinigameDetails.value && !offeringMinigameDetails.value) {
    checkAnswer();
  }
};
</script>

<style scoped>
/* A GameScreen.vue komponenshez tartozó stílusok. */
/* Ezeket a stílusokat a korábbi válaszokból vetted át, és itt helyezkednek el. */
/* Például: .game-container, .question-card, .progress-bar, stb. */

/* Annak biztosítása, hogy a fő játéktartalom elsötétüljön, ha minijáték ajánlat van */
.game-content-paused {
  opacity: 0.3; /* Erősebb áttetszőség, hogy a modál kiemelkedjen */
  pointer-events: none; /* Letiltja az interakciót az elsötétített tartalommal */
  transition: opacity 0.3s ease-in-out; /* Finom átmenet */
}
.game-content-active {
  opacity: 1;
  pointer-events: auto;
  transition: opacity 0.3s ease-in-out;
}

/* Minijáték ajánlati overlay és modál stílusai */
.minigame-offer-overlay {
  position: fixed; /* Fix pozíció, hogy lefedje az egész képernyőt */
  top: 0; left: 0; width: 100%; height: 100%;
  background-color: rgba(0, 0, 0, 0.75); /* Sötét, áttetsző háttér */
  display: flex; justify-content: center; align-items: center; /* Modál középre igazítása */
  z-index: 900; /* Z-index, hogy a fő tartalom felett legyen, de az aktív minijáték alatt (ha az magasabb z-indexet használ) */
}

.minigame-offer-modal {
  background-color: var(--color-card-bg, white); /* Háttérszín CSS változóból */
  padding: 30px 40px; /* Belső margó */
  border-radius: 20px; /* Lekerekített sarkok */
  box-shadow: 0 5px 15px rgba(0,0,0,0.25); /* Árnyék */
  border: 3px solid var(--color-text-question, #0077cc); /* Keret CSS változóból */
  text-align: center; /* Szöveg középre igazítása */
  font-family: var(--font-family-primary); /* Betűtípus CSS változóból */
  width: 90%; /* Szélesség */
  max-width: 450px; /* Maximális szélesség */
}

.minigame-offer-modal h2 {
  color: var(--color-text-level, orange); /* Szín CSS változóból */
  margin-bottom: 15px;
  font-size: 1.8em;
}
.minigame-offer-modal p {
  margin-bottom: 25px;
  font-size: 1.1em;
  color: var(--color-text-primary); /* Szín CSS változóból */
}
.modal-buttons {
  display: flex; /* Gombok egymás mellett */
  justify-content: space-around; /* Térköz a gombok között */
  gap: 15px; /* Explicit térköz */
}
.modal-button {
  font-family: var(--font-family-primary);
  padding: 10px 20px;
  font-size: 1em;
  font-weight: bold;
  color: var(--color-button-text, white); /* Szín CSS változóból */
  border: none;
  border-radius: 20px;
  transition: background-color 0.3s ease, transform 0.15s ease; /* Átmenetek */
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  text-transform: uppercase; /* Nagybetűs szöveg */
  flex-grow: 1; /* Gombok egyenlő méretűek legyenek, ha van hely */
  cursor: pointer;
}
.modal-button.yes { background-color: var(--color-button-primary-bg, green); } /* "Igen" gomb színe */
.modal-button.yes:hover { background-color: var(--color-button-primary-hover-bg, darkgreen); transform: translateY(-1px); }
.modal-button.no { background-color: var(--color-feedback-error-bg, red); color: var(--color-feedback-error-text, white); } /* "Nem" gomb színe */
.modal-button.no:hover { background-color: #c82333; transform: translateY(-1px); }


/* A GameScreen.vue eredeti stílusai (a teljesség igénye nélkül, ahogy a kódban volt) */
/* Győződj meg róla, hogy a korábban használt .game-container, .question-card, .floating-feedback stb. stílusaid itt vannak. */
.game-container {
  display: flex; flex-direction: column; align-items: center;
  font-family: var(--font-family-primary); position: relative;
  padding: 20px; box-sizing: border-box;
  width: 100%;
  /* background-color: var(--color-bg); /* Ezt a stílust a globális theme.css-ből vetted át, itt felülírható ha kell */
}
.floating-feedback {
  position: absolute; top: 20px; padding: 12px 20px; border-radius: 25px;
  font-weight: bold; font-size: 1.1em; z-index: 1000; opacity: 0;
  animation: fade-in-out-pop 2s ease-in-out forwards; white-space: nowrap;
  box-shadow: 0 4px 8px rgba(0,0,0,0.2); border: 2px solid transparent;
}
@keyframes fade-in-out-pop {
  0% { opacity: 0; transform: translateY(-30px) scale(0.8); } 15% { opacity: 1; transform: translateY(0) scale(1.05); }
  25% { opacity: 1; transform: translateY(0) scale(1); } 75% { opacity: 1; transform: translateY(0) scale(1); }
  85% { opacity: 1; transform: translateY(0) scale(1.05); } 100% { opacity: 0; transform: translateY(-30px) scale(0.8); }
}
.floating-feedback.success { background-color: var(--color-feedback-success-bg); color: var(--color-feedback-success-text); border-color: var(--color-feedback-success-text); }
.floating-feedback.error { background-color: var(--color-feedback-error-bg); color: var(--color-feedback-error-text); border-color: var(--color-feedback-error-text); }
.floating-feedback.info { background-color: var(--color-feedback-info-bg); color: var(--color-feedback-info-text); border-color: var(--color-feedback-info-text); }

.question-card {
  display: flex; flex-direction: column; align-items: center; justify-content: space-around;
  background-color: var(--color-card-bg); border-radius: 25px;
  box-shadow: 0 10px 20px var(--color-card-shadow), 0 0 0 5px rgba(255,255,255,0.3);
  padding: 30px 35px; margin-top: 80px; width: 500px; max-width: 95%;
  box-sizing: border-box; min-height: 450px; border: 3px solid var(--color-text-question);
}
.question-card h1 {
  color: var(--color-text-level); margin-bottom: 10px; font-size: 2.8em; font-weight: bold;
  text-shadow: 2px 2px 0px #fff, 4px 4px 0px rgba(0,0,0,0.1);
}
.question-card > p:first-of-type { /* Kérdés szövege */
  font-size: 2.5em; font-weight: bold; color: var(--color-text-question);
  margin-bottom: 20px; text-align: center;
}
.question-card > p { /* Egyéb p elemek (idő, pontszám) */
  font-size: 1.3em; color: var(--color-text-primary, #555); margin: 5px 0;
}
input[type="number"] {
  margin: 20px 0; padding: 15px 20px; font-size: 2em; width: 150px; text-align: center;
  border: 3px solid var(--color-input-border); border-radius: 15px; box-sizing: border-box;
  color: var(--color-text-primary); font-family: var(--font-family-game);
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}
input[type="number"]:focus {
  border-color: var(--color-input-focus-border); box-shadow: 0 0 10px rgba(0, 119, 204, 0.3); outline: none;
}
input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
input[type=number] { -moz-appearance: textfield; }

.question-card button { /* Submit button a kártyán belül */
  padding: 15px 30px; font-size: 1.5em; font-weight: bold; cursor: pointer;
  color: var(--color-button-text); background-color: var(--color-button-primary-bg);
  border: none; border-radius: 30px; transition: background-color 0.3s ease, transform 0.15s ease;
  margin-top: 15px; text-transform: uppercase; letter-spacing: 1px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.2);
}
.question-card button:hover:not(:disabled) {
  background-color: var(--color-button-primary-hover-bg);
  transform: translateY(-2px) scale(1.02); box-shadow: 0 6px 10px rgba(0,0,0,0.25);
}
.question-card button:active:not(:disabled) {
  transform: translateY(1px) scale(0.98); box-shadow: 0 2px 3px rgba(0,0,0,0.2);
}
.question-card button:disabled {
  background-color: #cccccc; cursor: not-allowed; opacity: 0.7; box-shadow: none;
}

.progress-bar-container {
  background-color: var(--color-progress-bar-bg); border-radius: 15px; height: 20px;
  width: 90%; margin: 25px 0; overflow: hidden; border: 2px solid #ccc;
}
.progress-bar {
  background-color: var(--color-progress-bar-fill);
  background-image: linear-gradient(45deg, rgba(255,255,255,.2) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.2) 50%, rgba(255,255,255,.2) 75%, transparent 75%, transparent);
  background-size: 30px 30px; height: 100%; border-radius: 13px;
  transition: width 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55);
  animation: progress-bar-stripes 1s linear infinite;
}
@keyframes progress-bar-stripes { from { background-position: 0 0; } to { background-position: 30px 0; } }

.game-over-message { margin-top: 20px; text-align: center; }
.game-over-message p {
  font-size: 1.8em; font-weight: bold; color: #d32f2f; margin-bottom: 20px;
  text-shadow: 1px 1px 0px #fff;
}
.game-over-message button { /* Play Again gomb */
  background-color: var(--color-button-secondary-bg);
}
.game-over-message button:hover:not(:disabled) {
  background-color: var(--color-button-secondary-hover-bg);
}

</style>