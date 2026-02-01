# OSTEP Chapter 5：Process API 學習筆記

深入學習 OSTEP 第五章 Process API，涵蓋 fork()、wait()、exec() 三大核心系統呼叫，以及 shell 如何利用 fork/exec 分離設計實現 I/O 重導向與管線機制。

## 第一階段：概念理解

### 1. fork() 系統呼叫

`fork()` 建立一個幾乎完全複製的子程序（child process）。

重點：

- 子程序**不是從 main() 開始**，而是從 `fork()` 返回處繼續執行
- 父程序收到子程序的 PID，子程序收到 `0`
- 輸出順序是**不確定的**（non-deterministic），取決於 CPU scheduler

```c
// p1.c
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

int main(int argc, char *argv[]) {
    printf("hello world (pid:%d)\n", (int)getpid());
    int rc = fork();
    if (rc < 0) {
        // fork failed
        fprintf(stderr, "fork failed\n");
        exit(1);
    } else if (rc == 0) {
        // child (new process)
        printf("hello, I am child (pid:%d)\n", (int)getpid());
    } else {
        // parent goes down this path (main)
        printf("hello, I am parent of %d (pid:%d)\n", rc, (int)getpid());
    }
    return 0;
}
```

`fork()` 回傳值的判斷邏輯：

- `rc < 0`：fork 失敗
- `rc == 0`：這是子程序
- `rc > 0`：這是父程序，rc 就是子程序的 PID

### 2. wait() 系統呼叫

`wait()` 讓父程序等待子程序完成，使輸出變為**確定性的**（deterministic）。

```c
// p2.c
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/wait.h>

int main(int argc, char *argv[]) {
    printf("hello world (pid:%d)\n", (int)getpid());
    int rc = fork();
    if (rc < 0) {
        fprintf(stderr, "fork failed\n");
        exit(1);
    } else if (rc == 0) {
        printf("hello, I am child (pid:%d)\n", (int)getpid());
    } else {
        int wc = wait(NULL);
        printf("hello, I am parent of %d (wc:%d) (pid:%d)\n", rc, wc, (int)getpid());
    }
    return 0;
}
```

- 父程序即使先被排程執行，也會因 `wait()` 阻塞直到子程序結束
- `waitpid()` 是更完整的版本，可以等待特定的子程序

### 3. exec() 系統呼叫

`exec()` 將當前程序**替換**為另一個程式，不建立新程序。

```c
// p3.c
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <string.h>
#include <sys/wait.h>

int main(int argc, char *argv[]) {
    printf("hello world (pid:%d)\n", (int)getpid());
    int rc = fork();
    if (rc < 0) {
        fprintf(stderr, "fork failed\n");
        exit(1);
    } else if (rc == 0) {
        printf("hello, I am child (pid:%d)\n", (int)getpid());
        char *myargs[3];
        myargs[0] = strdup("wc");       // 程式名稱
        myargs[1] = strdup("p3.c");     // 參數
        myargs[2] = NULL;               // 標記結尾
        execvp(myargs[0], myargs);
        printf("this shouldn't print out\n");
    } else {
        int wc = wait(NULL);
        printf("hello, I am parent of %d (wc:%d) (pid:%d)\n", rc, wc, (int)getpid());
    }
    return 0;
}
```

- 成功的 `exec()` 呼叫**永遠不會返回**
- Linux 提供六種變體：`execl`, `execlp`, `execle`, `execv`, `execvp`, `execvpe`

### 4. fork()/exec() 分離的設計動機

為什麼不把「建立新程序」和「執行新程式」合併成一個 API？因為分離讓 shell 能在 fork 後、exec 前修改子程序的環境。

**Shell 的工作流程：**

```
顯示 prompt -> 讀取指令 -> fork() -> 修改環境 -> exec() -> wait()
```

**I/O 重導向範例：**

