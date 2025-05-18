<template>
  <div class="login-page">
    <div class="form-container">
      <h1>{{ isLoginMode ? 'Jelentkezz be a fiókodba' : 'Hozz létre egy fiókot' }}</h1>

      <form @submit.prevent="isLoginMode ? handleLogin() : handleRegister()">

        <div v-if="!isLoginMode" class="form-group">
          <label for="username">Felhasználónév:</label>
          <input type="text" id="username" v-model="formData.username" required />
        </div>

        <div class="form-group">
          <label for="email">Email:</label>
          <input type="email" id="email" v-model="formData.email" required />
        </div>

        <div class="form-group">
          <label for="password">Jelszó:</label>
          <input type="password" id="password" v-model="formData.password" required />
        </div>

        <div v-if="!isLoginMode" class="form-group">
          <label for="avatar">Avatár (opcionális, emoji vagy név):</label>
          <input type="text" id="avatar" v-model="formData.avatar" />
        </div>

        <button type="submit" class="submit-btn">
          {{ isLoginMode ? 'Bejelentkezés' : 'Fiók létrehozása' }}
        </button>
      </form>

      <p v-if="message" class="message-display" :class="messageType === 'error' ? 'error-message' : 'success-message'">
        {{ message }}
      </p>

      <button @click="toggleMode" class="toggle-mode-btn">
        {{ isLoginMode ? 'Nincs még fiókod? Regisztrálj!' : 'Van már fiókod? Jelentkezz be!' }}
      </button>
    </div>
  </div>
</template>

<script setup>
// Vue és egyéb szükséges modulok importálása
import { ref, reactive } from 'vue'; // Vue reaktivitási eszközök: ref egyszerű értékekhez, reactive objektumokhoz
import { useRouter } from 'vue-router'; // Vue Router hook programatikus navigációhoz
import { useAuthStore } from '../stores/authStore'; // Authentikációs store importálása (az útvonalat ellenőrizd!)

// Router és Auth Store példányosítása a komponensben való használathoz
const router = useRouter(); // Router objektum a navigációhoz
const authStore = useAuthStore(); // Authentikációs store objektum

// Reaktív állapotok (state) definiálása
const isLoginMode = ref(true); // Logikai (boolean) ref: true = Bejelentkezési mód, false = Regisztrációs mód. Alapértelmezetten bejelentkezés.
const formData = reactive({    // Reaktív objektum az űrlap adatainak tárolására
  username: '',                // Felhasználónév (regisztrációhoz)
  email: '',                 // Email cím (mindkét módhoz)
  password: '',              // Jelszó (mindkét módhoz)
  avatar: ''                 // Avatár (opcionális, regisztrációhoz)
});

const message = ref('');      // Reaktív ref: Visszajelző üzenetek (pl. siker, hiba) megjelenítésére a felhasználónak.
const messageType = ref('');  // Reaktív ref: Az üzenet típusa ('success' vagy 'error'), ami a stílusát határozza meg.

// Funkció: Váltás a Bejelentkezési és Regisztrációs mód között
const toggleMode = () => {
  isLoginMode.value = !isLoginMode.value; // Az isLoginMode értékének megfordítása
  message.value = '';                     // Előző visszajelző üzenet törlése
  messageType.value = '';                 // Üzenet típusának törlése
  // Az űrlap mezőinek kiürítése a tiszta váltás érdekében
  formData.username = '';
  formData.email = '';
  formData.password = '';
  formData.avatar = '';
};

