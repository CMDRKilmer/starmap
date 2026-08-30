# 03 · 交互、时间轴、视图模式

## 3.1 三种视图模式

| Mode | 触发 | 范围 | 单位 | 性能目标 |
|---|---|---|---|---|
| `galaxy` | 默认 / Esc | 全星系(4155 行星 + 5k 空间站) | pc(world) | 60 fps |
| `system` | 双击恒星 / 点击星球列表 | 单恒星 + 行星 + 空间站 | km(相对恒星) | 60 fps |
| `planet` | 双击行星 | 单行星 + 卫星(若有) | km(相对行星) | 60 fps |

`viewStore` 持有当前 mode、target、focusedPlanetId。`App.jsx` 根据 mode 渲染对应 `<Canvas>` 与 HUD。

## 3.2 相机控制

复用 `@react-three/drei` 的 `OrbitControls`(`enableDamping`、`minDistance`、`maxDistance` 按 mode 动态调整)。在 mode 切换时,**不**直接 teleport,而是缓动到目标位置:

```js
// scene/controls/CameraTween.jsx(伪代码)
function easeInOut(t) { return t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t; }

useFrame((state, dt) => {
  if (tweenRef.current) {
    const t = Math.min(1, (elapsed / duration));
    camera.position.lerpVectors(start, end, easeInOut(t));
    if (t === 1) tweenRef.current = null;
  }
});
```

**焦点距离预算**(经验值):

| Mode | minDistance | maxDistance | 初始 distance |
|---|---|---|---|
| galaxy | 50 (world) | 3000 (world) | 800 (沿用现 App) |
| system | 0.05 (km → 但实际用半长轴 × 3) | 30 (km 同尺度) | star.planetMaxOrbitKm × 1.2 |
| planet | 0.001 | 5 (km) | planet.radiusKm × 6 |

> km 数值与 Three.js 单位转换:`1 km = 1 unit`;半长轴 `a(m) / 1000 = aKm`,直接做距离。

## 3.3 拾取(hover / click)

**星系数**:4155 行星 InstancedMesh + 5k 空间站 InstancedMesh → 用 `raycaster.intersectObject` 命中 `instanceId`,O(1) 查表。

```js
// scene/bodies/Planet.jsx
function Planets({ instances }) {
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useLayoutEffect(() => {
    for (let i = 0; i < instances.length; i++) {
      dummy.position.set(instances[i].posKm.x, instances[i].posKm.y, instances[i].posKm.z);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [instances]);

  return (
    <instancedMesh ref={meshRef} args={[null, null, instances.length]}
      onClick={e => viewStore.focusPlanet(instances[e.instanceId].id)}
      onPointerOver={e => setHovered(e.instanceId)}
    >
      <sphereGeometry args={[radius, 8, 8]} />
      <meshBasicMaterial color={color} />
    </instancedMesh>
  );
}
```

**恒星**:保持现有 `Star.jsx` 独立 mesh,因为数量小(< 1.4k)且每颗要响应 hover / click 显示卡片。

## 3.4 时间轴 UI

**布局**:底部固定条,与现有 `Legend` 同行或叠在 `Legend` 上方。

```
[⏮] [▶/⏸] 1× [60×] [3600×] [86400×]   |———●————————————|  2026-08-30 12:34 UTC
                                          ^slider
```

**数据来源**:`timeStore.currentGameTime`(秒)。HUD 显示用 `gameSecToUnixMs + Date(0)` 转可读时间。

**操作**:
- 拖动 slider → 立即设置 currentGameTime,暂停播放
- 点速率按钮 → 切换 `rate`
- ▶/⏸ → 切换 `playing`

**与 store 同步**:slider 用受控值,松手后写回 store(避免每帧 setState)。

## 3.5 星球列表 / 搜索 / 筛选

**复用现有** `PlanetSearch.jsx`、`FilterControls.jsx`、`applyPlanetFilters`。

**新增**:搜索结果跳转 — 点击搜索结果时:
- `viewStore.setMode('system')`
- `viewStore.setTargetStar(systemId)`
- `CameraTween` 飞到该恒星

## 3.6 系统详情面板