```c
// p4.c - 重導向 STDOUT 到檔案
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <string.h>
#include <fcntl.h>
#include <sys/wait.h>

int main(int argc, char *argv[]) {
    int rc = fork();
    if (rc < 0) {
        fprintf(stderr, "fork failed\n");
        exit(1);
    } else if (rc == 0) {
        // 子程序：關閉 stdout，開啟檔案
        close(STDOUT_FILENO);
        open("./p4.output", O_CREAT | O_WRONLY | O_TRUNC, S_IRWXU);
        // 此時 file descriptor 1 (stdout) 指向 p4.output
        char *myargs[3];
        myargs[0] = strdup("wc");
        myargs[1] = strdup("p4.c");
        myargs[2] = NULL;
        execvp(myargs[0], myargs);
    } else {
        int wc = wait(NULL);
    }
    return 0;
}
```

關鍵在於：`close(STDOUT_FILENO)` 之後，`open()` 會使用**最小的可用 file descriptor**，也就是 1（即 stdout）。之後 `exec()` 執行的程式會繼承這個 file descriptor table，所以 `wc` 的輸出會寫入檔案而非終端。

**Pipe 的實現：**

使用 `pipe()` 系統呼叫連接兩個程序的輸入輸出，讓一個程序的 stdout 成為另一個程序的 stdin。例如 `grep -o foo file | wc -l`。

### 5. 程序控制與使用者

信號（signals）是 Unix 系統中程序間通訊的基本機制：

| 操作          | 信號    | 說明                  |
| ------------- | ------- | --------------------- |
| Ctrl-C        | SIGINT  | 中斷（interrupt）程序 |
| Ctrl-Z        | SIGTSTP | 暫停（stop）程序      |
| `kill -9 PID` | SIGKILL | 強制終止程序          |

- `kill()` 系統呼叫用來發送信號給程序
- `signal()` 用來捕捉並自訂信號處理
- 使用者只能控制自己的程序，superuser (root) 可控制所有程序

### 6. 實用工具

| 指令      | 用途                       |
| --------- | -------------------------- |
| `ps`      | 列出目前的程序             |
| `top`     | 即時顯示程序狀態與資源使用 |
| `kill`    | 發送信號給指定程序         |
| `killall` | 依名稱終止程序             |

---

## 第二階段：動手練習（Coding Homework）

以下 8 個練習用 C 語言實作，每個練習驗證一個核心概念。

### 練習 1：fork() + 變數共享測試

> 目標：理解 fork 後記憶體是獨立複製的

```c
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/wait.h>

int main() {
    int x = 100;
    printf("初始值 x = %d\n", x);

    int rc = fork();
    if (rc < 0) {
        fprintf(stderr, "fork failed\n");
        exit(1);
    } else if (rc == 0) {
        // 子程序修改 x
        x = 200;
        printf("子程序: x = %d\n", x);
    } else {
        wait(NULL);
        // 父程序的 x 不受影響
        printf("父程序: x = %d\n", x);
    }
    return 0;
}
```

輸出結果：子程序把 `x` 改成 200，但父程序的 `x` 仍然是 100。`fork()` 建立的是記憶體的**獨立副本**（copy-on-write）。

### 練習 2：open() + fork() 檔案描述符測試

> 目標：理解 file descriptor 在 fork 後是共享的

```c
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <fcntl.h>
#include <sys/wait.h>

int main() {
    int fd = open("hw2_output.txt", O_CREAT | O_WRONLY | O_TRUNC, S_IRWXU);
    if (fd < 0) {
        fprintf(stderr, "open failed\n");
        exit(1);
    }

    int rc = fork();
    if (rc < 0) {
        fprintf(stderr, "fork failed\n");
        exit(1);
    } else if (rc == 0) {
        // 子程序寫入
        write(fd, "child writes\n", 13);
    } else {
        wait(NULL);
        // 父程序寫入
        write(fd, "parent writes\n", 14);
    }
    close(fd);
    return 0;
}
```

父子程序共享同一個 file descriptor（包括 offset），兩者的寫入都會出現在檔案中，不會互相覆蓋。

### 練習 3：保證子程序先印出（不用 wait）

> 目標：探索程序間同步方法

