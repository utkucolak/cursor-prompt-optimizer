/**
 * Generates data/OckBench_coding_polyglot_hard_200.jsonl
 *
 * 20 algorithmically hard core problems × 10 *genuinely multilingual*
 * style transformations = 200 instances.
 *
 * Unlike OckBench_coding_hard_chaos_200.jsonl (which wraps the same
 * English specification with foreign-language pleasantries), every
 * variant here translates the technical specification itself —
 * algorithm, parameters, edge cases, return value — into Turkish,
 * Arabic, Chinese, or a code-switched mixture of them.
 *
 * The `assert` lines are NEVER translated. They are authoritative test
 * code and must stay ASCII so the existing OckBench grader works.
 *
 * Style buckets:
 *   0. Pure Turkish
 *   1. Pure Arabic (Modern Standard)
 *   2. Pure Simplified Chinese
 *   3. TR ↔ AR sentence-alternating
 *   4. TR ↔ ZH sentence-alternating
 *   5. AR ↔ ZH sentence-alternating
 *   6. TR / AR / ZH tri-language rotation
 *   7. Turkish + English CS jargon code-switch
 *   8. Arabic  + English CS jargon code-switch
 *   9. Chinese + English CS jargon code-switch
 *
 * Quality note: Arabic and Chinese translations use conservative
 * Modern-Standard / Simplified registers and standard CS terminology.
 * Before any external benchmark release, the AR/ZH sentences should
 * be checked by native speakers — see the paper's data card.
 *
 * Run: node scripts/generate-polyglot-hard-200.cjs
 */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const outDir = path.join(root, "data");
const outputPath = path.join(outDir, "OckBench_coding_polyglot_hard_200.jsonl");

/* -------------------------------------------------------------------------- */
/*  20 hard core problems with multilingual segments                          */
/*                                                                            */
/*  Each PROBLEMS entry holds:                                                */
/*    fn        : function identifier (kept verbatim in every translation)    */
/*    code      : reference solution (Python)                                 */
/*    tests     : authoritative asserts (Python, ASCII-only)                  */
/*    en[]      : English specification, split into 3 atomic sentences        */
/*    tr[]      : Turkish translation, sentence-aligned with en[]             */
/*    ar[]      : Arabic translation, sentence-aligned with en[]              */
/*    zh[]      : Chinese translation, sentence-aligned with en[]             */
/*    tr_cs     : Turkish narrative with English CS jargon code-switched in   */
/*    ar_cs     : Arabic  narrative with English CS jargon code-switched in   */
/*    zh_cs     : Chinese narrative with English CS jargon code-switched in   */
/* -------------------------------------------------------------------------- */