// Funkció: Felhasználói regisztráció kezelése (aszinkron, mivel API hívást tartalmaz)
const handleRegister = async () => {
  message.value = ''; // Korábbi üzenetek törlése
  messageType.value = '';

  // Kliensoldali validáció: alapvető ellenőrzések
  if (!formData.username.trim() || !formData.email.trim() || !formData.password.trim()) {
    message.value = 'A felhasználónév, email és jelszó megadása kötelező a regisztrációhoz.';
    messageType.value = 'error';
    return; // Ha a validáció sikertelen, a funkció itt leáll
  }
  if (formData.password.length < 6) {
    message.value = 'A jelszónak legalább 6 karakter hosszúnak kell lennie.';
    messageType.value = 'error';
    return; // Ha a jelszó túl rövid, a funkció leáll
  }

  try {
    // API hívás a backend '/api/auth/register' végpontjára
    // Győződj meg róla, hogy a 'http://localhost:5000' URL helyes a te backend címedhez!
    const response = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST', // HTTP POST metódus használata
      headers: {
        'Content-Type': 'application/json', // Jelezzük a szervernek, hogy JSON adatot küldünk
      },
      body: JSON.stringify({ // Az űrlap adatait JSON string formátumba alakítjuk
        username: formData.username,
        email: formData.email,
        password: formData.password,
        avatar: formData.avatar || undefined // Avatárt csak akkor küldjük, ha van értéke, különben undefined (a backend kezelheti az alapértelmezettet)
      }),
    });

    const data = await response.json(); // A szerver válaszának feldolgozása JSON objektumként

    if (!response.ok) { // Ellenőrizzük, hogy a HTTP válasz státuszkódja sikeres-e (2xx tartomány)
      // Ha nem sikeres, hibát dobunk a szerver által küldött üzenettel, vagy egy általános hibaüzenettel
      throw new Error(data.message || `HTTP hiba! Státusz: ${response.status}`);
    }

    // Sikeres regisztráció esetén
    message.value = data.message || 'Sikeres regisztráció! Kérjük, váltson bejelentkezési módra.';
    messageType.value = 'success';
    isLoginMode.value = true; // Automatikus átváltás bejelentkezési módra
    formData.password = '';   // Jelszómező kiürítése (biztonsági okokból és kényelemből)
    // Az email mezőt általában érdemes meghagyni, ha a felhasználó most regisztrált és rögtön be akar jelentkezni.
  } catch (error) { // Hibák elkapása (pl. hálózati hiba, szerveroldali hiba)
    console.error('Regisztráció sikertelen:', error); // Hiba logolása a fejlesztői konzolra
    message.value = error.message || 'Regisztráció sikertelen. Kérjük, próbálja újra.';
    messageType.value = 'error';
  }
};

// Funkció: Felhasználói bejelentkezés kezelése (aszinkron)
const handleLogin = async () => {
  message.value = ''; // Korábbi üzenetek törlése
  messageType.value = '';

  // Kliensoldali validáció
  if (!formData.email.trim() || !formData.password.trim()) {
    message.value = 'Az email és jelszó megadása kötelező a bejelentkezéshez.';
    messageType.value = 'error';
    return; // Kilépés, ha hiányosak az adatok
  }

  try {
    // API hívás a backend '/api/auth/login' végpontjára
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ // Email és jelszó küldése
        email: formData.email,
        password: formData.password,
      }),
    });

    const data = await response.json(); // Válasz feldolgozása

    if (!response.ok) { // Sikertelen HTTP státusz esetén hiba dobása
      throw new Error(data.message || `HTTP hiba! Státusz: ${response.status}`);
    }

    // Sikeres bejelentkezés
    // message.value = data.message || 'Sikeres bejelentkezés!'; // Ezt az üzenetet az átirányítás miatt a felhasználó valószínűleg nem látja
    // messageType.value = 'success';

    if (data.token && data.user) { // Ellenőrizzük, hogy a válasz tartalmazza a szükséges adatokat (token, felhasználói adatok)
      // Az authentikációs store (Pinia) frissítése a kapott adatokkal
      authStore.setToken(data.token); // Token mentése (valószínűleg localStorage-ba/sessionStorage-ba is a store által)
      authStore.setUser(data.user);   // Felhasználói adatok mentése

      // Sikeres bejelentkezés után átirányítás az alkalmazás főoldalára (pl. a játék kezdőképernyőjére)
      // A '/' útvonal általában a gyökér (főoldal), de ez a router beállításaitól függ
      router.push('/'); // Módosítsd ezt a cél útvonalra, ha szükséges (pl. '/jatek', '/profil')
    } else {
      // Ez az eset nem lenne szabad, hogy előforduljon, ha a backend helyesen küldi az adatokat sikeres bejelentkezéskor
      throw new Error('A bejelentkezési válasz nem tartalmazott tokent vagy felhasználói adatokat.');
    }

  } catch (error) { // Hibakezelés
    console.error('Bejelentkezés sikertelen:', error); // Hiba logolása
    // Hiba esetén érdemes lehet az authStore-t tiszta állapotba hozni (logout)
    // authStore.logout(); // Ezt kikommentelheted, ha szükséges
    message.value = error.message || 'Bejelentkezés sikertelen. Érvénytelen email vagy jelszó.';
    messageType.value = 'error';
  }
};
</script>

