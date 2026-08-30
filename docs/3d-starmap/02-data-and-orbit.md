# 02 · 数据模型与轨道预测

## 2.1 数据源总览

| 数据 | 来源 | 用途 | 体积 |
|---|---|---|---|
| 恒星坐标 + 名称 + 类型 + SectorId | FIO `systemstars_allstars.json` / GitHub 镜像 | 全星系骨架 | ~4k 行 JSON |
| 恒星连接(自然跃迁) | FIO `csv_systemlinks.csv` | 自然航线边 | ~8k 行 |
| 派系 → 恒星 / 行星 | FIO `system_factions.json` | 颜色 / 过滤 | ~10k 行 |
| 行星静态元数据 | FIO `csv_systemplanets.csv` + `csv_planetdetail.csv` + `csv_planetresources.csv` | 行星卡 / 筛选 | ~4k × 5 列 |
| **行星轨道根数** | FIO `/planet/{id}` 或 RUNCN `public/json/planets-orbit.json` | 实时位置 | 4155 行星,每条 ~80B |
| **恒星质量** | FIO `/systemstars/star/{id}` 或 RUNCN `public/json/star-masses.json` | 开普勒 n 计算 | ~1.4k 条 |
| **空间站 + 轨道** | RUNCN `public/json/stations.json`(无 FIO 来源) | 空间站位置 | ~5k 条 |
| **行星环境(半径 / 气压)** | RUNCN `public/json/planet-env.json`(FIO `PlanetFull` 导出) | 行星大小 / 颜色 | ~4k 条 |

**关键**:已有项目 `dataParser.js` 已缓存恒星 / 行星 / 资源 / 派系;新增 **轨道数据 + 空间站 + 行星环境** 三类即可。详见 2.5。

## 2.2 复用 RUNCN 的导出物

将以下文件从 RUNCN 复制到 `starmap/public/orbit/`(或同目录结构):

```
RUNCN/public/json/
├── planets-orbit.json   →  starmap/public/orbit/planets-orbit.json
├── star-masses.json     →  starmap/public/orbit/star-masses.json
├── stations.json        →  starmap/public/orbit/stations.json
└── planet-env.json      →  starmap/public/orbit/planet-env.json
```