const PROBLEMS = [
  {
    fn: "edit_distance",
    code:
      "def edit_distance(s1, s2):\n" +
      "    m, n = len(s1), len(s2)\n" +
      "    dp = [[0]*(n+1) for _ in range(m+1)]\n" +
      "    for i in range(m+1):\n" +
      "        dp[i][0] = i\n" +
      "    for j in range(n+1):\n" +
      "        dp[0][j] = j\n" +
      "    for i in range(1, m+1):\n" +
      "        for j in range(1, n+1):\n" +
      "            if s1[i-1] == s2[j-1]:\n" +
      "                dp[i][j] = dp[i-1][j-1]\n" +
      "            else:\n" +
      "                dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])\n" +
      "    return dp[m][n]\n",
    tests: [
      'assert edit_distance("kitten", "sitting") == 3',
      'assert edit_distance("", "abc") == 3',
      'assert edit_distance("abc", "abc") == 0',
      'assert edit_distance("intention", "execution") == 5'
    ],
    en: [
      "Implement edit_distance(s1, s2) returning the Levenshtein edit distance between two strings.",
      "Allowed operations are insertion, deletion and substitution, each with cost 1.",
      "Empty strings must be handled correctly."
    ],
    tr: [
      "İki dizgi arasındaki Levenshtein düzenleme uzaklığını döndüren edit_distance(s1, s2) fonksiyonunu yazın.",
      "İzin verilen işlemler ekleme, silme ve değiştirmedir; her birinin maliyeti 1'dir.",
      "Boş dizgiler doğru şekilde ele alınmalıdır."
    ],
    ar: [
      "نفّذ الدالة edit_distance(s1, s2) التي تُعيد مسافة ليفنشتاين بين سلسلتين نصيتين.",
      "العمليات المسموح بها هي الإضافة والحذف والاستبدال، وتكلفة كل عملية تساوي 1.",
      "يجب التعامل مع السلاسل الفارغة بشكل صحيح."
    ],
    zh: [
      "实现 edit_distance(s1, s2)，返回两个字符串之间的 Levenshtein 编辑距离。",
      "允许的操作为插入、删除和替换，每次操作代价为 1。",
      "必须正确处理空字符串。"
    ],
    tr_cs:
      "edit_distance(s1, s2) fonksiyonunu yazın: iki string arasındaki Levenshtein edit distance değerini döndürsün; insert, delete ve substitute işlemlerinin her birinin cost değeri 1'dir; empty string durumlarını doğru şekilde handle edin.",
    ar_cs:
      "نفّذ edit_distance(s1, s2) لإرجاع قيمة Levenshtein edit distance بين سلسلتين؛ العمليات المسموحة هي insert و delete و substitute بتكلفة 1 لكل عملية؛ تعامل مع حالة empty string بشكل صحيح.",
    zh_cs:
      "实现 edit_distance(s1, s2)：返回两个字符串的 Levenshtein edit distance；允许的 operation 为 insert、delete、substitute，每个 cost 为 1；正确处理 empty string 的边界情况。"
  },
  {
    fn: "longest_common_subseq",
    code:
      "def longest_common_subseq(a, b):\n" +
      "    m, n = len(a), len(b)\n" +
      "    dp = [[0]*(n+1) for _ in range(m+1)]\n" +
      "    for i in range(1, m+1):\n" +
      "        for j in range(1, n+1):\n" +
      "            if a[i-1] == b[j-1]:\n" +
      "                dp[i][j] = dp[i-1][j-1] + 1\n" +
      "            else:\n" +
      "                dp[i][j] = max(dp[i-1][j], dp[i][j-1])\n" +
      "    return dp[m][n]\n",
    tests: [
      'assert longest_common_subseq("ABCBDAB", "BDCABA") == 4',
      'assert longest_common_subseq("AGGTAB", "GXTXAYB") == 4',
      'assert longest_common_subseq("", "abc") == 0',
      'assert longest_common_subseq("abc", "abc") == 3'
    ],
    en: [
      "Implement longest_common_subseq(a, b) returning the length of the longest common subsequence of two strings.",
      "Characters need not be contiguous, but their relative order must be preserved.",
      "If either string is empty the answer is 0."
    ],
    tr: [
      "İki dizginin en uzun ortak alt-dizilimi (longest common subsequence) uzunluğunu döndüren longest_common_subseq(a, b) fonksiyonunu yazın.",
      "Karakterlerin ardışık olması gerekmez, ancak göreli sıraları korunmalıdır.",
      "Dizgilerden biri boşsa sonuç 0 olmalıdır."
    ],
    ar: [
      "نفّذ الدالة longest_common_subseq(a, b) التي تُعيد طول أطول متتالية جزئية مشتركة بين سلسلتين.",
      "ليس من الضروري أن تكون الأحرف متجاورة، ولكن يجب الحفاظ على ترتيبها النسبي.",
      "إذا كانت إحدى السلسلتين فارغة فإن الناتج هو 0."
    ],
    zh: [
      "实现 longest_common_subseq(a, b)，返回两个字符串的最长公共子序列长度。",
      "字符不必连续，但必须保持原有的相对顺序。",
      "若任一字符串为空，结果为 0。"
    ],
    tr_cs:
      "longest_common_subseq(a, b) fonksiyonunu implement edin: iki string'in longest common subsequence'ının length'ini döndürsün; karakterler contiguous olmak zorunda değil ama relative order korunmalı; boş string için sonuç 0.",
    ar_cs:
      "نفّذ longest_common_subseq(a, b) لإرجاع length الـ longest common subsequence بين سلسلتين؛ ليس من اللازم أن تكون characters متجاورة لكن relative order يجب الحفاظ عليه؛ في حالة empty string الناتج 0.",
    zh_cs:
      "实现 longest_common_subseq(a, b)：返回两个 string 的 longest common subsequence 的 length；字符不必连续但 relative order 必须保持；任一 empty string 时返回 0。"
  },
  {
    fn: "knapsack",
    code:
      "def knapsack(weights, values, capacity):\n" +
      "    n = len(weights)\n" +
      "    dp = [[0]*(capacity+1) for _ in range(n+1)]\n" +
      "    for i in range(1, n+1):\n" +
      "        for w in range(capacity+1):\n" +
      "            if weights[i-1] <= w:\n" +
      "                dp[i][w] = max(dp[i-1][w], dp[i-1][w-weights[i-1]] + values[i-1])\n" +
      "            else:\n" +
      "                dp[i][w] = dp[i-1][w]\n" +
      "    return dp[n][capacity]\n",
    tests: [
      "assert knapsack([1,2,3], [10,15,40], 6) == 65",
      "assert knapsack([2,3,4,5], [3,4,5,6], 5) == 7",
      "assert knapsack([], [], 10) == 0",
      "assert knapsack([10], [100], 5) == 0"
    ],
    en: [
      "Implement knapsack(weights, values, capacity) solving the 0/1 knapsack problem.",
      "Given two equal-length lists weights and values plus an integer capacity, return the maximum total value such that the chosen items' weights do not exceed capacity.",
      "Each item may be either fully taken or skipped; partial items are not allowed."
    ],
    tr: [
      "0/1 sırt çantası problemini çözen knapsack(weights, values, capacity) fonksiyonunu yazın.",
      "Aynı uzunlukta iki liste (weights, values) ve bir tamsayı capacity verildiğinde, seçilen nesnelerin toplam ağırlığı capacity'i aşmayacak şekilde elde edilebilecek en büyük toplam değeri döndürün.",
      "Her nesne ya tamamen alınır ya da atlanır; kısmi alma yasaktır."
    ],
    ar: [
      "نفّذ الدالة knapsack(weights, values, capacity) لحل مسألة الحقيبة 0/1.",
      "بمعطى قائمتين متساويتي الطول weights و values وعدد صحيح capacity، أعِد أكبر قيمة إجمالية بحيث لا يتجاوز مجموع أوزان العناصر المختارة قيمة capacity.",
      "كل عنصر إما يؤخذ بالكامل أو يُترك؛ لا يُسمح بأخذ جزء منه."
    ],
    zh: [
      "实现 knapsack(weights, values, capacity)，求解 0/1 背包问题。",
      "给定两个等长列表 weights 和 values 以及一个整数容量 capacity，返回所选物品总重量不超过 capacity 时可达到的最大总价值。",
      "每件物品要么完整选取要么跳过，不允许部分选取。"
    ],
    tr_cs:
      "knapsack(weights, values, capacity) fonksiyonunu yazın: 0/1 knapsack problem'ini DP ile çözsün; verilen weights, values list'leri ve integer capacity için, total weight capacity'yi aşmayacak şekilde maksimum total value döndürsün; her item ya alınır ya skip edilir, fractional item olmaz.",
    ar_cs:
      "نفّذ knapsack(weights, values, capacity) لحل 0/1 knapsack باستخدام DP؛ بمعطى قوائم weights و values و integer capacity، أعد أكبر total value بحيث total weight لا يتجاوز capacity؛ كل item إما take أو skip دون fractional.",
    zh_cs:
      "实现 knapsack(weights, values, capacity)：用 DP 求解 0/1 knapsack；给定 weights、values list 和 integer capacity，返回 total weight 不超 capacity 的最大 total value；每个 item 要么 take 要么 skip，不允许 fractional。"
  },
  {
    fn: "coin_change_ways",
    code:
      "def coin_change_ways(amount, coins):\n" +
      "    dp = [0] * (amount + 1)\n" +
      "    dp[0] = 1\n" +
      "    for c in coins:\n" +
      "        for x in range(c, amount + 1):\n" +
      "            dp[x] += dp[x - c]\n" +
      "    return dp[amount]\n",
    tests: [
      "assert coin_change_ways(5, [1,2,5]) == 4",
      "assert coin_change_ways(3, [2]) == 0",
      "assert coin_change_ways(10, [10]) == 1",
      "assert coin_change_ways(0, [1,2,3]) == 1"
    ],
    en: [
      "Implement coin_change_ways(amount, coins) returning the number of distinct ways to make amount.",
      "Each coin denomination in coins may be used any number of times.",
      "An amount of 0 can always be made in exactly one way (the empty selection)."
    ],
    tr: [
      "Verilen amount tutarını oluşturmanın farklı yol sayısını döndüren coin_change_ways(amount, coins) fonksiyonunu yazın.",
      "coins listesindeki her madeni para istenildiği kadar kullanılabilir.",
      "amount 0 ise sonuç her zaman 1'dir (boş seçim)."
    ],
    ar: [
      "نفّذ الدالة coin_change_ways(amount, coins) لإرجاع عدد الطرق المختلفة لتكوين القيمة amount.",
      "يمكن استخدام كل فئة من فئات coins عدداً غير محدود من المرات.",
      "إذا كانت amount تساوي 0 فالنتيجة دائماً 1 (الاختيار الفارغ)."
    ],
    zh: [
      "实现 coin_change_ways(amount, coins)，返回凑出 amount 的不同方式数。",
      "coins 中每种面额可以使用任意次。",
      "amount 为 0 时总能以一种方式凑出（空选择）。"
    ],
    tr_cs:
      "coin_change_ways(amount, coins) fonksiyonunu yazın: amount'u oluşturmanın distinct way sayısını döndürsün; coins'deki her denomination unlimited kullanılabilir; amount=0 için sonuç 1 (empty selection).",
    ar_cs:
      "نفّذ coin_change_ways(amount, coins) لإرجاع عدد الـ distinct ways لتكوين amount؛ كل denomination في coins يمكن استخدامه unlimited مرات؛ amount=0 يعطي 1 (empty selection).",
    zh_cs:
      "实现 coin_change_ways(amount, coins)：返回组成 amount 的 distinct way 数；coins 中每个 denomination 可 unlimited 使用；amount=0 时返回 1（empty selection）。"
  },
  {
    fn: "max_subarray",
    code:
      "def max_subarray(nums):\n" +
      "    if not nums:\n" +
      "        return 0\n" +
      "    best = cur = nums[0]\n" +
      "    for x in nums[1:]:\n" +
      "        cur = max(x, cur + x)\n" +
      "        best = max(best, cur)\n" +
      "    return best\n",
    tests: [
      "assert max_subarray([-2,1,-3,4,-1,2,1,-5,4]) == 6",
      "assert max_subarray([1]) == 1",
      "assert max_subarray([-1,-2,-3]) == -1",
      "assert max_subarray([5,4,-1,7,8]) == 23"
    ],
    en: [
      "Implement max_subarray(nums) returning the maximum sum over all contiguous subarrays of nums.",
      "If every element is negative, return the largest single element rather than 0.",
      "An empty input must return 0."
    ],
    tr: [
      "nums listesinin tüm ardışık alt-dizileri arasındaki en büyük toplamı döndüren max_subarray(nums) fonksiyonunu yazın.",
      "Tüm elemanlar negatifse, 0 yerine en büyük tek elemanı döndürün.",
      "Boş girdide sonuç 0 olmalıdır."
    ],
    ar: [
      "نفّذ الدالة max_subarray(nums) التي تُعيد أكبر مجموع لأي مصفوفة جزئية متجاورة من nums.",
      "إذا كانت جميع العناصر سالبة، أعد أكبر عنصر منفرد بدلاً من 0.",
      "يجب أن تُعيد القائمة الفارغة 0."
    ],
    zh: [
      "实现 max_subarray(nums)，返回 nums 中所有连续子数组的最大和。",
      "若所有元素都为负数，返回最大的单个元素而非 0。",
      "空输入应返回 0。"
    ],
    tr_cs:
      "max_subarray(nums) fonksiyonunu yazın: nums'taki tüm contiguous subarray'lerin en büyük sum'ını döndürsün; tüm element'ler negatif ise 0 yerine en büyük single element döndürün; empty input için 0 döndürün.",
    ar_cs:
      "نفّذ max_subarray(nums) لإرجاع maximum sum لأي contiguous subarray في nums؛ إذا كانت كل العناصر negative أعد أكبر single element بدلاً من 0؛ في حال empty input أعد 0.",
    zh_cs:
      "实现 max_subarray(nums)：返回 nums 所有 contiguous subarray 的 maximum sum；若全部 element 为 negative，返回最大 single element 而非 0；empty input 时返回 0。"
  },
  {
    fn: "longest_palindrome",
    code:
      "def longest_palindrome(s):\n" +
      "    if not s:\n" +
      "        return \"\"\n" +
      "    start, end = 0, 0\n" +
      "    def expand(l, r):\n" +
      "        while l >= 0 and r < len(s) and s[l] == s[r]:\n" +
      "            l -= 1\n" +
      "            r += 1\n" +
      "        return l + 1, r - 1\n" +
      "    for i in range(len(s)):\n" +
      "        l1, r1 = expand(i, i)\n" +
      "        l2, r2 = expand(i, i + 1)\n" +
      "        if r1 - l1 > end - start:\n" +
      "            start, end = l1, r1\n" +
      "        if r2 - l2 > end - start:\n" +
      "            start, end = l2, r2\n" +
      "    return s[start:end + 1]\n",
    tests: [
      'assert longest_palindrome("babad") == "bab"',
      'assert longest_palindrome("cbbd") == "bb"',
      'assert longest_palindrome("a") == "a"',
      'assert longest_palindrome("forgeeksskeegfor") == "geeksskeeg"'
    ],
    en: [
      "Implement longest_palindrome(s) returning the longest palindromic substring of s.",
      "On ties, return the palindrome whose expansion centre is encountered first when scanning left to right.",
      "Empty input must return the empty string."
    ],
    tr: [
      "s dizgisinin en uzun palindromik alt-dizgisini döndüren longest_palindrome(s) fonksiyonunu yazın.",
      "Eşitlik durumunda soldan sağa tarama sırasında merkezi önce bulunan palindromu döndürün.",
      "Boş girdi için boş dizgi döndürülmelidir."
    ],
    ar: [
      "نفّذ الدالة longest_palindrome(s) لإرجاع أطول سلسلة جزئية متناظرة (palindrome) في s.",
      "عند التساوي، أعد المتناظرة التي يأتي مركز توسعها أولاً عند المسح من اليسار إلى اليمين.",
      "في حال إدخال فارغ يجب إعادة سلسلة فارغة."
    ],
    zh: [
      "实现 longest_palindrome(s)，返回 s 中最长的回文子串。",
      "若长度相同，返回从左到右扫描时扩展中心最先出现的那个回文。",
      "空输入应返回空字符串。"
    ],
    tr_cs:
      "longest_palindrome(s) fonksiyonunu yazın: s'in longest palindromic substring'ini döndürsün; tie durumunda left-to-right scan'de expansion center'ı önce bulunan palindrome'u seçin; empty input için empty string döndürün.",
    ar_cs:
      "نفّذ longest_palindrome(s) لإرجاع longest palindromic substring في s؛ عند tie أعد الـ palindrome الذي يأتي expansion center الخاص به أولاً عند left-to-right scan؛ في حال empty input أعد empty string.",
    zh_cs:
      "实现 longest_palindrome(s)：返回 s 的 longest palindromic substring；tie 时返回 left-to-right scan 中 expansion center 最先出现的 palindrome；empty input 时返回 empty string。"
  },
  {
    fn: "spiral_order",
    code:
      "def spiral_order(matrix):\n" +
      "    if not matrix or not matrix[0]:\n" +
      "        return []\n" +
      "    result = []\n" +
      "    top, bottom = 0, len(matrix) - 1\n" +
      "    left, right = 0, len(matrix[0]) - 1\n" +
      "    while top <= bottom and left <= right:\n" +
      "        for j in range(left, right + 1):\n" +
      "            result.append(matrix[top][j])\n" +
      "        top += 1\n" +
      "        for i in range(top, bottom + 1):\n" +
      "            result.append(matrix[i][right])\n" +
      "        right -= 1\n" +
      "        if top <= bottom:\n" +
      "            for j in range(right, left - 1, -1):\n" +
      "                result.append(matrix[bottom][j])\n" +
      "            bottom -= 1\n" +
      "        if left <= right:\n" +
      "            for i in range(bottom, top - 1, -1):\n" +
      "                result.append(matrix[i][left])\n" +
      "            left += 1\n" +
      "    return result\n",
    tests: [
      "assert spiral_order([[1,2,3],[4,5,6],[7,8,9]]) == [1,2,3,6,9,8,7,4,5]",
      "assert spiral_order([[1,2,3,4],[5,6,7,8],[9,10,11,12]]) == [1,2,3,4,8,12,11,10,9,5,6,7]",
      "assert spiral_order([]) == []",
      "assert spiral_order([[1]]) == [1]"
    ],
    en: [
      "Implement spiral_order(matrix) traversing a 2D matrix clockwise in spiral order from the top-left.",
      "Return the visited cells as a flat list, preserving traversal order.",
      "An empty matrix or a matrix with no columns returns an empty list."
    ],
    tr: [
      "Bir 2B matrisi sol-üst köşeden başlayarak saat yönünde sarmal sırada gezen spiral_order(matrix) fonksiyonunu yazın.",
      "Ziyaret edilen hücreleri gezilme sırasını koruyarak düz bir liste olarak döndürün.",
      "Boş matris veya sütunsuz matris için boş liste döndürülmelidir."
    ],
    ar: [
      "نفّذ الدالة spiral_order(matrix) التي تمشي على مصفوفة ثنائية الأبعاد بترتيب حلزوني باتجاه عقارب الساعة بدءاً من الزاوية العليا اليسرى.",
      "أعد الخلايا التي تمت زيارتها كقائمة مسطحة مع الحفاظ على ترتيب المسار.",
      "في حال مصفوفة فارغة أو مصفوفة بدون أعمدة أعد قائمة فارغة."
    ],
    zh: [
      "实现 spiral_order(matrix)：从左上角开始按顺时针螺旋顺序遍历二维矩阵。",
      "将访问到的单元格作为扁平列表返回，保持遍历顺序。",
      "空矩阵或无列的矩阵返回空列表。"
    ],
    tr_cs:
      "spiral_order(matrix) fonksiyonunu yazın: 2D matrix'i top-left'ten clockwise spiral order ile traverse etsin; visit edilen cell'leri flat list olarak döndürsün; empty matrix veya column'u olmayan matrix için empty list döndürsün.",
    ar_cs:
      "نفّذ spiral_order(matrix) لاجتياز 2D matrix بترتيب clockwise spiral order من الـ top-left؛ أعد الـ cells التي تمت زيارتها كـ flat list مع الحفاظ على traversal order؛ في حال matrix فارغة أو بدون columns أعد empty list.",
    zh_cs:
      "实现 spiral_order(matrix)：从 top-left 按 clockwise spiral order traverse 2D matrix；以 flat list 返回 visit 到的 cell 并保持 traversal order；empty matrix 或无 column 的 matrix 返回 empty list。"
  },
  {
    fn: "decode_ways",
    code:
      "def decode_ways(s):\n" +
      "    if not s or s[0] == '0':\n" +
      "        return 0\n" +
      "    n = len(s)\n" +
      "    dp = [0] * (n + 1)\n" +
      "    dp[0] = dp[1] = 1\n" +
      "    for i in range(2, n + 1):\n" +
      "        one = int(s[i-1])\n" +
      "        two = int(s[i-2:i])\n" +
      "        if 1 <= one <= 9:\n" +
      "            dp[i] += dp[i-1]\n" +
      "        if 10 <= two <= 26:\n" +
      "            dp[i] += dp[i-2]\n" +
      "    return dp[n]\n",
    tests: [
      'assert decode_ways("12") == 2',
      'assert decode_ways("226") == 3',
      'assert decode_ways("06") == 0',
      'assert decode_ways("11106") == 2'
    ],
    en: [
      "Implement decode_ways(s) returning the number of valid decodings of a digit string under the mapping A=1..Z=26.",
      "Any chunk that starts with '0' is invalid and contributes no decoding.",
      "An empty string or a string starting with '0' must return 0."
    ],
    tr: [
      "A=1..Z=26 eşlemesi altında bir rakam dizgisinin geçerli kod çözüm sayısını döndüren decode_ways(s) fonksiyonunu yazın.",
      "'0' ile başlayan herhangi bir parça geçersizdir ve kod çözümüne katkı vermez.",
      "Boş dizgi veya '0' ile başlayan dizgi için sonuç 0 olmalıdır."
    ],
    ar: [
      "نفّذ decode_ways(s) لإرجاع عدد طرق فك التشفير الصحيحة لسلسلة أرقام وفق التخطيط A=1..Z=26.",
      "أي مقطع يبدأ بـ '0' يُعتبر غير صالح ولا يساهم في أي طريقة فك تشفير.",
      "السلسلة الفارغة أو التي تبدأ بـ '0' يجب أن تُعيد 0."
    ],
    zh: [
      "实现 decode_ways(s)：在映射 A=1..Z=26 下，返回数字字符串的有效解码方式数。",
      "任何以 '0' 开头的片段为非法，不贡献任何解码。",
      "空字符串或以 '0' 开头的字符串必须返回 0。"
    ],
    tr_cs:
      "decode_ways(s) fonksiyonunu yazın: A=1..Z=26 mapping altında digit string'in valid decoding sayısını döndürsün; '0' ile başlayan herhangi bir chunk invalid'dir; empty string veya '0' ile başlayan string için 0 döndürsün.",
    ar_cs:
      "نفّذ decode_ways(s) لإرجاع عدد valid decodings لـ digit string تحت mapping A=1..Z=26؛ أي chunk يبدأ بـ '0' هو invalid؛ empty string أو string يبدأ بـ '0' يجب أن يُعيد 0.",
    zh_cs:
      "实现 decode_ways(s)：在 A=1..Z=26 mapping 下返回 digit string 的 valid decoding 数；以 '0' 开头的 chunk 为 invalid；empty string 或以 '0' 开头的 string 返回 0。"
  },
  {
    fn: "valid_parens",
    code:
      "def valid_parens(s):\n" +
      "    stack = []\n" +
      "    pairs = {')': '(', ']': '[', '}': '{'}\n" +
      "    for c in s:\n" +
      "        if c in '([{':\n" +
      "            stack.append(c)\n" +
      "        elif c in ')]}':\n" +
      "            if not stack or stack[-1] != pairs[c]:\n" +
      "                return False\n" +
      "            stack.pop()\n" +
      "    return not stack\n",
    tests: [
      'assert valid_parens("()") == True',
      'assert valid_parens("()[]{}") == True',
      'assert valid_parens("(]") == False',
      'assert valid_parens("([)]") == False',
      'assert valid_parens("{[]}") == True'
    ],
    en: [
      "Implement valid_parens(s) returning True iff every opening bracket from (), [], {} has a matching closer in the correct order.",
      "Closers may not appear before their matching opener and must respect the nesting structure.",
      "The empty string is considered valid."
    ],
    tr: [
      "(), [], {} parantezlerinden oluşan bir s dizgisi için her açılan parantezin doğru sırada eşleşen kapanışı varsa True döndüren valid_parens(s) fonksiyonunu yazın.",
      "Kapanış parantezleri eşleşen açılış parantezinden önce gelemez ve iç içe geçme kurallarına uymalıdır.",
      "Boş dizgi geçerli kabul edilir."
    ],
    ar: [
      "نفّذ valid_parens(s) لإرجاع True إذا وفقط إذا كان لكل قوس فاتح من (), [], {} قوس مغلق مطابق بالترتيب الصحيح.",
      "لا يمكن أن يسبق القوس المغلق فاتحه ويجب أن يحترم بنية التداخل.",
      "تُعتبر السلسلة الفارغة صالحة."
    ],
    zh: [
      "实现 valid_parens(s)：当且仅当 (), [], {} 中每个左括号都有按正确顺序匹配的右括号时返回 True。",
      "右括号不能出现在其匹配的左括号之前，且必须符合嵌套结构。",
      "空字符串视为有效。"
    ],
    tr_cs:
      "valid_parens(s) fonksiyonunu yazın: (), [], {} bracket'ları için her opening'in doğru order'da matching closing'i varsa True döndürsün; closer'lar opener'larından önce gelemez ve nesting structure'ına uymalı; empty string valid kabul edilir.",
    ar_cs:
      "نفّذ valid_parens(s) لإرجاع True فقط إذا كان لكل opening bracket من (), [], {} matching closing بالترتيب الصحيح؛ closer لا يمكن أن يأتي قبل opener المطابق ويجب احترام nesting structure؛ empty string يُعتبر valid.",
    zh_cs:
      "实现 valid_parens(s)：当 (), [], {} 中每个 opening bracket 都有按正确 order 匹配的 closing 时返回 True；closer 不能出现在 matching opener 之前，且需符合 nesting structure；empty string 视为 valid。"
  },
  {
    fn: "roman_to_int",
    code:
      "def roman_to_int(s):\n" +
      "    vals = {'I':1,'V':5,'X':10,'L':50,'C':100,'D':500,'M':1000}\n" +
      "    total = 0\n" +
      "    prev = 0\n" +
      "    for c in reversed(s):\n" +
      "        v = vals[c]\n" +
      "        if v < prev:\n" +
      "            total -= v\n" +
      "        else:\n" +
      "            total += v\n" +
      "        prev = v\n" +
      "    return total\n",
    tests: [
      'assert roman_to_int("III") == 3',
      'assert roman_to_int("IV") == 4',
      'assert roman_to_int("IX") == 9',
      'assert roman_to_int("LVIII") == 58',
      'assert roman_to_int("MCMXCIV") == 1994'
    ],
    en: [
      "Implement roman_to_int(s) converting a Roman numeral string into its integer value.",
      "Use the standard subtractive forms IV=4, IX=9, XL=40, XC=90, CD=400, CM=900.",
      "Symbols are I=1, V=5, X=10, L=50, C=100, D=500, M=1000."
    ],
    tr: [
      "Bir Roma rakamı dizgisini tamsayı değerine dönüştüren roman_to_int(s) fonksiyonunu yazın.",
      "Standart eksiltici biçimleri kullanın: IV=4, IX=9, XL=40, XC=90, CD=400, CM=900.",
      "Sembol değerleri I=1, V=5, X=10, L=50, C=100, D=500, M=1000'dir."
    ],
    ar: [
      "نفّذ roman_to_int(s) لتحويل سلسلة أرقام رومانية إلى قيمتها الصحيحة.",
      "استخدم الصيغ الطرحية القياسية: IV=4, IX=9, XL=40, XC=90, CD=400, CM=900.",
      "قيم الرموز: I=1, V=5, X=10, L=50, C=100, D=500, M=1000."
    ],
    zh: [
      "实现 roman_to_int(s)：将罗马数字字符串转换为对应整数值。",
      "使用标准的减法形式 IV=4、IX=9、XL=40、XC=90、CD=400、CM=900。",
      "字符值为 I=1、V=5、X=10、L=50、C=100、D=500、M=1000。"
    ],
    tr_cs:
      "roman_to_int(s) fonksiyonunu yazın: Roman numeral string'i integer'a convert etsin; standart subtractive form'larını (IV=4, IX=9, XL=40, XC=90, CD=400, CM=900) kullanın; symbol value'ları I=1, V=5, X=10, L=50, C=100, D=500, M=1000.",
    ar_cs:
      "نفّذ roman_to_int(s) لتحويل Roman numeral string إلى integer؛ استخدم subtractive forms القياسية (IV=4, IX=9, XL=40, XC=90, CD=400, CM=900)؛ symbol values: I=1, V=5, X=10, L=50, C=100, D=500, M=1000.",
    zh_cs:
      "实现 roman_to_int(s)：将 Roman numeral string 转换为 integer；使用标准 subtractive form（IV=4, IX=9, XL=40, XC=90, CD=400, CM=900）；symbol value 为 I=1, V=5, X=10, L=50, C=100, D=500, M=1000。"
  },
  {
    fn: "int_to_roman",
    code:
      "def int_to_roman(n):\n" +
      "    vals = [(1000,'M'),(900,'CM'),(500,'D'),(400,'CD'),(100,'C'),(90,'XC'),(50,'L'),(40,'XL'),(10,'X'),(9,'IX'),(5,'V'),(4,'IV'),(1,'I')]\n" +
      "    result = []\n" +
      "    for v, s in vals:\n" +
      "        while n >= v:\n" +
      "            result.append(s)\n" +
      "            n -= v\n" +
      "    return ''.join(result)\n",
    tests: [
      'assert int_to_roman(3) == "III"',
      'assert int_to_roman(4) == "IV"',
      'assert int_to_roman(9) == "IX"',
      'assert int_to_roman(58) == "LVIII"',
      'assert int_to_roman(1994) == "MCMXCIV"'
    ],
    en: [
      "Implement int_to_roman(n) converting an integer in [1, 3999] to its Roman numeral representation.",
      "Use the standard subtractive forms IV, IX, XL, XC, CD, CM rather than IIII, VIIII, etc.",
      "Output must be a single string built from the symbols I, V, X, L, C, D, M."
    ],
    tr: [
      "[1, 3999] aralığındaki bir tamsayıyı Roma rakamı gösterimine dönüştüren int_to_roman(n) fonksiyonunu yazın.",
      "IIII, VIIII gibi biçimler yerine standart eksiltici biçimleri (IV, IX, XL, XC, CD, CM) kullanın.",
      "Çıktı I, V, X, L, C, D, M sembollerinden oluşan tek bir dizgi olmalıdır."
    ],
    ar: [
      "نفّذ int_to_roman(n) لتحويل عدد صحيح في المجال [1, 3999] إلى تمثيله بالأرقام الرومانية.",
      "استخدم الصيغ الطرحية القياسية IV, IX, XL, XC, CD, CM بدلاً من IIII, VIIII وغيرها.",
      "يجب أن يكون الناتج سلسلة واحدة مكوّنة من الرموز I, V, X, L, C, D, M."
    ],
    zh: [
      "实现 int_to_roman(n)：将 [1, 3999] 范围内的整数转换为罗马数字表示。",
      "使用标准的减法形式 IV、IX、XL、XC、CD、CM，而非 IIII、VIIII 等。",
      "输出应为由 I、V、X、L、C、D、M 这些字符构成的单一字符串。"
    ],
    tr_cs:
      "int_to_roman(n) fonksiyonunu yazın: [1, 3999] aralığındaki integer'ı Roman numeral representation'a convert etsin; IIII gibi form'lar yerine standart subtractive form (IV, IX, XL, XC, CD, CM) kullanın; output I, V, X, L, C, D, M symbol'larından oluşan tek bir string olsun.",
    ar_cs:
      "نفّذ int_to_roman(n) لتحويل integer في [1, 3999] إلى Roman numeral representation؛ استخدم standard subtractive form (IV, IX, XL, XC, CD, CM) بدلاً من IIII أو VIIII؛ output يجب أن يكون single string من symbols I, V, X, L, C, D, M.",
    zh_cs:
      "实现 int_to_roman(n)：将 [1, 3999] 内的 integer 转为 Roman numeral representation；使用 standard subtractive form（IV, IX, XL, XC, CD, CM）而非 IIII 等；output 是由 I, V, X, L, C, D, M 组成的 single string。"
  },
  {
    fn: "sliding_window_max",
    code:
      "from collections import deque\n" +
      "def sliding_window_max(nums, k):\n" +
      "    result = []\n" +
      "    dq = deque()\n" +
      "    for i, x in enumerate(nums):\n" +
      "        while dq and dq[0] < i - k + 1:\n" +
      "            dq.popleft()\n" +
      "        while dq and nums[dq[-1]] < x:\n" +
      "            dq.pop()\n" +
      "        dq.append(i)\n" +
      "        if i >= k - 1:\n" +
      "            result.append(nums[dq[0]])\n" +
      "    return result\n",
    tests: [
      "assert sliding_window_max([1,3,-1,-3,5,3,6,7], 3) == [3,3,5,5,6,7]",
      "assert sliding_window_max([1], 1) == [1]",
      "assert sliding_window_max([1,-1], 1) == [1,-1]",
      "assert sliding_window_max([9,11], 2) == [11]"
    ],
    en: [
      "Implement sliding_window_max(nums, k) returning the maximum value within each sliding window of size k from left to right.",
      "Use an O(n) deque-based approach that maintains candidate indices in monotone decreasing order.",
      "If k equals 1, the result is just nums itself; if k equals len(nums), the result is a single-element list."
    ],
    tr: [
      "Bir nums listesinde soldan sağa kayan k boyutlu pencerenin her bir konumundaki en büyük değeri döndüren sliding_window_max(nums, k) fonksiyonunu yazın.",
      "Aday indekslerini monoton azalan sırada tutan O(n) çift uçlu kuyruk (deque) yaklaşımını kullanın.",
      "k=1 için sonuç doğrudan nums; k=len(nums) için tek elemanlı bir liste olmalıdır."
    ],
    ar: [
      "نفّذ الدالة sliding_window_max(nums, k) لإرجاع القيمة العظمى داخل كل نافذة منزلقة بحجم k من اليسار إلى اليمين.",
      "استخدم نهج deque بزمن O(n) يُبقي المؤشرات المرشحة بترتيب تنازلي صارم.",
      "إذا كانت k تساوي 1 يكون الناتج هو nums نفسها؛ وإذا كانت تساوي len(nums) يكون الناتج قائمة بعنصر واحد."
    ],
    zh: [
      "实现 sliding_window_max(nums, k)：从左到右返回每个大小为 k 的滑动窗口内的最大值。",
      "使用 O(n) 的双端队列方法，将候选下标按严格单调递减顺序维护。",
      "k=1 时结果即为 nums 本身；k=len(nums) 时结果为单元素列表。"
    ],
    tr_cs:
      "sliding_window_max(nums, k) fonksiyonunu yazın: nums üzerinde size k'lik her sliding window'un maximum value'sunu left-to-right döndürsün; candidate index'leri monotone decreasing tutan O(n) deque yaklaşımını kullanın; k=1 için sonuç nums, k=len(nums) için single element list.",
    ar_cs:
      "نفّذ sliding_window_max(nums, k) لإرجاع maximum value داخل كل sliding window بحجم k من left-to-right؛ استخدم O(n) deque approach تحفظ candidate indices بترتيب monotone decreasing؛ k=1 يعطي nums نفسها و k=len(nums) يعطي single element list.",
    zh_cs:
      "实现 sliding_window_max(nums, k)：从 left-to-right 返回每个 size k 的 sliding window 内的 maximum value；使用 O(n) deque approach 将 candidate index 按 monotone decreasing 顺序维护；k=1 时结果为 nums 本身，k=len(nums) 时为 single element list。"
  },
  {
    fn: "topo_sort",
    code:
      "from collections import defaultdict, deque\n" +
      "def topo_sort(num_nodes, edges):\n" +
      "    g = defaultdict(list)\n" +
      "    indeg = [0] * num_nodes\n" +
      "    for u, v in edges:\n" +
      "        g[u].append(v)\n" +
      "        indeg[v] += 1\n" +
      "    q = deque(i for i in range(num_nodes) if indeg[i] == 0)\n" +
      "    order = []\n" +
      "    while q:\n" +
      "        u = q.popleft()\n" +
      "        order.append(u)\n" +
      "        for v in g[u]:\n" +
      "            indeg[v] -= 1\n" +
      "            if indeg[v] == 0:\n" +
      "                q.append(v)\n" +
      "    return order if len(order) == num_nodes else []\n",
    tests: [
      "assert topo_sort(4, [[0,1],[0,2],[1,3],[2,3]]) == [0,1,2,3]",
      "assert topo_sort(2, [[0,1],[1,0]]) == []",
      "assert topo_sort(3, []) == [0,1,2]",
      "assert topo_sort(2, [[0,1]]) == [0,1]"
    ],
    en: [
      "Implement topo_sort(num_nodes, edges) returning one valid topological ordering of a directed graph.",
      "Use Kahn's algorithm with smallest-index priority so the output is deterministic across runs.",
      "If the graph contains a cycle, return an empty list."
    ],
    tr: [
      "Yönlü bir çizgenin geçerli bir topolojik sıralamasını döndüren topo_sort(num_nodes, edges) fonksiyonunu yazın.",
      "Çıktının çalıştırmalar arasında deterministik olması için Kahn algoritmasını en küçük indeks önceliğiyle kullanın.",
      "Çizgede bir döngü varsa boş liste döndürün."
    ],
    ar: [
      "نفّذ topo_sort(num_nodes, edges) لإرجاع ترتيب طوبولوجي صالح لمخطط موجّه.",
      "استخدم خوارزمية Kahn مع أولوية أصغر المؤشرات لكي يكون الناتج حتمياً عبر التشغيلات.",
      "إذا احتوى المخطط على دورة فأعد قائمة فارغة."
    ],
    zh: [
      "实现 topo_sort(num_nodes, edges)：对有向图返回一个合法的拓扑序。",
      "使用 Kahn 算法并以最小下标优先，使输出在多次运行间保持确定性。",
      "若图中存在环，返回空列表。"
    ],
    tr_cs:
      "topo_sort(num_nodes, edges) fonksiyonunu yazın: directed graph için valid bir topological order döndürsün; output deterministic olsun diye Kahn's algorithm'ı smallest-index priority ile kullanın; cycle varsa empty list döndürün.",
    ar_cs:
      "نفّذ topo_sort(num_nodes, edges) لإرجاع valid topological order لـ directed graph؛ استخدم Kahn's algorithm مع smallest-index priority ليكون الـ output deterministic؛ في حال cycle أعد empty list.",
    zh_cs:
      "实现 topo_sort(num_nodes, edges)：为 directed graph 返回 valid topological order；使用 Kahn's algorithm 并以 smallest-index priority 保证 output 的 determinism；若存在 cycle 返回 empty list。"
  },
  {
    fn: "lis_length",
    code:
      "from bisect import bisect_left\n" +
      "def lis_length(nums):\n" +
      "    tails = []\n" +
      "    for x in nums:\n" +
      "        i = bisect_left(tails, x)\n" +
      "        if i == len(tails):\n" +
      "            tails.append(x)\n" +
      "        else:\n" +
      "            tails[i] = x\n" +
      "    return len(tails)\n",
    tests: [
      "assert lis_length([10,9,2,5,3,7,101,18]) == 4",
      "assert lis_length([0,1,0,3,2,3]) == 4",
      "assert lis_length([7,7,7,7]) == 1",
      "assert lis_length([]) == 0"
    ],
    en: [
      "Implement lis_length(nums) returning the length of the longest strictly increasing subsequence.",
      "The subsequence need not be contiguous, but elements must remain in their original order and be strictly increasing.",
      "Aim for an O(n log n) algorithm using patience sorting with binary search."
    ],
    tr: [
      "En uzun kesin artan alt-dizilim uzunluğunu döndüren lis_length(nums) fonksiyonunu yazın.",
      "Alt-dizilim ardışık olmak zorunda değildir; ancak orijinal sırasını koruyarak kesin artan olmalıdır.",
      "İkili arama ile patience sorting kullanarak O(n log n) algoritmayı hedefleyin."
    ],
    ar: [
      "نفّذ lis_length(nums) لإرجاع طول أطول متتالية جزئية متزايدة بشكل صارم.",
      "ليست بالضرورة متجاورة، لكن يجب أن تحافظ على ترتيبها الأصلي وأن تكون متزايدة بصورة صارمة.",
      "استهدف خوارزمية O(n log n) باستخدام patience sorting مع البحث الثنائي."
    ],
    zh: [
      "实现 lis_length(nums)：返回最长严格递增子序列的长度。",
      "子序列不必连续，但必须保持原顺序且严格递增。",
      "目标算法复杂度为 O(n log n)，使用 patience sorting 配合二分查找。"
    ],
    tr_cs:
      "lis_length(nums) fonksiyonunu yazın: longest strictly increasing subsequence'ın length'ini döndürsün; subsequence contiguous olmak zorunda değil ama original order korunmalı ve strictly increasing olmalı; binary search ile patience sorting kullanarak O(n log n) algoritmayı hedefleyin.",
    ar_cs:
      "نفّذ lis_length(nums) لإرجاع length الـ longest strictly increasing subsequence؛ ليست بالضرورة contiguous لكن original order يجب الحفاظ عليه و strictly increasing؛ اهدف إلى O(n log n) algorithm عبر patience sorting مع binary search.",
    zh_cs:
      "实现 lis_length(nums)：返回 longest strictly increasing subsequence 的 length；subsequence 不必 contiguous 但必须保持 original order 且 strictly increasing；目标 O(n log n) algorithm，使用 patience sorting 与 binary search。"
  },
  {
    fn: "word_break",
    code:
      "def word_break(s, words):\n" +
      "    word_set = set(words)\n" +
      "    n = len(s)\n" +
      "    dp = [False] * (n + 1)\n" +
      "    dp[0] = True\n" +
      "    for i in range(1, n + 1):\n" +
      "        for j in range(i):\n" +
      "            if dp[j] and s[j:i] in word_set:\n" +
      "                dp[i] = True\n" +
      "                break\n" +
      "    return dp[n]\n",
    tests: [
      'assert word_break("leetcode", ["leet","code"]) == True',
      'assert word_break("applepenapple", ["apple","pen"]) == True',
      'assert word_break("catsandog", ["cats","dog","sand","and","cat"]) == False',
      'assert word_break("", ["a","b"]) == True'
    ],
    en: [
      "Implement word_break(s, words) returning True iff s can be segmented into a sequence of dictionary words.",
      "Words from the list may be reused an unlimited number of times.",
      "The empty string is always considered breakable and must return True."
    ],
    tr: [
      "s dizgisi sözlükteki kelimelerin bir dizilimine bölünebiliyorsa True döndüren word_break(s, words) fonksiyonunu yazın.",
      "Listedeki kelimeler sınırsız sayıda yeniden kullanılabilir.",
      "Boş dizgi her zaman bölünebilir kabul edilir ve True döndürülmelidir."
    ],
    ar: [
      "نفّذ word_break(s, words) لإرجاع True إذا أمكن تقسيم s إلى تسلسل من كلمات القاموس.",
      "يمكن إعادة استخدام الكلمات من القائمة عدداً غير محدود من المرات.",
      "تُعتبر السلسلة الفارغة قابلة للتقسيم دائماً ويجب أن تُعيد True."
    ],
    zh: [
      "实现 word_break(s, words)：当 s 可被分割为字典单词的序列时返回 True。",
      "列表中的单词可被无限次复用。",
      "空字符串总被视为可分割，应返回 True。"
    ],
    tr_cs:
      "word_break(s, words) fonksiyonunu yazın: s, dictionary word'lerinin bir sequence'ına segment edilebiliyorsa True döndürsün; list'teki word'ler unlimited reuse edilebilir; empty string her zaman breakable kabul edilir ve True döndürür.",
    ar_cs:
      "نفّذ word_break(s, words) لإرجاع True إذا كان s قابلاً للتقسيم إلى sequence من dictionary words؛ words في القائمة يمكن reuse بشكل unlimited؛ empty string دائماً breakable ويجب إرجاع True.",
    zh_cs:
      "实现 word_break(s, words)：若 s 可分割为 dictionary word 的 sequence 则返回 True；列表中的 word 可 unlimited reuse；empty string 总是 breakable，必须返回 True。"
  },
  {
    fn: "min_path_sum",
    code:
      "def min_path_sum(grid):\n" +
      "    if not grid or not grid[0]:\n" +
      "        return 0\n" +
      "    m, n = len(grid), len(grid[0])\n" +
      "    g = [row[:] for row in grid]\n" +
      "    for i in range(m):\n" +
      "        for j in range(n):\n" +
      "            if i == 0 and j == 0:\n" +
      "                continue\n" +
      "            elif i == 0:\n" +
      "                g[i][j] += g[i][j-1]\n" +
      "            elif j == 0:\n" +
      "                g[i][j] += g[i-1][j]\n" +
      "            else:\n" +
      "                g[i][j] += min(g[i-1][j], g[i][j-1])\n" +
      "    return g[m-1][n-1]\n",
    tests: [
      "assert min_path_sum([[1,3,1],[1,5,1],[4,2,1]]) == 7",
      "assert min_path_sum([[1,2,3],[4,5,6]]) == 12",
      "assert min_path_sum([[1]]) == 1",
      "assert min_path_sum([[1,2],[1,1]]) == 3"
    ],
    en: [
      "Implement min_path_sum(grid) returning the minimum sum path from top-left to bottom-right of a 2D non-negative grid.",
      "At each cell movement is restricted to right or down only; diagonal moves are not allowed.",
      "The grid is non-empty in the standard case but the function must safely return 0 for an empty grid."
    ],
    tr: [
      "Negatif olmayan tamsayılardan oluşan 2B ızgaranın sol üstünden sağ alta giden minimum toplam yolunu döndüren min_path_sum(grid) fonksiyonunu yazın.",
      "Her hücreden hareket yalnızca sağa veya aşağı yapılabilir; çapraz hareketlere izin verilmez.",
      "Standart durumda ızgara boş değildir ancak boş ızgara için fonksiyon güvenli biçimde 0 döndürmelidir."
    ],
    ar: [
      "نفّذ min_path_sum(grid) لإرجاع أصغر مجموع لمسار من الزاوية العليا اليسرى إلى الزاوية السفلى اليمنى لمصفوفة ثنائية الأبعاد بقيم غير سالبة.",
      "يُسمح بالحركة من كل خلية يميناً أو أسفل فقط؛ لا يُسمح بالحركة القطرية.",
      "المصفوفة غير فارغة في الحالة العادية، لكن يجب أن تُعيد الدالة 0 بأمان للمصفوفة الفارغة."
    ],
    zh: [
      "实现 min_path_sum(grid)：返回非负二维网格从左上到右下的最小路径和。",
      "每个单元格只能向右或向下移动，不允许斜向移动。",
      "标准情况下网格非空，但对于空网格函数必须安全地返回 0。"
    ],
    tr_cs:
      "min_path_sum(grid) fonksiyonunu yazın: non-negative 2D grid'in top-left'inden bottom-right'ına giden minimum sum path'i döndürsün; her cell'de sadece right veya down move'a izin var, diagonal move yok; standart case'de grid empty değil ama empty grid için güvenli şekilde 0 döndürün.",
    ar_cs:
      "نفّذ min_path_sum(grid) لإرجاع minimum sum path من top-left إلى bottom-right لـ 2D non-negative grid؛ في كل cell يُسمح فقط بـ right أو down move دون diagonal؛ grid عادةً غير فارغة لكن في حال empty grid أعد 0 بأمان.",
    zh_cs:
      "实现 min_path_sum(grid)：返回 non-negative 2D grid 从 top-left 到 bottom-right 的 minimum sum path；每个 cell 只允许 right 或 down move，不允许 diagonal；正常情况下 grid 非空，empty grid 时安全返回 0。"
  },
  {
    fn: "gcd_array",
    code:
      "from math import gcd\n" +
      "from functools import reduce\n" +
      "def gcd_array(nums):\n" +
      "    return reduce(gcd, nums)\n",
    tests: [
      "assert gcd_array([2,4,6,8]) == 2",
      "assert gcd_array([3,9,27]) == 3",
      "assert gcd_array([7]) == 7",
      "assert gcd_array([10,15]) == 5"
    ],
    en: [
      "Implement gcd_array(nums) returning the greatest common divisor of all positive integers in nums.",
      "Use functools.reduce together with math.gcd for an idiomatic Python implementation.",
      "A single-element list returns that element unchanged."
    ],
    tr: [
      "nums içindeki tüm pozitif tamsayıların en büyük ortak bölenini döndüren gcd_array(nums) fonksiyonunu yazın.",
      "Deyimsel bir Python uygulaması için math.gcd ile birlikte functools.reduce kullanın.",
      "Tek elemanlı bir liste o elemanı olduğu gibi döndürmelidir."
    ],
    ar: [
      "نفّذ gcd_array(nums) لإرجاع القاسم المشترك الأكبر لجميع الأعداد الصحيحة الموجبة في nums.",
      "استخدم functools.reduce مع math.gcd للحصول على تنفيذ أنيق بلغة Python.",
      "القائمة ذات العنصر الواحد تُعيد ذلك العنصر دون تغيير."
    ],
    zh: [
      "实现 gcd_array(nums)：返回 nums 中所有正整数的最大公约数。",
      "使用 functools.reduce 配合 math.gcd 编写符合 Python 习惯的实现。",
      "若列表只有一个元素，则原样返回该元素。"
    ],
    tr_cs:
      "gcd_array(nums) fonksiyonunu yazın: nums'taki tüm positive integer'ların greatest common divisor'unu döndürsün; idiomatic Python implementation için math.gcd ile functools.reduce kullanın; single element list o element'i değiştirmeden döndürür.",
    ar_cs:
      "نفّذ gcd_array(nums) لإرجاع greatest common divisor لكل positive integer في nums؛ استخدم functools.reduce مع math.gcd للحصول على idiomatic Python implementation؛ list بعنصر واحد تُعيد ذلك element دون تغيير.",
    zh_cs:
      "实现 gcd_array(nums)：返回 nums 中所有 positive integer 的 greatest common divisor；使用 functools.reduce 配合 math.gcd 实现 idiomatic Python implementation；single element list 原样返回该 element。"
  },
  {
    fn: "letter_combinations",
    code:
      "def letter_combinations(digits):\n" +
      "    if not digits:\n" +
      "        return []\n" +
      "    mapping = {'2':'abc','3':'def','4':'ghi','5':'jkl','6':'mno','7':'pqrs','8':'tuv','9':'wxyz'}\n" +
      "    result = ['']\n" +
      "    for d in digits:\n" +
      "        if d not in mapping:\n" +
      "            return []\n" +
      "        letters = mapping[d]\n" +
      "        result = [prev + l for prev in result for l in letters]\n" +
      "    return result\n",
    tests: [
      'assert letter_combinations("23") == ["ad","ae","af","bd","be","bf","cd","ce","cf"]',
      'assert letter_combinations("") == []',
      'assert letter_combinations("2") == ["a","b","c"]',
      'assert letter_combinations("9") == ["w","x","y","z"]'
    ],
    en: [
      "Implement letter_combinations(digits) returning every possible letter combination for a string of digits 2-9.",
      "Use the standard phone keypad mapping 2=abc, 3=def, 4=ghi, 5=jkl, 6=mno, 7=pqrs, 8=tuv, 9=wxyz.",
      "The result must be a list of strings in lexicographic order; empty input returns an empty list."
    ],
    tr: [
      "2-9 rakamlarından oluşan bir dizgi için olası tüm harf kombinasyonlarını döndüren letter_combinations(digits) fonksiyonunu yazın.",
      "Standart telefon tuş takımı eşlemesini kullanın: 2=abc, 3=def, 4=ghi, 5=jkl, 6=mno, 7=pqrs, 8=tuv, 9=wxyz.",
      "Sonuç sözlük sırasına göre dizgilerden oluşan bir liste olmalı; boş girdide boş liste döndürülmelidir."
    ],
    ar: [
      "نفّذ letter_combinations(digits) لإرجاع جميع تركيبات الحروف الممكنة لسلسلة من الأرقام 2-9.",
      "استخدم تخطيط لوحة الهاتف القياسي: 2=abc, 3=def, 4=ghi, 5=jkl, 6=mno, 7=pqrs, 8=tuv, 9=wxyz.",
      "يجب أن يكون الناتج قائمة سلاسل بالترتيب المعجمي؛ المدخل الفارغ يُعيد قائمة فارغة."
    ],
    zh: [
      "实现 letter_combinations(digits)：对仅含数字 2-9 的字符串返回所有可能的字母组合。",
      "使用标准电话键盘映射 2=abc、3=def、4=ghi、5=jkl、6=mno、7=pqrs、8=tuv、9=wxyz。",
      "结果应为按字典序排列的字符串列表；空输入返回空列表。"
    ],
    tr_cs:
      "letter_combinations(digits) fonksiyonunu yazın: 2-9 digit'lerinden oluşan string için tüm possible letter combination'ları döndürsün; standart phone keypad mapping (2=abc, 3=def, 4=ghi, 5=jkl, 6=mno, 7=pqrs, 8=tuv, 9=wxyz) kullanın; result lexicographic order'da string listesi olsun; empty input için empty list.",
    ar_cs:
      "نفّذ letter_combinations(digits) لإرجاع كل letter combinations الممكنة لـ string من digits 2-9؛ استخدم standard phone keypad mapping (2=abc, 3=def, 4=ghi, 5=jkl, 6=mno, 7=pqrs, 8=tuv, 9=wxyz)؛ result يجب أن يكون list من strings بـ lexicographic order؛ في حال empty input أعد empty list.",
    zh_cs:
      "实现 letter_combinations(digits)：对 2-9 digit 组成的 string 返回所有可能的 letter combination；使用 standard phone keypad mapping（2=abc, 3=def, 4=ghi, 5=jkl, 6=mno, 7=pqrs, 8=tuv, 9=wxyz）；result 为按 lexicographic order 排列的 string list；empty input 返回 empty list。"
  },
  {
    fn: "is_subsequence",
    code:
      "def is_subsequence(s, t):\n" +
      "    i = 0\n" +
      "    for ch in t:\n" +
      "        if i < len(s) and s[i] == ch:\n" +
      "            i += 1\n" +
      "    return i == len(s)\n",
    tests: [
      'assert is_subsequence("abc","ahbgdc") == True',
      'assert is_subsequence("axc","ahbgdc") == False',
      'assert is_subsequence("","abc") == True',
      'assert is_subsequence("a","") == False'
    ],
    en: [
      "Implement is_subsequence(s, t) returning True iff s is a subsequence of t.",
      "A subsequence is obtained by deleting zero or more characters from t without reordering the remaining characters.",
      "An empty s is always a subsequence; a non-empty s with empty t never is."
    ],
    tr: [
      "s, t'nin bir alt-dizilimi ise True döndüren is_subsequence(s, t) fonksiyonunu yazın.",
      "Alt-dizilim, t'den sıfır veya daha fazla karakter silinerek ve geri kalanların sırası bozulmadan elde edilir.",
      "Boş s her zaman bir alt-dizilimdir; boş t için boş olmayan s asla alt-dizilim olamaz."
    ],
    ar: [
      "نفّذ is_subsequence(s, t) لإرجاع True إذا كان s متتالية جزئية من t.",
      "تُستحصل المتتالية الجزئية بحذف صفر أو أكثر من الأحرف من t دون إعادة ترتيب الباقي.",
      "السلسلة الفارغة s هي دائماً متتالية جزئية؛ بينما s غير الفارغة مع t فارغة ليست كذلك أبداً."
    ],
    zh: [
      "实现 is_subsequence(s, t)：当 s 是 t 的子序列时返回 True。",
      "子序列是通过从 t 中删除零个或多个字符且保持其余字符相对顺序而得到的。",
      "空 s 总是子序列；非空 s 配合空 t 永远不是。"
    ],
    tr_cs:
      "is_subsequence(s, t) fonksiyonunu yazın: s, t'nin subsequence'ı ise True döndürsün; subsequence, t'den zero or more character delete ederek ve geri kalan character'ların order'ını koruyarak elde edilir; empty s her zaman subsequence'dır; non-empty s ile empty t durumunda asla değildir.",
    ar_cs:
      "نفّذ is_subsequence(s, t) لإرجاع True إذا كانت s subsequence لـ t؛ subsequence تُحصل بحذف zero or more character من t مع الحفاظ على relative order للباقي؛ empty s دائماً subsequence؛ non-empty s مع empty t أبداً ليست كذلك.",
    zh_cs:
      "实现 is_subsequence(s, t)：当 s 是 t 的 subsequence 时返回 True；subsequence 通过从 t 中 delete zero or more character 并保持其余 character 的 relative order 得到；empty s 总是 subsequence；non-empty s 配合 empty t 永远不是。"
  },
  {
    fn: "container_with_water",
    code:
      "def container_with_water(heights):\n" +
      "    l, r = 0, len(heights) - 1\n" +
      "    best = 0\n" +
      "    while l < r:\n" +
      "        best = max(best, min(heights[l], heights[r]) * (r - l))\n" +
      "        if heights[l] < heights[r]:\n" +
      "            l += 1\n" +
      "        else:\n" +
      "            r -= 1\n" +
      "    return best\n",
    tests: [
      "assert container_with_water([1,8,6,2,5,4,8,3,7]) == 49",
      "assert container_with_water([1,1]) == 1",
      "assert container_with_water([4,3,2,1,4]) == 16",
      "assert container_with_water([1,2,1]) == 2"
    ],
    en: [
      "Implement container_with_water(heights) returning the maximum water area between two vertical lines.",
      "heights[i] is the height of a vertical line at x=i and the container is bounded below by the x-axis.",
      "Aim for an O(n) two-pointer solution that converges from both ends of the array."
    ],
    tr: [
      "İki dikey çizgi arasındaki en büyük su alanını döndüren container_with_water(heights) fonksiyonunu yazın.",
      "heights[i] x=i konumundaki dikey çizginin yüksekliğidir ve kap aşağıdan x ekseniyle sınırlıdır.",
      "Dizinin her iki ucundan içeri yakınsayan O(n) iki-işaretçi çözümünü hedefleyin."
    ],
    ar: [
      "نفّذ container_with_water(heights) لإرجاع أكبر مساحة مائية بين خطين عموديين.",
      "heights[i] هو ارتفاع الخط العمودي عند x=i، والوعاء محدود من الأسفل بمحور x.",
      "استهدف حلاً بزمن O(n) باستخدام مؤشرين يلتقيان من طرفي المصفوفة."
    ],
    zh: [
      "实现 container_with_water(heights)：返回两条竖直线之间可容纳的最大水面积。",
      "heights[i] 表示在 x=i 处竖直线的高度，容器底部由 x 轴限定。",
      "目标使用从数组两端向中间收敛的 O(n) 双指针解法。"
    ],
    tr_cs:
      "container_with_water(heights) fonksiyonunu yazın: iki vertical line arasındaki maximum water area'yı döndürsün; heights[i] x=i'deki vertical line height'ıdır ve container aşağıdan x-axis ile bounded; array'in her iki end'inden converge eden O(n) two-pointer solution'ı hedefleyin.",
    ar_cs:
      "نفّذ container_with_water(heights) لإرجاع maximum water area بين خطين vertical؛ heights[i] هو height للخط vertical عند x=i والـ container محدود من الأسفل بـ x-axis؛ استهدف O(n) two-pointer solution يلتقي من طرفي الـ array.",
    zh_cs:
      "实现 container_with_water(heights)：返回两条 vertical line 之间的 maximum water area；heights[i] 是 x=i 处 vertical line 的 height，container 底部由 x-axis bounded；目标 O(n) two-pointer solution 从 array 两端向中间 converge。"
  }
];

