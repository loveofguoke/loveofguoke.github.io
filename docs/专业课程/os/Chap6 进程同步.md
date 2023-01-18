## Chap6 进程同步

### 背景

并行或并发的进程在访问共享的数据区域的时候可能会导致数据的不一致性，保持数据一致性需要有特定的机制使协作过程有序执行 

有限缓冲区问题：生产者往有限的缓冲区写入数据，消费者从中读取数据，如果我们用一个 count 来表示缓冲区中数据的个数，两种操作分别对应的就是count++ 和count--，但是这两种操作都需要满足原子性，即操作的时候不能被中断，如果一个生产者和一个消费者同时想要改变count 就会造成数据的不一致性(取决于进程调度执行的顺序)。

count++可能通过如下机器语言实现：

```c
register1 = counter
register1 = register1 + 1
counter = register1
```

count--同理

**例题**

有两个进程P1、P2分别执行下面的程序体，其中total是两个进程的共享变量且初值为0，count是每个进程的私有变量。假设这两个进程并发执行，并可自由交叉（interleave），则这两个进程都执行完后，变量total可能得到的最小取值是 3

```c
P1: {
    int count;
    for ( count = 1; count <= 50; count++ )
    total = total + 1; 
}
P2: {
    int count;
    for ( count = 1; count <= 50; count++ )
    total = total + 2; 
}
```

经过编译后有：

```c
total=total +1:
register1= total
register1 = register1 + 1
total = register1
//
total=total +2:
register2 = total
register2 = register2 + 2
total = register2
```

到最后一步才会把寄存器中的值写回total 中，只要进行合理控制，如使得 $P_1$ 的第一次加操作结束之前 $P_2$ 运行49 次，这样一来这49 次就不会影响total 的最终结果，因为两个进程分别用两个不同的寄存器对total 进行操作。此时total就被写成1，然后 $P_2$ 进行第50次操作，且 $P_1$ 在 $P_2$ 前结束，则最终影响到total 的可以只有一次+1 和一次+2，最后结果就是3。

**竞争条件**(race condition)：多个进程并发访问和操作共享数据，此时共享数据最终的值及进程执行的结果取决于特定的访问顺序。为了防止竞争条件，并发的进程必须被同步。

进程间竞争资源面临三个控制问题：

- 互斥（mutual exclusion )指多个进程不能**同时(同一时间段)**使用同一个资源
- 死锁（deadlock )指多个进程互不相让，都得不到足够的资源。永远得不到资源
- 饥饿（starvation )指一个进程长时间得不到资源（其它进程可能轮流占用资源）。资源分配不公平

### 临界区问题

临界资源：一次只允许一个进程使用(访问)的资源，如消息缓冲队列、打印机等。这里的一次指只有当一个进程使**用完**(可能分多个时间片)这些资源，其它进程才能访问。

临界区：进程中访问临界资源的代码段

临界区问题：设计一个协议，确保当一个进程在临界区内执行时，别的进程不被允许执行其临界区。

进程的一般结构：

```c
do {
    entry section //进入区
    critical section //临界区
    exit section //退出区
    reminder section //剩余区
} while (1);
```

临界区问题的解决方案必须满足三个条件：

- 互斥（Mutual Exclusion）：如果进程 $P_i$ 在临界区内执行，那么其它进程不能在其临界区内执行
- 空闲让进（Progress）：如果没有进程在其临界区内执行，并且有进程想要进入临界区，那么只有那些不在剩余区内执行的进程可以参加选择，以便确定接下来谁能进入临界区，这种选择不能无限期推迟
- 有限等待（Bounded Waiting）：从一个进程做出进入临界区的请求到这个请求被允许为止，其它进程被允许进入临界区的次数具有上限。即进程应当在等待有限时间后被允许访问临界资源。

- **让权等待不是必须的**

>让权等待
>
>如果一个进程在当前状态下根本无法获得临界资源而进入临界区，则应当释放处理机暂时退让，防止进程忙等待

### 软件同步

前提：LOAD和STORE指令是原子的，即无法被中断

#### Peterson's Solution

