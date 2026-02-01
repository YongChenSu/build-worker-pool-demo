const SimpleWorkerPool = require("./simple-worker-pool");

async function main() {
  console.log("=== Phase 1: 基礎 Worker Pool 測試 ===\n");

  // 建立 pool (使用 4 個 workers)
  const pool = new SimpleWorkerPool(4);

  // 提交 10 個任務
  console.log("\n📋 提交 10 個任務...\n");
  for (let i = 0; i < 10; i++) {
    pool.submit({
      data: `Task-${i}`,
      iterations: 10000000, // 調整這個數字來改變任務耗時
    });
  }

  // 等待所有任務完成
  await pool.waitForCompletion();

  console.log("\n✨ 所有任務完成!");
  pool.shutdown();
}

main();
