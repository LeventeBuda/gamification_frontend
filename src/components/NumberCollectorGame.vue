<template>
  <div class="minigame-overlay">
    <div class="number-collector-game">
      <h2>Szám Gyűjtögető!</h2>
      <p class="instructions">Húzd a számokat a megfelelő kosárba: Páros vagy Páratlan.</p>

      <div class="game-stats">
        <span>Idő: {{ minigameTimeLeft }}s</span>
        <span>Pontszám: {{ minigameScore }}</span>
      </div>

      <div class="minigame-main-content">
        <div class="game-area" @dragover.prevent @drop.prevent="handleDropOutsideBaskets">
          <div
              v-for="numObj in numbersOnScreen"
              :key="numObj.id"
              class="number-puck"
              :style="{ left: numObj.x + 'px', top: numObj.y + 'px' }"
              draggable="true"
              @dragstart="handleDragStart(numObj, $event)"
          >
            {{ numObj.value }}
          </div>
        </div>

        <div class="side-panel">
          <div class="baskets-container">
            <div
                class="basket even-basket"
                id="even-basket"
                @dragover.prevent="handleDragOverBasket('even', $event)"
                @drop.prevent="handleDropOnBasket('even', $event)"
                :class="{ 'drag-over': dragOverBasket === 'even' }"
            >
              Páros
            </div>
            <div
                class="basket odd-basket"
                id="odd-basket"
                @dragover.prevent="handleDragOverBasket('odd', $event)"
                @drop.prevent="handleDropOnBasket('odd', $event)"
                :class="{ 'drag-over': dragOverBasket === 'odd' }"
            >
              Páratlan
            </div>
          </div>
          <button v-if="!gameStarted && !isMinigameOver" @click="startGame" class="start-minigame-btn">
            Minijáték Indítása
          </button>
        </div>
      </div>

      <div v-if="isMinigameOver" class="game-over-summary">
        <h3>Minijáték Vége!</h3>
        <p>Minijáték Pontszámod: {{ minigameScore }}</p>
        <p>{{ finalBonusPoints }} bónuszpontot szereztél!</p>
        <button @click="closeMinigame">Vissza a Főjátékhoz</button>
      </div>
    </div>
  </div>
</template>

<script setup>
// Szükséges Vue funkciók importálása
import { ref, onMounted, onUnmounted, reactive } from 'vue';

// Eseménykibocsátó definiálása a szülő komponens (GameScreen) felé
const emit = defineEmits(['minigame-complete']);

// --- Minijáték Állapotok (Reaktív Változók) ---
const numbersOnScreen = ref([]); // Tömb a képernyőn lévő szám objektumoknak: { id, value, x, y }
const minigameTimeLeft = ref(15);  // Minijátékra szánt idő másodpercben (pl. 15 másodperc)
const minigameScore = ref(0);      // Minijáték során szerzett pontszám
const currentStreak = ref(0);      // Helyes válaszok sorozata
const isMinigameOver = ref(false); // Jelzi, hogy a minijátéknak vége van-e
const gameStarted = ref(false);    // Jelzi, hogy a minijáték elindult-e
const finalBonusPoints = ref(0); // A minijáték végén számolt összes bónuszpont

// Időzítők és azonosítók
let numberSpawnInterval = null; // Időzítő az új számok generálásához
let gameTimerInterval = null;   // Időzítő a játékidő visszaszámlálásához
let nextNumberId = 0;           // Egyedi azonosító a generált számokhoz
const MAX_NUMBERS_ON_SCREEN = 5; // Maximális számú "korong" egyszerre a képernyőn

// Drag and Drop (Húzd és Vidd) állapotok
const draggedNumber = ref(null); // Az éppen húzott szám objektumát tárolja: { id, value }
const dragOverBasket = ref(null); // Annak a kosárnak a típusa ('even' vagy 'odd'), ami fölött éppen húzzák a számot (vizuális visszajelzéshez)

