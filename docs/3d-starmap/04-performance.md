# 04 · 渲染性能

## 4.1 性能预算

| 目标 | 帧预算 | 备注 |
|---|---|---|
| 60 fps @ 1080p,Chrome 桌面端 | 16.6 ms / 帧 | 总预算,含 React + Three |
| CPU 预算(JS + upload) | ≤ 8 ms | 留 GPU 8 ms |
| GPU 预算(draw + vertex) | ≤ 6 ms | 1080p 中端独显轻松 |

按视图模式:

| Mode | drawCall 预算 | 顶点预算 | 关键瓶颈 |
|---|---|---|---|
| galaxy | < 50 | < 200k | 4155 行星 InstancedMesh 重算 |
| system | < 30 | < 60k | 轨道环 LineSegments + 行星 + 恒星 |
| planet | < 20 | < 20k | 单行星 + 卫星 |

## 4.2 InstancedMesh + Float32Array

**为什么**:Three.js 单 mesh 4096 顶点,4155 行星 = 4155 drawCall → 严重掉帧。

**方案**:
- 行星:`<instancedMesh args={[null, null, instances.length]}>`(`@react-three/fiber` 写法)
- `instanceMatrix` 用 `Float32Array` 写入;每帧 `needsUpdate = true`
- `instanceColor` 用 `Float32Array` 写入颜色,材质 `vertexColors = true`
- 一次性创建 `sphereGeometry(1, 8, 8)` 复用,所有行星共享 geometry / material

```js
const mesh = new THREE.InstancedMesh(geo, mat, N);
mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
```

## 4.3 轨道预测 → Worker

**问题**:每帧 4155 行星 × 16 次牛顿迭代 ≈ 6.6 万次 sin/cos,在主线程 5~8 ms(逼近预算上限)。时间轴拖动时还要重算。

**方案**:开一个 Web Worker,持有全量行星 / 空间站轨道数据;主线程每帧:
1. 把 `currentGameTimeSec` 通过 `postMessage` 发给 worker
2. Worker 计算所有位置 → `Float32Array`(4155 × 3 顶点)
3. 写回 `SharedArrayBuffer` 或 `Transferable`(避免拷贝)

**SharedArrayBuffer 要求**:`COOP/COEP` headers(Vite dev server 配置 + Cloudflare Pages headers)。

```toml
# wrangler.toml
[[headers]]
  for = "/*"
  [headers.values]
    Cross-Origin-Opener-Policy = "same-origin"
    Cross-Origin-Embedder-Policy = "require-corp"
```

如果 SharedArrayBuffer 部署麻烦,**降级方案**:Worker 用 `postMessage` + Transferable,主线程每帧 stall ≤ 2 ms(4155 个 float = 50 KB transfer)。

## 4.4 时间轴推进节流

**拖动 slider 时**:不需要每像素重算 → 节流到 30 fps 重算(每 33 ms),或 `requestAnimationFrame` 内合并:

```js
let pendingTime = null;
function setTime(t) { pendingTime = t; if (!scheduled) requestAnimationFrame(flush); }
function flush() {
  scheduled = false;
  worker.postMessage({ time: pendingTime });
  pendingTime = null;
}
```

**播放模式**(rate = 3600×):每 60 帧(1 秒)发一次新时间,而不是每帧发。

## 4.5 LOD(细节层次)

| 距相机距离 | 渲染策略 |
|---|---|
| < 5 km | 完整 sphereGeometry(32 段)+ 卫星 + 轨道环亮显 |
| 5 ~ 100 km | sphereGeometry(16 段)+ 轨道环亮显 |
| 100 ~ 1000 km | sphereGeometry(8 段)+ 轨道环淡显 |
| > 1000 km | 全部 InstancedMesh 单点 + 轨道环隐藏 |

实现:用 drei `<Detailed>` 或手写 `useFrame` + distance check。

## 4.6 视口裁剪

`mode = 'galaxy'` 时,**不渲染恒星不在视口内的行星系**:

```js
const frustum = new THREE.Frustum();
const projScreenMatrix = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
frustum.setFromProjectionMatrix(projScreenMatrix);

// 每帧对每颗恒星做「半径 ~ 半长轴 × 2」的包围球检测
for (let i = 0; i < stars.length; i++) {
  if (frustum.intersectsSphere(starBounds[i])) {
    visibleIndices.push(i);
  }
}
```

`visibleIndices` 通过 InstancedMesh 的 `count` 属性设:

```js
mesh.count = visibleIndices.length;
// 配合 setColorAt / setMatrixAt 写入可见实例
```

## 4.7 内存预算

| 对象 | 大小 |
|---|---|
| 4155 行星矩阵 | 4155 × 16 floats = 264 KB |
| 4155 行星颜色 | 4155 × 3 floats = 50 KB |
| 4155 轨道环顶点 | 4155 × 128 × 3 = 6.4 MB |
| 4155 空间站 | 类似行星 |
| **合计** | **~15 MB**(可接受) |

**优化**:轨道环几何按星系分块 + 视口裁剪,常驻 GPU 的 < 2 MB。

## 4.8 字体 / 文本

复用 drei `<Text>`(sdf 字体)而非 CSS 覆盖层 — SDF 字体在 3D 缩放不会糊。drei 自带默认字体,但要打包到 dist(`@react-three/drei` 的 font 文件 > 100KB,放进 `public/fonts/`)。

## 4.9 Postprocessing

**v1 不启用** postprocessing(EffectComposer / Bloom)— 行星本身小、恒星点少;开了反而降低性能。

**预留接口**:`scene/postprocessing/` 目录先建空文件夹,后续按需加 UnrealBloom(仅在恒星处)。

## 4.10 性能验证手段

- `stats.js`(`import { Stats } from '@react-three/drei'`)+ `lighthouse` 报告
- `chrome://inspect` Performance 面板录制 10 秒拖动 + 播放
- `React DevTools Profiler` 看哪些组件 re-render 频繁
- 自带 FPS HUD:屏幕左上角小字 60.0/30.0/15.0,按 F 切换
