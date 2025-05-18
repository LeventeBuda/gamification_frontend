<template>
  <div id="app-layout">
    <header class="app-header">
      <nav class="main-nav">
        <router-link to="/" class="nav-item logo">Számolj fejben!</router-link>

        <div class="nav-links">
          <router-link to="/game" class="nav-item" v-if="authStore.isAuthenticated">Játék</router-link>
          <router-link to="/highscores" class="nav-item">Ranglista</router-link>
        </div>

        <div class="auth-section">
          <template v-if="authStore.isAuthenticated">
            <span class="welcome-message">Üdv, {{ authStore.username || 'Játékos' }}!</span>
            <button @click="performLogout" class="auth-button logout-button">Kijelentkezés</button>
          </template>
          <template v-else>
            <router-link to="/login" class="auth-button login-button">Bejelentkezés / Regisztráció</router-link>
          </template>
        </div>
      </nav>
    </header>

    <main class="main-content">
      <router-view /> </main>

  </div>
</template>

<script setup>
// Authentikációs store importálása a felhasználói állapot és műveletek kezeléséhez
import { useAuthStore } from './stores/authStore'; // Ellenőrizd az elérési utat, ha a store máshol van!

// Az authentikációs store példányosítása
const authStore = useAuthStore();

// Kijelentkezési funkció
const performLogout = () => {
  authStore.logout(); // Meghívja a store 'logout' műveletét
                      // Ennek kellene kezelnie az állapot törlését és az átirányítást a /login oldalra.
};
</script>

<style scoped>
/* Az alkalmazás teljes elrendezésének alapstílusai */
#app-layout {
  display: flex; /* Flexbox elrendezés a főbb részek (fejléc, tartalom, lábléc) igazításához */
  flex-direction: column; /* Az elemek függőlegesen, egymás alatt helyezkednek el */
  min-height: 100vh; /* Minimális magasság a teljes képernyőmagasság, hogy a lábléc alul maradjon */
  font-family: Avenir, Helvetica, Arial, sans-serif; /* Alapértelmezett betűtípus család. Érdemes lehet CSS változót használni itt is: var(--font-family-primary) */
  color: #2c3e50; /* Alapértelmezett szövegszín. Érdemes lehet CSS változót használni: var(--color-text-primary) */
}

/* Fejléc stílusai */
.app-header {
  background-color: #ffffff; /* Fejléc háttérszíne. Érdemes lehet CSS változót használni: var(--color-card-bg) vagy egyedi fejléc háttérszín */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); /* Finom árnyék a fejléc alatt */
  padding: 0 20px; /* Vízszintes belső margó a fejléc tartalmának */
  position: sticky; /* Opcionális: Fejléc rögzítése görgetéskor a képernyő tetején */
  top: 0;
  z-index: 100; /* Magasabb z-index, hogy más elemek fölött maradjon */
}

/* Fő navigációs sáv stílusai */
.main-nav {
  display: flex; /* Flexbox a navigációs elemek egy sorba rendezéséhez és igazításához */
  justify-content: space-between; /* Az elemek között egyenletesen elosztja a teret (logó balra, linkek középen, auth jobbra - ehhez módosítás kellhet) */
  /* A jelenlegi 'justify-content: center' középre rendezi az egészet, ha a .nav-links és .auth-section nincs fix szélességen vagy pozíción */
  /* Ha a logó balra, linkek középen, auth jobbra elrendezés a cél, akkor a .nav-links-nek és .auth-section-nek margin:auto; vagy flex-grow segítségre lehet szüksége, */
  /* vagy a .main-nav-on belül további wrapper divek kellenek a space-between hatékonyabb kihasználásához. */
  /* A kódban 'justify-content: center;' volt, de a struktúra (logo, nav-links, auth-section) alapján a space-between logikusabbnak tűnik egy tipikus fejlécben. */
  /* Most visszaállítom az eredeti 'center'-re, ahogy a kódban volt, de megjegyzésként itt hagyom a space-between opciót. */
  justify-content: center; /* Az eredeti kódban ez volt, a gyerek elemeket középre rendezi a nav-on belül. */
  align-items: center; /* Függőleges középre igazítás a navigációs sávon belül */
  height: 60px; /* Navigációs sáv magassága */
  max-width: 1200px; /* Maximális szélesség, hogy nagy képernyőn ne nyúljon szét túlságosan */
  margin: 0 auto; /* Vízszintesen középre igazítja a .main-nav-ot a .app-header-en belül, ha az szélesebb */
  position: relative; /* Pozícionálási kontextus az abszolút pozicionált gyerek elemekhez (ha lennének) */
}

/* Navigációs elemek (linkek) általános stílusa */
.nav-item {
  padding: 0.5em 0.75em; /* Belső margó */
  text-decoration: none; /* Aláhúzás eltávolítása */
  color: #2c3e50; /* Szövegszín. Használj CSS változót: var(--color-text-primary) */
  font-weight: bold; /* Félkövér betűstílus */
  border-radius: 4px; /* Enyhén lekerekített sarkok */
  transition: background-color 0.2s ease-in-out, color 0.2s ease-in-out; /* Finom átmenet hover állapothoz */
}

/* Logó specifikus stílusa */
.nav-item.logo {
  font-size: 1.5em; /* Nagyobb betűméret a logónak */
  color: #42b983; /* Vue zöld szín, vagy használj egy téma színt: var(--color-text-level) */
  margin-right: auto; /* Balra tolja a logót, ha a .main-nav `display:flex` és a többi elem jobbra igazodik. A jelenlegi `justify-content:center` mellett ez nem így viselkedik. */
  /* Ha a cél, hogy a logó bal oldalon legyen, a .nav-links középen, az .auth-section pedig jobb oldalon, akkor a .main-nav felépítését és stílusait kell módosítani. */
  /* Például: .main-nav { justify-content: space-between; } és a .nav-links { position: absolute; left: 50%; transform: translateX(-50%); } bonyolultabb lehet. */
  /* Egy egyszerűbb megoldás lehet a .main-nav-ot három részre osztani flexbox-szal. */
}

