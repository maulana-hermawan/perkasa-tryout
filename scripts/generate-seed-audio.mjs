/**
 * Generates the placeholder listening audio used by the TOEFL seed package.
 *
 * The files are synthetic "speech-like" tones (formant-ish harmonics with a
 * syllable envelope) so the repository needs no binary media: replace
 * `public/audio/toefl-listening-0*.wav` with real recordings when available.
 *
 * Usage: node scripts/generate-seed-audio.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SAMPLE_RATE = 8000;
const BITS = 16;
const CHANNELS = 1;

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "public/audio");

/** Deterministic PRNG so regenerating produces identical files. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CLIPS = [
  { name: "toefl-listening-01.wav", seed: 20250101, syllables: 22, base: 190 },
  { name: "toefl-listening-02.wav", seed: 20250202, syllables: 26, base: 165 },
  { name: "toefl-listening-03.wav", seed: 20250303, syllables: 24, base: 205 },
];

function render({ seed, syllables, base }) {
  const rng = mulberry32(seed);
  const samples = [];
  const total = Math.round(SAMPLE_RATE * 1.2); // leading silence

  for (let i = 0; i < total; i++) samples.push(0);

  for (let s = 0; s < syllables; s++) {
    // Syllable length varies like natural speech (120–260 ms).
    const duration = Math.round(SAMPLE_RATE * (0.12 + rng() * 0.14));
    const pitch = base * (0.85 + rng() * 0.4) * (1 - (s / syllables) * 0.15);
    const envShape = 0.55 + rng() * 0.45;

    for (let i = 0; i < duration; i++) {
      const t = i / duration;
      const envelope = Math.sin(Math.PI * Math.min(1, t * 1.05)) ** 1.4 * envShape;
      const phase = (2 * Math.PI * pitch * i) / SAMPLE_RATE;
      const harmonic =
        Math.sin(phase) * 0.6 + Math.sin(2 * phase) * 0.25 + Math.sin(3 * phase) * 0.12 + Math.sin(5 * phase) * 0.05;
      samples.push(Math.max(-1, Math.min(1, harmonic * envelope * 0.45)));
    }

    // Inter-syllable pause (word gap every ~4 syllables).
    const gap = Math.round(SAMPLE_RATE * (s % 4 === 3 ? 0.11 : 0.03));
    for (let i = 0; i < gap; i++) samples.push(0);
  }

  // Trailing room tone.
  for (let i = 0; i < Math.round(SAMPLE_RATE * 0.4); i++) samples.push(0);

  return samples;
}

function toWav(samples) {
  const bytesPerSample = BITS / 8;
  const dataSize = samples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // PCM chunk size
  buffer.writeUInt16LE(1, 20); // format: PCM
  buffer.writeUInt16LE(CHANNELS, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * CHANNELS * bytesPerSample, 28);
  buffer.writeUInt16LE(CHANNELS * bytesPerSample, 32);
  buffer.writeUInt16LE(BITS, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  samples.forEach((sample, index) => {
    const clamped = Math.max(-1, Math.min(1, sample));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + index * bytesPerSample);
  });

  return buffer;
}

mkdirSync(outDir, { recursive: true });

for (const clip of CLIPS) {
  const samples = render(clip);
  const wav = toWav(samples);
  writeFileSync(resolve(outDir, clip.name), wav);
  console.log(
    `${clip.name} — ${(samples.length / SAMPLE_RATE).toFixed(1)}s · ${(wav.length / 1024).toFixed(0)} KB`,
  );
}
