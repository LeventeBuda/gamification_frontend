<template>
  <div class="highscore-page-container">
    <div class="highscore-card">
      <h1>🏆 Ranglista 🏆</h1> <div v-if="isLoading" class="loading-message">
      Ranglista betöltése...
    </div>

      <div v-if="error" class="error-message">
        <p>Hoppá! Nem sikerült betölteni a ranglistát.</p>
        <p class="error-details">{{ error }}</p> <button @click="fetchHighscores" class="retry-button">Újrapróbálkozás</button> </div>

      <div v-if="!isLoading && !error && scores.length === 0" class="no-scores-message">
        Nincsenek még rögzített eredmények. Legyél te az első!
      </div>

      <div v-if="!isLoading && !error && scores.length > 0" class="scores-list-container">
        <ol class="scores-list">
          <li v-for="(entry, index) in scores" :key="entry._id || index" class="score-entry">
            <span class="rank">{{ index + 1 }}.</span> <span class="username">{{ entry.username }}</span> <span class="score">{{ entry.score }} pont</span> <span class="date" v-if="entry.createdAt">{{ formatDate(entry.createdAt) }}</span>
          </li>
        </ol>
      </div>
    </div>
  </div>
</template>

<script setup>
// Vue reaktivitási funkciók importálása
import { ref, onMounted } from 'vue';

// Reaktív állapotok definiálása
const scores = ref([]);        // Tömb a ranglista bejegyzések tárolására
const isLoading = ref(true);   // Logikai érték: igaz, amíg a ranglista töltődik
const error = ref(null);       // Hibaüzenet tárolására, ha a betöltés sikertelen (kezdetben null)

// Aszinkron függvény a ranglista adatainak lekérésére a backendről
const fetchHighscores = async () => {
  isLoading.value = true;  // Töltési állapot beállítása
  error.value = null;      // Korábbi hibaüzenetek törlése
  try {
    // API hívás a backend '/api/scores/leaderboard' végpontjára
    // A ?limit=20 paraméter például a legjobb 20 eredményt kéri le.
    // Győződj meg róla, hogy a 'http://localhost:5000' URL helyes!
    const response = await fetch('http://localhost:5000/api/scores/leaderboard?limit=20');
    if (!response.ok) { // Ellenőrizzük, hogy a HTTP válasz státuszkódja sikeres-e
      const errorData = await response.json(); // Próbáljuk meg a hiba részleteit JSON-ként kiolvasni
      // Hibát dobunk a szerver által küldött üzenettel vagy egy általános HTTP hibaüzenettel
      throw new Error(errorData.message || `HTTP hiba! Státusz: ${response.status}`);
    }
    const data = await response.json(); // Sikeres válasz esetén az adatokat JSON-ként dolgozzuk fel
    scores.value = data; // A kapott ranglista adatokat beállítjuk a 'scores' reaktív változóba
  } catch (err) { // Hibák elkapása (pl. hálózati hiba, szerveroldali hiba)
    console.error('Nem sikerült lekérni a ranglistát:', err); // Hiba logolása a fejlesztői konzolra
    error.value = err.message || 'Ismeretlen hiba történt.'; // Hibaüzenet beállítása a felhasználói felület számára
  } finally {
    isLoading.value = false; // Töltési állapot befejezése (sikeres vagy sikertelen volt a betöltés)
  }
};

// Segédfüggvény a dátumstring formázásához olvashatóbb alakra
const formatDate = (dateString) => {
  if (!dateString) return ''; // Ha nincs dátumstring, üres stringet adunk vissza
  const options = { year: 'numeric', month: 'short', day: 'numeric' }; // Dátumformázási opciók
  // A böngésző helyi beállításainak megfelelő dátumformátumot használunk
  return new Date(dateString).toLocaleDateString(undefined, options);
};

// Vue életciklus hook: akkor fut le, amikor a komponens beillesztésre került a DOM-ba
onMounted(() => {
  fetchHighscores(); // A ranglista adatainak automatikus lekérése a komponens betöltődésekor
});
</script>

<style scoped>
/* A ranglista oldalának fő konténer stílusai */
.highscore-page-container {
  display: flex; /* Flexbox elrendezés a tartalom középre igazításához */
  flex-direction: column; /* Elemek függőlegesen */
  align-items: center; /* Vízszintes középre igazítás */
  padding: 20px; /* Belső margó */
  /* Minimális magasság: teljes képernyőmagasság mínusz a fejléc és lábléc magassága, valamint extra 40px padding.
     A --header-height és --footer-height CSS változókat az App.vue-ban vagy globálisan kellene definiálni. */
  min-height: calc(100vh - var(--header-height, 60px) - var(--footer-height, 51px) - 40px);
  box-sizing: border-box; /* Padding és border beleszámít a teljes méretbe */
  /* A háttérszín a globális stílusokból (body var(--color-bg)) öröklődik, ha van. */
}