各文件格式参考 RUNCN 源代码:
- [orbit.ts:155-167](file:///c:/Users/kilsa/Desktop/code/%E7%90%89%E7%92%83/RUNCN/src/infrastructure/fio/orbit.ts#L155-L167) 行星 `BundledPlanet = { n, a, e, i, o, p, m, s? }`
- [orbit.ts:170-181](file:///c:/Users/kilsa/Desktop/code/%E7%90%89%E7%92%83/RUNCN/src/infrastructure/fio/orbit.ts#L170-L181) 空间站 `BundledStation = { s, a, e, i, o, p }`
- 恒星 `{ n, m }`
- 行星环境 `{ r: km, p?: pressure }`

> 如果 starmap 想自给自足(不依赖 RUNCN),参见 2.6「独立预取脚本」。

## 2.3 坐标系与单位

**两类坐标系,严格区分**:

| 坐标系 | 来源 | 单位 | 用于 |
|---|---|---|---|
| **世界坐标**(恒星位置) | FIO `systemstars.PositionX/Y/Z` | 游戏坐标单位(1 unit = 1/12 pc,实测 `ParsecLength = 12`) | 星系视图位置 |
| **轨道坐标**(相对恒星) | 轨道根数算出来的位置 | 米(轨道根数 a 单位是 m),转换到 km 输出 | 单星系视图 |

**游戏 forward 旋转**(同 RUNCN `orbit.ts:453-471`):

```
R3(-Ω) · R1(+i) · R3(-ω) · (r·cosν, r·sinν, 0)
然后 x/y 交换 + /1000 → km
```

⚠️ **历史踩坑**:旧实现用反角(等价逆旋转),与服务器 transferEllipse 误差 5~10M km。starmap 直接抄 `R1(+i)` 正向旋转,与服务器坐标对齐。

**恒星距离**:`pcBetween = distance3d(a, b) / 12`(RUNCN `route-model.ts:62-69`)。starmap 在星系视图沿用;在行星系视图按 km 缩放。

## 2.4 开普勒预测(移植 RUNCN 公式)

**核心**(全部来自 [orbit.ts:478-501](file:///c:/Users/kilsa/Desktop/code/%E7%90%89%E7%92%83/RUNCN/src/infrastructure/fio/orbit.ts#L478-L501)):

```js
// src/orbit/constants.js
export const GAME_G = 6.67384e-11;          // SI
export const GAME_REF = 1451690603;          // Unix 秒,游戏世界时间历元
export const GAME_MOTION_FACTOR = 20;        // PlanetaryMotionFactor
export const PARSEC_LENGTH = 12;             // 1 pc = 12 坐标单位
```

```js
// src/orbit/kepler.js
// 解开普勒方程 M = E − e·sinE
export function solveKepler(meanAnomaly, e) {
  const M = meanAnomaly % (2 * Math.PI);
  let E = e < 0.8 ? M : Math.PI;
  for (let i = 0; i < 16; i++) {
    const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= d;
    if (Math.abs(d) < 1e-10) break;
  }
  return E;
}

export function trueAnomaly(E, e) {
  return Math.atan2(Math.sqrt(1 - e * e) * Math.sin(E), Math.cos(E) - e);
}
```

```js
// src/orbit/gameModel.js
import { GAME_G, GAME_REF, GAME_MOTION_FACTOR } from './constants';

function rotZ(v, th) {
  const c = Math.cos(th), s = Math.sin(th);
  return { x: c * v.x - s * v.y, y: s * v.x + c * v.y, z: v.z };
}
function rotX(v, th) {
  const c = Math.cos(th), s = Math.sin(th);
  return { x: v.x, y: c * v.y - s * v.z, z: s * v.y + c * v.z };
}

// 轨道面 → 世界:R3(-ω)·R1(+i)·R3(-Ω)
function gameOrbitalToWorld(p, { inclination: i, rightAscension: o, periapsis: w }) {
  let v = rotZ(p, -w);
  v = rotX(v, i);     // ⚠️ 正向旋转,与服务器坐标一致
  return rotZ(v, -o);
}

export function predictPositionKm(orbit, parentMassKg, gameTimeSec) {
  const n = Math.sqrt((GAME_G * parentMassKg) / Math.pow(orbit.semiMajorAxis, 3));
  const M = n * gameTimeSec;
  const E = solveKepler(M, orbit.eccentricity);
  const nu = trueAnomaly(E, orbit.eccentricity);
  const r = orbit.semiMajorAxis * (1 - orbit.eccentricity * Math.cos(E));
  const offset = gameOrbitalToWorld(
    { x: r * Math.cos(nu), y: r * Math.sin(nu), z: 0 },
    orbit
  );
  // 米 → 千米 + x/y 交换
  return { x: offset.y / 1e3, y: offset.x / 1e3, z: offset.z / 1e3 };
}
```

```js
// src/orbit/time.js
import { GAME_REF } from './constants';

// Unix ms ↔ gameTime(秒,与 GAME_REF 同源)
export function unixMsToGameSec(ms) {
  const unixSec = ms / 1000;
  return GAME_REF + (unixSec - GAME_REF) * GAME_MOTION_FACTOR;
}
export function gameSecToUnixMs(sec) {
  return (GAME_REF + (sec - GAME_REF) / GAME_MOTION_FACTOR) * 1000;
}
export function gameNowFromUnixMs(unixMs, offsetMs = 0) {
  return unixMsToGameSec(unixMs + offsetMs);
}
```

**与 RUNCN 的差异**:
1. 不需要 `resolveParent`(本项目从数据索引直接拿 `parentStarId`)。
2. 不需要 `predictWithGameModel` 的 cache / LRU,只读 plain object。

## 2.5 数据加载与索引(规划)

**目标**:加载完成后,O(1) 取出:
- `getStar(systemId)` → `{ id, name, position, mass, sectorId, ... }`
- `getStarPlanets(systemId)` → `Planet[]`
- `getStarStations(systemId)` → `Station[]`
- `getPlanetOrbit(planetNaturalId)` → `Orbit`
- `getStationOrbit(stationNaturalId)` → `Orbit`
- `getPlanetEnv(planetNaturalId)` → `{ radiusKm, pressure }`
- `searchPlanets(filter)` → 复用 `applyPlanetFilters`

### 数据流

```js
// src/bodies/loadOrbits.js
import planetsOrbit from '../../public/orbit/planets-orbit.json';
import starMasses from '../../public/orbit/star-masses.json';
import stations from '../../public/orbit/stations.json';

export async function loadOrbits() {
  // 4155 行星 + ~5k 空间站 + 1.4k 恒星 → 一次性 import + 索引
  const planetOrbits = new Map();
  for (const p of planetsOrbit) {
    planetOrbits.set(p.n.toUpperCase(), {
      naturalId: p.n.toUpperCase(),
      semiMajorAxis: p.a,  // m
      eccentricity: p.e,
      inclination: p.i,    // rad
      rightAscension: p.o,
      periapsis: p.p,
      massKg: p.m,
      systemId: p.s?.toUpperCase()
    });
  }

  const stars = new Map();
  for (const s of starMasses) {
    stars.set(s.n.toUpperCase(), { naturalId: s.n.toUpperCase(), massKg: s.m });
  }

  const stationOrbits = new Map();
  for (const [id, st] of Object.entries(stations)) {
    const key = id.toUpperCase();
    if (st.a !== undefined && st.a > 0) {
      stationOrbits.set(key, {
        naturalId: key,
        semiMajorAxis: st.a, eccentricity: st.e ?? 0,
        inclination: st.i ?? 0, rightAscension: st.o ?? 0, periapsis: st.p ?? 0,
        massKg: 0,
        systemId: st.s.toUpperCase()
      });
    }
  }
  return { planetOrbits, stars, stationOrbits };
}
```

**索引**:`buildIndex.js` 跨 `dataParser` 缓存与轨道:
- `systemId → [planetNaturalId]`(已有 `systemsPlanetsMap`)
- `planetNaturalId → systemId`(从 naturalId 剥尾字母)
- `stationNaturalId → systemId`(来自 `stations.json` 的 `s` 字段)

## 2.6 独立预取脚本(可选)

如果不想复用 RUNCN 的 JSON,可在 starmap 仓库内独立生成:

```
scripts/
├── fetch-planet-orbits.mjs   ← FIO /planet/{id} × 4155,低并发
├── fetch-star-masses.mjs     ← FIO /systemstars/star/{id}
├── fetch-station-orbits.mjs  ← 没有 FIO 端点 → 只能从 RUNCN 复制
└── build-index.mjs           ← 输出 public/orbit/*.json
```

实现参考 RUNCN [scripts/build-planet-data.mjs](file:///c:/Users/kilsa/Desktop/code/%E7%90%89%E7%92%83/RUNCN/scripts/build-planet-data.mjs) 与 [scripts/build-star-masses.mjs](file:///c:/Users/kilsa/Desktop/code/%E7%90%89%E7%92%83/RUNCN/scripts/build-star-masses.mjs)。FIO 端点:

```
GET https://rest.fnar.net/planet/{PlanetNaturalId}
GET https://rest.fnar.net/systemstars/star/{StarNaturalId}
GET https://rest.fnar.net/global/simulationdata   ← PlanetaryMotionFactor
```

## 2.7 渲染数据输出

每帧,场景需要的是「此刻所有行星 / 空间站的世界坐标」。我们**不**在领域层做 Three.js,只产 plain object 数组:

```js
// 伪代码
function snapshotBodiesAt(gameTimeSec) {
  const out = [];
  for (const planet of galaxyStore.planets) {
    const orbit = orbits.get(planet.naturalId);
    const star = stars.get(orbit.systemId);
    if (!orbit || !star) continue;
    const km = predictPositionKm(orbit, star.massKg, gameTimeSec);
    out.push({ kind: 'planet', id: planet.naturalId, posKm: km, parent: orbit.systemId });
  }
  for (const st of galaxyStore.stations) {
    const orbit = stationOrbits.get(st.naturalId);
    const star = stars.get(orbit.systemId);
    if (!orbit || !star) continue;
    const km = predictPositionKm(orbit, star.massKg, gameTimeSec);
    out.push({ kind: 'station', id: st.naturalId, posKm: km, parent: orbit.systemId });
  }
  return out;
}
```

**性能**:4155 行星 × 16 次牛顿迭代 ≈ 7 万次正弦/余弦;现代 V8 < 5 ms/次。详见 [04-performance.md](./04-performance.md)。

## 2.8 数据规模评估

| 文件 | 大小(估算) | 备注 |
|---|---|---|
| `planets-orbit.json` | ~350 KB(4155 × ~85B) | 含 a/e/i/o/p/m |
| `star-masses.json` | ~40 KB(1400 × ~30B) | |
| `stations.json` | ~600 KB(5k × ~120B,作为 dict) | |
| `planet-env.json` | ~200 KB | 4k × 50B |

合计 < 1.2 MB gzip,~5 MB 加载完内存。可以直接放进 localStorage 与 IndexedDB,二次访问 < 100 ms。
