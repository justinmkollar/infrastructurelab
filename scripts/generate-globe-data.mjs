import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';
import * as topojsonClient from 'topojson-client';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXPECTED_DATA_CENTER_COUNT = 9717;

function exactPair(pair) {
  if (!Array.isArray(pair) || pair.length < 2) return null;
  const lon = Number(pair[0]);
  const lat = Number(pair[1]);
  return Number.isFinite(lon) && Number.isFinite(lat) ? [lon, lat] : null;
}

function exactPath(points) {
  if (!Array.isArray(points)) return [];
  return points.map(exactPair).filter(Boolean);
}

function extractNestedCoordinatePaths(node, out = []) {
  if (!Array.isArray(node) || node.length === 0) return out;

  // A coordinate path is an array whose children are [longitude, latitude] pairs.
  if (
    Array.isArray(node[0]) &&
    node[0].length >= 2 &&
    typeof node[0][0] === 'number' &&
    typeof node[0][1] === 'number'
  ) {
    const path = exactPath(node);
    if (path.length > 1) out.push(path);
    return out;
  }

  for (const child of node) extractNestedCoordinatePaths(child, out);
  return out;
}

function geoJsonLinePaths(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'LineString') {
    const path = exactPath(geometry.coordinates);
    return path.length > 1 ? [path] : [];
  }
  if (geometry.type === 'MultiLineString') {
    return (geometry.coordinates || [])
      .map(exactPath)
      .filter((line) => line.length > 1);
  }
  if (geometry.type === 'GeometryCollection') {
    return (geometry.geometries || []).flatMap(geoJsonLinePaths);
  }
  return [];
}

function topoCountryPaths(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') {
    const path = exactPath(geometry.coordinates?.[0]);
    return path.length > 1 ? [path] : [];
  }
  if (geometry.type === 'MultiPolygon') {
    return (geometry.coordinates || [])
      .map((polygon) => exactPath(polygon?.[0]))
      .filter((ring) => ring.length > 1);
  }
  return [];
}

async function readExactDataCenters() {
  // This is the original 9,717-point Atlas globe dataset derived from
  // atlas_data_centers.csv. The chunks are gzip+base64 only to keep the
  // repository's text-file writes manageable; the decoded coordinates are
  // emitted as ordinary JSON and are never rounded or spatially binned.
  const chunkPaths = [
    path.join(root, 'src', 'data', 'globe-data-centers-exact.json.gz.b64'),
    path.join(root, 'src', 'data', 'globe-exact', 'dc-02.b64part'),
    path.join(root, 'src', 'data', 'globe-exact', 'dc-03.b64part'),
    path.join(root, 'src', 'data', 'globe-exact', 'dc-04.b64part'),
    path.join(root, 'src', 'data', 'globe-exact', 'dc-05.b64part'),
  ];
  const chunks = await Promise.all(chunkPaths.map((file) => readFile(file, 'utf8')));
  const encoded = chunks.join('').replace(/\s+/g, '');
  const decoded = gunzipSync(Buffer.from(encoded, 'base64')).toString('utf8');
  const points = JSON.parse(decoded).map(exactPair).filter(Boolean);

  if (points.length !== EXPECTED_DATA_CENTER_COUNT) {
    throw new Error(
      `Expected ${EXPECTED_DATA_CENTER_COUNT} original data-center coordinates; decoded ${points.length}`,
    );
  }
  return points;
}

async function loadCountryPaths() {
  // Prefer the Atlas repository's promoted low-poly boundaries. These preserve
  // their stored coordinate precision and are substantially more detailed than
  // the previous aggressively thinned 110m fallback.
  const boundaryUrl =
    'https://raw.githubusercontent.com/justinmkollar/atlasofdatacenterpolitics/main/data/processed/country_boundaries_poly_low.json';
  try {
    const response = await fetch(boundaryUrl, {
      headers: { 'user-agent': 'Infrastructure-Lab-site-build' },
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const records = await response.json();
    const paths = (Array.isArray(records) ? records : []).flatMap((record) =>
      extractNestedCoordinatePaths(record?.rings || []),
    );
    if (!paths.length) throw new Error('No country paths decoded');
    return paths;
  } catch (error) {
    console.warn(`[globe] Atlas boundary source unavailable; using local fallback: ${error.message}`);
    const worldPath = path.join(root, 'node_modules', 'world-atlas', 'countries-110m.json');
    const world = JSON.parse(await readFile(worldPath, 'utf8'));
    const collection = topojsonClient.feature(world, world.objects.countries);
    return collection.features.flatMap((item) => topoCountryPaths(item.geometry));
  }
}

async function loadCablePaths() {
  const cableUrl = 'https://www.submarinecablemap.com/api/v3/cable/cable-geo.json';
  try {
    const response = await fetch(cableUrl, {
      headers: { 'user-agent': 'Infrastructure-Lab-site-build' },
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const cableGeo = await response.json();
    const features = Array.isArray(cableGeo?.features) ? cableGeo.features : [];
    return features.flatMap((item) => geoJsonLinePaths(item.geometry));
  } catch (error) {
    console.warn(`[globe] Cable context unavailable; continuing without it: ${error.message}`);
    return [];
  }
}

const [dataCenters, countries, cables] = await Promise.all([
  readExactDataCenters(),
  loadCountryPaths(),
  loadCablePaths(),
]);

const outputDir = path.join(root, 'public', 'data');
await mkdir(outputDir, { recursive: true });
const outputPath = path.join(outputDir, 'atlas-globe-data.json');
await writeFile(outputPath, JSON.stringify({ countries, cables, dataCenters }));

console.log(
  `[globe] generated ${countries.length} country paths, ${cables.length} cable paths, ` +
    `${dataCenters.length} full-precision data-center points`,
);
