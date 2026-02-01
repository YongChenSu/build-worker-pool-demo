const { fork } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const babel = require("@babel/core");

/**
 * Benchmark: 比較單線程 vs 多線程編譯效能
 */

const srcDir = path.join(__dirname, "src");
const distDir = path.join(__dirname, "dist");

// 確保目錄存在
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// 取得所有要編譯的檔案
function getSourceFiles(dir = srcDir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(getSourceFiles(fullPath));
    } else if (entry.name.endsWith(".js") || entry.name.endsWith(".jsx")) {
      results.push(fullPath);
    }
  }
  return results;
}

// ========================================
// 方案 1: 單線程編譯 (Sequential)
// ========================================
async function singleThreadBuild() {
  console.log("1️⃣  單線程編譯 (Sequential)\n");

  const files = getSourceFiles();
  const startTime = Date.now();

  const outDir = path.join(distDir, "single");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  for (const file of files) {
    const code = fs.readFileSync(file, "utf-8");

    const result = babel.transformSync(code, {
      presets: ["@babel/preset-env", "@babel/preset-react"],
      filename: file,
    });

    const relativePath = path.relative(srcDir, file);
    const outputFile = path.join(outDir, relativePath);
    const outputFileDir = path.dirname(outputFile);
    if (!fs.existsSync(outputFileDir))
      fs.mkdirSync(outputFileDir, { recursive: true });
    fs.writeFileSync(outputFile, result.code);
  }

  const duration = Date.now() - startTime;
  console.log(`   ✅ 完成: ${files.length} 個檔案`);
  console.log(`   ⏱️  耗時: ${duration}ms\n`);

  return { method: "單線程", files: files.length, duration };
}

// ========================================
// 方案 2: 多線程編譯 (Worker Pool)
// ========================================
async function multiThreadBuild(numWorkers = 4) {
  console.log(`2️⃣  多線程編譯 (${numWorkers} Workers)\n`);

  const files = getSourceFiles();
  const startTime = Date.now();

  const outDir = path.join(distDir, `multi-${numWorkers}w`);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // 預先建立子目錄並準備任務
  const tasks = files.map((file) => {
    const relativePath = path.relative(srcDir, file);
    const outputFile = path.join(outDir, relativePath);
    const outputFileDir = path.dirname(outputFile);
    if (!fs.existsSync(outputFileDir))
      fs.mkdirSync(outputFileDir, { recursive: true });
    return { inputFile: file, outputFile };
  });

  return new Promise((resolve) => {
    const workers = [];
    const queue = [...tasks];
    let completed = 0;

    // 建立 workers
    for (let i = 0; i < numWorkers; i++) {
      const worker = {
        id: i,
        process: fork(path.join(__dirname, "compile-worker.js")),
        busy: false,
      };

      worker.process.on("message", () => {
        completed++;
        worker.busy = false;

        // 處理下一個任務
        if (queue.length > 0) {
          const next = queue.shift();
          worker.busy = true;
          worker.process.send(next);
        }

        // 全部完成
        if (completed === files.length) {
          const duration = Date.now() - startTime;
          console.log(`   ✅ 完成: ${files.length} 個檔案`);
          console.log(`   ⏱️  耗時: ${duration}ms\n`);

          // 清理 workers
          workers.forEach((w) => w.process.kill());

          resolve({
            method: `多線程 (${numWorkers}W)`,
            files: files.length,
            duration,
          });
        }
      });

      workers.push(worker);
    }

    // 分配初始任務
    for (let i = 0; i < Math.min(numWorkers, queue.length); i++) {
      const task = queue.shift();
      workers[i].busy = true;
      workers[i].process.send(task);
    }
  });
}

// ========================================
// 方案 3: 多線程 + 自動偵測核心數
// ========================================
async function autoMultiThreadBuild() {
  const numWorkers = os.cpus().length - 1;
  return multiThreadBuild(numWorkers);
}