// --- Játék Konfiguráció ---
const POINTS_CORRECT_SORT = 10;     // Pontszám helyes besorolásért
const POINTS_INCORRECT_SORT = -5;   // Pontszám helytelen besorolásért (lehet 0 is)
const STREAK_TARGET = 5;            // Hány helyes válasz után jár sorozat bónusz
const STREAK_BONUS_POINTS = 25;     // Sorozat bónusz pontszáma
const COMPLETION_BONUS_MIN_SCORE = 100; // Minimális pontszám a teljesítési bónuszhoz
const COMPLETION_BONUS_POINTS = 50;   // Teljesítési bónusz pontszáma

// --- Játéktér Méretei (számok generálásához) ---
// Ezeket ideális esetben dinamikusan kellene meghatározni az elem mérete alapján,
// de az egyszerűség kedvéért most fix értékekkel dolgozunk.
const gameAreaWidth = 500;  // A .game-area div hozzávetőleges szélessége pixelben
const gameAreaHeight = 300; // A .game-area div hozzávetőleges magassága pixelben

// --- Alapvető Játékfunkciók ---

// Új szám generálása és elhelyezése a játéktéren
const spawnNumber = () => {
  // Csak akkor generálunk új számot, ha nincs túl sok a képernyőn, és a játék aktív
  if (numbersOnScreen.value.length >= MAX_NUMBERS_ON_SCREEN || !gameStarted.value || isMinigameOver.value) {
    return;
  }

  const value = Math.floor(Math.random() * 100) + 1; // Véletlenszerű szám 1 és 100 között
  const newNumber = {
    id: nextNumberId++, // Egyedi ID
    value,
    x: Math.random() * (gameAreaWidth - 60),  // Véletlenszerű X pozíció (figyelembe véve a korong szélességét)
    y: Math.random() * (gameAreaHeight - 40), // Véletlenszerű Y pozíció (figyelembe véve a korong magasságát)
  };
  numbersOnScreen.value.push(newNumber); // Hozzáadás a képernyőn lévő számok listájához
};

// Minijáték elindítása
const startGame = () => {
  console.log("Number Collector Minijáték Elindítva!");
  gameStarted.value = true;
  isMinigameOver.value = false;
  minigameScore.value = 0;
  currentStreak.value = 0;
  minigameTimeLeft.value = 15; // Időzítő visszaállítása
  numbersOnScreen.value = [];  // Korábbi számok törlése
  finalBonusPoints.value = 0;
  nextNumberId = 0; // ID számláló visszaállítása

  // Számok generálásának indítása
  spawnNumber(); // Azonnali első szám generálása
  numberSpawnInterval = setInterval(spawnNumber, 2000); // Új szám generálása 2 másodpercenként

  // Játékidő visszaszámlálójának indítása
  gameTimerInterval = setInterval(() => {
    minigameTimeLeft.value--;
    if (minigameTimeLeft.value <= 0) {
      endMinigame(); // Ha lejár az idő, a játék véget ér
    }
  }, 1000); // Másodpercenként frissül
};

// Minijáték befejezése
const endMinigame = () => {
  console.log("Number Collector Minijáték Vége!");
  isMinigameOver.value = true;
  gameStarted.value = false; // A játék már nem aktív
  clearInterval(numberSpawnInterval); // Számgeneráló időzítő leállítása
  clearInterval(gameTimerInterval);   // Játékidő visszaszámláló leállítása

  // Végső bónuszpontok kiszámítása
  finalBonusPoints.value = minigameScore.value; // Alapból a minijáték pontszáma a bónusz
  if (minigameScore.value >= COMPLETION_BONUS_MIN_SCORE) { // Ha elérte a minimum pontot
    finalBonusPoints.value += COMPLETION_BONUS_POINTS; // Hozzáadjuk a teljesítési bónuszt
  }
  // Megjegyzés: A bónuszpont számítását itt tovább lehet bonyolítani igény szerint.
};

// Minijáték bezárása és eredmény visszaküldése a főjátéknak
const closeMinigame = () => {
  emit('minigame-complete', {
    success: minigameScore.value > 0, // Példa sikerességi feltétel (pl. ha szerzett legalább 1 pontot)
    points: finalBonusPoints.value,   // A megszerzett bónuszpontok
    // timeBonus: 0 // Ez a minijáték elsősorban pontokat ad, nem időbónuszt (de adhatna)
  });
};

// --- Drag and Drop (Húzd és Vidd) Kezelőfüggvények ---

