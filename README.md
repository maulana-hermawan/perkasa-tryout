# TryoutKu

Platform tryout online **mobile-first** untuk SKD CPNS, TOEFL, Psikotes, dan tes umum.
Dibangun dengan Next.js (App Router), TypeScript, Tailwind CSS v4, shadcn/ui, Zustand, dan KaTeX.

> Status: **Fondasi (Tahap 1)** — setup, domain model, mock backend, i18n, tema, auth, layout
> mobile-first, dan katalog tryout + seed data. Fitur ruang ujian, editor soal, sesi live, dan
> panel admin lengkap menyusul (lihat [Roadmap](#roadmap)).

---

## Menjalankan

```bash
npm install
npm run dev        # http://localhost:3000
```

| Script              | Fungsi                                                       |
| ------------------- | ------------------------------------------------------------ |
| `npm run dev`       | Dev server (Turbopack)                                        |
| `npm run build`     | Build produksi                                                |
| `npm run start`     | Menjalankan build produksi                                    |
| `npm run lint`      | ESLint (termasuk React Compiler rules)                        |
| `npm run typecheck` | `tsc --noEmit`                                                |
| `npm run test`      | Vitest — scoring, seed, repository, dan render test           |
| `npm run seed:audio`| Menggenerate ulang audio listening contoh (`public/audio`)     |

### Akun demo

| Peran                | Email                    | Password       |
| -------------------- | ------------------------ | -------------- |
| Admin                | `admin@tryoutku.id`      | `admin123`     |
| Pengajar / Host      | `pengajar@tryoutku.id`   | `pengajar123`  |
| Peserta              | `peserta@tryoutku.id`    | `peserta123`   |

Tombol akun demo tersedia langsung di halaman login. Seluruh data tersimpan di browser
(localStorage) — tidak ada server/backend sungguhan.

---

## Arsitektur

```
src/
├── app/                          # App Router
│   ├── layout.tsx                # <html>, bootstrap locale, provider
│   ├── page.tsx                  # Landing
│   ├── (auth)/                   # login, register
│   ├── (app)/                    # area peserta (butuh login)
│   │   ├── dashboard/            # katalog + tab saya/riwayat/gabung
│   │   ├── tryout/[id]/          # detail paket + checkout
│   │   └── profil/
│   └── admin/                    # panel admin (sidebar → drawer di mobile)
├── components/
│   ├── ui/                       # shadcn/ui primitives (button, sheet, dialog, …)
│   ├── common/                   # brand, toggles, guard, rich content (KaTeX)
│   ├── layout/                   # app header, bottom nav, admin shell, tabs
│   ├── catalog/                  # kartu paket, filter chips, grid
│   └── checkout/                 # sheet pembayaran manual
├── lib/
│   ├── i18n/                     # provider + kamus id.json / en.json
│   ├── repositories/             # lapisan data (kontrak + implementasi lokal)
│   ├── scoring/                  # registry penilai per tipe soal (+ unit test)
│   ├── seed/                     # data dummy realistis
│   ├── store/                    # Zustand (db mock + auth session)
│   ├── hooks/                    # turunan state (akses paket, dsb.)
│   ├── format.ts                 # Rupiah, tanggal, persen (Intl)
│   ├── sanitize.ts               # sanitizer HTML allow-list (SSR-safe)
│   └── utils.ts                  # cn, rng, format durasi, dll.
└── types/                        # model domain TypeScript
```

### 1. Lapisan data (repository)

UI **tidak pernah** menyentuh store secara langsung untuk mutasi. Semua akses lewat
`dataSource` (`src/lib/repositories`), yang merupakan kumpulan antarmuka
(`UserRepository`, `QuestionRepository`, `PackageRepository`, …) dengan implementasi
`localDataSource` berbasis Zustand + localStorage.

```ts
import { dataSource } from "@/lib/repositories";

const packages = await dataSource.packages.listByFilter({ pricingModel: "freemium" });
const invoice = await dataSource.payments.createInvoice({ userId, packageId, amount, methodId });
```

Untuk pindah ke Supabase/Firebase cukup menulis implementasi baru yang memenuhi
`DataSource` dan mengganti satu baris di `src/lib/repositories/index.ts`. Tidak ada
perubahan pada komponen/pages.

### 2. State

- `useDbStore` — "database" mock (Zustand + `persist`, di-hydrate manual melalui
  `<AppBootstrap />` supaya render server & klien identik).
- `useAuthStore` — sesi (hanya `userId` yang dipersist), di-restore setelah db siap.
- Tema — `next-themes` (`class`, default `system`).
- Bahasa — context sendiri + cookie `tryoutku_locale` (dibaca server) dan
  `localStorage` (dibaca klien).

Render data selalu menunggu flag `hydrated`, sehingga tidak ada hydration mismatch;
selama menunggu ditampilkan skeleton.

### 3. i18n

- Kamus: `src/lib/i18n/dictionaries/id.json` (sumber kebenaran) dan `en.json`.
- `useI18n()` → `{ t(key, vars), tx(content), locale, setLocale }`.
- Deteksi awal: timezone `Asia/Jakarta|Makassar|Jayapura` atau `navigator.language`
  berawalan `id` → Bahasa Indonesia, selain itu English. Pilihan disimpan dan
  dipakai pada kunjungan berikutnya lewat cookie.
- **Tidak ada teks UI yang di-hardcode** — semua melalui kamus.

### 4. Model domain (`src/types`)

`TestType → Subtest → Question (discriminated union) → Package (Tryout) → Session`,
plus `Attempt`, `Payment`, `Voucher`, `User`, `AppSettings`, `ActivityLog`.

Setiap tipe soal memiliki bentuk datanya sendiri:

```
multiple-choice · multiple-answer · weighted-choice · fill-blank · essay ·
true-false · matching · listening · ordering · image-choice · likert · group ·
kecermatan-karakter · kecermatan-kraepelin · kecermatan-perbandingan
```

### 5. Mesin ujian (`src/lib/exam`)

```
service.ts        startAttempt · loadExamContext · saveAnswers · submitAttempt · gradeAttempt
generators.ts     generator soal runtime (Tes Kecermatan), deterministik per attempt
use-exam-engine.ts  hook ruang ujian: fase, timer, autosave, navigasi, auto-submit
answer-format.ts  ringkasan jawaban ("jawaban Anda" vs "kunci jawaban")
```

- **Timer per subtes.** Subtes punya `durationMinutes` sendiri; bila kosong, durasi
  paket dibagi proporsional terhadap jumlah soal (mis. TOEFL: listening > structure).
  Sisa waktu dihitung dari `subtestProgress.startedAt`, sehingga **refresh atau
  keluar aplikasi tidak menghentikan waktu** — resume diteruskan dari posisi semula.
- **Autosave.** Setiap perubahan jawaban masuk ke antrean `dirty` dan dikirim 700 ms
  kemudian; `flush()` dipanggil sebelum pindah subtes, submit, dan unmount.
- **Navigasi.** `QuestionPalette` (bottom sheet) menampilkan statusAnswered /
  belum / ragu-ragu / sedang dibuka; tombol ragu-ragu menyimpan flag `marked`.
- **Auto-submit.** Saat waktu subtes habis → subtes ditutup, lalu lanjut ke intro
  subtes berikutnya; di subtes terakhir langsung dikumpulkan dan diarahkan ke
  `/hasil/[attemptId]?auto=1`.
- **Tes Kecermatan** (`KecermatanStage`) berjalan per **kolom**: baris kunci
  ditampilkan 5 detik untuk dihafal lalu disembunyikan, kolom berganti otomatis
  mengikuti sisa waktu (turunan dari clock, bukan state lokal, supaya aman di-refresh).
  Soal digenerate dari `GeneratorConfig` subtes (kolom × soal per kolom × detik per
  kolom), ditandai `attempt:<id>` dan disimpan agar bisa dinilai & ditinjau ulang.
- **Generator deterministik**: `createRng(hash(attemptId + subtestId))` — attempt yang
  sama selalu menghasilkan soal yang sama.

### 6. Scoring

`src/lib/scoring` memisahkan penilaian per tipe soal melalui **registry** — menambah
tipe soal baru = menambah satu entri `scorers`.

```ts
scoreQuestion(question, answer, rules)  // → { points, maxPoints, correct, detail }
scoreSubtest({ subtest, questions, answers, conversionTable })
scoreAttempt({ subtests, questions, questionOrder, answers, … })
```

Termasuk: penalti jawaban salah (minus), skor parsial, bobot 1–5 (TKP/personality),
toleransi numerik & regex untuk isian, keyword otomatis untuk esai, reverse scoring
Likert, tabel konversi TOEFL (dengan proyeksi raw → panjang section penuh), serta
passing grade yang diskalakan proporsional terhadap jumlah soal paket.

### 7. Alur peserta

```
/                 landing
/login /register  auth (mock)
/dashboard        katalog + filter (kategori, harga, pencarian)
/tryout/[id]      detail paket → "Mulai sekarang" → startAttempt()
/ruang/[id]       ruang ujian (focus mode, tanpa bottom nav)
/hasil/[id]       skor, per subtes, persentil, ranking, gate pembahasan
/hasil/[id]/pembahasan   kunci jawaban + penjelasan per soal
/dashboard/saya · /riwayat · /gabung
```

---

## Seed data

| Paket                                     | Model harga | Subtes                                                     |
| ----------------------------------------- | ----------- | ---------------------------------------------------------- |
| Tryout SKD CPNS 2025 – Paket A            | Freemium    | TWK (10), TIU (10, ada rumus KaTeX), TKP (6 berbobot 1–5)   |
| TOEFL ITP Mini Test                       | Gratis      | Listening (3, audio 1x putar), Structure (5), Reading (4)   |
| Tes Kecermatan Lengkap (3 Varian)         | Freemium    | Karakter hilang, Kraepelin/Pauli, Perbandingan angka        |
| Tes Kepribadian Big Five                  | Gratis      | 12 item Likert → 5 dimensi (profil, bukan benar/salah)      |
| Tes Umum: Pengetahuan, Logika & Esai      | Berbayar    | Pengetahuan umum (7 tipe soal), Logika (minus 1), Esai (2)  |

Selain itu: 8 pengguna (admin/host/peserta/suspended), 6 kategori, 5 tipe tes,
15 subtes, 3 tabel konversi TOEFL, 3 sesi (live/terjadwal/self-paced), 4 attempt
(3 selesai beserta hasil + 1 berjalan), 5 pembayaran (approved/pending/rejected),
4 voucher, 8 log aktivitas, dan metode pembayaran (bank/e-wallet/QRIS).

Soal kecermatan **digenerate saat ujian dimulai** dari konfigurasi subtes
(jumlah kolom, soal per kolom, detik per kolom) — bukan soal statis di bank soal.
Kode join sesi live **6 digit angka (0–9)** agar mudah dibacakan dan diketik di
keypad ponsel: `generateJoinCode()` di `src/lib/utils.ts`, input difilter dengan
`digitsOnly()` + `inputMode="numeric"`.

---

## Pengujian

```bash
npm run test
```

- `src/lib/scoring/scoring.test.ts` — 27 pengujian penilaian per tipe soal, konversi,
  passing grade, agregasi dimensi, dan skoring attempt.
- `src/lib/seed/seed.test.ts` — integritas seed (referensi id valid, kunci jawaban ada,
  hasil attempt terhitung, skor TOEFL dalam rentang 310–677, profil Big Five lengkap).
- `src/lib/repositories/repositories.test.ts` — auth, filter/pencarian/penomoran soal,
  filter & sorting paket, invoice + unique code, voucher, sesi, attempt, log.
- `src/components/catalog/catalog.test.tsx` — render katalog (badge harga, CTA,
  format Rupiah, ganti bahasa) dan pipeline konten kaya: sanitizer + KaTeX.
- `src/lib/exam/exam.test.ts` — alur ujian menyeluruh: mulai attempt untuk semua
  paket, generator kecermatan deterministik, penyimpanan soal generate, pembagian
  durasi subtes, penilaian per subtes + passing grade + persentil/ranking, submit,
  dan status `awaiting-manual` untuk esai.
- `src/components/exam/question-input.test.tsx` — renderer setiap tipe soal
  (14 tipe) dan nilai `AnswerValue` yang dikembalikan ke engine.
- `src/lib/utils.test.ts` — kode join 6 digit (0–9), `digitsOnly`, hash, shuffle.

---

## Catatan implementasi

- **Cache Components** dimatikan (`next.config.ts`): seluruh data berada di browser,
  jadi belum ada data server untuk di-cache. Nyalakan kembali saat backend nyata hadir.
- `cacheComponents: false` membuat seluruh rute dirender secara dinamis — wajar untuk
  aplikasi yang bergantung pada state klien.
- Konten soal disimpan sebagai HTML yang sudah disanitasi dengan allow-list sebelum
  dirender (`src/lib/sanitize.ts`); rumus ditulis `<span data-math="inline">…</span>`
  dan di-render oleh KaTeX setelah mount.
- Audio listening contoh adalah nada sintetis (placeholder) — ganti
  `public/audio/toefl-listening-0*.wav` dengan rekaman asli bila perlu.

## Roadmap (tahap berikutnya)

1. ✅ **Ruang ujian** (`/ruang/[attemptId]`) — timer per subtes, autosave, grid nomor
   soal (bottom sheet), ragu-ragu, auto-submit, mode kecermatan per kolom, renderer
   untuk 14 tipe soal.
2. ✅ **Hasil & pembahasan** (`/hasil/[attemptId]`, `/hasil/[attemptId]/pembahasan`) —
   skor per subtes, passing grade, persentil, ranking nasional, profil kepribadian,
   pembahasan per soal dengan gate freemium ("Buka Pembahasan" lewat pembayaran).
3. **Sesi live** — lobby host, monitor progres peserta, leaderboard, kode join 6 digit.
4. **Editor soal** — Tiptap + MathLive (toolbar Word-like, sisip rumus, gambar, audio,
   tabel) dan CRUD bank soal / paket / subtes / tipe tes.
5. **Panel admin lengkap** — CRUD seluruh entitas, verifikasi pembayaran, penilaian
   esai manual, voucher, pengaturan, log aktivitas.
6. **Pembersihan soal generate** — `pruneGeneratedQuestions(attemptId)` sudah tersedia
   di `src/lib/exam/service.ts`; tinggal dipanggil dari jadwal/retensi admin.
