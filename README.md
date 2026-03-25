# Starmap 星系地图

一个基于 React + Three.js 的 3D 交互式星系地图可视化应用。

## 功能特性

- 3D 星系可视化：使用 Three.js 渲染星系、星体和连接线路
- 交互式操作：支持拖拽旋转、滚轮缩放、右键平移
- 系统详情：点击星体查看详细信息，包括星球列表、重力、温度、压力等
- 扇区导航：快速定位到不同扇区
- 派系标识：不同派系用不同颜色标识
- 设施显示：显示本地市场、商会、仓库、行政中心、造船厂等设施

## 技术栈

- **React 18** - UI 框架
- **Vite** - 构建工具
- **Three.js** - 3D 渲染引擎
- **@react-three/fiber** - React 的 Three.js 渲染器
- **@react-three/drei** - Three.js 辅助组件库

## 项目结构

```
starmap/
├── src/
│   ├── App.jsx                 # 主应用组件
│   ├── main.jsx                # 入口文件
│   ├── index.css               # 全局样式
│   ├── data/                   # 数据文件
│   │   ├── systems.csv         # 星系数据
│   │   ├── system_stars.json   # 星系详细信息
│   │   ├── system_planets.csv  # 星球数据
│   │   ├── system_links.csv    # 星系连接关系
│   │   ├── system_factions.json # 派系数据
│   │   └── planet_detail.csv   # 星球详细信息
│   └── utils/                  # 工具函数
│       ├── dataParser.js       # 数据解析器
│       ├── factionColors.js    # 派系颜色配置
│       └── sectorCalculator.js # 扇区计算
├── index.html
├── package.json
└── vite.config.js
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 预览生产构建

```bash
npm run preview
```

## 操作指南

| 操作 | 说明 |
|------|------|
| 左键拖拽 | 旋转视角 |
| 滚轮 | 缩放视图 |
| 右键拖拽 | 平移视图 |
| 点击星体 | 查看系统详情 |
| 点击扇区 | 快速定位到该扇区 |

## 派系颜色

- 🟢 **IC** - 绿色
- 🟡 **CI** - 黄色
- 🔵 **NC** - 蓝色
- 🔴 **AI** - 红色
- ⚪ **无** - 白色

## 数据来源

项目数据来源于游戏 [Prosperous Universe](https://prosperousuniverse.com/) 的公开数据。

## License

MIT