/* Navigációs linkek hover állapota (kivéve a logót) */
.nav-item:hover:not(.logo) {
  background-color: #f0f0f0; /* Világosszürke háttér hover esetén */
}

/* A középső navigációs linkek konténere */
.nav-links {
  display: flex; /* Linkek egymás mellett */
  gap: 10px; /* Térköz a linkek között */
  /* A `justify-content: center` a .main-nav-on ezt a blokkot is középre próbálja tenni a többi flex item-hez képest. */
  /* Ha ez a blokk legyen középen a teljes nav szélességéhez képest, és a logo/auth section a széleken, akkor a .main-nav-nak `justify-content: space-between;` kellene, */
  /* és ennek a blokknak `margin-left: auto; margin-right: auto;` vagy más flexbox trükk. */
}

/* Authentikációs szekció (üdvözlő üzenet, gombok) jobb oldalon */
.auth-section {
  display: flex; /* Elemek egy sorban */
  align-items: center; /* Függőleges középre igazítás */
  gap: 10px; /* Térköz az elemek között */
  margin-left: auto; /* Jobbra tolja ezt a szekciót, ha a .main-nav `display:flex` és a .logo `margin-right: auto;` nincs, vagy a .nav-links nem foglal el minden helyet. */
  /* A .main-nav `justify-content: center;` mellett ez nem feltétlenül a jobb szélre pozícionálja, hanem a flex item-ek csoportját igazítja középre. */
  /* Ha a cél a jobb szélre igazítás, a .main-nav-nak `justify-content: space-between` kellene. */
}

/* Üdvözlő üzenet stílusa */
.welcome-message {
  font-weight: normal; /* Normál betűvastagság */
  color: #555;      /* Szövegszín. Használj CSS változót: var(--color-text-primary) */
  font-size: 0.9em; /* Kisebb betűméret */
  margin-right: 5px; /* Kis térköz a gomb előtt */
}

/* Authentikációs gombok (Login/Logout) alapstílusai */
.auth-button {
  border: none; /* Nincs keret */
  cursor: pointer; /* Kattintható kurzor */
  font-weight: bold; /* Félkövér szöveg */
  border-radius: 5px; /* Lekerekített sarkok */
  transition: background-color 0.2s ease-in-out, color 0.2s ease-in-out; /* Átmenet */
  text-decoration: none; /* Linkek esetén aláhúzás eltávolítása */
  display: inline-flex; /* Jobb igazítás a gombon belüli szöveghez/ikonokhoz */
  align-items: center; /* Tartalom függőleges középre igazítása */
  justify-content: center; /* Tartalom vízszintes középre igazítása */
  line-height: 1.2; /* Sor magasság normalizálása */
  padding: 8px 15px; /* Alapértelmezett belső margó, a specifikusabb gombok felülírhatják */
}

/* Bejelentkezés/Regisztráció gomb (router-link-ként is működhet) */
.login-button {
  background-color: #007bff; /* Kék háttér. Használj CSS változót: var(--color-button-secondary-bg) */
  color: white;             /* Fehér szöveg. Használj CSS változót: var(--color-button-text) */
  font-size: 0.9em;       /* Betűméret, hogy illeszkedjen a többi nav elemhez */
}
.login-button:hover {
  background-color: #0056b3; /* Sötétebb kék hover esetén */
  color: white; /* Szövegszín marad fehér */
}

/* Kijelentkezés gomb specifikus stílusai */
.logout-button {
  background-color: #dc3545; /* Piros háttér. Használj CSS változót: var(--color-feedback-error-bg) */
  color: white;             /* Fehér szöveg. Használj CSS változót: var(--color-button-text) */
  font-size: 0.85em;        /* Kicsit kisebb betűméret */
  padding: 6px 12px;      /* Csökkentett belső margó a kisebb mérethez (az eredetiben 15px volt a második érték) */
  margin-bottom: 16px; /* Ez a stílus függőlegesen eltolhatja a gombot a többi elemhez képest a flex containerben, óvatosan használd. */
  text-transform: uppercase;/* Nagybetűs szöveg */
}
.logout-button:hover {
  background-color: #c82333; /* Sötétebb piros hover esetén */
  color: white; /* Szövegszín marad fehér */
}

/* Aktív router link stílusa (kivéve a logót) */
.router-link-exact-active:not(.logo) {
  color: #42b983; /* Vue zöld az aktív link szövegszínének */
  background-color: #e9f5ee; /* Halványzöld háttér az aktív linknek */
}

/* Fő tartalmi terület stílusai */
.main-content {
  flex-grow: 1; /* Kitölti a rendelkezésre álló függőleges helyet a fejléc és lábléc között */
  padding: 20px; /* Belső margó a tartalom körül */
  background-color: #f4f6f8; /* Világos háttérszín a tartalomnak. Használj CSS változót: var(--color-bg) */
}

/* Lábléc stílusai (ez a class a CSS-ben definiálva van, de a template-ben nem szerepelt) */
.app-footer {
  text-align: center; /* Szöveg középre igazítása */
  padding: 15px; /* Belső margó */
  background-color: #343a40; /* Sötét háttérszín */
  color: #f8f9fa; /* Világos szövegszín */
  font-size: 0.9em; /* Kisebb betűméret */
}
</style>