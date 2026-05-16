/**
 * Generates data/OckBench_coding_hard_chaos_200.jsonl
 *
 * 20 hard, reasoning-heavy core problems × 10 chaos style wrappers
 * (Turkish, Arabic, Chinese, English-typos, polite-English, mixed, etc.)
 * = 200 chaotic prompts. Each variant uses the SAME reference code and
 * asserts; only the natural-language wrapping changes. This stresses the
 * optimizer's translate-and-strip-slang pipeline while keeping the
 * authoritative spec (asserts) intact.
 *
 * Run: node scripts/generate-hard-chaos-200.cjs
 */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const outDir = path.join(root, "data");
const outputPath = path.join(outDir, "OckBench_coding_hard_chaos_200.jsonl");

/* -------------------------------------------------------------------------- */
/*  20 hard core problems                                                     */
/* -------------------------------------------------------------------------- */

/** Each entry: function name, clean English spec, reference code, asserts. */
const PROBLEMS = [
  {
    fn: "edit_distance",
    en: "Compute the Levenshtein edit distance between two strings s1 and s2; allowed operations are insert, delete and substitute, each costing 1; handle empty strings correctly.",
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
    ]
  },
  {
    fn: "longest_common_subseq",
    en: "Return the length of the longest common subsequence of two strings a and b; characters need not be contiguous.",
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
    ]
  },
  {
    fn: "knapsack",
    en: "Solve the 0/1 knapsack problem: given lists weights and values of equal length plus an integer capacity, return the maximum total value such that each item is either fully taken or skipped.",
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
    ]
  },
  {
    fn: "coin_change_ways",
    en: "Return the number of distinct ways to make the given amount using the provided coin denominations, where every denomination may be used an unlimited number of times.",
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
    ]
  },
  {
    fn: "max_subarray",
    en: "Return the maximum sum over all contiguous subarrays of nums; if all elements are negative, return the largest single element; if nums is empty, return 0.",
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
    ]
  },
  {
    fn: "longest_palindrome",
    en: "Return the longest palindromic substring of s; on ties return the one whose expansion center is encountered first when scanning left to right; empty input returns empty string.",
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
    ]
  },
  {
    fn: "spiral_order",
    en: "Traverse a 2D matrix clockwise in spiral order starting from the top-left and return the visited cells as a flat list; an empty matrix returns an empty list.",
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
    ]
  },
  {
    fn: "decode_ways",
    en: "Given a digit string s encoded with A=1..Z=26, return the number of valid decodings; any chunk that starts with '0' is invalid.",
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
    ]
  },
  {
    fn: "valid_parens",
    en: "Given a string s of brackets from (), [], {}, return True iff every opener has a matching closer in the correct order; the empty string is valid.",
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
    ]
  },
  {
    fn: "roman_to_int",
    en: "Convert a Roman numeral string s into an integer using the standard subtractive forms IV, IX, XL, XC, CD, CM.",
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
    ]
  },
  {
    fn: "int_to_roman",
    en: "Convert an integer n in [1, 3999] to its Roman numeral representation, using the standard subtractive forms IV, IX, XL, XC, CD, CM.",
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
    ]
  },
  {
    fn: "sliding_window_max",
    en: "For a list nums and integer k, return the maximum value within each sliding window of size k from left to right; aim for an O(n) deque approach.",
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
    ]
  },
  {
    fn: "topo_sort",
    en: "Given num_nodes and a list of directed [u, v] edges, return one valid topological ordering as a list using Kahn's algorithm with smallest-index priority (deterministic); return an empty list if a cycle exists.",
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
    ]
  },
  {
    fn: "lis_length",
    en: "Return the length of the longest strictly increasing subsequence (not necessarily contiguous) of a list of integers; aim for O(n log n) using binary search.",
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
    ]
  },
  {
    fn: "word_break",
    en: "Return True iff string s can be segmented into a sequence of words from the given list, where words may be reused unlimited times; the empty string returns True.",
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
    ]
  },
  {
    fn: "min_path_sum",
    en: "Given a non-empty 2D grid of non-negative integers, return the minimum sum of a path from top-left to bottom-right where movement is restricted to right or down only.",
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
    ]
  },
  {
    fn: "gcd_array",
    en: "Return the greatest common divisor of all positive integers in the list nums; a single-element list returns that element.",
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
    ]
  },
  {
    fn: "letter_combinations",
    en: "Given a string of digits 2-9, return every possible letter combination using the standard phone keypad mapping (2=abc, 3=def, 4=ghi, 5=jkl, 6=mno, 7=pqrs, 8=tuv, 9=wxyz) as a list of strings in lexicographic order; empty input returns an empty list.",
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
    ]
  },
  {
    fn: "is_subsequence",
    en: "Return True iff string s is a subsequence of string t (s can be obtained by deleting characters from t without reordering); the empty string s is always a subsequence.",
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
    ]
  },
  {
    fn: "container_with_water",
    en: "Given heights[i] as the height of a vertical line at x=i, find two lines that together with the x-axis form the container holding the most water and return that area; aim for an O(n) two-pointer solution.",
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
    ]
  }
];

/* -------------------------------------------------------------------------- */
/*  10 chaos style wrappers                                                   */
/* -------------------------------------------------------------------------- */

const STYLES = [
  // 0: Turkish casual
  (en, fn) =>
    `Abi şu ${fn} fonksiyonunu yazsana ya, şöyle: ${en} Kolay gelsin sana, edge case sıkıntı çıkartmasın.`,
  // 1: Arabic casual
  (en, fn) =>
    `يا أخي، اكتب دالة بايثون اسمها ${fn}: ${en} اعتمد على الـ asserts. شكراً جزيلاً.`,
  // 2: Chinese casual
  (en, fn) =>
    `麻烦写个 ${fn} 函数：${en} 边界情况注意一下，谢谢啦~`,
  // 3: English with typos / chat-speak
  (en, fn) =>
    `plz make ${fn} that does this: ${en} thx a lot (sorry if its dumb question)`,
  // 4: Overly polite English
  (en, fn) =>
    `Could you kindly please write a Python function called ${fn}? ${en} I would really appreciate it, thank you so much in advance.`,
  // 5: Turkish formal-ish, chatty
  (en, fn) =>
    `Hocam ${fn} lazım, şu şekilde olacak: ${en} Rica etsem dikkatli yazın, edge case'leri unutmayalım.`,
  // 6: Arabic formal
  (en, fn) =>
    `من فضلك، نحتاج دالة بايثون باسم ${fn}: ${en} الرجاء التحقق من جميع الـ asserts. شكراً.`,
  // 7: Chinese mixed technical
  (en, fn) =>
    `请实现函数 ${fn}：${en} 注意 corner case，按 asserts 验证就好。`,
  // 8: Stream-of-consciousness English
  (en, fn) =>
    `So um, I kinda need a function ${fn}, you know like ${en} if u have time, thanks!! sorry for the long msg`,
  // 9: Mixed Turkish / English
  (en, fn) =>
    `Yani basically ${fn} fonksiyonu yaz: ${en} Her şey clear olsun, edge case'ler unutulmasın, teşekkürler.`
];

/* -------------------------------------------------------------------------- */

function buildRow(p, styleIdx, id) {
  const problem = STYLES[styleIdx](p.en, p.fn);
  return {
    problem,
    answer: p.code,
    id,
    metadata: {
      test_cases: p.tests.slice(),
      test_list: p.tests.slice(),
      challenge_test_list: [],
      reference_code: p.code,
      test_setup_code: ""
    }
  };
}

function main() {
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
