import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { feature as topoFeature } from 'topojson-client';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const round = (value) => Math.round(Number(value) * 100) / 100;
const cleanPair = (pair) => [round(pair[0]), round(pair[1])];

function thinPath(points, maxPoints = 42) {
  if (!Array.isArray(points) || points.length < 2) return [];
  if (points.length <= maxPoints) return points.map(cleanPair);
  const step = Math.ceil((points.length - 1) / (maxPoints - 1));
  const out = [];
  for (let i = 0; i < points.length; i += step) out.push(cleanPair(points[i]));
  const last = cleanPair(points[points.length - 1]);
  const currentLast = out[out.length - 1];
  if (!currentLast || currentLast[0] !== last[0] || currentLast[1] !== last[1]) out.push(last);
  return out;
}

function exteriorPaths(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') {
    return geometry.coordinates?.[0] ? [thinPath(geometry.coordinates[0], 80)] : [];
  }
  if (geometry.type === 'MultiPolygon') {
    return (geometry.coordinates || [])
      .map((polygon) => polygon?.[0] ? thinPath(polygon[0], 80) : [])
      .filter((ring) => ring.length > 1);
  }
  return [];
}

function linePaths(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'LineString') return [thinPath(geometry.coordinates, 44)];
  if (geometry.type === 'MultiLineString') {
    return (geometry.coordinates || []).map((line) => thinPath(line, 44)).filter((line) => line.length > 1);
  }
  if (geometry.type === 'GeometryCollection') {
    return (geometry.geometries || []).flatMap(linePaths);
  }
  return [];
}

const worldPath = path.join(root, 'node_modules', 'world-atlas', 'countries-110m.json');
const world = JSON.parse(await readFile(worldPath, 'utf8'));
const countryCollection = topoFeature(world, world.objects.countries);
const countries = countryCollection.features.flatMap((item) => exteriorPaths(item.geometry));

const dcPath = path.join(root, 'src', 'data', 'globe-data-centers.json');
const dataCenters = JSON.parse(await readFile(dcPath, 'utf8'));

let cables = [];
const cableUrl = 'https://www.submarinecablemap.com/api/v3/cable/cable-geo.json';
try {
  const response = await fetch(cableUrl, {
    headers: { 'user-agent': 'Infrastructure-Lab-site-build' },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const cableGeo = await response.json();
  const features = Array.isArray(cableGeo?.features) ? cableGeo.features : [];
  cables = features.flatMap((item) => linePaths(item.geometry));
} catch (error) {
  console.warn(`[globe] Cable context unavailable; continuing without it: ${error.message}`);
}

const outputDir = path.join(root, 'public', 'data');
await mkdir(outputDir, { recursive: true });
const outputPath = path.join(outputDir, 'atlas-globe-data.json');
await writeFile(outputPath, JSON.stringify({ countries, cables, dataCenters }));
console.log(`[globe] generated ${countries.length} country paths, ${cables.length} cable paths, ${dataCenters.length} data-center points`);
