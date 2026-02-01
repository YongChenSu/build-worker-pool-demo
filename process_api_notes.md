# build-worker-pool-demo

### 如何執行 C 語言檔案?

C 語言需要先編譯

1. 把程式碼存成檔案（例如 p1.c）
2. 編譯
   `gcc -o p1 p1.c`
3. 執行
   `./p1`

macOS 內建 clang（透過 Xcode Command Line Tools），gcc 指令實際上會呼叫 clang，兩者都能用。

### 什麼是 non-deterministic？

輸出順序不確定。同一支程式跑多次，父程序和子程序誰先印出是隨機的，取決於 OS 的 CPU scheduler 當下怎麼排程。
![non-deterministic](./assets/images/non-deterministic.png)

# What is Process API？

1. Process (行程/進程) 的詳細構成
   簡單說它是「執行中的程式」，但從作業系統的角度來看，一個 Process 是由機器狀態 (Machine State) 定義的。如果要「暫停」並「恢復」一個程式，OS 必須紀錄以下資訊：

記憶體 (Memory / Address Space)：

Code: 程式碼指令本身。

Static Data: 全域變數。

Heap: 動態配置的記憶體 (如 C 的 malloc 或 C++ 的 new)。

Stack: 函式呼叫的堆疊 (存區域變數、回傳位址)。

暫存器 (Registers)：

CPU 此刻正在運算的數據。最重要的是 PC (Program Counter)，它紀錄程式跑到第幾行指令；以及 Stack Pointer，紀錄堆疊頂端在哪。

I/O 資訊：

這個 Process 目前開啟了哪些檔案？(File Descriptors list)。

核心觀念： OS 透過 CPU 虛擬化 (Time Sharing)，在極短時間內不斷切換不同 Process 的機器狀態 (Context Switch)，讓使用者感覺所有程式是同時在跑的。

2. fork() 的深入機制
   fork() 是 OS API 中最奇特的一個。

一次呼叫，兩次返回： 這是 fork() 最讓人困惑的地方。當你呼叫一次 fork()：

在 Parent Process 中： 它會回傳新產生的 Child 的 PID (大於 0 的整數)。

在 Child Process 中： 它會回傳 0。 (如果回傳負數則代表失敗)。

複製了什麼？ Child 幾乎擁有 Parent 的一份完全拷貝 (Copy)。包含那瞬間的記憶體內容、變數值、PC 位置。 注意： 現代 OS 為了效能，通常使用 Copy-on-Write (COW) 技術。剛 fork 完，其實 Parent 和 Child 共用同一塊實體記憶體，只有當其中一方試圖「寫入/修改」數據時，OS 才會真的複製那塊記憶體出去。這讓 fork 速度非常快。

3. wait() 的詳細職責
   為什麼一定要 wait？除了同步執行順序外，最重要的是資源回收。

回收 Zombie (殭屍)： 在 UNIX/Linux 系統中，當一個 Child Process 結束 (exit) 時，它的記憶體會被釋放，但它的 PID 和 Exit Status (結束狀態碼) 會被保留在 OS 的核心列表裡，變成一個 "Zombie Process"。

它已經死了 (不能執行)，但還佔著茅坑 (佔用 PID)。

wait() 的動作： Parent 呼叫 wait() 等同於對 OS 說：「我的小孩結束了嗎？如果結束了，把他的成績單 (Exit Status) 給我，並把他從系統名單中完全移除。」 如果 Parent 不呼叫 wait() 就死掉，這些殭屍通常會被 Init process (PID 1) 收養並清理，但良好的程式設計規範是 Parent 必須負責回收自己生出的 Child。

4. exec() 與 fork() 的本質差異
   讓我們用「搬家」與「裝潢」來比喻：

fork() 是「複製房子」： 你在隔壁蓋了一棟一模一樣的房子，裡面的擺設、甚至住的人 (Process Context) 都跟你原本的一模一樣。

結果：系統多了一個 Process。

exec() (家族函數如 execl, execvp 等) 是「重新裝潢並換人住」： 你沒有蓋新房子，而是把現有房子裡的所有家具 (Memory/Stack/Heap) 全部清空，搬入全新的家具，並請來新的住戶 (載入新的 Program Code)。

關鍵點： 門牌號碼 (PID) 沒有變！原本的程式碼再也回不去了 (因為被覆蓋了)，除非 exec 執行失敗。

5. 為什麼需要拆成這兩個 API？ (The Power of Separation)
   這是 UNIX 設計哲學的精華。將「產生新 Process」和「執行新程式」分開，是為了在中間插入「設定環境」的機會。

最經典的例子：Shell 的重導向 (Redirection) 當你在終端機輸入：wc main.c > output.txt (計算 main.c 的行數並寫入 output.txt)

Shell 的執行步驟如下：

fork()：產生一個 Child Process (此時 Child 還是 Shell 的複製品)。

在 Child 內部 (exec 之前)：

關閉標準輸出 (STDOUT, file descriptor 1)。

開啟 output.txt 檔案。因為 STDOUT 剛被關閉，OS 會把 output.txt 分配到 file descriptor 1。

此時，任何寫入 STDOUT 的動作，實際上都是寫入 output.txt。

exec("wc", "main.c")：

Child 變身為 wc 程式。

wc 開始執行，它只知道把結果印到 STDOUT。它完全不知道 (也不需要知道) STDOUT 其實已經被偷天換日改成一個檔案了。

結論： 如果把 fork 和 exec 合併成一個超級指令 (例如 Windows 的 CreateProcess 帶有數十個參數)，要實現這種靈活的管線 (Pipe) 和重導向功能就會變得非常複雜且難以維護。
