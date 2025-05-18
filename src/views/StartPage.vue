<template>
  <div class="start-page-container">
    <div class="content-wrapper">
      <h1>Számolj fejben!</h1>
      <p class="subtitle">Tedd próbára aritmetikai képességeidet, és nézd meg, hány kérdésre tudsz helyesen válaszolni, mielőtt lejár az idő!</p>
      <button @click="startGame" class="start-game-button">Játék Indítása</button>
    </div>
  </div>
</template>

<script setup>
// Vue Router 'useRouter' hook importálása programatikus navigációhoz
import { useRouter } from 'vue-router';

// Router példány létrehozása a komponensben való használathoz
const router = useRouter();

// Funkció a játék elindításához
const startGame = () => {
  // Navigáció a játék képernyőjére a router segítségével.
  // A { name: 'Game' } feltételezi, hogy az útválasztó konfigurációjában (router/index.js)
  // a játék képernyőjének útvonala 'Game' néven van regisztrálva.
  router.push({ name: 'Game' });
};
</script>

<style scoped>
/* A teljes kezdőoldal konténerének stílusai */
.start-page-container {
  display: flex; /* Flexbox elrendezés a tartalom középre igazításához */
  flex-direction: column; /* Elemek függőlegesen egymás alá rendezése */
  justify-content: center; /* Függőleges középre igazítás */
  align-items: center; /* Vízszintes középre igazítás */
  /* Minimális magasság: a teljes képernyőmagasság mínusz a fejléc (kb. 60px) és lábléc (kb. 51px) magassága.
     Ezt igazítsd, ha az App.vue-ban a fejléc/lábléc mérete eltérő.
     Ez segít, hogy a tartalom a rendelkezésre álló hely közepén jelenjen meg. */
  min-height: calc(100vh - 60px - 51px);
  padding: 20px; /* Belső margó minden oldalon */
  box-sizing: border-box; /* A padding és border beleszámít az elem teljes méretébe */
  /* A háttérszín a globális stílusokból (pl. body var(--color-bg)) öröklődik vagy itt adható meg. */
}

/* A tartalmi "kártya" stílusai */
.content-wrapper {
  background-color: var(--color-card-bg); /* Háttérszín CSS változóból (téma alapján) */
  padding: 40px 50px; /* Nagyvonalú belső margó a kártyán belül */
  border-radius: 25px; /* Lekerekített sarkok */
  /* Árnyék és kiemelő keret, összhangban a GameScreen.vue kártya stílusával */
  box-shadow: 0 10px 20px var(--color-card-shadow), 0 0 0 5px rgba(255,255,255,0.3);
  border: 3px solid var(--color-text-question);
  max-width: 650px; /* Maximális szélesség, hogy nagyobb képernyőn is jól nézzen ki */
  width: 100%; /* Teljes szélesség a szülőhöz (.start-page-container) képest, a max-width korlátozza */
  text-align: center; /* Szöveg középre igazítása a kártyán belül */
}

/* Főcím (h1) stílusai */
h1 {
  font-size: 2.8em; /* Betűméret, összhangban a GameScreen H1 stílusával */
  color: var(--color-text-level); /* Szövegszín CSS változóból (téma alapján) */
  margin-bottom: 20px; /* Térköz a címsor alatt */
  font-weight: bold; /* Félkövér betűstílus */
  text-shadow: 2px 2px 0px #fff, 4px 4px 0px rgba(0,0,0,0.1); /* Szövegárnyék, összhangban a GameScreen stílusával */
}

/* Alcím (p.subtitle) stílusai */
.subtitle {
  font-size: 1.3em; /* Betűméret, összhangban a GameScreen p stílusával */
  color: var(--color-text-primary); /* Szövegszín CSS változóból */
  margin-bottom: 35px; /* Nagyobb térköz az alcím alatt, a gomb előtt */
  line-height: 1.6; /* Sorköz a jobb olvashatóságért */
}

/* Játék indítása gomb (.start-game-button) stílusai, összhangban a GameScreen gomb stílusával */
.start-game-button {
  font-family: var(--font-family-primary); /* Betűtípus CSS változóból */
  padding: 15px 30px; /* Belső margó */
  font-size: 1.5em; /* Betűméret */
  font-weight: bold; /* Félkövér */
  color: var(--color-button-text); /* Szövegszín CSS változóból */
  background-color: var(--color-button-primary-bg); /* Háttérszín CSS változóból */
  border: none; /* Nincs keret */
  border-radius: 30px; /* Erősen lekerekített, "pill" alakú gomb */
  transition: background-color 0.3s ease, transform 0.15s ease; /* Átmenetek hover és active állapothoz */
  margin-top: 10px; /* Térköz a gomb felett */
  letter-spacing: 1px; /* Betűköz */
  box-shadow: 0 4px 6px rgba(0,0,0,0.15); /* Finom árnyék */
  text-transform: uppercase; /* Nagybetűs szöveg */
  cursor: pointer; /* Kurzor jelzi a kattinthatóságot */
}

/* Gomb hover (egér fölé) állapotának stílusa, kivéve ha le van tiltva */
.start-game-button:hover:not(:disabled) {
  background-color: var(--color-button-primary-hover-bg); /* Háttérszín hover állapotban CSS változóból */
  transform: translateY(-2px) scale(1.02); /* Kis kiemelkedés és nagyítás */
  box-shadow: 0 6px 10px rgba(0,0,0,0.2); /* Erősebb árnyék */
}

/* Gomb active (kattintás) állapotának stílusa, kivéve ha le van tiltva */
.start-game-button:active:not(:disabled) {
  transform: translateY(1px) scale(0.98); /* Kis benyomódás */
}
</style>