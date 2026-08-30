# 01 · 架构

## 1.1 设计目标

1. **真实轨道**:每颗行星 / 空间站按轨道根数 + 开普勒预测在指定时刻绘出真实位置(不预生成 baked 路径)。
2. **可时间旅行**:一条全局时间轴,任意 ±N 天推演,不卡顿。
3. **下钻**:点恒星 → 进星系视图(看见本星系所有行星 + 空间站);点行星 → 看行星系放大图(轨道环 + 卫星)。
4. **可复用**:尽量沿用现有 `dataParser.js` / `colors.js` / `filterUtils.js` / `PlanetSearch.jsx` / `PlanetCard.jsx`。
5. **不引入新数据源**:除 RUNCN 已导出的 `planets-orbit.json` / `star-masses.json` / `stations.json` / `planet-env.json` 之外,不引入额外网络请求。

## 1.2 三层架构

```
┌─────────────────────────────────────────────────────────────┐
│  UI 层 (React)                                              │
│    - Scene (Canvas, OrbitControls, postprocessing)          │
│    - HUD (TimeBar, SearchBox, FilterPanel, SystemDetail)    │
│    - PlanetSystemView (双层下钻的局部 scene)                │
└──────────────┬──────────────────────────────────────────────┘
               │ props / zustand
┌──────────────▼──────────────────────────────────────────────┐
│  场景状态层 (zustand stores)                                │
│    - galaxyStore:   已加载的恒星 + 行星 + 空间站(全量静态)  │
│    - timeStore:     当前时间戳 + 播放/暂停 + 速率          │
│    - viewStore:     当前 mode('galaxy'|'system'|'planet')   │
│                     + 选中的恒星/行星 + 相机 target         │
│    - routeStore:    已规划航线(后续里程碑)                 │
└──────────────┬──────────────────────────────────────────────┘
               │ 调用
┌──────────────▼──────────────────────────────────────────────┐
│  领域层 (纯 JS,无 React,无 Three.js)                       │
│    - orbit/      predictPosition, kepler, gameOrbitalToWorld│
│    - bodies/     恒星/行星/空间站 数据加载器与索引           │
│    - routes/     (后续) Dijkstra / gateway 航线             │
│    - time/       worldTime ↔ gameTime 换算                   │
└─────────────────────────────────────────────────────────────┘
```

**关键约束**:领域层 0 依赖 React/Three,可单测、可放到 Web Worker。可视化只是其渲染出口。

## 1.3 模块目录(规划)

```
starmap/src/
├── App.jsx                      ← 改:根路由(galaxy / system / planet)
├── main.jsx
├── orbit/                       ← 新增:轨道与时间(领域层)
│   ├── constants.js             ← GAME_REF, MOTION_FACTOR, G, ParsecLength
│   ├── kepler.js                ← solveKepler, trueAnomaly
│   ├── gameModel.js             ← gameOrbitalToWorld, predictPosition
│   └── time.js                  ← gameNow, gameToUnix, unixToGame
├── bodies/                      ← 新增:数据加载与索引
│   ├── loadOrbits.js            ← 拉 public/orbit/*.json + 索引
│   ├── loadStars.js             ← 系统恒星(继承 dataParser,但补坐标)
│   └── buildIndex.js            ← systemId → [planet...] / planet → parentStar
├── stores/                      ← 新增:zustand
│   ├── timeStore.js
│   ├── viewStore.js
│   └── galaxyStore.js
├── scene/                       ← 新增:Three.js 组件层
│   ├── GalaxyScene.jsx          ← 重写原 App 的 Canvas 部分
│   ├── SystemScene.jsx          ← 单星系视图
│   ├── PlanetSystemScene.jsx    ← 单行星系(轨道环 + 卫星)
│   ├── bodies/Star.jsx          ← 改:接受 hoverTime(动画)
│   ├── bodies/Planet.jsx        ← 新:InstancedMesh(全星系一份)
│   ├── bodies/OrbitRing.jsx     ← 新:LineSegments 椭圆环
│   ├── bodies/SpaceStation.jsx  ← 新
│   └── controls/                ← 新:CameraControls / FocusController
├── hud/                         ← 新增:HUD 组件
│   ├── TimeBar.jsx
│   ├── SearchPanel.jsx          ← 复用并扩展 PlanetSearch
│   ├── SystemDetailPanel.jsx    ← 复用 PlanetCard
│   └── FilterPanel.jsx          ← 复用 FilterControls
└── utils/                       ← 既有
    ├── dataParser.js            ← 复用,但 orbit 数据另起 loadOrbits.js
    ├── colors.js                ← 复用
    ├── filterUtils.js           ← 复用
    ├── sectorCalculator.js      ← 复用
    └── ...
```

