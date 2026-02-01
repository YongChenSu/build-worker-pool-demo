# Phase 1: 基礎 Worker Pool

## 用意

用最簡單的例子展示**為什麼需要多線程**。

Node.js 是 single-threaded，一次只能做一件 CPU 密集的事。當你有 10 個耗時計算，單線程只能排隊一個一個跑，但 `fork()` 可以開多個子程序同時處理。

## 檔案說明

### `worker.js` — Worker 子程序

透過 `process.on("message")` 接收任務，執行 CPU 密集計算（迴圈跑 `Math.sqrt`），完成後用 `process.send()` 回傳結果給父程序。每個 worker 是一個獨立的 Node.js process。

### `simple-worker-pool.js` — Worker Pool 管理器

負責：
- `createWorkers()`：fork 指定數量的 worker 子程序
- `submit(task)`：把任務加入佇列
- `processQueue()`：找空閒 worker 派發任務，worker 完成後自動派下一個
- `waitForCompletion()`：等所有任務處理完
- `shutdown()`：kill 所有 worker

### `test-basic.js` — 測試入口

建立 4 個 worker 的 pool，提交 10 個 CPU 密集任務，等待全部完成後關閉 pool。用來驗證 worker pool 的基本運作流程。

## 學到的核心觀念

1. **Process 間通訊（IPC）** — parent 用 `worker.process.send()` 派任務，child 用 `process.send()` 回傳結果。這是 Node.js 多程序協作的基礎。

2. **Worker Pool 模式** — 不是每個任務都開一個新 process（成本太高），而是預先建好固定數量的 worker，用佇列分派任務。Worker 完成一個任務後自動接下一個。

3. **為 Phase 2 打基礎** — Phase 1 用假的 CPU 計算（`Math.sqrt` 迴圈）驗證 pool 機制可以運作，Phase 2 才把假計算換成真正的 Babel 編譯，套用到實際的 build 場景。

簡單說，Phase 1 是**概念驗證（POC）**，先理解 fork、IPC、佇列分派這些機制，再進到 Phase 2 做實際應用。
