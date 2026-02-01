const fs = require("fs");
const path = require("path");

// 設定目標目錄
const SRC_DIR = path.resolve(__dirname, "./phase2-build/src");
const COMPONENTS_DIR = path.join(SRC_DIR, "components");

// 確保目錄存在
if (!fs.existsSync(COMPONENTS_DIR)) {
  fs.mkdirSync(COMPONENTS_DIR, { recursive: true });
}

// 產生 X 個檔案
const FILE_COUNT = 2000;

console.log(`🔥 開始生成 ${FILE_COUNT} 個元件檔案...`);

const importsList = [];
const componentsList = [];

for (let i = 0; i < FILE_COUNT; i++) {
  const componentName = `Comp${i}`;
  const fileName = `${componentName}.jsx`;

  // 每個檔案寫入足夠多的程式碼，強迫 Babel 花時間解析 AST
  const fileContent = `
import React, { useState, useEffect } from 'react';

export const ${componentName} = () => {
  const [val, setVal] = useState(0);
  
  // 模擬一些複雜邏輯，增加 AST 深度
  useEffect(() => {
    const data = [${Array.from({ length: 50 }, (_, k) => k).join(",")}];
    const result = data.map(n => n * ${i}).reduce((a, b) => a + b, 0);
    setVal(result);
  }, []);

  return (
    <div className="wrapper-${i}">
      <h3>Component ${i}</h3>
      ${Array.from({ length: 20 }, (_, k) => `<span>Element ${k}</span>`).join("\n      ")}
    </div>
  );
};
  `;

  fs.writeFileSync(path.join(COMPONENTS_DIR, fileName), fileContent);

  importsList.push(
    `import { ${componentName} } from './components/${componentName}';`,
  );
  componentsList.push(`<${componentName} />`);
}

// 更新 Entry File (app.js)
const appContent = `
import React from 'react';
import { createRoot } from 'react-dom/client';

// 匯入所有 1000 個元件
${importsList.join("\n")}

const App = () => {
  return (
    <div>
      <h1>Monster Project Benchmark</h1>
      ${componentsList.join("\n      ")}
    </div>
  );
};

const root = createRoot(document.getElementById('root'));
root.render(<App />);
`;

fs.writeFileSync(path.join(SRC_DIR, "app.js"), appContent);

console.log(
  `✅ 完成！已生成 ${FILE_COUNT} 個檔案並更新入口點。請重新執行 Build。`,
);
