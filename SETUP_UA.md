# health. — як запустити (покроково)

Що в архіві:

- `app/` — сам застосунок (сайт). Кладеться на GitHub Pages → health.me20.studio
- `server/` — маленький сервер AI для режиму «AI від health.» (Cloudflare, безкоштовно)
- `gpt/` — текст для вашого GPT у ChatGPT (режим «Мій ChatGPT»)

Як це працює для людини: відкрила health.me20.studio → «Увійти через Google» → написала ім'я → обрала, хто читає аналізи. Усі дані лягають у папку **«health.»** на її Google Drive. Ви їх не бачите.

Порядок: **Крок 1 → 2 → 3** обов'язкові. Крок 4 — для режиму «AI від health.», крок 5 — для «Мій ChatGPT». Можна почати лише з одного з них.

---

## Крок 1. GitHub Pages (≈10 хв)

1. GitHub (акаунт fagenaiart-bit) → **New repository** → назва `health-app` → Public → Create.
2. **Add file → Upload files** → перетягніть **вміст** папки `app/` (не саму папку) → Commit.
3. Settings → **Pages** → Source: *Deploy from a branch* → Branch: `main` / `(root)` → Save.
4. Там же **Custom domain**: `health.me20.studio` → Save. Файл `CNAME` вже є в архіві.
5. Porkbun → me20.studio → DNS → додати запис: Type **CNAME**, Host **health**, Answer **fagenaiart-bit.github.io**. (Так само, як для exhale.)
6. Через 10–30 хв у Pages поставте галочку **Enforce HTTPS**.

Перевірка: https://health.me20.studio відкривається, кнопка «Подивитися демо» працює.

## Крок 2. Вхід через Google (≈15 хв)

1. https://console.cloud.google.com → вгорі **New project** → назва `health` → Create.
2. Меню → **APIs & Services → Library** → знайдіть **Google Drive API** → **Enable**.
3. **APIs & Services → OAuth consent screen** (може називатися *Google Auth Platform*):
   - User type: **External**
   - App name: `health.`, support email: ваш, logo — можна пізніше
   - Authorized domain: `me20.studio`
   - **Scopes / Data access** → Add: `.../auth/drive.file`, `openid`, `email`, `profile`
   - **Audience / Test users** → додайте email-и родичів (до 100 людей). Поки застосунок у режимі *Testing*, увійти можуть лише вони.
4. **Credentials → Create credentials → OAuth client ID** → тип **Web application**:
   - Authorized JavaScript origins: `https://health.me20.studio` (і для тесту `http://localhost:8765`)
   - Create → скопіюйте **Client ID** (закінчується на `.apps.googleusercontent.com`).
5. На GitHub відкрийте `config.js` → олівець ✏️ → вставте Client ID у `GOOGLE_CLIENT_ID` → Commit.

Чому `drive.file`: застосунок бачить **лише ті файли, які створив сам** (папку «health.» і документи, завантажені через нього). До решти Drive доступу немає. Це «безпечний» дозвіл, тож для продажу пізніше Google попросить тільки звичайну перевірку бренду, без платного аудиту.

Коли родичі входитимуть, Google покаже «Google hasn't verified this app» → **Continue**. Це нормально для режиму Testing.

## Крок 3. Перевірка

Увійдіть самі → у Google Drive має з'явитися папка **health.** з файлом `health-data.json`. Відкрийте застосунок на телефоні тим самим акаунтом — дані ті самі.

На iPhone: Safari → Поділитися → **На початковий екран**. На Android: Chrome → ⋮ → **Встановити застосунок**.

## Крок 4. Режим «AI від health.» (≈15 хв + ключ OpenAI)

**Ключ OpenAI:** https://platform.openai.com → Settings → **Billing** → поповніть на $5–10 → **API keys → Create new secret key** → скопіюйте (показується один раз).

Орієнтовна ціна: один PDF з аналізами — менше цента на моделі gpt-4.1-mini. Перевірте актуальні ціни на сторінці OpenAI Pricing.

**Сервер (Cloudflare, без програмування):**

1. https://dash.cloudflare.com → зареєструйтесь → **Workers & Pages → Create → Worker** → назва `health-ai` → Deploy.
2. **Edit code** → видаліть усе → вставте весь вміст `server/worker.js` → **Deploy**.
3. Worker → **Settings → Variables and Secrets** → Add:
   - `OPENAI_API_KEY` — тип **Secret**, ваш ключ
   - `GOOGLE_CLIENT_ID` — Client ID з кроку 2
   - `ALLOWED_ORIGIN` — `https://health.me20.studio`
   - `ALLOWED_EMAILS` — email-и через кому, кому дозволено (ваш + родичі). `*` = всім (тільки коли буде підписка!)
   - `OPENAI_MODEL` — `gpt-4.1-mini` (або новішу модель зі списку OpenAI)
4. Скопіюйте адресу воркера (`https://health-ai.<щось>.workers.dev`) → вставте в `config.js` → `AI_SERVER_URL` → Commit.

Перевірка: відкрийте адресу воркера в браузері — має бути `{"ok":true,...}`.

Важливо: файл проходить через сервер до OpenAI і **ніде не зберігається** (`store:false`, жодних баз даних). Але формально ви обробляєте медичні дані. Перед продажем — політика приватності й консультація юриста щодо GDPR. Для родичів за їхньою згодою цього достатньо (людина бачить пояснення і ставить галочку).

## Крок 5. Режим «Мій ChatGPT» (≈10 хв)

1. ChatGPT → **Explore GPTs → Create → Configure** → вставте все з `gpt/GPT_instructions.md`.
2. Save → **Anyone with the link** → скопіюйте посилання.
3. `config.js` → `GPT_URL` → Commit.

Як користується людина: «Додати документ» → обрала файл → застосунок зберіг його на Drive і відкрив вікно з кнопкою «Відкрити GPT» → у GPT завантажила той самий файл → скопіювала відповідь → вставила → перевірила галочки → «Зберегти». Через сервер health. нічого не проходить.

---

## Як застосунок береже дані

- Усе в одному файлі `health-data.json` на Drive людини + оригінали документів у тій самій папці.
- Копія в браузері — для швидкості й роботи без інтернету. Зміни без інтернету збережуться на Drive, щойно з'явиться мережа.
- Кілька пристроїв: зміни зливаються, нічого не перезаписується.
- Налаштування → «Завантажити копію (.json)» — додаткова резервна копія.
- Google-сесія живе ~1 годину. Після цього на головному екрані з'являється кнопка «Увійти знову» — один дотик.

## Що далі (етап 2 — підписка)

Stripe Payment Link → після оплати email потрапляє до списку дозволених на сервері (автоматично через Stripe webhook). Зробимо, коли родичі протестують.