// Akkor hívódik meg, amikor egy szám ("korong") húzása megkezdődik
const handleDragStart = (numObj, event) => {
  console.log('Húzás alatt:', numObj);
  draggedNumber.value = numObj; // Eltároljuk a húzott szám objektumát
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'; // Meghatározzuk a megengedett műveletet
    // Jó gyakorlat adatot is beállítani, bár itt elsősorban a 'draggedNumber' ref-et használjuk
    event.dataTransfer.setData('text/plain', numObj.id.toString());
  }
};

// Akkor hívódik meg, amikor egy elemet egy kosár fölé húznak
const handleDragOverBasket = (basketType, event) => {
  event.preventDefault(); // Ez szükséges ahhoz, hogy a 'drop' esemény működjön
  dragOverBasket.value = basketType; // Beállítjuk, melyik kosár fölött van az elem (vizuális visszajelzéshez)
};

// Akkor hívódik meg, amikor egy elemet egy kosárra ejtenek
const handleDropOnBasket = (basketType, event) => {
  event.preventDefault(); // Alapértelmezett esemény megakadályozása
  dragOverBasket.value = null; // Vizuális "drag over" jelzés eltávolítása

  if (!draggedNumber.value) return; // Ha valamiért nincs húzott elem, ne csináljon semmit

  const droppedValue = draggedNumber.value.value; // A leejtett szám értéke
  const isEven = droppedValue % 2 === 0;          // Ellenőrizzük, hogy páros-e
  let correctDrop = false;                        // Jelző a helyes leejtéshez

  // Ellenőrizzük, hogy a szám a megfelelő kosárba került-e
  if (basketType === 'even' && isEven) { // Páros kosárba páros szám
    correctDrop = true;
  } else if (basketType === 'odd' && !isEven) { // Páratlan kosárba páratlan szám
    correctDrop = true;
  }

  if (correctDrop) { // Helyes leejtés esetén
    minigameScore.value += POINTS_CORRECT_SORT; // Pontszám növelése
    currentStreak.value++;                      // Sorozat növelése
    console.log(`Helyes leejtés! ${droppedValue} a ${basketType} kosárba. Pontszám: ${minigameScore.value}`);
    // Sorozat bónusz ellenőrzése
    if (currentStreak.value > 0 && currentStreak.value % STREAK_TARGET === 0) {
      minigameScore.value += STREAK_BONUS_POINTS;
      console.log(`Sorozat bónusz! +${STREAK_BONUS_POINTS} pont!`);
      // Itt adhatnánk vizuális visszajelzést a sorozat bónuszról
    }
  } else { // Helytelen leejtés esetén
    minigameScore.value += POINTS_INCORRECT_SORT; // Pontszám módosítása (csökkentés vagy 0)
    currentStreak.value = 0;                      // Sorozat nullázása
    console.log(`Helytelen leejtés! ${droppedValue} a ${basketType} kosárba. Pontszám: ${minigameScore.value}`);
    // Itt adhatnánk vizuális visszajelzést a helytelen leejtésről
  }

  // A leejtett szám eltávolítása a képernyőről
  numbersOnScreen.value = numbersOnScreen.value.filter(n => n.id !== draggedNumber.value.id);
  draggedNumber.value = null; // Húzott elem ref nullázása

  // Opcionálisan új szám generálása, ha kevés van a képernyőn
  // (vagy hagyhatjuk, hogy az intervallum kezelje)
  if (numbersOnScreen.value.length < MAX_NUMBERS_ON_SCREEN / 2 && gameStarted.value && !isMinigameOver.value) {
    spawnNumber();
  }
};

// Kezeli azokat az eseteket, amikor a számot nem egy kosárra, hanem pl. a játéktérre ejtik vissza
const handleDropOutsideBaskets = (event) => {
  // Ez a funkció elsősorban hibamegelőzésre szolgál.
  // Ha van 'draggedNumber', az azt jelenti, hogy egy húzás aktív volt.
  // Itt egyszerűen töröljük a 'draggedNumber' ref-et, pontozás nélkül. A szám a képernyőn marad.
  if (draggedNumber.value) {
    console.log('Kosarakon kívülre ejtve, a szám a helyén marad.');
  }
  draggedNumber.value = null;
  dragOverBasket.value = null; // Vizuális jelzés eltávolítása
};


