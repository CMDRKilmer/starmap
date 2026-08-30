# 05 · 迭代路线与任务清单

## 5.1 里程碑总览

| Milestone | 范围 | 验收 |
|---|---|---|
| **M0 数据准备** | 把 RUNCN 的 4 个 JSON 拷到 starmap;验证 import 成功 | `loadOrbits()` 返回 4155 行星 + 1.4k 恒星 |
| **M1 轨道预测 + 星系视图行星层** | 移植 kepler / gameModel;4155 行星 InstancedMesh 在星系视图实时绘制 | 截图能看出 VH-331g 等几颗行星位置在动 |
| **M2 时间轴 + 恒星下钻** | TimeBar + SystemScene;点击恒星进入;看到该恒星所有行星 + 轨道环 | 双击恒星 → 平滑过渡 → 行星带轨道环 |
| **M3 空间站 + 行星系下钻** | 空间站 InstancedMesh;双击行星进 PlanetSystemScene | 显示空间站位置;双击行星进入单星系 |
| **M4 性能 / LOD / Worker** | 视口裁剪 + InstancedMesh + 共享内存 Worker | 60 fps 持续,内存 < 50 MB |
| **M5 航线叠加 + 与 RUNCN 互通** | 加载 RUNCN 导出的航线 JSON,叠加自然 / 网关航线 | 选定起终点 → 看到虚线航线 |
| **M6 (可选)航线规划** | 接入 RUNCN 的 Dijkstra,实时算最优 | 在 starmap 内选起终点,显示自然/网关规划 |

M0~M4 是核心,M5/M6 是扩展。

## 5.2 任务分解(可勾选)

### M0 · 数据准备

- [ ] 在 starmap 建 `public/orbit/` 目录
- [ ] 从 RUNCN `public/json/planets-orbit.json` 复制到 `starmap/public/orbit/`
- [ ] 从 RUNCN `public/json/star-masses.json` 复制到 `starmap/public/orbit/`
- [ ] 从 RUNCN `public/json/stations.json` 复制到 `starmap/public/orbit/`
- [ ] 从 RUNCN `public/json/planet-env.json` 复制到 `starmap/public/orbit/`
- [ ] 编写 `src/bodies/loadOrbits.js`(Map 索引,见 02 §2.5)
- [ ] 验证:`loadOrbits()` 在 App 启动后调用,console.log 出 `planets: 4155, stars: 14xx, stations: 5xxx`

### M1 · 轨道预测 + 行星层

- [ ] 新建 `src/orbit/constants.js`:`GAME_G` / `GAME_REF` / `GAME_MOTION_FACTOR` / `PARSEC_LENGTH`
- [ ] 新建 `src/orbit/kepler.js`:`solveKepler` + `trueAnomaly`
- [ ] 新建 `src/orbit/gameModel.js`:`gameOrbitalToWorld` + `predictPositionKm`
- [ ] 新建 `src/orbit/time.js`:`unixMsToGameSec` / `gameSecToUnixMs`
- [ ] 单元测试 / 单文件 demo:`vitest` 或一行 `node --input-type=module` 跑出几个已知的预测位置,与 RUNCN 的 `verify-orbit-model.mjs` 输出对得上
- [ ] 新建 `src/stores/galaxyStore.js`(zustand):全量恒星 + 行星 + 空间站(内存),`currentBodiesAt(time)` 计算
- [ ] 新建 `src/scene/bodies/Planet.jsx`:InstancedMesh 渲染 4155 行星
- [ ] 新建 `src/scene/bodies/Star.jsx`:把现有 `App.jsx` 里的 `Star` 抽出,接受 `getPosition(time)`
- [ ] 修改 `src/App.jsx`:把 `<Canvas>` 内星点 + 连接迁到 `src/scene/GalaxyScene.jsx`,恒星位置由 `galaxyStore` 提供

### M2 · 时间轴 + 下钻

- [ ] 新建 `src/stores/timeStore.js`:`currentGameTime` / `playing` / `rate` / `setTime` / `play/pause`
- [ ] 新建 `src/stores/viewStore.js`:`mode` / `focusedStarId` / `focusedPlanetId` / `goToStar` / `back`
- [ ] 新建 `src/hud/TimeBar.jsx`:底部固定条;slider + 播放 + 速率按钮
- [ ] 新建 `src/scene/controls/CameraTween.jsx`:mode 切换时缓动相机
- [ ] 新建 `src/scene/SystemScene.jsx`:单恒星 + 该星系行星 + 空间站 + 轨道环
- [ ] 新建 `src/scene/bodies/OrbitRing.jsx`:单 BufferGeometry LineSegments
- [ ] 改 `App.jsx`:`{mode === 'galaxy' && <GalaxyScene/>}{mode === 'system' && <SystemScene/>}`
- [ ] 在 `PlanetSearch.jsx` 加 `onSelect(systemId) → viewStore.goToStar(id)`
- [ ] 改 `App.jsx` 监听 viewStore.mode,在双击恒星时 setMode('system')