/* A ranglista kártyájának stílusai */
.highscore-card {
  background-color: var(--color-card-bg, #ffffff); /* Háttérszín CSS változóból vagy alapértelmezett fehér */
  padding: 30px 40px; /* Belső margó */
  border-radius: 25px; /* Lekerekített sarkok, összhangban a téma többi kártyájával */
  /* Árnyék és kiemelő keret, összhangban a téma többi kártyájával */
  box-shadow: 0 10px 20px var(--color-card-shadow, rgba(0,0,0,0.15)), 0 0 0 5px rgba(255,255,255,0.3);
  border: 3px solid var(--color-text-question, #0077cc); /* Keret CSS változóból */
  width: 100%; /* Teljes szélesség a szülőhöz képest */
  max-width: 700px; /* Szélesebb kártya a ranglista tartalmához */
  text-align: center; /* Szöveg középre igazítása a kártyán belül */
}

/* Főcím (h1) stílusa */
h1 {
  color: var(--color-text-level, #ff6f00); /* Szövegszín CSS változóból */
  font-size: 2.5em; /* Betűméret */
  margin-bottom: 30px; /* Térköz alatta */
  font-weight: bold; /* Félkövér */
  text-shadow: 2px 2px 0px #fff, 3px 3px 0px rgba(0,0,0,0.05); /* Szövegárnyék */
}

/* Töltési és "nincs eredmény" üzenetek stílusa */
.loading-message,
.no-scores-message {
  font-size: 1.2em; /* Betűméret */
  color: var(--color-text-primary, #555); /* Szövegszín CSS változóból */
  padding: 20px; /* Belső margó */
}

/* Hibaüzenet blokk stílusa */
.error-message {
  font-size: 1.2em; /* Betűméret */
  color: var(--color-feedback-error-text, #721c24); /* Szövegszín CSS változóból */
  background-color: var(--color-feedback-error-bg, #f8d7da); /* Háttérszín CSS változóból */
  border: 1px solid var(--color-feedback-error-text, #f5c6cb); /* Keretszín CSS változóból */
  padding: 20px; /* Belső margó */
  border-radius: 15px; /* Lekerekített sarkok, összhangban a témával */
  margin-bottom: 20px; /* Térköz alatta */
}
/* Hiba részleteinek stílusa */
.error-details {
  font-size: 0.9em; /* Kisebb betűméret */
  color: #5a5a5a; /* Sötétszürke szövegszín */
  margin-top: 5px; /* Térköz felette */
}

/* "Újrapróbálkozás" gomb stílusa */
.retry-button {
  font-family: var(--font-family-primary); /* Betűtípus CSS változóból */
  padding: 10px 20px; /* Belső margó */
  font-size: 1em; /* Betűméret */
  font-weight: bold; /* Félkövér */
  color: var(--color-button-text, white); /* Szövegszín CSS változóból */
  background-color: var(--color-button-secondary-bg, #007bff); /* Háttérszín CSS változóból (másodlagos gomb) */
  border: none; /* Nincs keret */
  border-radius: 30px; /* Lekerekített, "pill" alak */
  transition: background-color 0.3s ease, transform 0.15s ease; /* Átmenetek */
  margin-top: 15px; /* Térköz felette */
  box-shadow: 0 4px 6px rgba(0,0,0,0.1); /* Finom árnyék */
  text-transform: uppercase; /* Nagybetűs szöveg */
  cursor: pointer;
}
.retry-button:hover {
  background-color: var(--color-button-secondary-hover-bg, #0056b3); /* Sötétebb háttér hover esetén */
  transform: translateY(-1px); /* Kis emelkedés */
}

/* A ranglista elemeit tartalmazó konténer */
.scores-list-container {
  margin-top: 20px; /* Térköz felette */
}

/* Maga a ranglista (rendezett lista) stílusai */
.scores-list {
  list-style-type: none; /* Nincsenek listajelölők (pl. számok, pontok) - a .rank span adja a sorszámot */
  padding: 0; /* Alapértelmezett belső margó eltávolítása */
  text-align: left; /* Szöveg balra igazítása a listaelemekben */
}

/* Egyetlen ranglista bejegyzés stílusa */
.score-entry {
  display: flex; /* Flexbox az elemek (helyezés, név, pont, dátum) egy sorba rendezéséhez */
  justify-content: space-between; /* Térköz egyenletes elosztása az elemek között */
  align-items: center; /* Elemek függőleges középre igazítása */
  padding: 12px 15px; /* Belső margó */
  border-bottom: 1px solid #eee; /* Elválasztó vonal a bejegyzések között (CSS változó: var(--color-input-border) vagy hasonló) */
  font-size: 1.1em; /* Betűméret */
}

/* Utolsó ranglista bejegyzésnél nincs alsó elválasztó vonal */
.score-entry:last-child {
  border-bottom: none;
}

/* Páratlan sorszámú ranglista bejegyzések hátterének finom sávozása */
.score-entry:nth-child(odd) {
  background-color: #f9f9f9; /* Nagyon világosszürke háttér */
}

/* Helyezés (sorszám) stílusa */
.rank {
  font-weight: bold; /* Félkövér */
  color: var(--color-text-level, #ff6f00); /* Szín CSS változóból */
  min-width: 40px; /* Minimális szélesség, hogy a sorszámok jól elférjenek és igazodjanak */
}

/* Felhasználónév stílusa */
.username {
  flex-grow: 1; /* Kitölti a rendelkezésre álló helyet a többi elem mellett */
  padding-left: 15px; /* Térköz balra (a rangtól) */
  font-weight: 500; /* Közepesen félkövér */
  color: var(--color-text-primary, #333); /* Szín CSS változóból */
}

/* Pontszám stílusa */
.score {
  font-weight: bold; /* Félkövér */
  color: var(--color-button-primary-bg, #4CAF50); /* Kiemelkedő szín (pl. elsődleges gomb színe) CSS változóból */
  min-width: 100px; /* Minimális szélesség az igazításhoz */
  text-align: right; /* Jobbra igazítás */
}

/* Dátum stílusa */
.date {
  font-size: 0.85em; /* Kisebb betűméret */
  color: #777; /* Szürke (CSS változó: var(--color-text-secondary) vagy hasonló) */
  min-width: 120px; /* Minimális szélesség az igazításhoz */
  text-align: right; /* Jobbra igazítás */
  padding-left: 15px; /* Térköz balra (a pontszámtól) */
}
</style>