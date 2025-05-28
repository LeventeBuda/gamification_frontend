

// Vue Router szükséges funkcióinak importálása
import { createRouter, createWebHistory } from 'vue-router';

// Az útvonalakhoz tartozó Vue komponensek importálása
// Győződj meg róla, hogy az elérési utak helyesek a te projektstruktúrádhoz képest!
import StartPage from '../views/StartPage.vue';       // A játék kezdőoldala
import GameScreen from '../views/GameScreen.vue';     // A fő játék képernyője
import LoginPage from '../views/LoginPage.vue';       // Bejelentkezési oldal
import HighscorePage from '../views/HighscorePage.vue'; // Ranglista oldal

// Az authentikációs store importálása (Pinia)
// Ez szükséges annak ellenőrzéséhez, hogy a felhasználó be van-e jelentkezve
import { useAuthStore } from '../stores/authStore';

// Útvonalak definiálása a webalkalmazáshoz
const routes = [
    {
        path: '/login',                             // Az URL elérési útja a böngészőben
        name: 'Login',                              // Az útvonal egyedi neve (programatikus navigációhoz hasznos)
        component: LoginPage,                       // Ehhez az útvonalhoz rendelt Vue komponens
        meta: { requiresGuest: true }               // Meta információ: ez az útvonal csak vendég (nem bejelentkezett) felhasználók számára elérhető
    },
    {
        path: '/',                                  // Gyökér útvonal (általában a főoldal vagy kezdőoldal)
        name: 'Start',                              // Az útvonal neve
        component: StartPage,                       // A StartPage komponens jelenik meg ezen az útvonalon
        meta: { requiresAuth: true }                // Meta információ: ez az útvonal authentikációt (bejelentkezést) igényel
    },
    {
        path: '/game',                              // A játék képernyőjének elérési útja
        name: 'Game',                               // Az útvonal neve
        component: GameScreen,                      // A GameScreen komponens jelenik meg
        meta: { requiresAuth: true }                // Meta információ: ez az útvonal is authentikációt igényel
    },
    {
        path: '/highscores',                        // A ranglista oldal elérési útja
        name: 'Highscores',                         // Az útvonal neve
        component: HighscorePage                    // A HighscorePage komponens jelenik meg
        // A ranglista oldal lehet publikus vagy igényelhet authentikációt, igény szerint.
        // Ha authentikációt igényel: meta: { requiresAuth: true }
        // Ha nem, akkor nincs szükség meta mezőre, vagy { requiresAuth: false } (bár ez utóbbi redundáns).
    }
    // ... Itt adhatsz hozzá további útvonalakat a projektedhez ...
];

// Az útválasztó (router) példány létrehozása
const router = createRouter({
    // A `createWebHistory()` a HTML5 History API-t használja a "tiszta" URL-ekhez (nincs # az URL-ben).
    // A `process.env.BASE_URL` általában a Vue CLI projektekben használt alap URL, Vite esetén más lehet vagy nem szükséges.
    // Gyakran elegendő csak createWebHistory().
    history: createWebHistory(import.meta.env.BASE_URL || '/'), // Vite esetén az import.meta.env.BASE_URL használatos az alapútvonalhoz
    routes  // A fentebb definiált útvonalak tömbje
});

// Globális navigációs őr (Global Navigation Guard)
// Ez a függvény minden útvonalváltás előtt lefut.
// `to`: a cél útvonal objektuma, ahova navigálni szeretnénk.
// `from`: az aktuális útvonal objektuma, ahonnan indulunk.
// `next`: egy függvény, amit meg kell hívni a navigáció folytatásához, átirányításához vagy megszakításához.
router.beforeEach((to, from, next) => {
    const authStore = useAuthStore();           // Auth store példány lekérése
    const isAuthenticated = authStore.isAuthenticated; // Annak ellenőrzése, hogy a felhasználó be van-e jelentkezve (a store getterén keresztül)

    // Ellenőrzés: Ha az útvonal authentikációt igényel (`to.meta.requiresAuth === true`)
    // ÉS a felhasználó NINCS bejelentkezve (`!isAuthenticated`)
    if (to.meta.requiresAuth && !isAuthenticated) {
        // Akkor átirányítjuk a felhasználót a 'Login' nevű útvonalra (bejelentkezési oldalra)
        next({ name: 'Login' });
    }
        // Ellenőrzés: Ha az útvonal csak vendégeknek szóló (`to.meta.requiresGuest === true`)
    // (pl. bejelentkezési vagy regisztrációs oldal) ÉS a felhasználó MÁR BE VAN jelentkezve (`isAuthenticated`)
    else if (to.meta.requiresGuest && isAuthenticated) {
        // Akkor átirányítjuk a felhasználót a főoldalra ('Start' nevű útvonalra vagy más alapértelmezett belső oldalra)
        // hogy ne lássa újra a bejelentkezési oldalt, ha már be van lépve.
        next({ name: 'Start' });
    }
        // Minden egyéb esetben (pl. az útvonal nem igényel authentikációt,
        // vagy az útvonal authentikációt igényel és a felhasználó be van jelentkezve,
    // vagy az útvonal vendégeknek szól és a felhasználó nincs bejelentkezve)
    else {
        // Engedélyezzük a navigációt a kért útvonalra
        next();
    }
});

// Az útválasztó példány exportálása, hogy a fő Vue alkalmazás (`main.js` vagy `main.ts`) használni tudja
export default router;