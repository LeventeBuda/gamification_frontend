// frontend/src/main.js

// A Vue alkalmazás létrehozásához szükséges alapvető funkció importálása a 'vue' csomagból
import { createApp } from 'vue';

// A Pinia állapotkezelő létrehozásához szükséges funkció importálása
import { createPinia } from 'pinia';

// Az alkalmazás gyökérkomponensének (App.vue) importálása
// Ez a komponens tartalmazza az alkalmazás fő elrendezését és a router-view-t
import App from './App.vue';

// A Vue Router konfigurációjának importálása (a ./router/index.js fájlból)
import router from './router';

// Globális stíluslap importálása (téma CSS)
// Ez a stíluslap az egész alkalmazásra érvényes lesz
import '/src/assets/theme.css';

// Létrehozzuk a Vue alkalmazáspéldányt az App gyökérkomponenssel
const app = createApp(App);

// Létrehozzuk a Pinia store példányt az állapotkezeléshez
const pinia = createPinia();

// A Pinia plugin regisztrálása a Vue alkalmazáshoz
// Fontos, hogy a Pinia-t a router előtt regisztráljuk, ha az útvonal őrök (navigation guards)
// esetleg már a store-ból szeretnének adatokat olvasni.
app.use(pinia); // Pinia hozzáadása az alkalmazáshoz

// A Vue Router plugin regisztrálása az alkalmazáshoz
// Ez teszi lehetővé az útvonal-kezelést a komponensekben (pl. <router-link>, <router-view>, this.$router)
app.use(router); // Router hozzáadása az alkalmazáshoz

// A Vue alkalmazás csatlakoztatása a DOM-hoz
// Az alkalmazás az index.html fájlban található '#app' ID-jű HTML elemhez lesz csatolva és ott jelenik meg.
app.mount('#app');