/* -------------------------------------------------------------------------- */
/*  Style mixers — produce 10 polyglot variants per problem                   */
/* -------------------------------------------------------------------------- */

/** Round-robin merge of N parallel sentence arrays (already aligned). */
function interleave(...arrs) {
  const out = [];
  const max = Math.max(...arrs.map((a) => a.length));
  for (let i = 0; i < max; i++) {
    for (let a = 0; a < arrs.length; a++) {
      if (i < arrs[a].length) out.push(arrs[a][i]);
    }
  }
  return out.join(" ");
}

const STYLES = [
  // 0: pure Turkish
  (p) => p.tr.join(" "),
  // 1: pure Arabic (MSA)
  (p) => p.ar.join(" "),
  // 2: pure Simplified Chinese
  (p) => p.zh.join(""),
  // 3: TR ↔ AR sentence-alternating (TR first)
  (p) => {
    const out = [];
    for (let i = 0; i < p.tr.length; i++) {
      out.push(p.tr[i]);
      if (i < p.ar.length) out.push(p.ar[i]);
    }
    return out.join(" ");
  },
  // 4: TR ↔ ZH sentence-alternating
  (p) => {
    const out = [];
    for (let i = 0; i < p.tr.length; i++) {
      out.push(p.tr[i]);
      if (i < p.zh.length) out.push(p.zh[i]);
    }
    return out.join(" ");
  },
  // 5: AR ↔ ZH sentence-alternating
  (p) => {
    const out = [];
    for (let i = 0; i < p.ar.length; i++) {
      out.push(p.ar[i]);
      if (i < p.zh.length) out.push(p.zh[i]);
    }
    return out.join(" ");
  },
  // 6: TR / AR / ZH tri-language rotation (one sentence each)
  (p) => {
    const out = [];
    const len = Math.max(p.tr.length, p.ar.length, p.zh.length);
    for (let i = 0; i < len; i++) {
      if (i < p.tr.length) out.push(p.tr[i]);
      if (i < p.ar.length) out.push(p.ar[i]);
      if (i < p.zh.length) out.push(p.zh[i]);
    }
    return out.join(" ");
  },
  // 7: Turkish + EN CS jargon code-switch
  (p) => p.tr_cs,
  // 8: Arabic + EN CS jargon code-switch
  (p) => p.ar_cs,
  // 9: Chinese + EN CS jargon code-switch
  (p) => p.zh_cs
];