// ========================================
// 執行 Benchmark
// ========================================
async function runBenchmark() {
  console.log("=".repeat(70));
  console.log("🏁 Build Performance Benchmark");
  console.log("=".repeat(70));
  console.log();

  const { execSync } = require("child_process");
  const totalCpus = os.cpus().length;
  let pCores, eCores;
  try {
    pCores = parseInt(
      execSync("sysctl -n hw.perflevel0.logicalcpu").toString().trim(),
    );
    eCores = parseInt(
      execSync("sysctl -n hw.perflevel1.logicalcpu").toString().trim(),
    );
  } catch {
    pCores = totalCpus;
    eCores = 0;
  }

  console.log(
    `💻 CPU: ${totalCpus} 核心 (${pCores} P-core + ${eCores} E-core)`,
  );

  const files = getSourceFiles();
  console.log(`📦 測試檔案數量: ${files.length}\n`);
  console.log("=".repeat(70));
  console.log();

  const results = [];

  // 執行測試
  try {
    results.push(await singleThreadBuild());
  } catch (e) {
    console.error("單線程測試失敗:", e.message);
  }

  try {
    results.push(await multiThreadBuild(2));
  } catch (e) {
    console.error("2 Workers 測試失敗:", e.message);
  }

  try {
    results.push(await multiThreadBuild(4));
  } catch (e) {
    console.error("4 Workers 測試失敗:", e.message);
  }

  try {
    results.push(await autoMultiThreadBuild());
  } catch (e) {
    console.error("自動核心數測試失敗:", e.message);
  }

  // 輸出結果
  printResults(results);
}

// ========================================
// 輸出結果表格
// ========================================
function printResults(results) {
  console.log("=".repeat(70));
  console.log("📊 效能比較結果");
  console.log("=".repeat(70));
  console.log();

  // 找出最快的
  const fastest = results.reduce((min, r) =>
    r.duration < min.duration ? r : min,
  );

  // 表格
  console.log("方法".padEnd(25) + " | 耗時(ms) | 相對速度 | 評級");
  console.log("-".repeat(70));

  results.forEach((r) => {
    const speedup = (r.duration / fastest.duration).toFixed(2);
    const rating =
      speedup < 1.2 ? "🏆" : speedup < 1.5 ? "⭐" : speedup < 2 ? "👍" : "👎";
    const isFastest = r.duration === fastest.duration ? " ← 最快!" : "";

    console.log(
      r.method.padEnd(25) +
        " | " +
        r.duration.toString().padStart(8) +
        " | " +
        speedup.padStart(8) +
        "x | " +
        rating +
        isFastest,
    );
  });

  console.log("=".repeat(70));
  console.log();

  // 統計資訊
  const baseline = results.find((r) => r.method === "單線程");
  if (baseline) {
    console.log("💡 與單線程相比:");
    results
      .filter((r) => r.method !== "單線程")
      .forEach((r) => {
        const improvement = (
          ((baseline.duration - r.duration) / baseline.duration) *
          100
        ).toFixed(1);
        if (improvement > 0) {
          console.log(`   ${r.method}: 快 ${improvement}%`);
        } else {
          console.log(`   ${r.method}: 慢 ${Math.abs(improvement)}%`);
        }
      });
  }

  console.log();
  console.log("=".repeat(70));

  // 建議
  console.log("\n💭 建議:");
  if (fastest.method === "單線程") {
    console.log("   ⚠️  檔案數量太少,workers 的啟動成本 > 收益");
    console.log("   建議: 增加測試檔案數量 (50+ 個) 來看到 workers 的優勢");
  } else {
    console.log(`   ✅ ${fastest.method} 表現最佳`);
    console.log("   對於這個檔案數量,使用 workers 是值得的");
  }
  console.log();
}

// 執行
if (require.main === module) {
  runBenchmark().catch(console.error);
}

module.exports = { runBenchmark };