**复用现有** `PlanetCard.jsx`、`PieChart.jsx`(作为资源分布展示)。

**新增**:`SystemDetailPanel.jsx`:
- 恒星名 / 类型 / 派系色
- 行星列表(每个行星一行 mini card,可点击下钻)
- 空间站列表(若有)
- 该星系所有「行星名 → 资源饼图」的折叠区

## 3.7 轨道环(OrbitRing)

**单 BufferGeometry** 装下本星系所有轨道环:

```js
// scene/bodies/OrbitRing.jsx
function buildOrbitsGeometry(planets) {
  // 每条轨道 128 段 → 129 个点 → 组成 LineSegments 的 pair
  // 顶点累计 = Σ (planetCount × 128 × 2)
  // 颜色存到 instanceColor
  const positions = [];
  const colors = [];
  for (const p of planets) {
    const orbit = getOrbit(p.naturalId);
    if (!orbit) continue;
    const pts = sampleOrbit(orbit, 128); // 返回 Vec3[]
    for (let i = 0; i < pts.length - 1; i++) {
      positions.push(...pts[i], ...pts[i + 1]);
      colors.push(...tierColor(p), ...tierColor(p));
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return geo;
}
```

**采样轨道环**:对每条轨道,沿时间均匀取 128 个 gameTimeSec → predictPosition → 顶点列表 → 缓存(轨道形状不变,只采样一次)。

**性能**:4155 行星 × 128 = 53 万顶点,在视口外的不渲染(InstancedMesh 同款 LOD:按 distance to camera 切线宽 / opacity)。

## 3.8 行星颜色 / 大小映射

| 属性 | 来源 | 颜色 / 大小 |
|---|---|---|
| 半径 | `planet-env.json` 的 `r` | 大小 ∝ `log10(rKm)`,`rKm ∈ [2000, 14000]` → 单位球 × [0.3, 1.5] |
| 气压 | `planet-env.json` 的 `p` | 色相 ∝ `p`(蓝→绿→黄→红);缺省灰 |
| 温度 | FIO `planet_detail.Temperature` | 同上辅助 |
| 类型(岩/气) | FIO `Surface` | 灰偏蓝(气)/ 偏褐(岩) |

复用 `getEnvColor`(colors.js)做阈值染色,但 3D 端用更细的连续色阶,新写一个 `planetColor(env)` 工具。

## 3.9 航线(后续里程碑)

`mode = 'system' / 'galaxy'` 下,可叠加:
- 自然航线(由 `star-connections.json` / 现有 `links` 数据)
- 网关航线(无静态数据,需要玩家在 RUNCN 观测后导出 JSON 喂入 — 不在 v1 范围)
- 玩家自有航线:从 RUNCN 的 `flightPlansStore` 导出 JSON(后续)

航线渲染 = `Line` / `LineSegments`(淡蓝,虚线表示网关、实线表示自然)。

## 3.10 视图状态机伪代码

```js
// stores/viewStore.js
export const useViewStore = create((set, get) => ({
  mode: 'galaxy',
  focusedStarId: null,
  focusedPlanetId: null,
  cameraTarget: new Vector3(0, 0, 0),
  goToStar: (id) => set({ mode: 'system', focusedStarId: id, focusedPlanetId: null }),
  goToPlanet: (id) => set({ mode: 'planet', focusedPlanetId: id }),
  back: () => {
    const s = get();
    if (s.mode === 'planet') set({ mode: 'system', focusedPlanetId: null });
    else if (s.mode === 'system') set({ mode: 'galaxy', focusedStarId: null });
  },
}));
```

## 3.11 与现有 `<Legend>` / `<SectorNav>` / `<PlanetSearch>` 的叠放

保持绝对定位布局。`App.jsx` 中:

```jsx
<>
  <Canvas>{renderSceneByMode(view.mode)}</Canvas>
  <TopBar />
  <PlanetSearch ... onSelect={view.goToStar} />
  <SectorNav ... onSectorClick={...} />
  <TimeBar />
  <SystemDetailPanel />
  <Legend />
</>
```

不删除任何已有 HUD;只新增 `TimeBar` 与 `SystemDetailPanel`,并把搜索结果点击行为接通到 `viewStore.goToStar`。
