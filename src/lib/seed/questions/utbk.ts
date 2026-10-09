import type { Question } from "@/types";
import { m, mb, options, p, q, rich, ul } from "../helpers";

const CREATED = "2025-01-04T00:00:00.000Z";

/* ============================ PENALARAN UMUM ============================ */

const PU: Question[] = [
  q({
    id: "q-utbk-pu-01",
    type: "multiple-choice",
    testTypeId: "tt-utbk",
    subtestId: "st-utbk-pu",
    difficulty: "easy",
    topics: ["Silogisme"],
    tags: ["utbk", "penalaran", "silogisme"],
    prompt: rich(
      p("Semua mahasiswa penerima beasiswa wajib mempertahankan IPK 3,00.") +
        p("Sebagian mahasiswa penerima beasiswa mengikuti organisasi kampus.") +
        p("Kesimpulan yang <strong>pasti benar</strong> adalah …"),
    ),
    options: options([
      { key: "a", id: "Semua yang mengikuti organisasi kampus ber-IPK 3,00" },
      { key: "b", id: "Sebagian mahasiswa yang mengikuti organisasi kampus wajib mempertahankan IPK 3,00" },
      { key: "c", id: "Mahasiswa yang tidak berorganisasi kehilangan beasiswanya" },
      { key: "d", id: "Hanya mahasiswa ber-IPK 3,00 yang boleh berorganisasi" },
      { key: "e", id: "Tidak ada penerima beasiswa yang berorganisasi" },
    ]),
    correctOptionId: "b",
    explanation: rich(
      p(
        "Karena sebagian penerima beasiswa berorganisasi dan <em>semua</em> penerima beasiswa wajib menjaga IPK 3,00, maka sebagian anggota organisasi itu wajib menjaga IPK 3,00. Pilihan lain menambahkan informasi yang tidak pernah diklaim premis.",
      ),
    ),
  }),
  q({
    id: "q-utbk-pu-02",
    type: "multiple-choice",
    testTypeId: "tt-utbk",
    subtestId: "st-utbk-pu",
    difficulty: "medium",
    topics: ["Analitik"],
    tags: ["utbk", "penalaran", "tabel"],
    prompt: rich(
      p("Lima siswa — Andi, Bowo, Citra, Dedi, Eka — duduk sejajar pada bangku nomor 1 sampai 5.") +
        ul([
          "Bowo duduk dua kursi di kanan Andi.",
          "Citra duduk di ujung kanan.",
          "Dedi duduk tepat di kiri Eka.",
          "Andi tidak duduk di nomor 1.",
        ]) +
        p("Siapakah yang duduk di nomor 3?"),
    ),
    options: options([
      { key: "a", id: "Andi" },
      { key: "b", id: "Bowo" },
      { key: "c", id: "Dedi" },
      { key: "d", id: "Eka" },
      { key: "e", id: "Tidak dapat ditentukan" },
    ]),
    correctOptionId: "a",
    explanation: rich(
      p(
        "Citra menempati nomor 5. Dedi–Eka harus berurutan, dan Bowo = Andi + 2. Jika Andi di nomor 3 maka Bowo di nomor 5 — bertabrakan dengan Citra. Satu-satunya susunan yang mungkin: Dedi(1), Eka(2), <strong>Andi(3)</strong>, Bowo(4), Citra(5).",
      ),
    ),
  }),
  q({
    id: "q-utbk-pu-03",
    type: "multiple-choice",
    testTypeId: "tt-utbk",
    subtestId: "st-utbk-pu",
    difficulty: "medium",
    topics: ["Pola Bilangan"],
    tags: ["utbk", "penalaran", "deret"],
    prompt: rich(
      p("Perhatikan pola berikut:") +
        p("<code>2, 6, 12, 20, 30, …</code>") +
        p("Suku ke-7 dari barisan tersebut adalah …"),
    ),
    options: options([
      { key: "a", id: "42" },
      { key: "b", id: "48" },
      { key: "c", id: "56" },
      { key: "d", id: "60" },
      { key: "e", id: "72" },
    ]),
    correctOptionId: "c",
    explanation: rich(
      p(
        `Suku ke-n mengikuti ${m("n(n+1)")}: ${m("1\\cdot2=2")}, ${m("2\\cdot3=6")}, ${m("3\\cdot4=12")}, … sehingga suku ke-7 adalah ${m("7\\cdot8=56")}.`,
      ),
    ),
  }),
  q({
    id: "q-utbk-pu-04",
    type: "multiple-choice",
    testTypeId: "tt-utbk",
    subtestId: "st-utbk-pu",
    difficulty: "hard",
    topics: ["Penguatan Argumen"],
    tags: ["utbk", "penalaran", "argumen"],
    prompt: rich(
      p(
        "Kota P menerapkan sistem kerja empat hari dalam sepekan. Setelah enam bulan, tingkat kelelahan karyawan menurun dan produktivitas per jam meningkat. Pemerintah kota berpendapat kebijakan ini layak diterapkan di seluruh instansi.",
      ) +
        p("Pernyataan yang <strong>paling memperlemah</strong> argumen tersebut adalah …"),
    ),
    options: options([
      { key: "a", id: "Total jam kerja mingguan tetap sama, hanya dipadatkan" },
      { key: "b", id: "Survei hanya melibatkan karyawan yang menyukai kebijakan baru" },
      { key: "c", id: "Beberapa instansi sudah lama menerapkan sistem serupa" },
      { key: "d", id: "Produktivitas diukur dari jumlah tugas yang diselesaikan per jam" },
      { key: "e", id: "Tingkat kelelahan diukur dengan kuesioner terstandar" },
    ]),
    correctOptionId: "b",
    explanation: rich(
      p(
        "Sampel yang bias (hanya karyawan yang menyukai kebijakan) membuat hasil survei tidak dapat digeneralisasi. Pilihan A sekadar menjelaskan mekanisme, sedangkan D dan E justru memperkuat kredibilitas pengukuran.",
      ),
    ),
  }),
];

