/**
 * species-naming.mjs
 *
 * Shared by fetch-pokedex.mjs and fetch-usage.mjs. Champions/Smogon/
 * PokeAPI each use a DIFFERENT naming convention for the same species,
 * and — critically — championsbattledata's OWN metadata (its bulk index's
 * summary.sprite field) is unreliable for Megas and other special forms,
 * pointing at the wrong asset path. So for anything matched here, BOTH
 * scripts override that unreliable metadata with the conventions
 * confirmed below, rather than trusting whatever championsbattledata's
 * own index says for these specific forms.
 *
 * Three naming conventions, kept deliberately separate:
 *   - pokeApiSlug:  what PokeAPI's /pokemon/{slug} endpoint wants (stats)
 *   - displayName:  Showdown's own convention, hyphen-separated
 *                   ("Charizard-Mega-X", "Ninetales-Alola") — used for
 *                   on-page display AND team-export text
 *   - assetName:    championsbattledata's own asset-filename convention,
 *                   space-separated ("Mega Charizard X.png") — used only
 *                   to build the sprite download URL
 */

export const toId = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
export const titleCase = (s) => s.split(/[- ]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

// Species-specific exceptions that don't follow the generic Mega/
// regional-suffix pattern below. Checked FIRST.
export const SPECIAL_FORM_RULES = [
  // Floette only exists as Eternal Flower in this game (no regular
  // color variants) — Mega Floette's export/display identity is still
  // Floette-Eternal (only Floette-Eternal can Mega Evolve), so its name
  // carries the "-Eternal-Mega" suffix rather than bare "-Mega".
  { test: /^floette-?mega$/,
    asset: () => "Mega Floette", display: () => "Floette-Eternal-Mega", slug: () => null },
  { test: /^floette-?eternal$/,
    asset: () => "Floette Eternal Flower", display: () => "Floette-Eternal", slug: () => "floette-eternal" },
  { test: /^floette$/,
    asset: () => "Floette", display: () => "Floette-Eternal", slug: () => "floette-eternal" },

  // Lycanroc: asset filenames use the literal word "Form"; Showdown/
  // PokeAPI use a hyphen suffix, and Midday has none (it's the default).
  { test: /^lycanroc-?(dusk|midnight)$/,
    asset: (m) => `Lycanroc ${titleCase(m[1])} Form`, display: (m) => `Lycanroc-${titleCase(m[1])}`, slug: (m) => `lycanroc-${m[1]}` },
  { test: /^lycanrocmidday$/,
    asset: () => "Lycanroc Midday Form", display: () => "Lycanroc", slug: () => "lycanroc" },

  // Aegislash: only Blade forme needs the name/asset override — Shield
  // is the default/base entry and already goes through the normal path.
  // Stats: Shield forme's numbers are used for every Aegislash reference
  // (Blade isn't independently trackable/selectable on the ladder).
  { test: /^aegislash-?blade$/,
    asset: () => "Aegislash Blade Forme", display: () => "Aegislash-Blade", slug: () => "aegislash" },

  // Vivillon: cosmetic wing patterns, all sharing the "{Pattern} Pattern"
  // asset-name shape. The bare "vivillon" ID (no pattern — Showdown
  // treats all patterns as battle-identical, so there's usually just
  // one competitive entry) defaults its ART specifically to the Fancy
  // pattern, but keeps the plain "Vivillon" display/export name.
  { test: /^vivillon$/,
    asset: () => "Vivillon Fancy Pattern", display: () => "Vivillon", slug: () => "vivillon" },
  { test: /^vivillonfancy$/,
    asset: () => "Vivillon Fancy Pattern", display: () => "Vivillon", slug: () => "vivillon" },
  { test: /^vivillon-?(.+)$/,
    asset: (m) => `Vivillon ${titleCase(m[1])} Pattern`, display: (m) => `Vivillon-${titleCase(m[1])}`, slug: (m) => `vivillon-${m[1]}` },

  // Paldean Tauros: three "Breed" forms.
  { test: /^tauros-?paldea-?(combat|aqua|blaze)$/,
    asset: (m) => `Paldean Tauros ${titleCase(m[1])} Breed`, display: (m) => `Tauros-Paldea-${titleCase(m[1])}`, slug: (m) => `tauros-paldea-${m[1]}-breed` },

  // Palafin: base form's ASSET needs "Zero Form" even though its
  // display/export name is just "Palafin" (Zero is the default state).
  { test: /^palafin$/,
    asset: () => "Palafin Zero Form", display: () => "Palafin", slug: () => "palafin" },
  { test: /^palafin-?hero$/,
    asset: () => "Palafin Hero Form", display: () => "Palafin-Hero", slug: () => "palafin-hero" },

  // Furfrou: cosmetic trims are battle-identical in Showdown (one
  // competitive entry), but the asset name needs "Natural Form".
  { test: /^furfrou$/,
    asset: () => "Furfrou Natural Form", display: () => "Furfrou", slug: () => "furfrou" },

  // Florges: five flower colors, confirmed asset shape "{Color} Flower".
  // Red is Showdown's default/base ID (no suffix).
  { test: /^florges$/,
    asset: () => "Florges Red Flower", display: () => "Florges", slug: () => "florges" },
  { test: /^florges-?(blue|orange|white|yellow)$/,
    asset: (m) => `Florges ${titleCase(m[1])} Flower`, display: (m) => `Florges-${titleCase(m[1])}`, slug: (m) => `florges-${m[1]}` },

  // Gourgeist: four sizes; Average is Showdown's default/base ID.
  { test: /^gourgeist-?(small|large|super)$/,
    asset: (m) => `Gourgeist ${titleCase(m[1])}`, display: (m) => `Gourgeist-${titleCase(m[1])}`, slug: (m) => `gourgeist-${m[1]}` },
  { test: /^gourgeistjumbo(variety)?$/,
    asset: () => "Gourgeist Super", display: () => "Gourgeist-Super", slug: () => "gourgeist-super" },

  // Meowstic: male (default, no suffix) and female are separate species
  // as far as sprites/stats go for the REGULAR forms — must never share
  // art. Mega forms are different: confirmed both genders share ONE
  // sprite (https://championsbattledata.com/pokemon_champions_assets/pokemon/Mega%20Meowstic.png,
  // no gender in the filename) and identical stats/type. PokeAPI slugs
  // confirmed directly: meowstic-male-mega / meowstic-female-mega.
  { test: /^meowsticf$/,
    asset: () => "Meowstic F", display: () => "Meowstic-F", slug: () => "meowstic-f" },
  { test: /^meowstic-?f-?mega$/,
    asset: () => "Mega Meowstic", display: () => "Meowstic-F-Mega", slug: () => "meowstic-female-mega" },
  { test: /^meowstic-?m?-?mega$/,
    asset: () => "Mega Meowstic", display: () => "Meowstic-M-Mega", slug: () => "meowstic-male-mega" },
];

export function matchSpecialForm(chaosKey){
  const id = chaosKey.toLowerCase();
  for (const rule of SPECIAL_FORM_RULES){
    const m = id.match(rule.test);
    if (m) return { assetName: rule.asset(m), displayName: rule.display(m), pokeApiSlug: rule.slug(m) };
  }
  return null;
}

// PokeAPI slug — "-?" tolerates chaos-key IDs that keep a literal hyphen
// before the suffix ("garchomp-mega") as well as ones that don't
// ("garchompmega"); without it, a real hyphen leaks into the captured
// species name and (via titleCase's hyphen-splitting) leaves a trailing
// empty segment — that was the cause of a stray trailing space/%20 in
// built names and URLs.
export function guessPokeApiSlug(chaosKey){
  const special = matchSpecialForm(chaosKey);
  if (special) return special.pokeApiSlug;
  const id = chaosKey.toLowerCase();
  let m;
  if ((m = id.match(/^(.+?)-?megax$/))) return `${m[1]}-mega-x`;
  if ((m = id.match(/^(.+?)-?megay$/))) return `${m[1]}-mega-y`;
  if ((m = id.match(/^(.+?)-?megaz$/))) return `${m[1]}-mega-z`;
  if ((m = id.match(/^(.+?)-?mega$/))) return `${m[1]}-mega`;
  if ((m = id.match(/^(.+?)-?alola$/))) return `${m[1]}-alola`;
  if ((m = id.match(/^(.+?)-?galar$/))) return `${m[1]}-galar`;
  if ((m = id.match(/^(.+?)-?hisui$/))) return `${m[1]}-hisui`;
  return id;
}

export function guessDisplayName(chaosKey){
  const special = matchSpecialForm(chaosKey);
  if (special) return special.displayName;
  const id = chaosKey.toLowerCase();
  let m;
  if ((m = id.match(/^(.+?)-?megax$/))) return `${titleCase(m[1])}-Mega-X`;
  if ((m = id.match(/^(.+?)-?megay$/))) return `${titleCase(m[1])}-Mega-Y`;
  if ((m = id.match(/^(.+?)-?megaz$/))) return `${titleCase(m[1])}-Mega-Z`;
  if ((m = id.match(/^(.+?)-?mega$/))) return `${titleCase(m[1])}-Mega`;
  if ((m = id.match(/^(.+?)-?alola$/))) return `${titleCase(m[1])}-Alola`;
  if ((m = id.match(/^(.+?)-?galar$/))) return `${titleCase(m[1])}-Galar`;
  if ((m = id.match(/^(.+?)-?hisui$/))) return `${titleCase(m[1])}-Hisui`;
  return titleCase(id);
}

export function guessChampionsAssetName(chaosKey){
  const special = matchSpecialForm(chaosKey);
  if (special) return special.assetName;
  const id = chaosKey.toLowerCase();
  let m;
  if ((m = id.match(/^(.+?)-?megax$/))) return `Mega ${titleCase(m[1])} X`;
  if ((m = id.match(/^(.+?)-?megay$/))) return `Mega ${titleCase(m[1])} Y`;
  if ((m = id.match(/^(.+?)-?megaz$/))) return `Mega ${titleCase(m[1])} Z`;
  if ((m = id.match(/^(.+?)-?mega$/))) return `Mega ${titleCase(m[1])}`;
  if ((m = id.match(/^(.+?)-?alola$/))) return `Alolan ${titleCase(m[1])}`;
  if ((m = id.match(/^(.+?)-?galar$/))) return `Galarian ${titleCase(m[1])}`;
  if ((m = id.match(/^(.+?)-?hisui$/))) return `Hisuian ${titleCase(m[1])}`;
  return titleCase(id);
}

// ---------------------------------------------------------------------
// PREFERRED PATH: derive naming from a REAL championsbattledata metadata
// row (GET /api/metadata/{base_name} — one row per form, with its own
// saved_name/types/abilities/stats/image_path already correct). This is
// ground truth, not a guess — used to flatten every form into its own
// pokedex entry. The guess* functions above stay as a fallback ONLY for
// species championsbattledata doesn't track at all.
// ---------------------------------------------------------------------

// A handful of saved_names don't reduce to a clean Smogon ID by pattern
// alone. Floette is handled directly in deriveShowdownId/deriveDisplayName/
// derivePokeApiSlug (it only exists as Eternal Flower in this game — see
// those functions for why a table entry here wasn't reliable enough).
const SAVED_NAME_OVERRIDES = {};

// Species whose forms are cosmetic only — they don't change stats,
// abilities, or anything battle-relevant, so the display/export name
// should ALWAYS be just the base species, regardless of which specific
// trim/color/pattern it is. Floette is NOT here — handled separately.
const COSMETIC_ONLY_BASE_SPECIES = new Set(["furfrou", "florges", "vivillon"]);

export function deriveShowdownId(row) {
  // Floette only exists as the Eternal Flower form in this game — no
  // regular color variants at all. championsbattledata's own saved_name
  // for it is unqualified "Floette" (not "Floette Red Flower" or
  // similar), which was silently being treated as a generic default
  // form and landing on the wrong ("floette") ID instead of the correct
  // "floetteeternal" one. Mega Floette gets its own distinct ID too
  // (it's a real, separate ladder entry) — but its EXPORT identity is
  // still Floette-Eternal, handled via the "-Mega" suffix in the
  // display name below rather than here.
  if (toId(row.base_name) === "floette") {
    return /mega/i.test(row.saved_name || "") ? "floettemega" : "floetteeternal";
  }

  const override = SAVED_NAME_OVERRIDES[row.saved_name];
  if (override) return override.smogonId;

  const special = matchSpecialForm(toId(row.saved_name || ""));
  if (special) return toId(special.displayName);

  const base = toId(row.base_name);
  if (COSMETIC_ONLY_BASE_SPECIES.has(base)) return base;
  let s = (row.saved_name || "").trim();
  s = s.replace(/\s+(Form|Forme|Pattern|Flower|Breed|Variety)$/i, "").trim();

  let m;
  // Gender-specific Mega (Meowstic) — the generic single-letter X/Y/Z
  // check below doesn't recognize "F"/"M", so without this, both
  // genders silently collapsed to the same ID and overwrote each other.
  if ((m = s.match(/^Mega\s+.+?\s+(Female|F)$/i))) return base + "fmega";
  if ((m = s.match(/^Mega\s+.+?\s+(Male|M)$/i))) return base + "mega";
  if ((m = s.match(/^Mega\s+.+?\s+([XYZ])$/i))) return base + "mega" + m[1].toLowerCase();
  if (/^Mega\s+/i.test(s)) return base + "mega";
  if (/^Alolan\s+/i.test(s)) return base + "alola";
  if (/^Galarian\s+/i.test(s)) return base + "galar";
  if (/^Hisuian\s+/i.test(s)) return base + "hisui";
  if ((m = s.match(/^Paldean\s+.+?\s+(\w+)$/i))) return base + "paldea" + toId(m[1]);
  if (/^Paldean\s+/i.test(s)) return base + "paldea"; // no breed suffix — plain regional form

  const speciesTitle = titleCase(base);
  if (s.toLowerCase().startsWith(speciesTitle.toLowerCase())) {
    const suffix = s.slice(speciesTitle.length).trim();
    if (!suffix) return base; // exactly the species name = default form
    if (/^female$/i.test(suffix)) return base + "f";
    if (/^(male|shield)$/i.test(suffix)) return base; // unsuffixed defaults
    if (/^(average|medium)$/i.test(suffix)) return base;
    return base + toId(suffix);
  }
  return toId(s);
}

export function deriveDisplayName(row) {
  // See deriveShowdownId — Floette only exists as Eternal Flower in this
  // game. Mega Floette displays as "Floette-Eternal-Mega" (not
  // "Floette-Mega") so that stripping the "-Mega" suffix for export
  // correctly lands on "Floette-Eternal", never bare "Floette".
  if (toId(row.base_name) === "floette") {
    return /mega/i.test(row.saved_name || "") ? "Floette-Eternal-Mega" : "Floette-Eternal";
  }

  const override = SAVED_NAME_OVERRIDES[row.saved_name];
  if (override) return override.displayName;

  const special = matchSpecialForm(toId(row.saved_name || ""));
  if (special) return special.displayName;

  const base = titleCase(toId(row.base_name));
  if (COSMETIC_ONLY_BASE_SPECIES.has(toId(row.base_name))) return base;

  let s = (row.saved_name || "").trim();
  s = s.replace(/\s+(Form|Forme|Pattern|Flower|Breed|Variety)$/i, "").trim();

  let m;
  if ((m = s.match(/^Mega\s+.+?\s+(Female|F)$/i))) return `${base}-F-Mega`;
  if ((m = s.match(/^Mega\s+.+?\s+(Male|M)$/i))) return `${base}-M-Mega`;
  if ((m = s.match(/^Mega\s+.+?\s+([XYZ])$/i))) return `${base}-Mega-${m[1].toUpperCase()}`;
  if (/^Mega\s+/i.test(s)) return `${base}-Mega`;
  if (/^Alolan\s+/i.test(s)) return `${base}-Alola`;
  if (/^Galarian\s+/i.test(s)) return `${base}-Galar`;
  if (/^Hisuian\s+/i.test(s)) return `${base}-Hisui`;
  if ((m = s.match(/^Paldean\s+.+?\s+(\w+)$/i))) return `${base}-Paldea-${titleCase(m[1])}`;
  if (/^Paldean\s+/i.test(s)) return `${base}-Paldea`; // no breed suffix — plain regional form

  if (s.toLowerCase().startsWith(base.toLowerCase())) {
    const suffix = s.slice(base.length).trim();
    if (!suffix) return base;
    if (/^female$/i.test(suffix)) return `${base}-F`;
    if (/^(male|shield)$/i.test(suffix)) return base;
    if (/^(average|medium)$/i.test(suffix)) return base;
    return `${base}-${titleCase(suffix)}`;
  }
  return titleCase(s);
}

// PokeAPI slug from a REAL metadata row — mirrors deriveShowdownId's
// suffix detection but joins with "-" (PokeAPI's convention) instead of
// concatenating (Smogon's convention). Built from row.base_name directly
// rather than a derived chaos ID, so it doesn't lose information for
// generic suffixes the way the chaos-key-only guessPokeApiSlug can
// (that one only recognizes Mega/regional suffixes — this recognizes
// anything, since it has the real base_name to work from).
// Row-based PokeAPI slug overrides — for species where the generic
// suffix-stripping logic below either can't resolve to a real PokeAPI
// entry, or where you've asked for a deliberately simplified answer.
// Checked before the generic logic in derivePokeApiSlug.
function rowPokeApiSlugOverride(row) {
  const base = toId(row.base_name);
  if (base === "aegislash") return "aegislash"; // Shield forme's stats for every Aegislash reference — Blade isn't independently trackable/selectable on the ladder anyway
  if (base === "meowstic") {
    if (/mega/i.test(row.saved_name)) {
      // Confirmed exact PokeAPI slugs — do NOT collapse to one shared
      // slug; each gender has its own real Mega stat block on PokeAPI.
      return /\bf(emale)?\b/i.test(row.saved_name) ? "meowstic-female-mega" : "meowstic-male-mega";
    }
    if (/\bf(emale)?\b/i.test(row.saved_name)) return "meowstic-f";
    return "meowstic";
  }
  if (base === "floette") {
    // Only exists as Eternal Flower in this game — always the real
    // "floette-eternal" PokeAPI slug, never bare "floette" (which would
    // silently give the wrong, mainline-default Floette's stats).
    // Mega Floette uses the "floette-mega" PokeAPI slug.
    return /mega/i.test(row.saved_name || "") ? "floette-mega" : "floette-eternal";
  }
  if (base === "gourgeist") {
    // Explicit, hardcoded — bypasses the generic suffix chain entirely
    // for this species, since something in that chain kept producing
    // wrong results here even when tested output looked correct.
    const s = (row.saved_name || "").toLowerCase();
    if (/small/.test(s)) return "gourgeist-small";
    if (/average/.test(s)) return "gourgeist-average";
    if (/large/.test(s)) return "gourgeist-large";
    if (/super/.test(s)) return "gourgeist-super";
    // "Jumbo" (and any other size this game invents beyond the four
    // real mainline sizes) has no PokeAPI entry — "NONE" stops here
    // rather than guessing a slug that will 404, falling back cleanly
    // to Champions' own numbers, the best source available for it.
    return "NONE";
  }
  return null;
}

export function derivePokeApiSlug(row) {
  const override = SAVED_NAME_OVERRIDES[row.saved_name];
  if (override?.pokeApiSlug) return override.pokeApiSlug;
  const special = matchSpecialForm(toId(row.saved_name || ""));
  if (special) return special.pokeApiSlug;
  const rowOverride = rowPokeApiSlugOverride(row);
  if (rowOverride === "NONE") return null; // explicitly no PokeAPI stats exist — caller falls back to Champions' own numbers
  if (rowOverride) return rowOverride;
  if (COSMETIC_ONLY_BASE_SPECIES.has(toId(row.base_name))) return toId(row.base_name);

  const base = toId(row.base_name);
  let s = (row.saved_name || "").trim();
  s = s.replace(/\s+(Form|Forme|Pattern|Flower|Breed|Variety)$/i, "").trim();

  let m;
  if ((m = s.match(/^Mega\s+.+?\s+([XYZ])$/i))) return `${base}-mega-${m[1].toLowerCase()}`;
  if (/^Mega\s+/i.test(s)) return `${base}-mega`;
  if (/^Alolan\s+/i.test(s)) return `${base}-alola`;
  if (/^Galarian\s+/i.test(s)) return `${base}-galar`;
  if (/^Hisuian\s+/i.test(s)) return `${base}-hisui`;
  if ((m = s.match(/^Paldean\s+.+?\s+(\w+)$/i))) return `${base}-paldea-${toId(m[1])}-breed`;
  if (/^Paldean\s+/i.test(s)) return `${base}-paldea`;

  const speciesTitle = titleCase(base);
  if (s.toLowerCase().startsWith(speciesTitle.toLowerCase())) {
    const suffix = s.slice(speciesTitle.length).trim();
    if (!suffix) return base;
    if (/^female$/i.test(suffix)) return `${base}-female`;
    if (/^(male|shield)$/i.test(suffix)) return base;
    // Average is the implicit default everywhere ELSE on this site
    // (Gourgeist/Pumpkaboo show as bare "Gourgeist" in the name/export),
    // but PokeAPI has no bare entry for these — it requires the explicit
    // "-average" suffix. Confirmed: slug is gourgeist-average.
    if (/^(average|medium)$/i.test(suffix)) return `${base}-average`;
    return `${base}-${toId(suffix)}`;
  }
  return base;
}

// True for anything this module has an opinion on — i.e. anywhere
// championsbattledata's own metadata should be treated as untrustworthy
// and overridden with the conventions above.
export function isSpecialForm(chaosKey){
  return matchSpecialForm(chaosKey) !== null
    || /^(.+?)-?(megax|megay|megaz|mega|alola|galar|hisui)$/i.test(chaosKey.toLowerCase());
}
