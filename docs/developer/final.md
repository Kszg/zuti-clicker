# Fejlesztői dokumentáció – Zuti Clicker

## Projektstruktúra

A projekt két önálló alkalmazásból áll, amelyek egy közös repository gyökér alatt helyezkednek el:

```
zuti-clicker/
--> api/
--> frontend/
--> docs/
```

---

## Előfeltételek

| Eszköz | Verzió |
|---|---|
| Node.js | ≥ 20.19 |
| pnpm | ≥ 10 |
| MariaDB | ≥ 10.6 |

---

## API szerver

### Beállítás

```bash
cd api
cp .env.example .env   # ha van példafájl, különben hozd létre manuálisan
pnpm install
```

A `.env` fájl kötelező mezői:

```env
IP=localhost
PORT=2710

DATABASE_URL="mysql://felhasználó:jelszó@host:3306/zutiClicker"
SHADOW_DATABASE_URL="mysql://felhasználó:jelszó@host:3306/zutiClickerShadow"
DATABASE_USER=felhasználó
DATABASE_PASSWORD=jelszó
DATABASE_NAME=zutiClicker
DATABASE_HOST=host
DATABASE_PORT=3306

CRYPTO_SECRET_KEY=<min. 64 karakteres véletlen string>
```

A shadow adatbázis a Prisma migrációk validálásához szükséges; ugyanazon a szerveren kell lennie, de üres adatbázisként.

### Adatbázis migráció

```bash
pnpm prisma migrate deploy   # meglévő migrációk futtatása
pnpm prisma generate         # Prisma client újragenerálása (sémaváltozás után)
```

### Indítás

```bash
pnpm start    # nodemon + tsx – fejlesztői mód, automatikus újraindítás
```

Az API elérhető: `http://localhost:2710`  
Swagger docs: `http://localhost:2710/docs`

### Tesztek futtatása

A tesztekhez az API-nak futnia kell (a tesztek élő szerver ellen dolgoznak):

```bash
pnpm test
```

A tesztek a `tests/` mappában találhatók. Az összes teszt a `TestData` osztályból veszi az adatokat (`tests/test-data.ts`); a belépési adatokat minden futtatás véletlenszerűen generálja, a mentési payloadok hardkódoltak.

Mivel a tesztek élő szerver ellen, valós adatbázisban hoznak létre `test_<random>@example.com` felhasználókat, ezek takarítására szolgál a `pnpm cleanup:test-users` script (`scripts/cleanup-test-users.ts`). Alapértelmezetten csak szimulál (dry run) és kiírja, mit törölne; a tényleges törléshez `--apply` kapcsoló szükséges: `pnpm cleanup:test-users --apply`. A script szigorú, `generateUser()` mintázatához illeszkedő reguláris kifejezéssel dönti el, mely sorokat érinti — az SQL-szűrés csak egy durva előszűrés, sosem a végső hatóság.

---

## Frontend

### Beállítás

```bash
cd frontend
pnpm install
```

### Indítás

```bash
pnpm dev # Vite dev szerver, Hot Module Replacement
```

A frontend elérhető: `http://localhost:5173`

A Vite dev szerver proxy-n keresztül kapcsolódik az API-hoz: minden `/api/*` kérés automatikusan `http://localhost:2710/*` -ra irányítódik. Az API-nak futnia kell a frontend megfelelő működéséhez.

### Build

```bash
pnpm build # type-check + bundle
pnpm preview # a build előnézete lokálisan
```

### Tesztek futtatása

A frontend a Vitest keretrendszert használja, valós szerver vagy adatbázis nélkül:

```bash
pnpm test          # egyszeri futtatás
pnpm test:watch    # watch mód fejlesztéshez
pnpm test:coverage # lefedettségi riport
```

A tesztek a `src/**/__tests__/*.spec.ts` minta alatt találhatók, a forrásfájlok mellett (pl. `src/utils/__tests__/prestige.spec.ts`).

---

## Architektúra áttekintő

### API rétegek

```
router/ → controllers/ → database/models/ → Prisma → MariaDB
              ↑
         middlewares/  (isAuthenticated)
```

- **`router/`** – Express route regisztráció (`authentication.ts`, `save.ts`, `settings.ts`)
- **`controllers/`** – Request/response kezelés, validáció, Swagger JSDoc
- **`database/models/`** – Adatbázis műveletek (Prisma hívások)
- **`middlewares/`** – `isAuthenticated`: session token ellenőrzés, `req.identity` feltöltése
- **`helpers/`** – HMAC-SHA256 hitelesítés, random token generálás
- **`constants/responses.ts`** – Centralizált HTTP válaszkódok és üzenetek
- **`constants/settings.ts`** – A `UserSettings` mezők megengedett értékei (téma, nyelv, autosave-intervallum, fokozatszerzés-ünneplés) és alapértékei — a `config/swagger.ts` és a `controllers/settings.ts` egyaránt ebből importál, hogy ne csúszhassanak szét