/* ============================== KUANTITATIF ============================= */

const KUANTITATIF: Question[] = [
  q({
    id: "q-utbk-kuan-01",
    type: "multiple-choice",
    testTypeId: "tt-utbk",
    subtestId: "st-utbk-kuantitatif",
    difficulty: "easy",
    topics: ["Aljabar"],
    tags: ["utbk", "kuantitatif", "aljabar"],
    prompt: rich(p(`Jika ${m("2x+3y=18")} dan ${m("x-y=4")}, nilai ${m("x")} adalah …`)),
    options: options([
      { key: "a", id: "4" },
      { key: "b", id: "5" },
      { key: "c", id: "6" },
      { key: "d", id: "7" },
      { key: "e", id: "8" },
    ]),
    correctOptionId: "c",
    explanation: rich(
      p(
        `Dari ${m("x-y=4")} diperoleh ${m("x=y+4")}. Substitusi: ${m("2(y+4)+3y=18")} → ${m("5y=10")} → ${m("y=2")}, sehingga ${m("x=6")}.`,
      ),
    ),
  }),
  q({
    id: "q-utbk-kuan-02",
    type: "multiple-choice",
    testTypeId: "tt-utbk",
    subtestId: "st-utbk-kuantitatif",
    difficulty: "medium",
    topics: ["Geometri"],
    tags: ["utbk", "kuantitatif", "geometri"],
    prompt: rich(
      p(
        `Sebuah taman berbentuk persegi panjang berukuran ${m("12\\,\\text{m}\\times8\\,\\text{m}")}. Di sekelilingnya dibuat jalan dengan lebar seragam ${m("1\\,\\text{m}")}. Luas jalan tersebut adalah …`,
      ),
    ),
    options: options([
      { key: "a", id: "40 m²" },
      { key: "b", id: "42 m²" },
      { key: "c", id: "44 m²" },
      { key: "d", id: "46 m²" },
      { key: "e", id: "48 m²" },
    ]),
    correctOptionId: "c",
    explanation: rich(
      p(
        `Luas taman berikut jalan ${m("(12+2)(8+2)=14\\cdot10=140")} m², luas taman ${m("12\\cdot8=96")} m², jadi luas jalan ${m("140-96=44")} m².`,
      ),
    ),
  }),
  q({
    id: "q-utbk-kuan-03",
    type: "fill-blank",
    testTypeId: "tt-utbk",
    subtestId: "st-utbk-kuantitatif",
    difficulty: "medium",
    topics: ["Aritmetika Sosial"],
    tags: ["utbk", "kuantitatif", "persen"],
    prompt: rich(p("Isilah titik-titik berikut dengan angka (tanpa titik pemisah juga diterima).")),
    template: rich(
      p(`Harga sebuah buku Rp80.000,00. Setelah diskon 25%, harga buku tersebut menjadi Rp{{b1}}.`),
    ),
    blanks: [
      {
        id: "b1",
        input: "text",
        mode: "advanced",
        accepted: ["60000", "60.000", "60000,00", "60.000,00"],
        caseSensitive: false,
        ignoreWhitespace: true,
      },
    ],
    partialScoring: false,
    explanation: rich(
      p(`Diskon ${m("25\\%\\times80.000=20.000")}, sehingga harga akhir ${m("80.000-20.000=60.000")}.`),
    ),
  }),
  q({
    id: "q-utbk-kuan-04",
    type: "multiple-choice",
    testTypeId: "tt-utbk",
    subtestId: "st-utbk-kuantitatif",
    difficulty: "hard",
    topics: ["Peluang"],
    tags: ["utbk", "kuantitatif", "peluang"],
    prompt: rich(
      p(
        "Dua dadu setimbang dilempar bersamaan sekali. Peluang muncul jumlah mata dadu <strong>genap atau</strong> lebih dari 8 adalah …",
      ),
    ),
    options: options([
      { key: "a", id: "1/2" },
      { key: "b", id: "5/9" },
      { key: "c", id: "7/12" },
      { key: "d", id: "2/3" },
      { key: "e", id: "3/4" },
    ]),
    correctOptionId: "d",
    explanation: rich(
      p(
        `Kejadian genap: 18 dari 36. Jumlah lebih dari 8: 10. Irisannya (genap <em>dan</em> lebih dari 8, yaitu 10 dan 12): 4. Dengan inklusi–eksklusi: ${m("\\frac{18+10-4}{36}=\\frac{24}{36}=\\frac{2}{3}")}.`,
      ) + mb("\\frac{18+10-4}{36}=\\frac{2}{3}"),
    ),
  }),
];

