const { fork } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

class BuildWorkerPool {
  constructor(numWorkers = os.cpus().length - 1) {
    this.workers = [];
    this.queue = [];
    this.results = [];
    this.startTime = 0;

    console.log(`🏗️  Build Worker Pool (${numWorkers} workers)`);

    for (let i = 0; i < numWorkers; i++) {
      this.createWorker(i);
    }
  }

  createWorker(id) {
    const worker = {
      id,
      process: fork("./phase2-build/compile-worker.js"),
      busy: false,
    };

    worker.process.on("message", ({ file, output, duration }) => {
      console.log(`  ✅ [Worker ${id}] ${file} → ${output} (${duration}ms)`);

      this.results.push({ file, output, duration });
      worker.busy = false;
      this.processNext();
    });

    worker.process.on("error", (err) => {
      console.error(`  ❌ [Worker ${id}] Error:`, err.message);
      worker.busy = false;
      this.processNext();
    });

    this.workers.push(worker);
  }

  async build(srcDir, distDir) {
    this.startTime = Date.now();

    // 確保輸出目錄存在
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }

    // 取得所有 JS/JSX 檔案
    const files = this.getSourceFiles(srcDir);
    console.log(`\n📦 找到 ${files.length} 個檔案需要編譯\n`);

    // 加入佇列
    files.forEach((file) => {
      this.queue.push({
        inputFile: file,
        outputFile: path.join(distDir, path.basename(file)),
      });
    });

    // 開始處理
    this.processNext();

    // 等待完成
    await this.waitForCompletion();

    const totalTime = Date.now() - this.startTime;
    this.printSummary(totalTime);
  }

  getSourceFiles(dir) {
    const files = fs.readdirSync(dir);
    return files
      .filter((f) => f.endsWith(".js") || f.endsWith(".jsx"))
      .map((f) => path.join(dir, f));
  }

  processNext() {
    const freeWorker = this.workers.find((w) => !w.busy);

    if (freeWorker && this.queue.length > 0) {
      const task = this.queue.shift();
      freeWorker.busy = true;
      freeWorker.process.send(task);
    }
  }

  async waitForCompletion() {
    return new Promise((resolve) => {
      const check = setInterval(() => {
        const allFree = this.workers.every((w) => !w.busy);
        if (allFree && this.queue.length === 0) {
          clearInterval(check);
          resolve();
        }
      }, 100);
    });
  }

  printSummary(totalTime) {
    console.log("\n" + "=".repeat(50));
    console.log("📊 Build Summary");
    console.log("=".repeat(50));
    console.log(`總檔案數: ${this.results.length}`);
    console.log(`總耗時: ${totalTime}ms`);
    console.log(`平均每檔: ${(totalTime / this.results.length).toFixed(2)}ms`);
    console.log(`Workers: ${this.workers.length}`);

    const avgPerWorker =
      this.results.reduce((sum, r) => sum + r.duration, 0) /
      this.results.length;
    console.log(`Worker 平均處理時間: ${avgPerWorker.toFixed(2)}ms`);
    console.log("=".repeat(50) + "\n");
  }

  shutdown() {
    this.workers.forEach((w) => w.process.kill());
  }
}

// 執行 build
async function main() {
  console.log("=== Phase 2: 實際 Build 測試 ===\n");

  const pool = new BuildWorkerPool(4);

  await pool.build("./phase2-build/src", "./phase2-build/dist");

  pool.shutdown();
}

if (require.main === module) {
  main();
}

module.exports = BuildWorkerPool;