#### Végpontok

| Metódus | Útvonal | Hitelesítés | Leírás |
|---|---|---|---|
| `POST` | `/auth/register`, `/auth/login`, `/auth/logout` | – / kötelező | Regisztráció, bejelentkezés, kijelentkezés |
| `GET` | `/auth/me` | kötelező | Bejelentkezett felhasználó adatai |
| `GET`, `PUT`, `DELETE` | `/save` | kötelező | Játékmentés betöltése, felülírása (részlegesen: a prestige mezők opcionálisak), törlése |
| `GET`, `PUT` | `/settings` | kötelező | Felhasználói beállítások betöltése (alapértékek, ha még nincs mentve) és részleges frissítése |

A `PUT /save` öt prestige-mezője (`phdCount`, `prestigeCount`, `runTokensEarned`, `runClicks`, `runSeconds`) **opcionális**: egy régebbi kliens, amely nem ismeri ezeket, biztonságosan tud menteni — a hiányzó mezőket a szerver a már tárolt értéken hagyja (nem nullázza), első mentésnél pedig az életút-mezőkből tölti fel őket.

### Frontend state management

```
App.vue
  ├── useGameLoop()          → gameStore.tick() 20x/s
  ├── usePrestige()          → gameStore.prestige() -> ceremónia/szinkron
  ├── authStore              → session check, login/register/logout
  ├── settingsStore          → téma, nyelv, autosave, ceremónia — localStorage + szerver szinkron
  ├── saveStore               → load/sync/reset (autosave-időzítő a settingsStore-ból olvas)
  ├── uiStore                → modál állapotok
  └── gameStore              → tokenek, egységek, statisztikák, prestige állapot
```

A `saveStore` a `authStore`-tól és a `settingsStore`-tól függ: az autosave-időzítő automatikusan elindul/leáll, amikor `isLoggedIn`, `autosaveEnabled` vagy `autosaveIntervalSecs` megváltozik. A `settingsStore` sosem importálja a `saveStore`-t (a függőségi irány mindig `settings → save`, nem fordítva), hogy elkerülje a körkörös importot.

---

## Új egység hozzáadása

1. Szerkeszd a `frontend/src/utils/gameConstants.ts` fájlt, adj hozzá egy új elemet a `UNIT_DEFINITIONS` tömbhöz:

```typescript
{ id: "iota", baseCost: 5_000_000_000, baseProduction: 150_000, costGrowth: 1.15 }
```

2. Adj hozzá fordítási kulcsokat mindkét i18n fájlhoz (`src/i18n/en.ts`, `hu.ts`):

```typescript
names: { ..., iota: "Iota" },
descriptions: { ..., iota: "Leírás..." }
```

Az egység azonnal megjelenik a shopban (a láthatóság automatikusan számított: `totalTokensEarned >= baseCost * 0.1`).

---

## Új API endpoint hozzáadása

1. Hozd létre a controller függvényt `src/controllers/` mappában (Swagger JSDoc kommenttel együtt).
2. Regisztráld a route-ot a megfelelő `src/router/*.ts` fájlban.
3. Ha szükséges, adj hozzá új válaszkódokat a `src/constants/responses.ts`-be.
4. Ha az endpoint új adatbázis-mezőt vagy táblát igényel: bővítsd a `prisma/schema.prisma`-t, majd `pnpm prisma migrate dev --create-only` paranccsal generálj vázlat-migrációt, formázd át a repo meglévő migrációinak stílusára (lásd pl. `20260912120000_add_prestige_fields`), és futtasd le. Additív változtatásnál (`NOT NULL DEFAULT ...`) a már futó, régebbi kliens nem törik el.
5. Bővítsd a `config/swagger.ts` sémáit, ha a request/response alak változott.
6. Írj teszteket a `tests/` mappában — ha a mező opcionális egy régebbi kliens kompatibilitása miatt, tesztelj mindkét irányban (jelen van / hiányzik).

---

## Prestige egyensúly (balance) állandók módosítása

A PhD-formula és a szorzók egyetlen helyen, a `frontend/src/utils/gameConstants.ts` fájlban vannak (`PHD_TOKEN_SCALE`, `PHD_PRODUCTION_BONUS`, `PHD_COST_REDUCTION`, `PHD_COST_REDUCTION_CAP`); a képletek maguk a `frontend/src/utils/prestige.ts`-ben. Egy balance-módosítás után futtasd le a `frontend/src/utils/__tests__/prestige.spec.ts` és `costCalculator.spec.ts` teszteket — ezek konkrét, számított határértékeket ellenőriznek, amik a konstansok módosításával változni fognak.

---

## CI/CD

Két GitHub Actions workflow fut a self-hosted runneren (`vbServer`, bare metal, Docker konténerezés nélkül):