<style scoped>
/* A teljes bejelentkezési oldal konténerének stílusai */
.login-page {
  display: flex; /* Flexbox használata a középre igazításhoz */
  flex-direction: column; /* Elemek függőlegesen egymás alá rendezése */
  justify-content: center; /* Függőleges középre igazítás */
  align-items: center; /* Vízszintes középre igazítás */
  min-height: calc(100vh - 60px - 51px); /* Teljes magasság mínusz a feltételezett fejléc és lábléc magassága, hogy a tartalom középen legyen a látható területen */
  padding: 20px; /* Belső margó minden oldalon */
  box-sizing: border-box; /* A padding és border beleszámít a teljes méretbe */
  /* A háttérszín a globális stílusokból (var(--color-bg)) jön, ha van ilyen beállítva */
}

/* Az űrlapot tartalmazó "kártya" stílusai */
.form-container {
  background-color: var(--color-card-bg); /* Háttérszín CSS változóból (téma alapján) */
  padding: 30px 40px; /* Belső margó */
  border-radius: 25px; /* Lekerekített sarkok, összhangban a .question-card-dal */
  box-shadow: 0 10px 20px var(--color-card-shadow), 0 0 0 5px rgba(255,255,255,0.3); /* Árnyék, összhangban a .question-card-dal */
  border: 3px solid var(--color-text-question); /* Keret, összhangban a .question-card-dal */
  width: 100%; /* Teljes szélesség a szülőhöz képest */
  max-width: 480px; /* Maximális szélesség, hogy ne legyen túl nyújtott nagy képernyőn */
  text-align: center; /* Szöveg középre igazítása a konténeren belül */
}

/* Címsor (h1) stílusai */
h1 {
  margin-bottom: 25px; /* Térköz a címsor alatt */
  color: var(--color-text-level); /* Szövegszín CSS változóból (téma alapján) */
  font-size: 2.2em; /* Betűméret */
  font-weight: bold; /* Félkövér betűstílus */
  text-shadow: 1px 1px 0px #fff, 2px 2px 0px rgba(0,0,0,0.05); /* Szövegárnyék a jobb olvashatóságért és dizájnhoz */
}

/* Az űrlapcsoportok (label + input) közös stílusai */
.form-group {
  margin-bottom: 20px; /* Térköz az űrlapcsoportok között */
  text-align: left; /* Szöveg balra igazítása a címkékhez és inputokhoz */
}

/* Címkék (label) stílusai */
.form-group label {
  display: block; /* A címke teljes sort elfoglal */
  margin-bottom: 8px; /* Térköz a címke és az input mező között */
  font-weight: bold; /* Félkövér betűstílus */
  color: var(--color-text-primary); /* Szövegszín CSS változóból */
}

/* Input mezők (text, email, password) stílusai */
.form-group input[type="text"],
.form-group input[type="email"],
.form-group input[type="password"] {
  width: 100%; /* Teljes szélesség a .form-group-on belül */
  padding: 12px 15px; /* Belső margó, összhangban a játék input stílusával */
  border: 3px solid var(--color-input-border); /* Keret, összhangban a játék input stílusával */
  border-radius: 15px; /* Lekerekített sarkok, összhangban a játék input stílusával */
  box-sizing: border-box; /* A padding és border beleszámít a teljes méretbe */
  font-size: 1.1em; /* Betűméret */
  color: var(--color-text-primary); /* Szövegszín */
  font-family: var(--font-family-primary); /* Betűtípus CSS változóból */
  transition: border-color 0.3s ease, box-shadow 0.3s ease; /* Finom átmenet fókusz esetén */
}

/* Input mezők fókusz állapotának stílusai */
.form-group input[type="text"]:focus,
.form-group input[type="email"]:focus,
.form-group input[type="password"]:focus {
  border-color: var(--color-input-focus-border); /* Keretszín fókuszban CSS változóból */
  box-shadow: 0 0 10px rgba(0, 119, 204, 0.2); /* Finom árnyék fókuszban */
  outline: none; /* Alapértelmezett böngésző outline eltávolítása */
}