### M3 · 空间站 + 行星系下钻

- [ ] `src/scene/bodies/SpaceStation.jsx`:InstancedMesh + 简单几何(立方体 / 圆锥)
- [ ] 在 `SystemScene` 内追加空间站渲染
- [ ] 在 `SystemScene` 内给行星加 `onDoubleClick → viewStore.goToPlanet(id)`
- [ ] 新建 `src/scene/PlanetSystemScene.jsx`:单行星 + 卫星(若有)
- [ ] 新建 `src/scene/bodies/OrbitRing.jsx` LOD:近相机用 256 段,远 64 段

### M4 · 性能

- [ ] 新建 `src/scene/visibility.js`:frustum 裁剪,只渲染视口内恒星系
- [ ] `Star.jsx` / `Planet.jsx` 用 `mesh.count` 控制可见数
- [ ] 新建 `src/workers/orbitWorker.js`:Web Worker,持有轨道数据,响应 `predict(time) → Float32Array`
- [ ] 主线程 `galaxyStore` 接 Worker,`currentBodiesAt` 改为异步 + 缓存
- [ ] vite.config.js / wrangler.toml 加 COOP/COEP(为 SharedArrayBuffer)
- [ ] 性能验证:`vite build` 后用 `vite preview`,Chrome Performance 录制 10 秒 3600× 播放,确认 60 fps 稳定

### M5 · 航线叠加

- [ ] 设计航线 JSON schema(沿用 RUNCN `flightPlansStore` 导出格式)
- [ ] 新建 `src/bodies/loadRoutes.js`:从 public/orbit/routes.json 加载
- [ ] 新建 `src/scene/bodies/RouteLine.jsx`:LineSegments 渲染自然 / 网关航线
- [ ] `SystemScene` 与 `GalaxyScene` 内叠加航线(默认隐藏,菜单开关)
- [ ] 在 `SystemDetailPanel` 加「显示该星系航线」按钮

### M6 · 航线规划(可选)

- [ ] 移植 RUNCN `route-planner.ts` 的 Dijkstra → JS
- [ ] 新建 `src/hud/RoutePlanner.jsx`:起终点输入 → 调用 planner
- [ ] 在 3D 内绘制规划结果(自然 = 实线,网关 = 虚线)
- [ ] 显示里程 / 段时长(调 RUNCN `routeMetrics`)

## 5.3 单次可执行最小切片(1~2 天)

如果只想快速验证可行性:

1. M0(全部)+ M1 的前 5 项(领域层)→ 在 node REPL 跑出 `predictPositionKm` 与 RUNCN `verify-orbit-model.mjs` 对比
2. M1 的后 3 项(InstancedMesh 渲染)→ 浏览器里能看到 4155 行星点缓慢移动
3. 时间轴 + 播放 → 拖 slider 看位置变化

到这里就足够证明「3D 实时行星系地图」的核心可行性;M2 之后是体验打磨。

## 5.4 风险与决策点

| 风险 | 影响 | 缓解 |
|---|---|---|
| SharedArrayBuffer 部署问题 | Worker 性能受限 | 退到 Transferable Float32Array,实测够用 |
| RUNCN 内置 JSON 数据陈旧 | 部分新天体无轨道 | 提供 `scripts/fetch-fresh-orbits.mjs` 重新拉 |
| WebGL 在低端 GPU 撑不住 4155 行星 InstancedMesh | 掉帧 | LOD + 视口裁剪 |
| 时间轴拖动引起 main thread 阻塞 | UI 卡顿 | Worker + 节流(rAF 内合并) |
| 与 RUNCN 公式版本不同步 | 两边预测不一致 | 02 文档明确「抄自 RUNCN orbit.ts:478-501」,跟随更新 |

## 5.5 后续可考虑

- **分享 URL**:`?system=CH-131&time=...` 一键跳到指定星系 / 时刻
- **轨迹线**:行星过去 30 天位置用半透明拖尾展示(Line 段)
- **多目标对比**:同时显示 3 个星系的行星位置,辅助贸易路线选择
- **接入 FIO 在线实时**:`fetch('/planet/{id}')` 增量补缺(目前内置全量)
