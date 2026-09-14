import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ITEM_SPRITE_BASE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/";
const CHAMPIONS_ITEM_BASE = "https://championsbattledata.com/pokemon_champions_assets/items/";
const SPRITE_CACHE = new Map();

export function itemSlug(name){
  return String(name || "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function isValidPng(buf){
  return buf.length > 50 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
}

export async function downloadItemSprite(name, spriteDir){
  const slug = itemSlug(name);
  if (!slug) return null;
  if (SPRITE_CACHE.has(slug)) return SPRITE_CACHE.get(slug);

  const localName = `${slug}.png`;
  const localPath = path.join(spriteDir, localName);
  const relativePath = `assets/items/${localName}`;
  try {
    await access(localPath);
    SPRITE_CACHE.set(slug, relativePath);
    return relativePath;
  } catch {
    // Download only missing item icons.
  }

  const sources = [
    `${ITEM_SPRITE_BASE}${encodeURIComponent(slug)}.png`,
    `${CHAMPIONS_ITEM_BASE}${encodeURIComponent(name)}.png`,
  ];
  for (const url of sources){
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (!isValidPng(buf)) throw new Error("not a valid PNG");
      await writeFile(localPath, buf);
      SPRITE_CACHE.set(slug, relativePath);
      return relativePath;
    } catch {
      // Try the Champions-specific asset path for game-exclusive items.
    }
  }
  console.warn(`  item sprite failed for ${name}`);
  SPRITE_CACHE.set(slug, null);
  return null;
}

export async function downloadItemSprites(names, spriteDir){
  await mkdir(spriteDir, { recursive: true });
  const uniqueNames = [...new Set(names.filter(Boolean))];
  const sprites = new Map();
  for (const name of uniqueNames){
    sprites.set(name, await downloadItemSprite(name, spriteDir));
  }
  return sprites;
}
