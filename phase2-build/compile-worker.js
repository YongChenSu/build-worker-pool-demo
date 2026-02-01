const babel = require("@babel/core");
const fs = require("fs");

process.on("message", ({ inputFile, outputFile }) => {
  const startTime = Date.now();

  try {
    // 讀取源碼
    const code = fs.readFileSync(inputFile, "utf-8");

    // Babel 編譯
    const result = babel.transformSync(code, {
      presets: ["@babel/preset-env", "@babel/preset-react"],
      filename: inputFile,
    });

    // 寫入輸出
    fs.writeFileSync(outputFile, result.code);

    const duration = Date.now() - startTime;

    // 回報結果
    process.send({
      file: inputFile,
      output: outputFile,
      duration,
    });
  } catch (error) {
    console.error(`編譯錯誤 (${inputFile}):`, error.message);
    process.send({
      file: inputFile,
      error: error.message,
      duration: Date.now() - startTime,
    });
  }
});