const STYLE_LABELS = [
  "tr_pure",
  "ar_pure",
  "zh_pure",
  "tr_ar_alt",
  "tr_zh_alt",
  "ar_zh_alt",
  "tr_ar_zh_tri",
  "tr_en_cs",
  "ar_en_cs",
  "zh_en_cs"
];

/* -------------------------------------------------------------------------- */
/*  Self-check                                                                */
/* -------------------------------------------------------------------------- */

function selfCheck() {
  const issues = [];
  for (const p of PROBLEMS) {
    if (p.tr.length !== p.en.length) issues.push(`${p.fn}: tr/en sentence count mismatch`);
    if (p.ar.length !== p.en.length) issues.push(`${p.fn}: ar/en sentence count mismatch`);
    if (p.zh.length !== p.en.length) issues.push(`${p.fn}: zh/en sentence count mismatch`);
    for (const seg of [...p.tr, ...p.ar, ...p.zh, p.tr_cs, p.ar_cs, p.zh_cs]) {
      if (typeof seg !== "string" || seg.length === 0) {
        issues.push(`${p.fn}: empty translation segment`);
      }
    }
    for (const test of p.tests) {
      // eslint-disable-next-line no-control-regex
      if (!/^[\x00-\x7F]+$/.test(test)) {
        issues.push(`${p.fn}: non-ASCII assert detected`);
      }
    }
  }
  return issues;
}

/* -------------------------------------------------------------------------- */

function buildRow(p, styleIdx, id) {
  const problem = STYLES[styleIdx](p);
  return {
    problem,
    answer: p.code,
    id,
    metadata: {
      test_cases: p.tests.slice(),
      test_list: p.tests.slice(),
      challenge_test_list: [],
      reference_code: p.code,
      test_setup_code: "",
      style: STYLE_LABELS[styleIdx],
      function_name: p.fn
    }
  };
}

function main() {
  const issues = selfCheck();
  if (issues.length > 0) {
    // eslint-disable-next-line no-console
    console.error("Self-check failed:");
    for (const m of issues) console.error("  -", m);
    process.exit(1);
  }

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const out = fs.createWriteStream(outputPath, { encoding: "utf8" });
  let id = 1;
  for (let p = 0; p < PROBLEMS.length; p++) {
    for (let s = 0; s < STYLES.length; s++) {
      out.write(`${JSON.stringify(buildRow(PROBLEMS[p], s, id))}\n`);
      id += 1;
    }
  }
  out.end();
  // eslint-disable-next-line no-console
  console.log(
    `Wrote ${PROBLEMS.length} problems × ${STYLES.length} styles = ${id - 1} rows → ${outputPath}`
  );
}

main();
