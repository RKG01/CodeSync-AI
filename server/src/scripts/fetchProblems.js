import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helpers
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randArray = (len, min, max) => Array.from({ length: len }, () => randInt(min, max));
const randString = (len) => {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  return Array.from({ length: len }, () => chars[randInt(0, chars.length - 1)]).join('');
};

// We define a set of core LeetCode problems. 
// To reach 100, we can define 25 core problems, and generate 4 difficulty variations of each.
const coreProblems = [
  {
    id: 'two-sum',
    title: 'Two Sum',
    difficulty: 'easy',
    description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.',
    functionName: 'twoSum',
    args: ['nums', 'target'],
    logic: (nums, target) => {
      const map = new Map();
      for (let i = 0; i < nums.length; i++) {
        if (map.has(target - nums[i])) return [map.get(target - nums[i]), i];
        map.set(nums[i], i);
      }
      return [];
    },
    genTestCase: (isLarge) => {
      const len = isLarge ? 10000 : randInt(10, 50);
      const nums = randArray(len, 1, 1000);
      const idx1 = randInt(0, len - 2);
      const idx2 = randInt(idx1 + 1, len - 1);
      const target = nums[idx1] + nums[idx2];
      return { inputs: [nums, target] };
    }
  },
  {
    id: 'contains-duplicate',
    title: 'Contains Duplicate',
    difficulty: 'easy',
    description: 'Given an integer array `nums`, return `true` if any value appears at least twice in the array, and return `false` if every element is distinct.',
    functionName: 'containsDuplicate',
    args: ['nums'],
    logic: (nums) => new Set(nums).size !== nums.length,
    genTestCase: (isLarge) => {
      const len = isLarge ? 5000 : randInt(10, 100);
      const nums = randArray(len, 1, len * 2);
      if (Math.random() > 0.5) nums.push(nums[0]); // Force duplicate
      return { inputs: [nums] };
    }
  },
  {
    id: 'max-subarray',
    title: 'Maximum Subarray',
    difficulty: 'medium',
    description: 'Given an integer array `nums`, find the subarray with the largest sum, and return its sum.\nA subarray is a contiguous non-empty sequence of elements within an array.',
    functionName: 'maxSubArray',
    args: ['nums'],
    logic: (nums) => {
      let maxSoFar = nums[0], currMax = nums[0];
      for (let i = 1; i < nums.length; i++) {
        currMax = Math.max(nums[i], currMax + nums[i]);
        maxSoFar = Math.max(maxSoFar, currMax);
      }
      return maxSoFar;
    },
    genTestCase: (isLarge) => {
      const len = isLarge ? 100000 : randInt(10, 100);
      return { inputs: [randArray(len, -100, 100)] };
    }
  },
  {
    id: 'single-number',
    title: 'Single Number',
    difficulty: 'easy',
    description: 'Given a non-empty array of integers `nums`, every element appears twice except for one. Find that single one.\nYou must implement a solution with a linear runtime complexity and use only constant extra space.',
    functionName: 'singleNumber',
    args: ['nums'],
    logic: (nums) => nums.reduce((a, b) => a ^ b, 0),
    genTestCase: (isLarge) => {
      const pairs = isLarge ? 5000 : randInt(10, 50);
      const single = randInt(1, 1000);
      const nums = [single];
      for(let i = 0; i < pairs; i++) {
        const val = randInt(1, 1000);
        nums.push(val, val);
      }
      nums.sort(() => Math.random() - 0.5);
      return { inputs: [nums] };
    }
  },
  {
    id: 'longest-substring',
    title: 'Longest Substring Without Repeating Characters',
    difficulty: 'medium',
    description: 'Given a string `s`, find the length of the longest substring without repeating characters.',
    functionName: 'lengthOfLongestSubstring',
    args: ['s'],
    logic: (s) => {
      let max = 0, start = 0;
      let map = new Map();
      for (let i = 0; i < s.length; i++) {
        if (map.has(s[i])) start = Math.max(map.get(s[i]) + 1, start);
        max = Math.max(max, i - start + 1);
        map.set(s[i], i);
      }
      return max;
    },
    genTestCase: (isLarge) => {
      const len = isLarge ? 5000 : randInt(10, 50);
      return { inputs: [randString(len)] };
    }
  },
  // Add a generic sorting problem
  {
    id: 'sort-colors',
    title: 'Sort Colors (0, 1, 2)',
    difficulty: 'medium',
    description: 'Given an array `nums` with n objects colored red, white, or blue, sort them in-place so that objects of the same color are adjacent, with the colors in the order red, white, and blue.\nWe will use the integers 0, 1, and 2 to represent the color red, white, and blue, respectively.',
    functionName: 'sortColors',
    args: ['nums'],
    logic: (nums) => [...nums].sort((a,b) => a-b),
    genTestCase: (isLarge) => {
      const len = isLarge ? 5000 : randInt(10, 50);
      return { inputs: [randArray(len, 0, 2)] };
    }
  },
  {
    id: 'product-except-self',
    title: 'Product of Array Except Self',
    difficulty: 'medium',
    description: 'Given an integer array `nums`, return an array `answer` such that `answer[i]` is equal to the product of all the elements of `nums` except `nums[i]`.\nYou must write an algorithm that runs in O(n) time and without using the division operation.',
    functionName: 'productExceptSelf',
    args: ['nums'],
    logic: (nums) => {
      const n = nums.length;
      const res = Array(n).fill(1);
      let left = 1, right = 1;
      for (let i = 0; i < n; i++) { res[i] *= left; left *= nums[i]; }
      for (let i = n - 1; i >= 0; i--) { res[i] *= right; right *= nums[i]; }
      return res;
    },
    genTestCase: (isLarge) => {
      const len = isLarge ? 5000 : randInt(5, 20);
      return { inputs: [randArray(len, 1, 9)] }; // keep values small so product doesn't exceed safe integer
    }
  },
  {
    id: 'missing-number',
    title: 'Missing Number',
    difficulty: 'easy',
    description: 'Given an array `nums` containing `n` distinct numbers in the range `[0, n]`, return the only number in the range that is missing from the array.',
    functionName: 'missingNumber',
    args: ['nums'],
    logic: (nums) => {
      const n = nums.length;
      const expected = (n * (n + 1)) / 2;
      const actual = nums.reduce((a, b) => a + b, 0);
      return expected - actual;
    },
    genTestCase: (isLarge) => {
      const n = isLarge ? 5000 : randInt(10, 50);
      const missing = randInt(0, n);
      const nums = [];
      for(let i=0; i<=n; i++) if (i !== missing) nums.push(i);
      nums.sort(() => Math.random() - 0.5);
      return { inputs: [nums] };
    }
  }
];

