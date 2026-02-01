const fs = require("fs");
const path = require("path");

// 設定：生成的檔案路徑 (請根據你的專案結構調整)
const targetPath = path.resolve(__dirname, "./phase2-build/src/app.js");

// 1. 產生大量的無意義子元件 (增加 Scope 分析負擔)
const generateSubComponents = (count) => {
  let code = "";
  for (let i = 0; i < count; i++) {
    code += `
const SubComponent${i} = ({ val }) => {
  const [local, setLocal] = useState(val);
  return (
    <div className="complexity-layer-${i}" style={{ color: '${i % 2 ? "red" : "blue"}' }}>
      <h4>Layer ${i}</h4>
      <span>Computed: {Math.sin(local) * Math.random()}</span>
      <div className="nested">
        {val > 0 ? 'Positive' : 'Negative'}
      </div>
    </div>
  );
};
`;
  }
  return code;
};

// 2. 產生大量的 JSX 節點 (增加 AST 解析負擔)
const generateJSXNodes = (count) => {
  let nodes = "";
  for (let i = 0; i < count; i++) {
    nodes += `<SubComponent${i} val={count + ${i}} />\n      `;
  }
  return nodes;
};

// 3. 組合最終檔案
const finalContent = `
import React, { useState, useEffect } from "react";

// --- 自動生成的 500 個子元件 ---
${generateSubComponents(500)}

export default function App() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log("Count changed:", count);
  }, [count]);

  // 模擬大量的靜態計算邏輯
  const heavyCalculation = () => {
    const data = [];
    ${Array.from({ length: 100 })
      .map((_, i) => `data.push(Math.pow(count, ${i % 10}));`)
      .join("\n    ")}
    return data.reduce((a, b) => a + b, 0);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Counter: {count}</h1>
      <p>Heavy Calc Result: {heavyCalculation()}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      
      <hr />
      <h2>Complex Tree Below (To stress test Babel)</h2>
      <div className="grid-container">
        {/* --- 自動生成的 500 個 JSX 節點 --- */}
        ${generateJSXNodes(500)}
      </div>
    </div>
  );
}
`;

fs.writeFileSync(targetPath, finalContent);
console.log(
  `✅ 已將 ${targetPath} 改寫為高複雜度版本 (約 ${finalContent.length} 字元)`,
);
