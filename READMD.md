```
build-worker-pool-demo/
├── package.json
├── .gitignore
├── README.md
│
├── phase1-basic/              # Phase 1: 基礎概念
│   ├── simple-worker-pool.js
│   ├── worker.js
│   └── test-basic.js
│
├── phase2-build/              # Phase 2: 實際編譯
│   ├── build-pool.js
│   ├── compile-worker.js
│   ├── src/                   # 模擬的源碼
│   │   ├── app.js
│   │   ├── utils.js
│   │   ├── component.jsx
│   │   └── ... (10+ 檔案)
│   └── dist/                  # 編譯輸出
│
├── phase3-comparison/         # Phase 3: 工具對照
│   ├── webpack-config/
│   │   ├── webpack.config.js
│   │   └── with-workers.js
│   ├── vite-config/
│   │   └── vite.config.js
│   └── benchmark.js           # 效能比較
│
└── docs/                      # 學習筆記
    ├── concepts.md
    └── performance.md
```

# （一）

#### 1. 建立專案結構

```
mkdir build-worker-pool-demo && cd build-worker-pool-demo
```

#### 2. 初始化並安裝依賴

```js
npm init -y
npm install # 根據上面的 package.json
```

#### 3. 建立 Phase 1 檔案

複製上面的 simple-worker-pool.js, worker.js, test-basic.js

#### 4. 執行測試

npm run phase1

#### 5. 實驗: 改變 worker 數量

編輯 test-basic.js,試試 1, 2, 4, 8 個 workers

# （二）

#### 1. 建立 Phase 2 檔案

`mkdir -p phase2-build/src`

#### 2. 建立測試源碼

複製上面的 build-pool.js, compile-worker.js

#### 3. 產生測試檔案

```js
for i in {1..20}; do
cp phase2-build/src/app.js phase2-build/src/file$i.js
done
```

#### 4. 執行編譯

`npm run phase2`

#### 5. 查看輸出

`ls -lh phase2-build/dist/`

#### 1. 建立 Webpack 設定

複製上面的 webpack config 檔案

#### 2. 比較執行

```js
npm run phase3:webpack
npm run phase3:webpack-workers
```

#### 3. 執行 benchmark

`npm run phase2:benchmark`

![phase2](./assets/images/phase2.png.png)

![phase3-webpack](./assets/images/phase3-webpack.png)
