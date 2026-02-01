/**
 * Worker Process
 * 接收任務、處理、回傳結果
 */

process.on("message", (task) => {
  console.log(`  🔧 Worker ${process.pid} 開始處理: ${task.data}`);

  // 模擬耗時的工作 (例如編譯、壓縮等)
  const startTime = Date.now();
  let sum = 0;

  // CPU 密集型計算
  for (let i = 0; i < task.iterations || 1000000; i++) {
    sum += Math.sqrt(i);
  }

  const duration = Date.now() - startTime;

  // 回傳結果給 parent
  process.send({
    data: task.data,
    result: sum,
    duration: duration,
    pid: process.pid,
  });
});

console.log(`Worker ${process.pid} 已啟動`);