/* ============================ LITERASI BAHASA ============================ */

const LITERASI: Question[] = [
  q({
    id: "q-utbk-lit-01",
    type: "group",
    testTypeId: "tt-utbk",
    subtestId: "st-utbk-literasi",
    difficulty: "medium",
    topics: ["Pemahaman Bacaan"],
    tags: ["utbk", "literasi", "stimulus"],
    prompt: rich(p("Bacaan berikut digunakan untuk menjawab dua pertanyaan di bawahnya.")),
    stimulus: {
      kind: "text",
      content: rich(
        p(
          "Riset terbaru menunjukkan bahwa membaca 20 menit setiap hari berkorelasi dengan peningkatan kosakata yang signifikan pada remaja. Namun, peneliti menekankan bahwa korelasi tidak selalu berarti sebab-akibat: remaja yang gemar membaca umumnya juga tumbuh di lingkungan yang kaya percakapan, dan faktor lingkungan ini turut menyumbang perkembangan kosakata.",
        ) +
          ul([
            "Membaca 20 menit per hari berkorelasi dengan pertumbuhan kosakata.",
            "Lingkungan kaya percakapan ikut berpengaruh.",
            "Korelasi tidak serta-merta membuktikan hubungan sebab-akibat.",
          ]),
      ),
    },
    children: [
      {
        id: "q-utbk-lit-01a",
        type: "multiple-choice",
        testTypeId: "tt-utbk",
        subtestId: "st-utbk-literasi",
        difficulty: "medium",
        topics: ["Pemahaman Bacaan"],
        tags: ["utbk", "literasi"],
        prompt: rich(p("Ide pokok bacaan tersebut adalah …")),
        options: options([
          { key: "a", id: "Membaca 20 menit menjamin kosakata remaja meningkat" },
          { key: "b", id: "Ada korelasi antara kebiasaan membaca dan kosakata, tetapi faktor lain ikut berperan" },
          { key: "c", id: "Lingkungan percakapan tidak berpengaruh terhadap kosakata" },
          { key: "d", id: "Remaja harus menggantikan percakapan dengan membaca" },
          { key: "e", id: "Peneliti membuktikan bahwa membaca menyebabkan kosakata bertambah" },
        ]),
        correctOptionId: "b",
        createdAt: CREATED,
        updatedAt: CREATED,
      },
      {
        id: "q-utbk-lit-01b",
        type: "multiple-choice",
        testTypeId: "tt-utbk",
        subtestId: "st-utbk-literasi",
        difficulty: "hard",
        topics: ["Pemahaman Bacaan"],
        tags: ["utbk", "literasi", "makna kata"],
        prompt: rich(p("Makna kata <em>berkorelasi</em> dalam bacaan tersebut adalah …")),
        options: options([
          { key: "a", id: "Memiliki hubungan timbal balik yang pasti" },
          { key: "b", id: "Memiliki hubungan statistik yang tidak selalu bersifat sebab-akibat" },
          { key: "c", id: "Saling menggantikan satu sama lain" },
          { key: "d", id: "Berlawanan arah" },
          { key: "e", id: "Tidak memiliki hubungan apa pun" },
        ]),
        correctOptionId: "b",
        createdAt: CREATED,
        updatedAt: CREATED,
      },
    ],
    explanation: rich(
      p(
        "Bacaan menekankan adanya korelasi sekaligus mengingatkan bahwa faktor lingkungan ikut berperan — bukan klaim sebab-akibat tunggal.",
      ),
    ),
  }),
  q({
    id: "q-utbk-lit-02",
    type: "multiple-choice",
    testTypeId: "tt-utbk",
    subtestId: "st-utbk-literasi",
    difficulty: "easy",
    topics: ["Tata Bahasa"],
    tags: ["utbk", "literasi", "ejaan"],
    prompt: rich(p("Kalimat yang menggunakan kata <em>di mana</em> dengan tepat adalah …")),
    options: options([
      { key: "a", id: "Saya tidak tahu di mana dia tinggal sekarang" },
      { key: "b", id: "Pemerintah mengeluarkan kebijakan di mana masyarakat harus mendaftar ulang" },
      { key: "c", id: "Rapat dilaksanakan di mana ruang rapat utama" },
      { key: "d", id: "Karya ilmiah di mana ditulis oleh mahasiswa tingkat akhir" },
      { key: "e", id: "Panitia mengumumkan di mana peserta wajib hadir" },
    ]),
    correctOptionId: "a",
    explanation: rich(
      p(
        "<em>Di mana</em> tepat dipakai sebagai kata tanya tempat. Pada pilihan lain seharusnya digunakan kata <em>tempat</em>, <em>di</em>, atau konjungsi <em>bahwa</em>.",
      ),
    ),
  }),
  q({
    id: "q-utbk-lit-03",
    type: "multiple-choice",
    testTypeId: "tt-utbk",
    subtestId: "st-utbk-literasi",
    difficulty: "medium",
    topics: ["Perbandingan Teks"],
    tags: ["utbk", "literasi", "teks"],
    prompt: rich(
      p("Teks 1: “Program wajib belajar 12 tahun meningkatkan angka partisipasi sekolah.”") +
        p("Teks 2: “Peningkatan partisipasi sekolah juga ditopang oleh bantuan biaya pendidikan.”") +
        p("Hubungan kedua teks tersebut adalah …"),
    ),
    options: options([
      { key: "a", id: "Teks 2 menyangkal Teks 1" },
      { key: "b", id: "Teks 2 melengkapi faktor penyebab pada Teks 1" },
      { key: "c", id: "Kedua teks membahas topik yang sama sekali berbeda" },
      { key: "d", id: "Teks 1 merupakan kesimpulan dari Teks 2" },
      { key: "e", id: "Teks 2 menyatakan akibat dari Teks 1" },
    ]),
    correctOptionId: "b",
    explanation: rich(
      p(
        "Teks 2 menambahkan faktor lain (bantuan biaya) yang turut menopang fenomena pada Teks 1, sehingga bersifat melengkapi, bukan menyangkal.",
      ),
    ),
  }),
];

export const UTBK_QUESTIONS: Question[] = [...PU, ...KUANTITATIF, ...LITERASI];
export const UTBK_PU_IDS = PU.map((item) => item.id);
export const UTBK_KUANTITATIF_IDS = KUANTITATIF.map((item) => item.id);
export const UTBK_LITERASI_IDS = LITERASI.map((item) => item.id);
