// Génère la carte de l'Afrique utilisée par l'application, à partir des données Natural Earth (world-atlas, 1:50m) :
//   - src/assets/africa-map.json : un tracé SVG par pays (code ISO alpha-2), pour la carte interactive ;
//   - public/africa-map.svg : le continent et ses frontières, en image de fond de toute l'application ;
//   - public/africa-mask.svg : la silhouette pleine, utilisée comme masque CSS dans les bandeaux.
// À relancer seulement si le découpage change :  node scripts/build-africa-map.mjs
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import countries from "i18n-iso-countries";
import { feature, merge } from "topojson-client";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const reference = JSON.parse(readFileSync(join(root, "../backend/config/reference/africa.json"), "utf8"));
const codes = new Set(reference.countries.map((c) => c.code));
const topology = JSON.parse(readFileSync(join(root, "node_modules/world-atlas/countries-50m.json"), "utf8"));
const world = feature(topology, topology.objects.countries).features;

// Somaliland n'a pas de code ISO dans Natural Earth : rattaché à la Somalie.
const alpha2 = (f) => (f.properties.name === "Somaliland" ? "SO" : f.id ? countries.numericToAlpha2(f.id) : undefined);
const african = world.filter((f) => codes.has(alpha2(f)));

const width = 800;
const height = 860;
const projection = geoNaturalEarth1().fitExtent([[10, 10], [width - 10, height - 10]], { type: "FeatureCollection", features: african });
const path = geoPath(projection).digits(1);

const paths = {};
for (const f of african) {
  const code = alpha2(f);
  paths[code] = (paths[code] ?? "") + path(f);
}
const missing = [...codes].filter((c) => !paths[c]);
if (missing.length) throw new Error(`Pays sans tracé : ${missing.join(", ")}`);

// Petits États insulaires : un repère circulaire pour qu'ils restent visibles et cliquables.
const markers = {};
for (const code of ["CV", "ST", "KM", "MU", "SC"]) {
  const f = african.find((x) => alpha2(x) === code);
  const [x, y] = path.centroid(f);
  markers[code] = [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

mkdirSync(join(root, "src/assets"), { recursive: true });
writeFileSync(join(root, "src/assets/africa-map.json"), JSON.stringify({ width, height, paths, markers }));

// Fond d'écran : précision entière, largement suffisante à cette échelle.
const rough = geoPath(projection).digits(0);
const silhouette = african.map((f) => rough(f)).join("");
writeFileSync(
  join(root, "public/africa-map.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><path d="${silhouette}" fill="#b5532f" fill-opacity=".07" stroke="#b5532f" stroke-opacity=".28" stroke-width="1.1" stroke-linejoin="round"/></svg>\n`,
);
// Silhouette pleine, utilisée comme masque CSS (les bandeaux la remplissent d'un dégradé) :
// frontières intérieures fusionnées en un seul contour, fichier bien plus léger.
const ids = new Set(african.map((f) => f.id ?? f.properties.name));
const outline = merge(topology, topology.objects.countries.geometries.filter((g) => ids.has(g.id ?? g.properties.name)));
writeFileSync(
  join(root, "public/africa-mask.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><path d="${rough(outline)}" fill="#000"/></svg>\n`,
);
console.log(`${Object.keys(paths).length} pays, ${Math.round(silhouette.length / 1024)} Ko de tracés`);
