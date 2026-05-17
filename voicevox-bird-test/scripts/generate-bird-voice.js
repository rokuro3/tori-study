const fs = require("node:fs/promises");
const path = require("node:path");

const VOICEVOX_URL = process.env.VOICEVOX_URL || "http://127.0.0.1:50021";
const rawSpeaker = process.env.VOICEVOX_SPEAKER || "1";
const speaker = Number(rawSpeaker);
const speakerParam = encodeURIComponent(String(speaker));
const birdName = process.argv[2];
const outputPath =
  process.argv[3] ||
  path.resolve(process.cwd(), "output", `${birdName || "bird"}.wav`);

if (!birdName) {
  console.error("使い方: npm run speak -- <鳥の名前> [出力先wavパス]");
  process.exit(1);
}

if (!Number.isFinite(speaker)) {
  console.error("VOICEVOX_SPEAKER には数値を指定してください");
  process.exit(1);
}

async function ensureDirectory(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function postToVoicevox(url, options) {
  try {
    return await fetch(url, options);
  } catch (error) {
    throw new Error(
      `VOICEVOX Engine に接続できませんでした。VOICEVOX_URL (${VOICEVOX_URL}) を確認してください。詳細: ${error.message}`
    );
  }
}

async function callVoicevox(text) {
  const queryRes = await postToVoicevox(
    `${VOICEVOX_URL}/audio_query?text=${encodeURIComponent(text)}&speaker=${speakerParam}`,
    { method: "POST" }
  );

  if (!queryRes.ok) {
    throw new Error(
      `audio_query 失敗: ${queryRes.status} ${queryRes.statusText}`
    );
  }

  const audioQuery = await queryRes.json();

  const synthRes = await postToVoicevox(
    `${VOICEVOX_URL}/synthesis?speaker=${speakerParam}`,
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
  const wav = await callVoicevox(birdName);
  await ensureDirectory(outputPath);
  await fs.writeFile(outputPath, wav);
  console.log(`音声を書き出しました: ${outputPath}`);
}

main().catch((error) => {
  console.error("音声生成に失敗しました:", error.message);
  process.exit(1);
});