```c
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <signal.h>

static volatile int got_signal = 0;

void handler(int sig) {
    got_signal = 1;
}

int main() {
    signal(SIGUSR1, handler);

    int rc = fork();
    if (rc < 0) {
        fprintf(stderr, "fork failed\n");
        exit(1);
    } else if (rc == 0) {
        printf("子程序先印出\n");
        // 通知父程序
        kill(getppid(), SIGUSR1);
    } else {
        // 父程序等待信號
        while (!got_signal)
            pause();
        printf("父程序後印出\n");
    }
    return 0;
}
```

不使用 `wait()`，而是透過 `SIGUSR1` 信號讓父程序等待子程序完成印出後才繼續。

### 練習 4：fork() + exec() 的所有變體

> 目標：熟悉 exec 家族的差異

```c
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/wait.h>

int main() {
    // execl: 參數用 list 傳遞，需要完整路徑
    if (fork() == 0) {
        execl("/bin/ls", "ls", "-l", NULL);
        perror("execl failed");
        exit(1);
    }
    wait(NULL);

    // execlp: 參數用 list，會搜尋 PATH
    if (fork() == 0) {
        execlp("ls", "ls", "-l", NULL);
        perror("execlp failed");
        exit(1);
    }
    wait(NULL);

    // execle: 參數用 list，可指定環境變數
    if (fork() == 0) {
        char *env[] = { "PATH=/bin", NULL };
        execle("/bin/ls", "ls", "-l", NULL, env);
        perror("execle failed");
        exit(1);
    }
    wait(NULL);

    // execv: 參數用 array，需要完整路徑
    if (fork() == 0) {
        char *args[] = { "ls", "-l", NULL };
        execv("/bin/ls", args);
        perror("execv failed");
        exit(1);
    }
    wait(NULL);

    // execvp: 參數用 array，會搜尋 PATH
    if (fork() == 0) {
        char *args[] = { "ls", "-l", NULL };
        execvp("ls", args);
        perror("execvp failed");
        exit(1);
    }
    wait(NULL);

    printf("所有 exec 變體測試完成\n");
    return 0;
}
```

exec 家族命名規則：

- `l`：參數用 list（逐一列出）
- `v`：參數用 vector（陣列）
- `p`：會搜尋 PATH 環境變數
- `e`：可自訂環境變數

### 練習 5：wait() 的返回值與行為

> 目標：理解 wait() 在父/子程序中的行為

```c
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/wait.h>

int main() {
    int rc = fork();
    if (rc < 0) {
        fprintf(stderr, "fork failed\n");
        exit(1);
    } else if (rc == 0) {
        // 子程序呼叫 wait() — 沒有子程序可等待
        int wc = wait(NULL);
        printf("子程序中 wait() 回傳: %d (無子程序，回傳 -1)\n", wc);
    } else {
        int status;
        int wc = wait(&status);
        if (WIFEXITED(status)) {
            printf("父程序: 子程序 %d 正常結束，exit code = %d\n", wc, WEXITSTATUS(status));
        }
    }
    return 0;
}
```

- 在子程序中呼叫 `wait()` 會立刻回傳 `-1`，因為子程序沒有自己的子程序
- `WIFEXITED` 和 `WEXITSTATUS` 巨集用來檢查結束狀態

### 練習 6：waitpid() 取代 wait()

> 目標：理解 waitpid 可等待特定子程序

```c
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/wait.h>

int main() {
    int rc1 = fork();
    if (rc1 == 0) {
        printf("第一個子程序 (pid:%d)\n", getpid());
        sleep(2);
        printf("第一個子程序結束\n");
        exit(0);
    }

    int rc2 = fork();
    if (rc2 == 0) {
        printf("第二個子程序 (pid:%d)\n", getpid());
        sleep(1);
        printf("第二個子程序結束\n");
        exit(0);
    }

    // 明確等待第二個子程序
    int status;
    int wc = waitpid(rc2, &status, 0);
    printf("waitpid 回傳: %d (等待的是第二個子程序)\n", wc);

    // 再等待第一個子程序
    wc = waitpid(rc1, &status, 0);
    printf("waitpid 回傳: %d (等待的是第一個子程序)\n", wc);

    return 0;
}
```