适用于两个进程交错执行临界区，要求两个进程共享两个数据项：

```java
int turn; // 表示哪个进程可以进入临界区，初始化为0或1
boolean flag[2]; // 表示哪个进程准备好进入临界区，初始化为false
```

进程结构如下：

```java
P0:
do {
    flag[0] = true;
    turn = 1;
    while (flag[1] && turn == 1);
    // 临界区
    flag[0] = false;
    // 其余代码
} while(true)

P1:
do {
    flag[1] = true;
    turn = 0;
    while (flag[0] && turn == 0);
    // 临界区
    flag[1] = false;
    // 其余代码
} while(true)
```

>peterson 算法 软件解决方案 2进程 单处理器系统
>进之前先把turn给对方，如果对方想进/正在进就让它先进/继续进，否则自己进，如果两个都想进，由于turn不是0就是1，所以一定有一个会等，保证了互斥
>当两个人都想进时，由于turn的给予是有先后的，所以一定有一个能进，不会死锁，保证了空闲让进
>一个结束了就把flag置为false，另一个如果在等就能马上进，保证有限等待

[在多处理器系统不适用](https://blog.csdn.net/Hundredl/article/details/105585280)，指的是一个进程在多个处理器上并行

Peterson算法适合单处理器系统，对于多处理器系统并不适用，因为一个进程内部顺序执行的指令，可能由于满足Bernstein条件而被**并行执行**，并行执行的效果可能是重排序执行的结果，比如Peterson算法中，进程 $P_0$ 进入临界区之前的两条指令`flag[0]=1;` `turn=1;`重排序后可能顺序变为 `turn=1;` `flag[0]=1;`，此时将不再满足互斥性，即进程 $P_0$ 和进程 $P_1$ 可能同时进入临界区，原因如下：
当 $P_0$ 进程执行`turn=1`后时间片用尽，若此时 $P_1$ 获得处理器，将直接进入临界区，若 $P_1$ 进程在临界区中时间片用尽，$P_0$ 进程又重新获得处理器，则 $P_0$ 进程也将进入临界区。此时不能满足互斥性。

#### Bakery Algorithm

处理N个进程的同步，进入临界区之前，进程会收到一个number，拥有最小number的进程有权进入临界区。如果两个进程有相同的number，就按照FCFS 原则，先服务下标小的。编号方式总是按枚举的递增顺序产生number，如1，2，3，3，3，3，4，5 ...

定义标记order = (a, b) = (#ticket, #pid)，ticket即number，排队登记号

进程共享数据项：

```java
boolean choosing[n]; // choosing[i] = true表示进程i正在获取number，初始化为false
int number[n]; // 进程当前的number，若为0表示进程未参与排队，不想获得临界资源，初始化为0
```

进程结构如下：

```c++
do {
    choosing[i] = true; // 保证计算number[i]值的原子操作
    number[i] = max(number[0], number[1], …, number [n–1])+1; // 获取新number
    choosing[i] = false;
    for (j = 0; j < n; j++) { 
        while (choosing[j]); // 等j取号结束
        while ((number[j] !=0) && (number[j],j) < (number[i],i)); // 若j想进入临界区且j的number更小，则i等待
    }
    // critical section
    number[i] = 0;
    // remainder section
} while (1);
```

>Bakery Algorithm 软件方案 n进程
>number小优先级高，number相同时进程id小优先级高
>对于进程p：
>先原子取号，然后和各个进程比较：
>
>1. 若该进程正在取号，则等它取号结束
>2. 若该进程想进入临界区且优先级更高，则等待
>若比较结束离开循环，则我优先级已经最高，轮到我进入。
>由于取到的号总是递增的，所以一个进程进入一次后下一次的号会变大，所以同一轮取号的进程能依次进入，满足有限等待

### 硬件同步

对于单处理器环境，可以禁用中断，这样当前运行的代码将在没有抢占的情况下执行。对于多处理器系统，禁用中断效率很低，因为消息要传递到所有处理器。

许多现代操作系统提供特殊的原子硬件指令(无法被中断)，用于测试和设置内存字的内容，或者用于原子地交换两个字。

#### 测试与设置

```java
// 原子指令，同时应该只能由一个进程执行(硬件实现)，否则可能多个进程同时取到false
boolean TestAndSet(boolean &target) {
    boolean rv = target;
    target = true; // 设置为true
    return rv; // 返回target原来的值
}
```

如果一台机器支持指令`test_and_set()`，可以通过声明一个共享布尔变量`lock`，初始化为`false`，来实现互斥。

```java
boolean lock = false; // Shared data，true表示已经被某进程上锁
```

进程结构如下：

```java
while(1) {
    while (TestAndSet(lock)); // 如果是true，说明lock原来就被别的进程占用，需要等待，若为false，则lock是被此进程设置为true的，即此进程成功占用了lock
    // critical section
    lock = false;
    // remainder section
};
```

>testandset 硬件方案 原子指令
>取锁的旧值，然后上锁(赋值为true)，返回锁的旧值
>若返回值是true，则锁本来就被别人上了(本来就是true，我只是又给它赋了一遍，没影响)，我得等
>若返回值是false，则锁本来没人上，这次被我上了，我独占了这把锁，我可以进
>进完就释放锁

由于是在lock = false后从等待进程中随机选择了一个(执行TestAndSet的那个)进入临界区，所以有的进程可能一直选不上，造成饥饿。因此需要用新的机制实现**有限等待**的互斥：

```java
Boolean waiting[n], lock; // 初始化为false, waiting[]：排队队列，通过排队解决饥饿问题
while (1) {
    waiting[i] = true;
    key = true;
    while (waiting[i] && key) key = TestAndSet(lock); // 如果别的进程占用锁，就等待
    waiting[i] = false;
    // critical section;
    j = (i+1) % n;
    while ((j != i) && !waiting[j]) j = (j+1) % n;
    if (j == i) lock = false; // 遍历整个队列都没有发现在排队的进程，则将lock置为false
    else waiting[j] = false; // 将下一个的waiting设置成false，使其退出死循环，起到将lock和对临界区的访问权限传递给j的作用
    // remainder section;
}
```

此版本只有在初始化以及没有进程要访问临界区时lock才等于false，在依次访问临界区时lock始终为true，即锁是伴随着设置下一个的waiting = false使其退出死循环而**平滑传递**的，不需要每次都上锁再释放锁。

原来的版本就是只管自己能不能访问临界区，互相之间没有任何交流。现在引入排队队列，相当于互相告知自己是否渴望进入临界区，并将渴望的进程**排个队**，一个进程访问完后就礼貌地把锁交给排在它后面的进程，这样就是先来先得，解决了饥饿的问题。

#### 交换

```java
// 原子指令，通过原子交换实现lock的转移，同时应该只能由一个进程执行(硬件实现)
void Swap (boolean *a, boolean *b)
{
    boolean temp = *a;
    *a = *b;
    *b = temp;
}
```

声明一个**共享**布尔变量`lock`，并初始化为 false，来实现互斥。

```java
boolean lock;
```

进程结构如下：

```c++
while(1) {
    key = TRUE; // 局部变量，不是共享的
    while (key == TRUE)
    	Swap(&lock, &key); // 如果lock是false，则交换成功，跳出循环
    // critical section
    lock = false;
    // remainder section
}
```

>swap 硬件方案 原子指令
>每个进程都准备好true这个值，存在自己的key里，然后交换key和lock
>如果交换完key还是true，则lock本来就是true，我得等
>如果交换完key为false，则lock本来是false，本次交换中我把key的true给了lock，我独占了锁，我可以进
>进完就释放锁

#### 小结

硬件方法的优点

- 适用于任意数目的进程，在单处理器或多处理器上
- 简单，容易验证其正确性
- 可以支持进程内存在多个临界区，只需为每个临界区设立一个布尔变量

硬件方法的缺点

- 等待要耗费CPU时间，不能实现"让权等待"
- 可能“饥饿”：从等待进程中随机选择一个进入临界区，有的进程可能一直选不上
- 可能死锁：单CPU情况下,P1执行特殊指令(swap)进入临界区，这时拥有更高优先级P2执行并中断P1,如果P2又要使用P1占用的资源，按照资源分配规则拒绝P2对资源的要求，陷入忙等循环。然后P1也得不到CPU，因为P1比P2优先级低。(解决方案：P2进入waiting状态 or 动态优先级，P1优先级升高)

### 互斥锁 (Mutex Lock)

采用互斥锁保护临界区，从而防止竞争条件

一个进程在进入临界区时应得到锁，在退出临界区时释放锁

#### 自旋锁 spinlock

当一个进程欲访问已被其他进程锁定的资源时，进程循环检测该锁是否被释放，等待锁变得可用

自旋锁[不适用于单处理器系统](https://blog.csdn.net/qq_46311811/article/details/122354855)，但通常用于多处理器系统。

自旋锁不适合单处理器的原因是由于当一个进程处于自旋锁状态时说明其正在等待某一个资源，而在单处理器系统中，一旦发生了这种自旋锁，那么拥有资源的那个进程也会由于无法得到CPU而一直等待，这样之后，占用CPU的进程会等待另一个进程释放资源，占用资源的进程会等待另一个进程释放CPU，从而导致程序进入一个死锁的状态，因此单处理器不适合自旋锁

在多处理器中，即使一个进程处于自旋锁状态而占用一个CPU，拥有资源的进程也可以在另外空闲的处理器上执行，直到资源释放，处于忙等的进程这时便可以正常进行，防止了死锁的发生

### 信号量 (Semaphores)

信号量是一种数据类型，只有初始化，wait(P) 和signal(V) 三种操作，信号量可以分为整型信号量、**记录型信号量**，AND 型信号量和二值信号量。现在信号量机制已广泛应用于操作系统了同步互斥中。

不需要忙等待的同步工具，复杂度更低

#### 整型信号量 Integer semaphore

信号量是个整型变量，除了初始化外只能通过两个标准**原子**操作`wait()`和`signal()`来访问

```c
// 等待资源，等到后取走一份资源
wait (S) {
    while (S <= 0); // no-op
    S--;
}
```

```c
// 释放一份资源
signal (S) {
    S++;
}
```

在`wait()`和`signal()`操作中，信号量整数值的修改应不可分割地执行，即当一个进程修改信号量值时，没有其它进程能够同时修改同一信号量的值。

#### 计数信号量 Counting semaphore

integer value can range over an unrestricted domain

Can implement a counting semaphore S as a binary semaphore

#### 二值信号量 Binary semaphore

integer value can range only between 0 and 1; can be simpler to implement

- Also known as mutex locks，提供互斥锁

```c++
// mutual exclusion
Semaphore mutex; // initialized to 1
do {
    wait (mutex);	// 忙等待, spinlock
    // Critical Section
    signal (mutex);
    // remainder section
} while (true);
```

用二值信号量实现计数信号量：

```c
struct S {
    integer val;  //initially K
    BinarySemaphore sem;  //initially 0
    integer waitCount;  //initially 0, number of processes waiting on S
    BinarySemaphore mutex;  //initially 1, protects val and waitCount
};

wait(S) {
    wait(S.mutex);
    if (S.val == 0) {
        S.waitCount += 1;
        signal(S.mutex);
        wait(S.sem);
    } else {
        S.val -= 1;
        signal(S.mutex);
    }
}

signal(S) {
    wait(S.mutex);
    if (S.waitCount > 0) {
        S.waitCount -= 1;
        signal(S.sem);
    }else {
        S.val += 1;
    }
    signal(S.mutex);
}
```

#### 信号量的实现

当信号量只是一个值时，必须保证没有两个进程能同时对同一个信号量执行wait()或signal()，因此wait和signal的代码就要被放在临界区，成为临界区问题。

Could now have **busy waiting** in critical section implementation

- But implementation code is short
- Little busy waiting if critical section rarely occupied

Note that applications may spend lots of time in critical sections and therefore this is not a good solution

忙等待**浪费 CPU 周期**，这原本可以有效用于其他进程

为了克服忙等待，可以修改`wait()`和`signal()`操作的定义，将忙等待换成阻塞自己。即既然你还得不到资源，那就先去睡觉，等有资源了我会唤醒你，你再执行。

每个信号量都有一个与之关联的等待队列，队列中每个元素有两个数据项：

```c
value; // 整型
pointer; // 指向列表中的下一条记录
```

##### 记录型信号量

```c
// 将信号量定义成结构体
typedef struct {
	int value;
    struct process *list; // 指向list中下一条记录
} semaphore;
```

该数据结构中list 指向等待队列的下一个进程，记录型信号量中value 的值大于0 表示资源的个数，等于0 的时候表示没有资源可以用或者不允许进入临界区，负数表示在等待队列中的进程个数或者等待进入临界区的进程。

##### 两种操作(原子?)

block()，将调用该操作的进程放置到适当的等待队列中。即将该进程从running转变为waiting。然后 CPU 调度程序选择执行另一个进程。

wakeup()，将一个进程从等待队列中移出并放置到就绪队列中，从waiting转变为ready。即让等待信号量而阻塞的进程在其他进程执行操作`signal()`之后重新执行，将进程从等待状态改为就绪状态。

##### 无忙等待的实现方式(真正使用的 & 题干中所指的)

```c
wait(semaphore *S) { // 相当于申请资源
    S->value--; // 声明我需要此资源
    if (S->value < 0) {	// 资源已被分配完毕且我没拿到(若=0则我拿到了最后一份资源)
        add this process to S->list; // 加入等待队列
        block();
    }
}

signal(semaphore *S) {	// 相当于释放资源
    S->value++;
    if (S->value <= 0) { // 有进程在等资源
        remove a process P from S->list;
        wakeup(P); // 唤醒一个进程
    }
}
```

##### wait signal操作讨论

通常用信号量表示资源或临界区
信号量的物理含义

- S.value>0 表示有S.value个资源可用；
- S.value=0 表示无资源可用或表示不允许进程再进入临界区；

- S.value<0 则|S.value|表示在等待队列中进程的个数或表示等待进入临界区的进程个数。

wait(S)≡P(S) ≡down(S) ：表示申请一个资源
signal(S)≡V(S)≡up(S) ：表示释放一个资源

wait、signal操作必须成对出现，有一个wait操作就一定有一个signal操作。一般情况下：当为互斥操作时，它们同处于同一进程；当为同步操作时，则不在同一进程中出现。

如果两个wait操作相邻，那么它们的顺序至关重要，而两个相邻的signal操作的顺序无关紧要。一个同步wait操作与一个互斥wait操作在一起时，**同步wait操作在互斥wait操作前**。
wait、signal操作的优缺点

- 优点：简单，而且表达能力强
- 缺点：不够安全；wait、signal操作使用不当会出现死锁；实现复杂。

**使用信号量时必须设定信号量的初始值。**

#### 死锁与饥饿

死锁：两个或多个进程无限等待一个事件，而该事件只能由等待进程之一引发

饥饿：无限阻塞。A process may never be removed from the semaphore queue in which it is suspended

优先级反转：因低优先级进程持有高优先级进程所需的锁而引发的调度问题

### 经典进程同步问题

#### 有限缓冲区问题(生产者-消费者问题)

主要形式就是生产者写入缓冲区，消费者读取缓冲区，是许多相互合作进程的一种抽象。消息队列。

`n`个缓冲区，每个缓冲区可存一个数据项

信号量`mutex`提供缓冲池访问的互斥要求，并初始化为 1，即生产者和消费者不能同时访问缓冲区

信号量`empty`用于表示空的缓冲区数量，并初始化为 n

信号量`full`用于表示满的缓冲区数量，并初始化为 0

共享数据及其初始化：

```c
int n;
semaphore mutex = 1;
semaphore empty = n;
semaphore full = 0;
```

生产者进程：

```c
do {
    …
    produce an item in nextp
    …
    wait(empty); // 同步wait
    wait(mutex); // 互斥wait
    …
    add nextp to buffer
    …
    signal(mutex);
    signal(full);
} while (1);
```

>生产了一个数据项，想要加入缓冲区，先看看有没有空的缓冲区，如果没有则等待，等到后等待互斥锁，拿到互斥锁后加入缓冲区，释放锁并将满的缓冲区数量+1

消费者进程

```c
do {
    wait(full);
    wait(mutex);
    …
    remove an item from buffer to nextc
    …
    signal(mutex);
    signal(empty);
    …
    consume the item in nextc
    …
} while (1);
```

>看看有没有满的缓冲区，如果没有则等待，等到后等待互斥锁，拿到锁后消费一个数据项，释放锁并将空的缓冲区数量+1

#### 读者-写者问题

一个数据集（如文件）如果被几个并行进程所共享：

- 有些进程只要求读数据集内容，它称读者
- 一些进程则要求修改数据集内容，它称写者
- 几个读者可以同时读数据集，而不需要互斥
- 一个写者不能和其它进程（不管是写者或读者）同时访问些数据集，它们之间必须互斥。

第一读者写者问题：

- 允许多个读者同时读。而一个写者在访问共享数据时将独占访问权。
- 写者可能会饥饿，因为写者等待时新来的读者依然能访问共享数据，如果一直有新读者来，写者就无法执行写操作。

信号量`wrt`供写者作为互斥信号量，也为第一个进入临界区和最后一个离开临界区的读者所使用，初始化为 1

信号量`mutex`用于确保在更新变量`readcount`时互斥，初始化为 1

变量`readcount`用于跟踪多少进程正在读对象，初始化为 0

共享数据及初始化：

```c
Data set;
semaphore wrt = 1;
semaphore mutex = 1;
int readcount = 0;
```

写者进程

```c
do {
    wait (wrt);
    // writing is performed
    signal (wrt);
} while (TRUE);
```

读者进程

```c
do {
    wait(mutex);
    readcount++;
    if (readcount == 1)
        wait(wrt); // 第一个读者到来
    signal(mutex); // 不能提前释放互斥锁，否则可能导致readcount跳过1，读者们没有拿到wrt就开始读
    …
    // reading is performed
    …
    wait(mutex);
    readcount--;
    if (readcount == 0)
        signal(wrt); // 最后一个读者离开
    signal(mutex)；
} while (TRUE);
```

第二读者写者问题

- 一旦写者就绪就尽快让它执行写操作，即写者等待时不允许新读者进行操作
- 读者可能会饥饿

#### 哲学家就餐问题

问题描述：

- N个哲学家围成一圈吃饭
- 相邻哲学家之间有一根筷子(共享)
- 每个哲学家需要拿起左右两边的筷子来吃饭
- 相邻哲学家不能同时吃饭
- 哲学家在吃饭和思考之间切换状态

共享数据

```c
Bowl of rice (data set);
Semaphore chopstick [5]; // initialized to 1
```

哲学家i的进程结构

```c
do {
    wait(chopstick[i])
    wait(chopstick[(i+1) % 5])
    …
    // eat
    …
    signal(chopstick[i]);
    signal(chopstick[(i+1) % 5]);
    …
    // think
    …
} while (1);
```

##### 哲学家就餐问题讨论

这个方案可以保证对筷子的使用互斥，但显然很容易导致死锁(都拿起左边的筷子)，且可能导致饥饿(starvation)。

有几种可能的解决方案：

- 一次只允许四个哲学家饥饿(hungry)
- 只有当两个筷子都可获取时才允许拿起(在临界区实现)
- 标号为奇数的哲学家总是先拿左边的筷子，标号为偶数的哲学家总是先拿右边的筷子
- 为了避免死锁，把哲学家分为三种状态：思考、饥饿、吃饭，并且一次拿到两只筷子，否则不拿。（Dijkstra）
- 每个哲学家拿起第1根筷子一定时间后，若拿不到第2根筷子，再放下第1根筷子。(可以解决死锁，但是不能消除饥饿，比如大家都拿起、放下、拿起...)

没有死锁的解决方案不一定能消除饥饿的可能性

### 管程*

### 总结

同步问题对进程执行有额外的条件(顺序、时机)

互斥问题仅要求不同时访问临界区