### `ci.yml` – tesztek PR-en

Minden `main`-re nyíló pull request-en lefut, három egymástól független jobban (egyetlen runner miatt sorban futnak, de a State külön látszik):

| Job | Mit ellenőriz |
|---|---|
| `typecheck` | `api`: `tsc --noEmit` · `frontend`: `vue-tsc --build` |
| `frontend-tests` | Vitest (`src/**/__tests__/*.spec.ts`), szerver/adatbázis nélkül |
| `api-tests` | Jest, éles szerver a `:2710` porton egy dedikált `zutiClickerTest` adatbázis ellen |

Az `api-tests` job egy futtatáshoz kötött, runner-lokális `.env` fájlt vár `/mnt/raid1/zuti-clicker-ci/.env.ci` alatt (sosem GitHub secret) — ez tartalmazza a `zutiClickerTest` / `zutiClickerTestShadow` adatbázisok elérését és egy eldobható `CRYPTO_SECRET_KEY`-t. A teszt lefutása után a job a `cleanup:test-users --apply` scriptet futtatja, hogy a `test_<random>@example.com` felhasználók ne halmozódjanak.

Mindhárom job feltölt egy `junit-<stage>` artifactot; egy negyedik (`reports`) job ezekből generálja a `.github/scripts/junit-report.mjs` scripttel a `report.html`, `report.ods` (valódi OpenDocument táblázat, Summary + Tests munkalapokkal) és `summary.md`/`summary.json` fájlokat, `test-reports` artifactként. Az ötödik (`summary`) job publikálja az eredményt:

- a futás GitHub Actions job summary-jába,
- egy "sticky" PR-kommentbe (pusholásonként frissül, nem szaporodik),
- inline check-run annotációkba a hibás teszteknél.

### `deploy.yml` – build, release, deploy

Minden `main`-re kerülő push-on lefut (branch protection miatt ez mindig egy már CI-tesztelt, mergelt PR):

1. **version** — beolvassa és összeveti az `api/package.json` és `frontend/package.json` verzióját (a kettőnek meg kell egyeznie — lásd a repo-konvenciót a kézzel duplikált értékekről), és megnézi, létezik-e már `v<version>` tag.
2. **build-push** — megépíti és pusholja mindkét image-et a GitHub Container Registry-be (`ghcr.io/vb2007/zuti-clicker-api`, `ghcr.io/vb2007/zuti-clicker-frontend`), mindig `sha-<rövid_sha>` és `latest` taggel, új verzió esetén a puszta `<version>` taggel is.
3. **release** (csak ha a verzió új) — létrehozza a `v<version>` taget és egy GitHub release-t automatikusan generált jegyzetekkel, kiegészítve image digest-ekkel és a mergelt PR CI-futásának teszteredményeivel. Csatolt fájlok: a verzióra rögzített `docker-compose.prod.yml`, egy `images.json` digest-lista, a frontend build tartalma (`.tar.gz`), és a teszt-riport csomag.
4. **deploy** — csak a `docker-compose.prod.yml`-t szinkronizálja a `/mnt/raid1/zuti-clicker` telepítési könyvtárba (a már ott lévő `.env`-hez soha nem nyúl), lehúzza a sha-hoz rögzített image-eket, és újraindítja a stacket a meglévő healthcheckek megvárásával.

**Migráció**: a deploy workflow **sosem** futtat `prisma migrate deploy`-t — ez továbbra is kézi, a deploy előtti lépés marad (lásd fent, "Adatbázis migráció").

**Verziózás**: egy funkció leszállításakor mindkét `package.json`-ban (api + frontend) egyszerre kell emelni a `version` mezőt — ez a release-mechanizmus egyetlen forrása.

**Visszaállás egy korábbi verzióra:**

```bash
cd /mnt/raid1/zuti-clicker
IMAGE_TAG=sha-<korábbi_rövid_sha> docker compose -f docker-compose.prod.yml up -d
```

---

## Fontos tudnivalók fejlesztőknek

- A projekt `"type": "module"` (ESM). CommonJS `require()` nem működik; minden import ESM `import` szintaxist használ.
- A lodash CJS named import (`import { merge } from "lodash"`) az ESM miatt hibát okoz; kerüld a használatát.
- A Prisma client a `generated/prisma/` mappában van, nem a szokásos `node_modules/@prisma/client` helyen. A `pnpm prisma generate` futtatása után commitolni kell a generált fájlokat is.
- A `CORS_ORIGIN_URLS` environment változó nincs beállítva a `.env`-ben; fejlesztési módban a Vite proxy kezeli a cross-origin kéréseket, így CORS konfiguráció nem szükséges.
- A session tokenek az `Authentication.sessionToken` mezőben tárolódnak. Kijelentkezéskor ez üres stringre áll vissza, nem törlődik a rekord.
```