**注**:`App.jsx` 不删除,但只保留路由 + 全局 HUD;Canvas 内全部交给 `scene/GalaxyScene.jsx`。`dataParser.js` 的恒星 / 系统 / 派系加载保留(不动)。

## 1.4 关键决策

| 决策点 | 选项 | 选择 | 理由 |
|---|---|---|---|
| 时间推进驱动 | rAF / setInterval / 自循环 | rAF + `useFrame` | 与 Three 同步,易暂停 / 倍速 |
| 全星系行星渲染 | 每行星独立 mesh / InstancedMesh | InstancedMesh | 4155 颗行星不可逐 mesh |
| 轨道环 | N 条 Line / 单 BufferGeometry | 单 BufferGeometry,所有环共享顶点缓冲 | drawCall 1 |
| 轨道预测位置 | 每帧重算 / 插值 | 行星只画当前位置(轨道环表达未来);空间站按时移动 | 4155 × kepler 可放后台 |
| 数据规模 | 全量预加载 / 视口内按需 | 全量预加载(JSON < 2 MB,可放 localStorage) | 简化 |
| 空间站轨道 | 内置 stations.json 即可 | 是(RUNCN 已导出) | 不再依赖游戏 DATA_DATA |
| 行星环境(用于颜色 / 大小) | FIO planet-env.json | 复用 RUNCN 的 `public/json/planet-env.json` 复制 | 已有 |
| 单位换算 | AU / km / 坐标系缩放 | 沿用 RUNCN:`pc = coord / 12`,行星系视图按 `km` 缩放 | 与 FTC 一致 |
| 状态管理 | Redux / zustand / Context | zustand | 轻量,与 rAF 解耦容易 |
| 路由 | react-router / 自实现 mode | 自实现 mode(galaxy/system/planet) | 三态足够 |

## 1.5 时间轴

**单位**:游戏世界时间(GAME_REF = 1451690603 起的「世界秒」,与 UTC 脱钩;所有渲染以 gameTime 推进)。
**输入**:`Date.now()` → `gameNow = Date.now()/1000 + gameClockOffset`,参考 RUNCN `orbit.ts:527`。starmap 默认 `offset = 0`(显示游戏世界时间,不跟随玩家本地)。
**控件**:
- 播放 / 暂停
- 倍速:`1× / 60× / 3600×(1s=1h)/ 86400×(1s=1d)`
- 拖动滑块到任意 ±N 天

**实现**:`timeStore` 持有 `currentGameTime`(秒)与 `playing / rate`。`useFrame` 每帧 `delta * rate` 累加;暂停即不累加。
**性能**:行星位置每帧重算会 OOM。详见 [04-performance.md](./04-performance.md) 的 Worker + 帧节流方案。

## 1.6 视图模式与下钻

| mode | 触发 | 视图 |
|---|---|---|
| `galaxy` | 默认 / 返回 | 全星系;恒星为球,行星 / 空间站按真实位置 InstancedMesh 绘制;轨道环可选 |
| `system` | 双击恒星 | 单恒星 + 行星 + 空间站放大;每行星带轨道环;行星间比例正确 |
| `planet` | 双击行星 | 单行星 + 其卫星(若 PRUN 有);通常一颗行星系只有 1~2 颗本体 + 轨道环 |

`viewStore.mode` 切换 → `CameraControls` 缓动到目标位置(`tween.js` 或手写 easeOut)。

## 1.7 与现有代码的兼容边界

- **不**改:`dataParser.js`、`colors.js`、`filterUtils.js`、`sectorCalculator.js`、`PlanetSearch.jsx`、`PlanetCard.jsx`、`PieChart.jsx`、`Legend.jsx`、`SectorNav.jsx`、`index.css`。
- **改**:`App.jsx`(瘦身为壳)、`Star.jsx`(提升到 `scene/bodies/`,加 hoverTime)。
- **新增**:见 1.3。