`waitpid()` 比 `wait()` 更靈活，可以指定要等待哪一個子程序，而非只等待任意一個。

### 練習 7：關閉 STDOUT 後呼叫 printf

> 目標：理解 file descriptor 關閉後的行為

```c
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

int main() {
    printf("關閉 stdout 之前可以正常印出\n");

    close(STDOUT_FILENO);

    // 這行不會顯示在終端
    printf("這行看不到\n");

    // 但 stderr 仍然可用
    fprintf(stderr, "stderr 仍然可以輸出\n");

    return 0;
}
```

關閉 `STDOUT_FILENO`（fd 1）後，`printf` 寫入會失敗（或寫入到其他被開啟的 fd 1），但 `stderr`（fd 2）不受影響。

### 練習 8：pipe() 連接兩個子程序

> 目標：實作管線機制，模擬 `ls | wc -l`

```c
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/wait.h>

int main() {
    int pipefd[2];
    if (pipe(pipefd) < 0) {
        fprintf(stderr, "pipe failed\n");
        exit(1);
    }

    // 第一個子程序：執行 ls，stdout 導向 pipe 寫入端
    int rc1 = fork();
    if (rc1 == 0) {
        close(pipefd[0]);              // 關閉讀取端
        dup2(pipefd[1], STDOUT_FILENO); // stdout -> pipe 寫入端
        close(pipefd[1]);
        execlp("ls", "ls", NULL);
        perror("exec ls failed");
        exit(1);
    }

    // 第二個子程序：執行 wc -l，stdin 來自 pipe 讀取端
    int rc2 = fork();
    if (rc2 == 0) {
        close(pipefd[1]);              // 關閉寫入端
        dup2(pipefd[0], STDIN_FILENO);  // stdin <- pipe 讀取端
        close(pipefd[0]);
        execlp("wc", "wc", "-l", NULL);
        perror("exec wc failed");
        exit(1);
    }

    // 父程序：關閉 pipe 兩端，等待子程序
    close(pipefd[0]);
    close(pipefd[1]);
    waitpid(rc1, NULL, 0);
    waitpid(rc2, NULL, 0);

    return 0;
}
```

`pipe()` 建立一對 file descriptor：`pipefd[0]` 為讀取端，`pipefd[1]` 為寫入端。透過 `dup2()` 把子程序的 stdin/stdout 重導向到 pipe，就能實現 `ls | wc -l` 的效果。

---

## 第三階段：模擬作業（Simulation Homework）

使用 `fork.py` 模擬器完成練習，重點：

1. **預測程序樹的變化** — 追蹤每次 fork/exit 後程序樹的狀態
2. **fork_percentage 的影響** — 較高的 fork 比例會產生更寬的樹，較低則更深
3. **孤兒程序的處理** — 父程序先結束時，子程序會被 init（PID 1）收養
4. **從程序樹反推操作** — 給定最終狀態，推導出可能的 fork/exit 序列

---

## 核心概念總結

| API         | 功能               | 回傳值            |
| ----------- | ------------------ | ----------------- |
| `fork()`    | 建立子程序         | 父：子 PID，子：0 |
| `wait()`    | 等待任一子程序結束 | 結束的子 PID      |
| `waitpid()` | 等待指定子程序     | 指定的子 PID      |
| `exec()`    | 替換為新程式       | 成功不回傳        |
| `pipe()`    | 建立管線           | 0 成功，-1 失敗   |
| `kill()`    | 發送信號           | 0 成功，-1 失敗   |

**fork/exec 分離的意義**：讓 shell 能在兩者之間修改子程序的環境（如 I/O 重導向、設定環境變數），這是 Unix 設計哲學中「簡單機制的靈活組合」的經典案例。

---

## 延伸閱讀

- Stevens & Rago《Advanced Programming in the UNIX Environment》
- Lampson "Hints for Computer Systems Design"
- Baumann et al. "A fork() in the road" (HotOS '19) — 對 fork() 的批評觀點

## Reference

- https://pages.cs.wisc.edu/~remzi/OSTEP/
