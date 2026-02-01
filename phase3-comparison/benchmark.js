const { execSync } = require("child_process");

console.log("🏁 Build Performance Benchmark\n");
console.log("=".repeat(60));

// ========== Group A: Babel 轉譯 (串行 vs 平行) ==========
console.log("\n📦 Group A: Babel 轉譯比較\n");

console.log("1️⃣  Sequential Babel (單進程逐檔)...");
const start1 = Date.now();
execSync("npm run phase3:sequential", { stdio: "inherit" });
const timeSeqBabel = Date.now() - start1;

console.log("2️⃣  Worker Pool Babel (多進程平行)...");
const start2 = Date.now();
execSync("npm run phase2", { stdio: "inherit" });
const timePoolBabel = Date.now() - start2;

// ========== Group B: Webpack bundling ==========
console.log("\n📦 Group B: Webpack Bundle 比較\n");

console.log("3️⃣  Webpack (標準)...");
const start3 = Date.now();
execSync("npm run phase3:webpack", { stdio: "inherit" });
const timeWebpack = Date.now() - start3;

console.log("4️⃣  Webpack (thread-loader)...");
const start4 = Date.now();
execSync("npm run phase3:webpack-workers", { stdio: "inherit" });
const timeWebpackWorkers = Date.now() - start4;

// ========== 結果 ==========
console.log("\n" + "=".repeat(60));
console.log("📊 結果統計");
console.log("=".repeat(60));

console.log("\n--- Group A: Babel 轉譯 (相同工作，比較串行 vs 平行) ---");
console.log(`  Sequential Babel:   ${timeSeqBabel}ms`);
console.log(`  Worker Pool Babel:  ${timePoolBabel}ms`);
console.log(`  Worker Pool 加速:   ${(timeSeqBabel / timePoolBabel).toFixed(2)}x`);

console.log("\n--- Group B: Webpack Bundle (相同工作，比較有無 thread-loader) ---");
console.log(`  Webpack 標準:            ${timeWebpack}ms`);
console.log(`  Webpack + thread-loader: ${timeWebpackWorkers}ms`);
console.log(`  thread-loader 加速:      ${(timeWebpack / timeWebpackWorkers).toFixed(2)}x`);

console.log("\n" + "=".repeat(60));
