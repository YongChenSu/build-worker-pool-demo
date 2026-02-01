const babel = require("@babel/core");
const fs = require("fs");
const path = require("path");

function getSourceFiles(dir) {
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

function main() {
  const srcDir = "./phase2-build/src";
  const distDir = "./phase2-build/dist-sequential";

  console.log("=== Sequential Babel Build ===\n");

  const files = getSourceFiles(srcDir);
  console.log(`📦 找到 ${files.length} 個檔案需要編譯\n`);

  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  const startTime = Date.now();

  for (const file of files) {
    const code = fs.readFileSync(file, "utf-8");
    const result = babel.transformSync(code, {
      presets: ["@babel/preset-env", "@babel/preset-react"],
      filename: file,
    });

    const relativePath = path.relative(srcDir, file);
    const outputFile = path.join(distDir, relativePath);
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(outputFile, result.code);
  }

  const totalTime = Date.now() - startTime;

  console.log("=".repeat(50));
  console.log("📊 Sequential Build Summary");
  console.log("=".repeat(50));
  console.log(`總檔案數: ${files.length}`);
  console.log(`總耗時: ${totalTime}ms`);
  console.log(`平均每檔: ${(totalTime / files.length).toFixed(2)}ms`);
  console.log("=".repeat(50) + "\n");
}

main();
