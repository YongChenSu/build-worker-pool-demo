const { fork } = require("child_process");
const os = require("os");

/**
 * 簡單的 Worker Pool 實作
 * 用途: 理解 worker pool 的核心概念
 */
class SimpleWorkerPool {
  constructor(numWorkers = os.cpus().length) {
    this.numWorkers = numWorkers;
    this.workers = [];
    this.queue = [];
    this.activeJobs = 0;

    console.log(`🚀 建立 Worker Pool,使用 ${numWorkers} 個 workers`);
    this.createWorkers();
  }

  /**
   * 建立指定數量的 worker processes
   */
  createWorkers() {
    for (let i = 0; i < this.numWorkers; i++) {
      const worker = {
        id: i,
        process: fork("./phase1-basic/worker.js"),
        busy: false,
      };

      // 監聽 worker 的訊息
      worker.process.on("message", (result) => {
        console.log(`✅ Worker ${worker.id} 完成任務: ${result.data}`);
        worker.busy = false;
        this.activeJobs--;

        // 處理佇列中的下一個任務
        this.processQueue();
      });

      worker.process.on("error", (err) => {
        console.error(`❌ Worker ${worker.id} 錯誤:`, err);
      });

      this.workers.push(worker);
      console.log(`  Worker ${i} 已就緒 (PID: ${worker.process.pid})`);
    }
  }

  /**
   * 提交任務到 pool
   */
  submit(task) {
    this.queue.push(task);
    this.processQueue();
  }

  /**
   * 處理任務佇列
   */
  processQueue() {
    // 找到空閒的 worker
    const freeWorker = this.workers.find((w) => !w.busy);

    if (freeWorker && this.queue.length > 0) {
      const task = this.queue.shift();
      freeWorker.busy = true;
      this.activeJobs++;

      console.log(`📤 分配任務給 Worker ${freeWorker.id}: ${task.data}`);
      freeWorker.process.send(task);
    }
  }

  /**
   * 等待所有任務完成
   */
  async waitForCompletion() {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.activeJobs === 0 && this.queue.length === 0) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  /**
   * 關閉 pool
   */
  shutdown() {
    console.log("🛑 關閉 Worker Pool...");
    this.workers.forEach((worker) => {
      worker.process.kill();
    });
  }
}

module.exports = SimpleWorkerPool;
