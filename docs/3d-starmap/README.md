# 3D 实时行星系地图 — 设计文档

本目录是为 `starmap`编写的 3D 实时行星系地图设计文档。starmap 现有项目是一个 React + Vite + Three.js (@react-three/fiber / @react-three/drei) 的「星系级」星图(目前只有恒星点 + 系统连线 + 派系颜色),**行星 / 空间站 / 实时位置 / 时间轴**均未实现。本组文档规划如何把它升级为「行星系级」实时地图。

## 文档导航

| 文件                                                                 | 内容                                         |
| ------------------------------------------------------------------ | ------------------------------------------ |
| [01-architecture.md](./01-architecture.md)                         | 整体架构、分层与模块边界、关键决策                          |
| [02-data-and-orbit.md](./02-data-and-orbit.md)                     | 数据模型(恒星/行星/空间站)、轨道预测与坐标系、FIO/DATA\_DATA 来源 |
| [03-interaction-and-timeline.md](./03-interaction-and-timeline.md) | 相机控制、拾取、聚焦、时间轴 UI、航线/跃迁叠加                  |
| [04-performance.md](./04-performance.md)                           | 渲染性能预算、InstancedMesh、worker、内存             |
| [05-roadmap-and-tasks.md](./05-roadmap-and-tasks.md)               | 迭代里程碑 + 可勾选任务清单                            |

## 目标与边界

**做**:在已有星系骨架上加一颗一颗(和空间站)真实轨道运行的行星 / 空间站;支持时间轴(过去 / 现在 / 未来)整体推演;点击行星下钻到行星系视图;接入 RUNCN 的轨道预测代码,做离线轨道计算。

**不做**:不做燃料计算(FTC 仍在 RUNCN 侧)、不做游戏客户端注入、不做服务器航线实时同步(本项目是独立运行时 + 公开数据)。

## 项目现状摘要

| 模块                                | 现状                                                                                                    | 备注               |
| --------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------- |
| `src/App.jsx`                     | 单一 `<Canvas>` 渲染 `Star`(恒星球) + `SystemLinks`(系统连线) + `SectorBounds`                                   | 缺行星层             |
| `src/utils/dataParser.js`         | 从 `CMDRKilmer/fiodata` GitHub 拉 CSV/JSON,缓存 `systems / links / planets / planetsDetail / factionData` | 已缓存行星静态数据(无轨道根数) |
| `src/utils/sectorCalculator.js`   | 按 SectorId 分组 + 紧凑包围盒                                                                                 | 适用               |
| `src/components/PlanetSearch.jsx` | 文本 + 多维度筛选(重力 / 温度 / 压力 / 资源 / 肥沃)                                                                    | 可复用              |
| `src/components/PlanetCard.jsx`   | 行星信息卡片                                                                                                | 可复用              |
| `src/components/PieChart.jsx`     | SVG 资源饼图                                                                                              | 可复用              |
| `src/utils/colors.js`             | 派系色、矿物色、UI 主题                                                                                         | 可复用              |
| `src/utils/filterUtils.js`        | `applyPlanetFilters`                                                                                  | 可复用              |

依赖:`react@18`、`@react-three/fiber@8`、`@react-three/drei@9`、`three@0.160`、`prop-types`。构建 `vite@5`,Cloudflare Pages 部署(`wrangler.toml` 已就位)。

## 与 RUNCN 的关系

RUNCN 是浏览器扩展,其 `src/infrastructure/fio/orbit.ts` 已实现:

- 行星轨道根数(`semiMajorAxis / eccentricity / inclination / rightAscension / periapsis`)
- 游戏同款开普勒预测 `predictPosition(naturalId, timestampMs)`
- 恒星坐标 + `pcBetween`、内置 `planets-orbit.json`、`stations.json`、`star-masses.json`

starmap 是独立运行时(Vite SPA),**不能**直接 import RUNCN 的 TS。但两件事可以共用:

1. **算法公式**:开普勒方程、牛顿迭代、`gameOrbitalToWorld` 是纯函数,可移植到 `starmap/src/orbit/`(JS 版),详见 [02-data-and-orbit.md](./02-data-and-orbit.md)。
2. **数据生成产物**:RUNCN 的 `scripts/build-planet-data.mjs` / `build-star-masses.mjs` / `build-station-data.mjs` 已产出与 FIO 字段同构的 JSON,可复制或重新从 FIO 拉到 `starmap/public/orbit/`。

## 阅读顺序建议

1. 先读 [01-architecture.md](./01-architecture.md) 建立心智模型
2. 再读 [02-data-and-orbit.md](./02-data-and-orbit.md) 看数据怎么来、怎么算
3. 然后 [03-interaction-and-timeline.md](./03-interaction-and-timeline.md) 和 [04-performance.md](./04-performance.md) 看 UI / 性能
4. 最后 [05-roadmap-and-tasks.md](./05-roadmap-and-tasks.md) 决定从哪个里程碑开始

