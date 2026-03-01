import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const REPO_RAW_BASE = 'https://raw.githubusercontent.com/doomhammerhell/invariantsplit/main';
const DIAGRAM_DIR = resolve('docs', 'assets', 'diagrams');
const SCREENSHOT_DIR = resolve('docs', 'assets', 'screenshots');

const diagrams = [
  {
    name: 'system-architecture',
    sourcePath: resolve(DIAGRAM_DIR, 'system-architecture.mmd')
  },
  {
    name: 'delivery-pipeline',
    sourcePath: resolve(DIAGRAM_DIR, 'delivery-pipeline.mmd')
  }
];

const screenshots = [
  {
    name: 'factory-sepolia.png',
    url: 'https://image.thum.io/get/png/width/1600/https://sepolia.etherscan.io/address/0x8f9633c55d6EC8EF0426742460A4B374481D6c0C'
  },
  {
    name: 'solidity-observed-sepolia.png',
    url: 'https://image.thum.io/get/png/width/1600/https://sepolia.etherscan.io/address/0xc5068CA8448E5FAEd512eA4F734eE6f5b1b08f71'
  },
  {
    name: 'huff-observed-sepolia.png',
    url: 'https://image.thum.io/get/png/width/1600/https://sepolia.etherscan.io/address/0x43A2F08D802642BD30EbaDa4A509d5bbBCa0d2fC'
  },
  {
    name: 'huff-distribute-tx-sepolia.png',
    url: 'https://image.thum.io/get/png/width/1600/https://sepolia.etherscan.io/tx/0x47be17dfef49b7dffb5695761de9fe90f0174b1fb59fb96ed02c9e700724a09d'
  }
];

async function ensureDirectories() {
  await mkdir(DIAGRAM_DIR, { recursive: true });
  await mkdir(SCREENSHOT_DIR, { recursive: true });
}

async function fetchBuffer(url, options = {}) {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status} ${response.statusText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function renderDiagram(diagram) {
  const source = await readFile(diagram.sourcePath, 'utf8');
  const outputs = {};

  for (const format of ['svg', 'png']) {
    const buffer = await fetchBuffer(`https://kroki.io/mermaid/${format}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: source
    });

    const outputPath = resolve(DIAGRAM_DIR, `${diagram.name}.${format}`);
    await writeFile(outputPath, buffer);
    outputs[format] = {
      path: `docs/assets/diagrams/${diagram.name}.${format}`,
      rawUrl: `${REPO_RAW_BASE}/docs/assets/diagrams/${diagram.name}.${format}`
    };
  }

  return {
    sourcePath: `docs/assets/diagrams/${diagram.name}.mmd`,
    ...outputs
  };
}

async function fetchScreenshot(entry) {
  const buffer = await fetchBuffer(entry.url);
  const outputPath = resolve(SCREENSHOT_DIR, entry.name);
  await writeFile(outputPath, buffer);

  return {
    path: `docs/assets/screenshots/${entry.name}`,
    rawUrl: `${REPO_RAW_BASE}/docs/assets/screenshots/${entry.name}`,
    sourceUrl: entry.url
  };
}

async function main() {
  await ensureDirectories();

  const diagramResults = {};

  for (const diagram of diagrams) {
    diagramResults[diagram.name] = await renderDiagram(diagram);
  }

  const screenshotResults = {};

  for (const screenshot of screenshots) {
    screenshotResults[screenshot.name] = await fetchScreenshot(screenshot);
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    repoRawBase: REPO_RAW_BASE,
    diagrams: diagramResults,
    screenshots: screenshotResults
  };

  await writeFile(
    resolve('docs', 'assets', 'article-assets.json'),
    `${JSON.stringify(manifest, null, 2)}\n`
  );
  console.log('Exported article diagrams and screenshots.');
}

await main();
