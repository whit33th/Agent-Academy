const fs = require('fs');
const path = require('path');

const destDir = path.join(__dirname, '..', 'public', 'ranks');
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

const ranks = {
  S: 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/27/largeicon.png', // Radiant
  A: 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/26/largeicon.png', // Immortal 3
  B: 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/23/largeicon.png', // Ascendant 3
  C: 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/20/largeicon.png', // Diamond 3
  D: 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/17/largeicon.png', // Platinum 3
  unranked: 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/0/smallicon.png', // Unranked
};

async function download(name, url) {
  console.log(`Downloading ${name} rank icon from ${url}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const destPath = path.join(destDir, `${name.toLowerCase()}.png`);
  fs.writeFileSync(destPath, buffer);
  console.log(`Saved to ${destPath}`);
}

async function main() {
  try {
    for (const [name, url] of Object.entries(ranks)) {
      await download(name, url);
    }
    console.log("All rank icons downloaded successfully!");
  } catch (err) {
    console.error("Error downloading rank icons:", err);
  }
}

main();