/* Általános gombstílusok (submit és toggle gombokra) */
button.submit-btn, button.toggle-mode-btn {
  font-family: var(--font-family-primary); /* Betűtípus */
  padding: 12px 25px; /* Belső margó */
  font-size: 1.2em; /* Betűméret */
  font-weight: bold; /* Félkövér */
  color: var(--color-button-text); /* Szövegszín CSS változóból (általában fehér) */
  border: none; /* Nincs keret */
  border-radius: 30px; /* Erősen lekerekített, "pill" alakú gombok */
  transition: background-color 0.3s ease, transform 0.15s ease; /* Átmenetek hover és active állapothoz */
  margin-top: 10px; /* Térköz a gomb felett */
  letter-spacing: 0.5px; /* Betűköz */
  box-shadow: 0 4px 6px rgba(0,0,0,0.15); /* Finom árnyék */
  text-transform: uppercase; /* Nagybetűs szöveg */
  cursor: pointer; /* Kurzor megváltoztatása kattinthatóság jelzésére */
}

/* Gombok hover (egér fölé) és active (kattintás) állapotának stílusai, kivéve ha le vannak tiltva */
button.submit-btn:hover:not(:disabled), button.toggle-mode-btn:hover:not(:disabled) {
  transform: translateY(-2px) scale(1.02); /* Kis kiemelkedés és nagyítás */
  box-shadow: 0 6px 10px rgba(0,0,0,0.2); /* Erősebb árnyék */
}
button.submit-btn:active:not(:disabled), button.toggle-mode-btn:active:not(:disabled) {
  transform: translateY(1px) scale(0.98); /* Kis benyomódás */
}

/* Küldés (submit) gomb specifikus stílusai */
.submit-btn {
  width: 100%; /* Teljes szélességű gomb */
  background-color: var(--color-button-primary-bg); /* Elsődleges gomb háttérszín (pl. zöld) CSS változóból */
}
.submit-btn:hover:not(:disabled) {
  background-color: var(--color-button-primary-hover-bg); /* Háttérszín hover állapotban */
}

/* Módváltó (toggle) gomb specifikus stílusai */
.toggle-mode-btn {
  margin-top: 20px; /* Nagyobb térköz felette */
  background-color: transparent; /* Átlátszó háttér, másodlagos gombként funkcionál */
  color: var(--color-text-link, #007bff) !important; /* Linkhez hasonló szövegszín CSS változóból (fontos, hogy felülírja az általános gomb szövegszínt) */
  box-shadow: none; /* Nincs árnyék */
  font-size: 0.95em; /* Kicsit kisebb betűméret */
  text-transform: none; /* Normál (nem nagybetűs) szöveg */
}
.toggle-mode-btn:hover:not(:disabled) {
  background-color: transparent; /* Háttér maradjon átlátszó */
  color: var(--color-input-focus-border); /* Szín hover állapotban (pl. sötétebb kék) */
  text-decoration: underline; /* Aláhúzás hover állapotban */
  transform: none; /* Nincs hover transzformáció (méretváltozás, elmozdulás) */
  box-shadow: none; /* Nincs árnyék hover állapotban sem */
}

/* Visszajelző üzenetek stílusai */
.message-display { /* Közös stílus az üzeneteknek */
  margin-top: 15px; /* Térköz felette */
  padding: 12px; /* Belső margó */
  border-radius: 15px; /* Lekerekített sarkok */
  font-weight: bold; /* Félkövér szöveg */
  border: 2px solid transparent; /* Alapértelmezett átlátszó keret */
}
/* Hibaüzenet specifikus stílusa */
.message-display.error-message {
  color: var(--color-feedback-error-text); /* Hiba szövegszín CSS változóból */
  background-color: var(--color-feedback-error-bg); /* Hiba háttérszín CSS változóból */
  border-color: var(--color-feedback-error-text); /* Hiba keretszín CSS változóból */
}
/* Sikerüzenet specifikus stílusa */
.message-display.success-message {
  color: var(--color-feedback-success-text); /* Siker szövegszín CSS változóból */
  background-color: var(--color-feedback-success-bg); /* Siker háttérszín CSS változóból */
  border-color: var(--color-feedback-success-text); /* Siker keretszín CSS változóból */
}
/* A sablonban az üzenet megjelenítését így kell használni a fenti stílusokkal:
   <p v-if="message" class="message-display" :class="messageType === 'error' ? 'error-message' : 'success-message'">
     {{ message }}
   </p>
*/
</style>