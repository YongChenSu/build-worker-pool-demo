# Phase 2: 實際 Build 場景

## 用意

把 Phase 1 的 Worker Pool 概念套用到**真實的 Babel 編譯場景**，並用 benchmark 量化單線程 vs 多線程的效能差異。

## 檔案說明

### `compile-worker.js` — 編譯 Worker

Phase 1 的 `worker.js` 跑假計算，這裡換成真正的工作：接收檔案路徑，用 Babel 編譯 JS/JSX，寫入輸出檔，回報結果。每個 worker 是獨立 process，可以平行編譯不同檔案。

### `build-pool.js` — BuildWorkerPool

Phase 1 `SimpleWorkerPool` 的進化版，針對 build 場景強化：
- `build(srcDir, distDir)`：遞迴掃描源碼目錄，自動建立輸出目錄結構
- `processNext()`：用 `while` 迴圈一次填滿所有空閒 worker（Phase 1 只派一個）
- `waitForCompletion()`：event-driven，worker 完成時直接 resolve（Phase 1 用 100ms 輪詢）
- `printSummary()`：輸出編譯統計資訊

### `benchmark.js` — 效能比較

三個方案同場較量，編譯相同的檔案集合：

| 方案 | 說明 |
|------|------|
| 方案 1：單線程 | 主程序用 `babel.transformSync` 逐一編譯 |
| 方案 2：多線程 (2W / 4W) | fork 固定數量的 worker，佇列分派 |
| 方案 3：多線程 (自動核心數) | 同方案 2，但 worker 數量用 `os.cpus().length - 1` 自動偵測 |

輸出結果到各自獨立的資料夾（`dist/single/`、`dist/multi-2w/`、`dist/multi-4w/`、`dist/multi-Nw/`），方便對比編譯產物。

### `src/` — 測試源碼

包含 `app.js` 和 `components/` 下約 1000 個 JSX 檔案，用來產生足夠的編譯量讓 benchmark 有意義。

## 學到的核心觀念

1. **從 POC 到實際應用** — Phase 1 驗證了 fork + IPC + 佇列的機制，Phase 2 證明這套模式可以直接用在 Babel 編譯上，worker 只需把假計算換成 `babel.transformSync`。

2. **Worker 數量 vs 效能** — 不是越多 worker 越快。受限於 CPU 架構（P-core / E-core），超過物理核心數後效能不會再提升，反而增加 IPC 開銷。

3. **公平比較的重要性** — 三個方案必須編譯相同的檔案集合、輸出到獨立目錄，才能公平比較。遞迴掃描 vs 扁平掃描、檔名前綴 vs 保留目錄結構，這些細節都會影響結果的可信度。