// --- Vue Életciklus Hook-ok ---
onMounted(() => {
  // A minijáték nem indul el automatikusan, amikor a komponens betöltődik;
  // a "Minijáték Indítása" gombra vár.
  // Ha azt szeretnéd, hogy automatikusan induljon, hívd meg itt a startGame()-et:
  // startGame();
});

onUnmounted(() => {
  // Időzítők törlése, amikor a komponens megszűnik (elhagyjuk az oldalt),
  // hogy elkerüljük a memóriaszivárgást és a felesleges műveleteket.
  clearInterval(numberSpawnInterval);
  clearInterval(gameTimerInterval);
});

</script>

<style scoped>
/* Minijáték teljes képernyős háttere (overlay) */
.minigame-overlay {
  position: fixed; /* Fix pozíció a viewport-hoz képest */
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6); /* Sötét, áttetsző háttér */
  display: flex; /* Flexbox a tartalom középre igazításához */
  justify-content: center;
  align-items: center;
  z-index: 1000; /* Magas z-index, hogy minden más felett jelenjen meg */
}

/* A számgyűjtögető játék központi doboza */
.number-collector-game {
  background-color: var(--color-card-bg, white); /* Háttérszín CSS változóból vagy fehér */
  padding: 20px 30px; /* Belső margók */
  border-radius: 20px; /* Lekerekített sarkok */
  box-shadow: 0 5px 20px rgba(0,0,0,0.3); /* Árnyék */
  border: 3px solid var(--color-text-question, #0077cc); /* Keret színe CSS változóból */
  width: 90%; /* Szélesség a szülőhöz (overlay) képest */
  max-width: 600px; /* Maximális szélesség */
  text-align: center; /* Szöveg középre igazítása */
  font-family: var(--font-family-primary); /* Betűtípus CSS változóból */
  position: relative; /* Pozícionálási kontextus belső elemekhez */
}

/* Címsor */
h2 {
  color: var(--color-text-level, orange); /* Szín CSS változóból */
  margin-bottom: 10px;
}

/* Instrukciók szövege */
.instructions {
  margin-bottom: 15px;
  font-size: 0.9em;
  color: var(--color-text-primary); /* Szín CSS változóból */
}

/* Játék statisztikák (idő, pontszám) konténere */
.game-stats {
  display: flex;
  justify-content: space-around; /* Egyenletes elosztás */
  margin-bottom: 20px;
  font-size: 1.1em;
  font-weight: bold;
}

/* A fő tartalmi rész, ami a játéktért és az oldalsó panelt (kosarak, start gomb) tartalmazza */
.minigame-main-content {
  display: flex; /* Flexbox az elemek egymás melletti elrendezéséhez */
  gap: 20px; /* Térköz a játéktér és az oldalsó panel között */
  align-items: flex-start; /* Igazítás a tetejéhez, ha magasságuk eltérő */
}

/* Játéktér, ahol a számok megjelennek */
.game-area {
  flex-grow: 1; /* Kitölti a rendelkezésre álló helyet az oldalsó panel mellett */
  /* width: 100%; /* Eredetileg ez volt, de flex-grow mellett a szélességet a flexbox kezeli */
  height: 300px; /* Fix magasság, igény szerint állítható */
  background-color: var(--color-bg, #f0f9ff); /* Háttérszín CSS változóból */
  border: 2px dashed var(--color-input-border, #ccc); /* Szaggatott keret */
  border-radius: 10px; /* Lekerekített sarkok */
  position: relative; /* Abszolút pozicionált számok ("korongok") miatt szükséges */
  margin-bottom: 20px; /* Eredetileg itt volt, de a .minigame-main-content flex elrendezése miatt lehet, hogy nem szükséges, vagy a .side-panel-re is kell */
  overflow: hidden; /* Megakadályozza, hogy a számok "kilógjanak", ha a szélre kerülnek */
}

/* Oldalsó panel a kosaraknak és a start gombnak */
.side-panel {
  display: flex;
  flex-direction: column; /* Elemek egymás alatt */
  align-items: center; /* Középre igazítás */
  width: 180px; /* Fix szélesség az oldalsó panelnek, igény szerint állítható */
  flex-shrink: 0; /* Megakadályozza, hogy összenyomódjon, ha nincs elég hely */
}

/* Húzható számok ("korongok") stílusa */
.number-puck {
  position: absolute; /* Pozicionálás a .game-area-hoz képest */
  background-color: var(--color-progress-bar-fill, gold); /* Háttérszín CSS változóból */
  color: var(--color-text-primary, black); /* Szövegszín CSS változóból */
  padding: 10px; /* Belső margó, de fix méret mellett az align/justify center jobb */
  border-radius: 50%; /* Kerek forma */
  width: 40px;  /* Fix szélesség */
  height: 40px; /* Fix magasság */
  display: flex; /* Flexbox a szám középre igazításához a korongon belül */
  justify-content: center;
  align-items: center;
  font-weight: bold;
  font-size: 1.2em;
  cursor: grab; /* "Megfogható" kurzor */
  border: 2px solid var(--color-text-question); /* Keret színe CSS változóból */
  user-select: none; /* Megakadályozza a szöveg kijelölését húzás közben */
  box-sizing: border-box; /* Border és padding beleszámít a méretbe */
}
/* Stílus húzás közben (aktív állapot) */
.number-puck:active {
  cursor: grabbing; /* "Megfogva" kurzor */
  opacity: 0.7; /* Enyhe áttetszőség */
}

/* Kosarakat tartalmazó konténer */
.baskets-container {
  display: flex;
  flex-direction: column; /* Kosarak egymás alatt */
  /* justify-content: space-around; /* Eredetileg ez volt, de flex-direction:column mellett az align-items:center a .side-panel-en jobb lehet */
  gap: 15px; /* Térköz a kosarak között */
  margin-bottom: 20px;
  width: 100%; /* Kitölti az oldalsó panel szélességét */
}

/* Általános kosár stílus */
.basket {
  width: 100%; /* Kitölti a .baskets-container szélességét (ami a .side-panel szélessége) */
  padding: 20px 10px; /* Belső margó (függőlegesen több, vízszintesen kevesebb) */
  border: 3px dashed var(--color-input-border, #ccc); /* Szaggatott keret */
  border-radius: 10px; /* Lekerekített sarkok */
  font-size: 1.3em;
  font-weight: bold;
  transition: background-color 0.2s ease, border-style 0.2s ease; /* Átmenet a vizuális visszajelzéshez */
  box-sizing: border-box;
}

/* Páros számok kosarának egyedi stílusa */
.even-basket {
  background-color: #e6f7ff; /* Világoskék háttér */
  color: #005f88; /* Sötétkék szöveg */
}
/* Páratlan számok kosarának egyedi stílusa */
.odd-basket {
  background-color: #fff0e6; /* Világos narancssárgás háttér */
  color: #884d00; /* Sötét narancs szöveg */
}

/* Vizuális visszajelzés, amikor egy számot egy kosár fölé húznak */
.basket.drag-over {
  background-color: #d1ffd1; /* Világoszöld háttér */
  border-style: solid; /* Folyamatos keretstílus */
  border-color: var(--color-button-primary-bg); /* Keretszín CSS változóból (pl. zöld) */
}

/* Minijáték indító gomb és "Játék Vége" összegző gombjának stílusa */
.start-minigame-btn, .game-over-summary button {
  font-family: var(--font-family-primary);
  padding: 12px 25px;
  font-size: 1.2em; /* Kicsit nagyobb betűméret a fő gombokhoz képest */
  font-weight: bold;
  color: var(--color-button-text, white);
  background-color: var(--color-button-primary-bg, green); /* Háttérszín CSS változóból */
  border: none;
  border-radius: 30px; /* Erősen lekerekített sarkok */
  transition: background-color 0.3s ease;
  margin-top: 10px;
  text-transform: uppercase; /* Nagybetűs szöveg */
  cursor: pointer;
}
.start-minigame-btn:hover, .game-over-summary button:hover {
  background-color: var(--color-button-primary-hover-bg, darkgreen); /* Sötétebb háttér hover esetén */
}

/* Játék vége összegző panel stílusa */
.game-over-summary {
  margin-top: 20px;
}
.game-over-summary h3 {
  color: var(--color-text-level); /* Szín CSS változóból */
  margin-bottom: 10px;
}
</style>