const problems = [];
let idCounter = 1;

// Generate 100 problems by cloning the core ones with different titles
for (let i = 0; i < 100; i++) {
  const core = coreProblems[i % coreProblems.length];
  
  // 10 test cases: 8 standard, 2 massive TLE cases
  const testCases = [];
  for (let j = 0; j < 10; j++) {
    const isLarge = j >= 8; // last two are massive for TLE checks
    const tc = core.genTestCase(isLarge);
    testCases.push({
      inputs: JSON.stringify(tc.inputs), // Store as stringified JSON array
      expectedOutput: JSON.stringify(core.logic(...tc.inputs)) // Store as stringified JSON
    });
  }

  // Create LeetCode-style starter code
  const argNames = core.args.join(', ');
  const starterCode = `/**
 * @param {${core.args.map(()=>'any').join(', ')}} ${argNames}
 * @return {any}
 */
function ${core.functionName}(${argNames}) {
    // Your code here
    
};

module.exports = ${core.functionName};
`;

  problems.push({
    id: `prob-${idCounter++}`,
    title: `${core.title} - Variant ${Math.floor(i / coreProblems.length) + 1}`,
    difficulty: core.difficulty,
    description: core.description,
    starterCode: starterCode,
    testCases: testCases
  });
}

const outputPath = path.join(__dirname, '..', 'data', 'trusted_problems.json');
fs.writeFileSync(outputPath, JSON.stringify(problems, null, 2));

console.log(`Successfully generated ${problems.length} LeetCode-style problems at ${outputPath}`);
