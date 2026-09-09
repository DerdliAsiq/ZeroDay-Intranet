# ZeroDay Intranet

Öğrenci kulübü intraneti: tapşırıqlar, təhvil/qimətləndirmə, dərs cədvəli və admin paneli.
Tek servis (Express + statik frontend), Postgres, email+şifrə girişi.

## Stack

- Frontend: React 19 + Vite 7 + Tailwind 4 + shadcn/ui + tRPC + React Query
- Backend: Express 4 + tRPC 11 + Drizzle ORM + Postgres (`pg`)
- Auth: email+şifrə (`bcryptjs`), JWT cookie (`jose`)
- Deploy: Render (tek Web Service + managed Postgres, `render.yaml`)

## Kurulum

```bash
pnpm install
cp .env.example .env   # DATABASE_URL, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD doldur
pnpm db:migrate        # tabloları kur
pnpm dev               # http://localhost:3000
```

## Komutlar

| Komut            | Açıklama                              |
| ---------------- | ------------------------------------- |
| `pnpm dev`       | Vite + Express geliştirme sunucusu    |
| `pnpm build`     | Prod build (`dist/public` + `dist`)   |
| `pnpm start`     | Prod sunucu (`node dist/index.js`)    |
| `pnpm check`     | TypeScript kontrolü                   |
| `pnpm test`      | Vitest                                |
| `pnpm db:generate` | Schema'dan migration üret           |
| `pnpm db:migrate`  | Migration'ları çalıştır             |

## Ortam değişkenleri

| Değişken         | Açıklama                                        |
| ---------------- | ----------------------------------------------- |
| `DATABASE_URL`   | Postgres connection string                      |
| `JWT_SECRET`     | Session imzalama anahtarı (uzun, rastgele)      |
| `ADMIN_EMAIL`    | İlk admin hesabı (boot'ta seed'lenir)           |
| `ADMIN_PASSWORD` | İlk admin şifresi                               |
| `PORT`           | Sunucu portu (Render otomatik verir)            |
| `NODE_ENV`       | `production` (Render) / `development` (local)   |

## Roller ve akış

- **Admin:** hər şey + kullanıcı ekler/siler, şifre belirler/sıfırlar.
- **Mentor:** tapşırıq ve dərs yaradır, arxivləyir, bərpa edir, silir; təhvilləri qəbul/geri qaytarır, 10 üzerinden qiymət verir, təhvil dosyasını endirir. Kullanıcı yönetimi yapamaz.
- **Tələbə:** tapşırıqlara baxır, fayl (max 1 MB, DB'de saklanır) ilə təhvil verir, şifrəsini dəyişir, qiymətini görür.

Tapşırıq yaradarkən icazəli fayl tipləri seçilir (default: pdf, docx, zip, txt, md, png, jpg); `.exe` türevleri her durumda yasaktır. Qiymət verilən təhvilin dosya içeriği DB'den otomatik silinir (yer açılır).

## Güvenlik

- Parola politikası: min 10 karakter + küçük/büyük harf + rakam + özel karakter (`@#$%&`).
- Session JWT ömrü 7 gün; parola değişince tüm oturumlar iptal olur (`sessionVersion`).
- Login rate-limit: IP + email bazında 10 dakikada 10 deneme (sonrası 429).
- Güvenlik başlıkları: HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`; `x-powered-by` kapalı; cookie `SameSite=Lax`.
- `/api/ready`: DB bağlantısını kontrol eden readiness probu (DB yoksa 503).

## Render deploy

1. Dashboard → New → Blueprint → bu repo (`render.yaml` web + postgres kurar).
2. `ADMIN_EMAIL` / `ADMIN_PASSWORD` gir (`JWT_SECRET` otomatik, `DATABASE_URL` DB'den bağlanır).
3. Start komutu migration'ı otomatik çalıştırır (`pnpm db:migrate && node dist/index.js`).
4. `/api/health` → `{"ok":true}` ile doğrula, log'da `[Seed] admin ready` satırını gör.

Manuel kurulumda (Blueprint'siz) DB'yi bir kez hazırla: `DATABASE_URL=... pnpm db:migrate`.
