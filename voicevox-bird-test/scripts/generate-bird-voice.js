const fs = require("node:fs/promises");
const path = require("node:path");

const VOICEVOX_URL = process.env.VOICEVOX_URL || "http://127.0.0.1:50021";
const speaker = Number(process.env.VOICEVOX_SPEAKER || "1");
const birdName = process.argv[2];
const outputPath =
  process.argv[3] ||
  path.resolve(process.cwd(), "output", `${birdName || "bird"}.wav`);

if (!birdName) {
  console.error("使い方: npm run speak -- <鳥の名前> [出力先wavパス]");
  process.exit(1);
}

async function ensureDirectory(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function callVoiceVox(text) {
  const queryRes = await fetch(
    `${VOICEVOX_URL}/audio_query?text=${encodeURIComponent(text)}&speaker=${speaker}`,
    { method: "POST" }
  );

  if (!queryRes.ok) {
    throw new Error(
      `audio_query 失敗: ${queryRes.status} ${queryRes.statusText}`
    );
  }

  const audioQuery = await queryRes.json();

  const synthRes = await fetch(
    `${VOICEVOX_URL}/synthesis?speaker=${speaker}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(audioQuery),
    }
  );

  if (!synthRes.ok) {
    throw new Error(
      `synthesis 失敗: ${synthRes.status} ${synthRes.statusText}`
    );
  }

  return Buffer.from(await synthRes.arrayBuffer());
}

async function main() {
  const wav = await callVoiceVox(birdName);
  await ensureDirectory(outputPath);
  await fs.writeFile(outputPath, wav);
  console.log(`音声を書き出しました: ${outputPath}`);
  console.log(`VOICEVOX_URL=${VOICEVOX_URL}, speaker=${speaker}, text=${birdName}`);
}

main().catch((error) => {
  console.error("音声生成に失敗しました:", error.message);
  process.exit(1);
});
