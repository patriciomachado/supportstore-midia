#!/usr/bin/env node
// locucao.mjs - gera a locução dos Reels da Support Store com a voz do Gemini (Google AI Studio).
//
// Uso:
//   node locucao.mjs 2026-10-19                 baixa o roteiro da semana do GitHub e gera os áudios
//   node locucao.mjs 2026-10-19 --local falas.json   usa um arquivo local no lugar do GitHub
//   node locucao.mjs 2026-10-19 --out C:\caminho\saida
//
// Precisa de Node 18+ (sem instalar nada) e da variável de ambiente GEMINI_API_KEY.
// A chave fica só no seu computador. Nunca cole a chave em conversa, repositório ou print.
//
// Variáveis opcionais:
//   GEMINI_TTS_MODEL   modelo de voz (padrão: gemini-2.5-flash-preview-tts)
//   GEMINI_VOICE       voz (padrão: Charon). Outras: Kore, Puck, Fenrir, Orus, Zephyr...
//   REPO_DIR           pasta do clone de supportstore-midia; se definida, copia os áudios e faz git push
//   GEMINI_BASE        endereço da API (só para testes)

import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const REPO = "patriciomachado/supportstore-midia";
const BASE = process.env.GEMINI_BASE || "https://generativelanguage.googleapis.com";
const MODEL = process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts";
const VOICE = process.env.GEMINI_VOICE || "Charon";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
// A chave vem da variável GEMINI_API_KEY ou, se não existir, do arquivo chave.txt ao lado deste script (não vai para o GitHub).
let KEY = process.env.GEMINI_API_KEY;
if (!KEY) {
  try { KEY = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "chave.txt"), "utf8").trim(); } catch {}
}

const args = process.argv.slice(2);
const date = args.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };

if (!date) { console.error("Informe a data da segunda-feira da semana. Ex.: node locucao.mjs 2026-10-19"); process.exit(1); }
if (!KEY) { console.error("Falta a chave: defina GEMINI_API_KEY ou crie o arquivo chave.txt ao lado do script (veja LEIAME-locucao.md)."); process.exit(1); }

const outDir = flag("--out") || path.join(process.cwd(), "saida", date);

// WAV mono 16 bits a partir de PCM bruto
export function pcmToWav(pcm, sampleRate = 24000) {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVE", 8);
  h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(sampleRate, 24); h.writeUInt32LE(sampleRate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

async function carregarFalas() {
  const local = flag("--local");
  if (local) return JSON.parse(await readFile(local, "utf8"));
  const url = `https://raw.githubusercontent.com/${REPO}/main/${date}/locucoes.json`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Não achei o roteiro em ${url} (HTTP ${r.status}). O agente já rodou nesta semana?`);
  return r.json();
}

async function gerar(texto, estilo, voz = VOICE, modelo = MODEL) {
  const prompt = `${estilo}\n\n${texto}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voz } } },
    },
  };
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    const r = await fetch(`${BASE}/v1beta/models/${modelo}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": KEY },
      body: JSON.stringify(body),
    });
    if (r.ok) {
      const j = await r.json();
      const part = j?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
      if (!part) throw new Error("A API respondeu sem áudio: " + JSON.stringify(j).slice(0, 300));
      const mime = part.inlineData.mimeType || "";
      const taxa = Number((mime.match(/rate=(\d+)/) || [])[1]) || 24000;
      return pcmToWav(Buffer.from(part.inlineData.data, "base64"), taxa);
    }
    const txt = (await r.text()).slice(0, 300);
    if ((r.status === 429 || r.status >= 500) && tentativa < 3) {
      console.log(`  limite ou erro temporário (HTTP ${r.status}), nova tentativa em ${10 * tentativa}s...`);
      await new Promise((ok) => setTimeout(ok, 10000 * tentativa));
      continue;
    }
    throw new Error(`HTTP ${r.status}: ${txt}`);
  }
}

const dados = await carregarFalas();
const estilo = dados.estilo || "Fale em português do Brasil, com tom direto e calmo, como um técnico experiente explicando para um cliente. Ritmo natural, sem exagero e sem tom de propaganda.";
const falas = dados.falas || {};
const chaves = Object.keys(falas);
if (!chaves.length) { console.error("O arquivo não tem nenhuma fala em \"falas\"."); process.exit(1); }

await mkdir(outDir, { recursive: true });
const gerados = [];
for (const k of chaves) {
  // cada fala pode ser um texto ou { "texto": "...", "voz": "Puck", "modelo": "...", "estilo": "..." }
  const f = typeof falas[k] === "string" ? { texto: falas[k] } : falas[k];
  process.stdout.write(`Gerando ${k} (${f.texto.length} caracteres, voz ${f.voz || VOICE})... `);
  const wav = await gerar(f.texto, f.estilo || estilo, f.voz || VOICE, f.modelo || MODEL);
  const arq = path.join(outDir, `${k}.wav`);
  await writeFile(arq, wav);
  gerados.push(arq);
  console.log("ok");
}
console.log(`\nPronto: ${gerados.length} áudio(s) em ${outDir}`);

const repoDir = process.env.REPO_DIR;
if (repoDir && existsSync(path.join(repoDir, ".git"))) {
  const destino = path.join(repoDir, date, "audio");
  await mkdir(destino, { recursive: true });
  for (const a of gerados) await copyFile(a, path.join(destino, path.basename(a)));
  const git = (...a) => execFileSync("git", ["-C", repoDir, ...a], { stdio: "inherit" });
  git("pull", "--rebase", "origin", "main");
  git("add", path.join(date, "audio"));
  git("commit", "-m", `Locuções da semana ${date}`);
  git("push", "origin", "main");
  console.log("Áudios enviados ao GitHub. Pode avisar o Claude.");
} else {
  console.log(`\nPróximo passo: envie os .wav para a pasta ${date}/audio/ do repositório ${REPO}`);
  console.log("(GitHub > Add file > Upload files) e avise o Claude.");
}
