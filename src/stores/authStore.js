
// A Pinia store definiálásához szükséges 'defineStore' funkció importálása
import { defineStore } from 'pinia';
// A Vue reaktivitási rendszeréből a 'ref' (reaktív referenciákhoz) és 'computed' (számított tulajdonságokhoz) importálása
import { ref, computed } from 'vue';
// A Vue Router 'useRouter' hook importálása programatikus navigációhoz az akciókon belül (pl. kijelentkezéskor)
import { useRouter } from 'vue-router';

// Az 'auth' store definiálása a Pinia setup szintaxisával (függvény alapú)
// Az első argumentum ('auth') a store egyedi azonosítója a Pinia devtools-ban és belsőleg.
export const useAuthStore = defineStore('auth', () => {
    // --- Állapot (State) ---
    // Reaktív referencia a felhasználói authentikációs token tárolására.
    // Kezdeti értékét megpróbálja betölteni a localStorage-ből; ha ott nincs, null lesz.
    const token = ref(localStorage.getItem('authToken') || null);
    // Reaktív referencia a bejelentkezett felhasználó adatainak tárolására.
    // Kezdeti értékét JSON stringként próbálja betölteni a localStorage-ből és parse-olni;
    // ha ott nincs, vagy a parse sikertelen, null lesz.
    const user = ref(JSON.parse(localStorage.getItem('authUser')) || null);

    // Router példány lekérése a navigációs műveletekhez (pl. kijelentkezés utáni átirányítás).
    // Fontos: A useRouter() csak egy komponens setup funkciójában vagy egy másik composable függvényen belül hívható meg közvetlenül.
    // Globális store esetén, ha a store a router előtt jön létre, a router itt null lehet.
    // Gyakran jobb megoldás a routert paraméterként átadni az akcióknak, vagy a routert a komponensből használni az akció hívása után.
    // Azonban a Pinia setup store-ok esetében a useRouter() általában működik, mivel a store a komponens kontextusában jön létre, amikor először használják.
    const router = useRouter();

    // --- Lekérdezők (Getters) ---
    // Számított tulajdonság, ami megmondja, hogy a felhasználó authentikált-e.
    // Igaz, ha van érvényes token ÉS felhasználói adat.
    const isAuthenticated = computed(() => !!token.value && !!user.value);
    // Számított tulajdonság a felhasználó email címének lekérdezésére (ha van user objektum).
    const userEmail = computed(() => user.value?.email); // Az opcionális láncolás (?. operátor) megakadályozza a hibát, ha user.value null.
    // Számított tulajdonság a felhasználó nevének lekérdezésére.
    const username = computed(() => user.value?.username);
    // Számított tulajdonság a felhasználó avatárjának lekérdezésére.
    const userAvatar = computed(() => user.value?.avatar);

    // --- Műveletek (Actions) ---

    /**
     * Beállítja az authentikációs tokent az állapotban és a localStorage-ben.
     * @param {string | null} newToken Az új token, vagy null a token törléséhez.
     */
    function setToken(newToken) {
        token.value = newToken; // Frissíti a reaktív token állapotot
        if (newToken) {
            localStorage.setItem('authToken', newToken); // Elmenti a tokent a localStorage-be perzisztencia céljából
        } else {
            localStorage.removeItem('authToken'); // Törli a tokent a localStorage-ből (pl. kijelentkezéskor)
        }
    }

    /**
     * Beállítja a felhasználói adatokat az állapotban és a localStorage-ben.
     * @param {object | null} newUser Az új felhasználói objektum, vagy null a felhasználói adatok törléséhez.
     */
    function setUser(newUser) {
        user.value = newUser; // Frissíti a reaktív user állapotot
        if (newUser) {
            // A felhasználói objektumot JSON stringként mentjük a localStorage-be
            localStorage.setItem('authUser', JSON.stringify(newUser));
        } else {
            localStorage.removeItem('authUser'); // Törli a felhasználói adatokat a localStorage-ből
        }
    }

    /**
     * Bejelentkezési művelet (egyszerűsített).
     * Ez az 'login' akció a store-ban magában foglalhatná magát az API hívást is,
     * de jelenleg feltételezzük, hogy a LoginPage.vue komponens végzi az API hívást,
     * majd meghívja a setToken/setUser függvényeket a kapott adatokkal.
     * Alternatívaként a fetch logika a LoginPage.vue-ból ide helyezhető.
     * A LoginPage.vue jelenlegi struktúrájával való egyszerűség kedvéért:
     * @param {object} userData - Objektum, ami tartalmazza a `token`-t és `user` adatokat a sikeres API hívás után.
     */
    async function login(userData) {
        // Ezt a funkciót a LoginPage.vue hívja meg sikeres API válasz után.
        setToken(userData.token);
        setUser(userData.user);
        // Itt akár további logikát is hozzáadhatnánk, pl. felhasználói beállítások betöltése.
    }

    /**
     * Kijelentkezési művelet.
     * Törli a tokent és a felhasználói adatokat az állapotból és a localStorage-ből,
     * majd átirányítja a felhasználót a bejelentkezési oldalra.
     */
    function logout() {
        setToken(null); // Token törlése
        setUser(null);  // Felhasználói adatok törlése

        // Átirányítás a bejelentkezési oldalra a router segítségével
        // Fontos ellenőrizni, hogy a router itt elérhető-e.
        // A Pinia setup store-oknál ez általában rendben van, ha a store-t egy komponensen belül használják először.
        if (router) {
            router.push('/login');
        } else {
            // Végső megoldás, ha a router valamiért nem lenne elérhető (nem jellemző Vue komponens kontextusban)
            console.warn('Router instance was not available in authStore.logout(). Falling back to window.location.');
            window.location.pathname = '/login';
        }
    }

    // A felhasználói adatok localStorage-ből való betöltése a store inicializálásakor
    // ezt már a `token` és `user` ref-ek kezdeti értékadása kezeli a `localStorage.getItem` hívásokkal.
    // Tehát nincs szükség külön inicializáló függvényre itt ehhez.

    // Az állapotok, getterek és akciók visszaadása, hogy a komponensekben használhatók legyenek
    return {
        token,              // Reaktív token állapot
        user,               // Reaktív felhasználói objektum állapot
        isAuthenticated,    // Számított tulajdonság: be van-e jelentkezve a felhasználó
        userEmail,          // Számított tulajdonság: felhasználó email címe
        username,           // Számított tulajdonság: felhasználónév
        userAvatar,         // Számított tulajdonság: felhasználó avatárja
        setToken,           // Akció: token beállítása
        setUser,            // Akció: felhasználói adatok beállítása
        login,              // Akció: bejelentkezés (adatok beállítása)
        logout              // Akció: kijelentkezés
    };
});