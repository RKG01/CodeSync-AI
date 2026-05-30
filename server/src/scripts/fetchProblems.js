import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to generate a random integer
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Helper to generate a random array of integers
const randArray = (len, min, max) => Array.from({ length: len }, () => randInt(min, max));

// Define 20 core algorithmic templates
const coreAlgorithms = [
  {
    id: 'sum-multiples',
    difficulty: 'easy',
    logic: (n) => {
      let sum = 0;
      for (let i = 1; i < n; i++) if (i % 3 === 0 || i % 5 === 0) sum += i;
      return sum;
    },
    genInput: () => randInt(10, 1000).toString(),
    processOutput: (res) => res.toString(),
    parseInput: (s) => Number(s),
    themes: [
      { title: "Classic: Sum of Multiples", desc: "Given an integer N, find the sum of all positive integers strictly less than N that are multiples of 3 or 5." },
      { title: "Cyberpunk: Data Node Link", desc: "In the neon grid, you must connect data nodes. Given grid limit N, find the sum of all node IDs less than N that are multiples of 3 or 5." },
      { title: "Fantasy: Magical Essences", desc: "You are brewing a potion. Given a capacity N, find the sum of all magical essence weights less than N that are multiples of 3 or 5." },
      { title: "Space: Asteroid Harvesting", desc: "Your ship has scanner range N. Find the total mass of asteroids (which only appear at multiples of 3 or 5) within range." },
      { title: "Hacker: Payload Extraction", desc: "Extract fragments from a payload array of size N. Only fragments at indices that are multiples of 3 or 5 are valid. Return their sum." }
    ]
  },
  {
    id: 'reverse-string',
    difficulty: 'easy',
    logic: (s) => s.split('').reverse().join(''),
    genInput: () => {
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      return Array.from({length: randInt(5, 50)}, () => chars[randInt(0, chars.length-1)]).join('');
    },
    processOutput: (res) => res,
    parseInput: (s) => s,
    themes: [
      { title: "Classic: Reverse String", desc: "Given a string, print the reversed version of it." },
      { title: "Cyberpunk: Encrypted Cipher", desc: "A megacorp uses a basic reversal cipher. Given the ciphertext, reverse it to crack the code." },
      { title: "Fantasy: Ancient Spell", desc: "To cast the counter-spell, you must chant the magical incantation backwards. Given the spell, print the reverse." },
      { title: "Space: Alien Transmission", desc: "An alien transmission was received backwards due to temporal distortion. Reverse the string to read it." },
      { title: "Hacker: DNS Spoof", desc: "You need to spoof a DNS record by reversing the domain string. Given the string, output its reverse." }
    ]
  },
  {
    id: 'max-subarray',
    difficulty: 'hard',
    logic: (arr) => {
      let maxSoFar = arr[0], currMax = arr[0];
      for (let i = 1; i < arr.length; i++) {
        currMax = Math.max(arr[i], currMax + arr[i]);
        maxSoFar = Math.max(maxSoFar, currMax);
      }
      return maxSoFar;
    },
    genInput: () => randArray(randInt(10, 50), -100, 100).join(' '),
    processOutput: (res) => res.toString(),
    parseInput: (s) => s.split(' ').map(Number),
    themes: [
      { title: "Classic: Maximum Subarray", desc: "Given an array of integers, find the contiguous subarray with the largest sum." },
      { title: "Cyberpunk: Credit Siphon", desc: "You are siphoning credits from a corporate bank log (array of positive/negative transactions). Find the maximum contiguous profit block." },
      { title: "Fantasy: Hero's Journey", desc: "A hero travels through a path of encounters (gaining/losing health). Find the path segment that yields the maximum net health gain." },
      { title: "Space: Thruster Optimization", desc: "A spaceship's thrusters output fluctuating power levels. Find the contiguous timeframe that yields maximum absolute acceleration." },
      { title: "Hacker: Traffic Spike", desc: "Analyze network traffic deltas to find the contiguous period with the highest net data transfer." }
    ]
  },
  {
    id: 'two-sum',
    difficulty: 'medium',
    logic: (input) => {
      const [arrStr, targetStr] = input.split('\n');
      const arr = arrStr.split(' ').map(Number);
      const target = Number(targetStr);
      const map = new Map();
      for (let i = 0; i < arr.length; i++) {
        const comp = target - arr[i];
        if (map.has(comp)) return [arr[map.get(comp)], arr[i]].sort((a,b)=>a-b).join(' ');
        map.set(arr[i], i);
      }
      return "";
    },
    genInput: () => {
      const arr = randArray(randInt(10, 20), 1, 100);
      const i = randInt(0, arr.length - 2);
      const j = randInt(i + 1, arr.length - 1);
      const target = arr[i] + arr[j];
      return `${arr.join(' ')}\n${target}`;
    },
    processOutput: (res) => res,
    parseInput: (s) => s,
    themes: [
      { title: "Classic: Two Sum", desc: "Given an array of integers (line 1) and a target (line 2), find the two numbers that add up to the target. Print them sorted, separated by space." },
      { title: "Cyberpunk: Key Matching", desc: "Find two encryption keys (line 1) that sum up to the master hash (line 2). Print the two keys sorted." },
      { title: "Fantasy: Alchemy Mix", desc: "Find two potion ingredients (line 1) whose combined power equals the target elixir strength (line 2). Print the two powers sorted." },
      { title: "Space: Orbital Resonance", desc: "Find two planets (line 1) whose combined mass creates the target gravitational resonance (line 2). Print the masses sorted." },
      { title: "Hacker: Hash Collision", desc: "Find two fragmented hashes (line 1) that combine to form the target verification hash (line 2). Print them sorted." }
    ]
  },
  {
    id: 'valid-parentheses',
    difficulty: 'medium',
    logic: (s) => {
      const stack = [];
      const map = { ')': '(', '}': '{', ']': '[' };
      for (let char of s) {
        if (['(', '{', '['].includes(char)) stack.push(char);
        else if (stack.pop() !== map[char]) return 'false';
      }
      return stack.length === 0 ? 'true' : 'false';
    },
    genInput: () => {
      const chars = ['(', ')', '{', '}', '[', ']'];
      let s = '';
      if (Math.random() > 0.5) {
        // generate valid
        for(let i=0; i<randInt(3, 10); i++) s = chars[randInt(0, 2)*2] + s + chars[randInt(0, 2)*2 + 1];
      } else {
        // generate random
        for(let i=0; i<randInt(4, 14); i++) s += chars[randInt(0, 5)];
      }
      return s;
    },
    processOutput: (res) => res,
    parseInput: (s) => s,
    themes: [
      { title: "Classic: Valid Brackets", desc: "Given a string containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid. Print 'true' or 'false'." },
      { title: "Cyberpunk: Syntax Validator", desc: "Validate the syntax of an ancient corporate firewall config containing nested brackets. Print 'true' if valid, else 'false'." },
      { title: "Fantasy: Rune Pairing", desc: "Magical runes must be paired correctly to avoid an explosion. Check if the sequence of runes is valid. Print 'true' or 'false'." },
      { title: "Space: Airlock Sequences", desc: "Check if the inner and outer airlock door sequence log is properly nested to maintain pressure. Print 'true' or 'false'." },
      { title: "Hacker: Packet Encapsulation", desc: "Determine if a captured data packet has properly matching opening and closing structural bytes. Print 'true' or 'false'." }
    ]
  },
  {
    id: 'missing-number',
    difficulty: 'easy',
    logic: (arr) => {
      const n = arr.length;
      const expected = (n * (n + 1)) / 2;
      const actual = arr.reduce((a, b) => a + b, 0);
      return expected - actual;
    },
    genInput: () => {
      const n = randInt(5, 50);
      const missing = randInt(0, n);
      const arr = [];
      for(let i=0; i<=n; i++) if (i !== missing) arr.push(i);
      arr.sort(() => Math.random() - 0.5);
      return arr.join(' ');
    },
    processOutput: (res) => res.toString(),
    parseInput: (s) => s.split(' ').map(Number),
    themes: [
      { title: "Classic: Missing Number", desc: "Given an array containing n distinct numbers taken from 0, 1, 2, ..., n, find the one that is missing from the array." },
      { title: "Cyberpunk: Lost Sector", desc: "A memory drive contains sectors labeled 0 to n. One sector got wiped. Identify the missing sector ID." },
      { title: "Fantasy: Stolen Artifact", desc: "The royal vault has artifacts numbered 0 to n. A thief stole one. Find the number of the stolen artifact." },
      { title: "Space: Missing Crewmate", desc: "Crew ID tags are 0 to n. During hyperspace jump, one signal disappeared. Find the missing ID." },
      { title: "Hacker: Dropped Packet", desc: "A sequence of packets 0 to n was sent, but one was dropped by the router. Find the dropped packet index." }
    ]
  },
  {
    id: 'single-number',
    difficulty: 'easy',
    logic: (arr) => arr.reduce((a, b) => a ^ b, 0),
    genInput: () => {
      const n = randInt(5, 20);
      const arr = [];
      const single = randInt(1, 100);
      arr.push(single);
      for(let i=0; i<n; i++) {
        const val = randInt(1, 100);
        arr.push(val, val);
      }
      arr.sort(() => Math.random() - 0.5);
      return arr.join(' ');
    },
    processOutput: (res) => res.toString(),
    parseInput: (s) => s.split(' ').map(Number),
    themes: [
      { title: "Classic: Single Number", desc: "Given a non-empty array of integers, every element appears twice except for one. Find that single one." },
      { title: "Cyberpunk: Rogue AI", desc: "All subroutines operate in pairs for redundancy, except one rogue AI subroutine. Find its ID." },
      { title: "Fantasy: The Lone Wolf", desc: "In the forest, wolves travel in pairs. You spotted a lone wolf. Find its tracking number." },
      { title: "Space: Unpaired Star", desc: "Binary star systems dominate this sector, but one star has no companion. Identify its mass." },
      { title: "Hacker: Orphaned Process", desc: "Most processes spawn a child mirror process. Find the PID of the orphaned process." }
    ]
  },
  {
    id: 'palindrome',
    difficulty: 'easy',
    logic: (s) => {
      const clean = s.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      return clean === clean.split('').reverse().join('') ? 'true' : 'false';
    },
    genInput: () => {
      const words = ["A man a plan a canal Panama", "racecar", "hello world", "Was it a car or a cat I saw", "CodeSync AI", "madam", "kayak"];
      return words[randInt(0, words.length-1)];
    },
    processOutput: (res) => res,
    parseInput: (s) => s,
    themes: [
      { title: "Classic: Valid Palindrome", desc: "Given a string, determine if it is a palindrome, considering only alphanumeric characters and ignoring cases. Print 'true' or 'false'." },
      { title: "Cyberpunk: Symmetrical Hash", desc: "A corp uses symmetrical string hashes for biometric access. Check if the hash reads the same backwards. Print 'true' or 'false'." },
      { title: "Fantasy: Mirror Spell", desc: "Mirror spells must be perfectly reflective to cast. Determine if the spell is reflective. Print 'true' or 'false'." },
      { title: "Space: Time Loop", desc: "A temporal anomaly is detected if the event log reads the same backwards. Check the log. Print 'true' or 'false'." },
      { title: "Hacker: Injection Reflection", desc: "Check if the SQL injection payload is perfectly symmetrical to bypass the naive WAF. Print 'true' or 'false'." }
    ]
  },
  {
    id: 'anagram',
    difficulty: 'easy',
    logic: (input) => {
      const [s, t] = input.split('\n');
      if(s.length !== t.length) return 'false';
      return s.split('').sort().join('') === t.split('').sort().join('') ? 'true' : 'false';
    },
    genInput: () => {
      const pairs = [
        ["anagram", "nagaram"],
        ["rat", "car"],
        ["listen", "silent"],
        ["hello", "world"],
        ["evil", "vile"]
      ];
      return pairs[randInt(0, pairs.length-1)].join('\n');
    },
    processOutput: (res) => res,
    parseInput: (s) => s,
    themes: [
      { title: "Classic: Valid Anagram", desc: "Given two strings (on two separate lines), write a function to determine if the second string is an anagram of the first. Print 'true' or 'false'." },
      { title: "Cyberpunk: Cipher Shift", desc: "Check if two cipher strings are permutations of the same letters to detect a shared encryption key. Print 'true' or 'false'." },
      { title: "Fantasy: Shapeshifter Detection", desc: "A shapeshifter's true name uses the exact same letters as their disguise. Determine if they are the same entity. Print 'true' or 'false'." },
      { title: "Space: Cargo Manifest", desc: "Check if the departed cargo list and arrived cargo list contain the exact same items scrambled. Print 'true' or 'false'." },
      { title: "Hacker: Packet Scrambler", desc: "Verify if the intercepted packet is just a scrambled version of the original packet. Print 'true' or 'false'." }
    ]
  },
  {
    id: 'fibonacci',
    difficulty: 'easy',
    logic: (n) => {
      if (n <= 1) return n;
      let a = 0, b = 1;
      for(let i=2; i<=n; i++) {
        let c = a + b;
        a = b;
        b = c;
      }
      return b;
    },
    genInput: () => randInt(5, 30).toString(),
    processOutput: (res) => res.toString(),
    parseInput: (s) => Number(s),
    themes: [
      { title: "Classic: Fibonacci Number", desc: "The Fibonacci numbers form a sequence where each number is the sum of the two preceding ones. Given N, calculate F(N)." },
      { title: "Cyberpunk: AI Generation", desc: "An AI replicates its nodes using the Fibonacci sequence. Given Generation N, find the number of nodes." },
      { title: "Fantasy: Dragon Scales", desc: "The number of scales on a dragon grows in a Fibonacci sequence. Given its age N in centuries, find the scales." },
      { title: "Space: Warp Resonance", desc: "Warp engines require power levels matching the Fibonacci sequence. Calculate power required for warp level N." },
      { title: "Hacker: Encryption Layers", desc: "An encryption algorithm layers security using Fibonacci numbers. Find the number of layers at depth N." }
    ]
  },
  {
    id: 'vowels',
    difficulty: 'easy',
    logic: (s) => {
      const m = s.match(/[aeiou]/gi);
      return m === null ? 0 : m.length;
    },
    genInput: () => {
      const s = ["The quick brown fox", "Cybernetics", "Hello World", "Competitive Programming is Fun", "a e i o u"];
      return s[randInt(0, s.length-1)] + randArray(5, 97, 122).map(c=>String.fromCharCode(c)).join('');
    },
    processOutput: (res) => res.toString(),
    parseInput: (s) => s,
    themes: [
      { title: "Classic: Count Vowels", desc: "Given a string, count the total number of vowels (a, e, i, o, u) ignoring case." },
      { title: "Cyberpunk: Data Glitches", desc: "Count the number of glitched data sectors (represented by vowels) in the string block." },
      { title: "Fantasy: Magical Runes", desc: "Count the number of high-energy magical runes (vowels) in the ancient script." },
      { title: "Space: Alien Frequencies", desc: "Alien communication relies heavily on specific harmonic frequencies (vowels). Count them." },
      { title: "Hacker: Flag Characters", desc: "Find the total number of vulnerable flag characters (vowels) in the payload." }
    ]
  },
  {
    id: 'contains-duplicate',
    difficulty: 'easy',
    logic: (arr) => new Set(arr).size !== arr.length ? 'true' : 'false',
    genInput: () => {
      const n = randInt(10, 20);
      const arr = randArray(n, 1, 50);
      if (Math.random() > 0.5) arr.push(arr[0]);
      return arr.join(' ');
    },
    processOutput: (res) => res,
    parseInput: (s) => s.split(' ').map(Number),
    themes: [
      { title: "Classic: Contains Duplicate", desc: "Given an integer array, print 'true' if any value appears at least twice, and 'false' if every element is distinct." },
      { title: "Cyberpunk: Cloned Identities", desc: "Check if the database array contains any cloned (duplicate) user IDs. Print 'true' or 'false'." },
      { title: "Fantasy: Twin Souls", desc: "A soul gem array should only contain unique souls. Check if there are any twin souls (duplicates). Print 'true' or 'false'." },
      { title: "Space: Clone Troopers", desc: "Scan the squad array to see if any clone troopers have the exact same serial number. Print 'true' or 'false'." },
      { title: "Hacker: Replay Attack", desc: "Check the transaction log array for duplicate transaction IDs, indicating a replay attack. Print 'true' or 'false'." }
    ]
  },
  {
    id: 'majority-element',
    difficulty: 'easy',
    logic: (arr) => {
      let count = 0, candidate = null;
      for (let num of arr) {
        if (count === 0) candidate = num;
        count += (num === candidate) ? 1 : -1;
      }
      return candidate;
    },
    genInput: () => {
      const n = randInt(5, 15) * 2 + 1;
      const majority = randInt(1, 100);
      const arr = Array(Math.floor(n/2) + 1).fill(majority);
      for(let i=0; i<Math.floor(n/2); i++) arr.push(randInt(1, 100));
      arr.sort(() => Math.random() - 0.5);
      return arr.join(' ');
    },
    processOutput: (res) => res.toString(),
    parseInput: (s) => s.split(' ').map(Number),
    themes: [
      { title: "Classic: Majority Element", desc: "Given an array of size n, find the majority element (appears more than n/2 times). Assume it always exists." },
      { title: "Cyberpunk: Voting Protocol", desc: "Find the node ID that has achieved majority consensus in the decentralized network." },
      { title: "Fantasy: Ruling Faction", desc: "Find the faction ID that holds the absolute majority of territories in the realm." },
      { title: "Space: Dominant Species", desc: "Identify the dominant alien species ID that populates more than half of the galaxy sector." },
      { title: "Hacker: Botnet Controller", desc: "Identify the primary botnet controller ID that dominates the infected machine network traffic." }
    ]
  },
  {
    id: 'power-of-two',
    difficulty: 'easy',
    logic: (n) => (n > 0 && (n & (n - 1)) === 0) ? 'true' : 'false',
    genInput: () => {
      if(Math.random() > 0.5) return Math.pow(2, randInt(0, 20)).toString();
      return randInt(1, 10000).toString();
    },
    processOutput: (res) => res,
    parseInput: (s) => Number(s),
    themes: [
      { title: "Classic: Power of Two", desc: "Given an integer, write a function to determine if it is a power of two. Print 'true' or 'false'." },
      { title: "Cyberpunk: Bitwise Matrix", desc: "Check if the server RAM allocation block size is perfectly aligned (a power of two). Print 'true' or 'false'." },
      { title: "Fantasy: Binary Magic", desc: "A spell's power level must be a perfect power of two to prevent backfiring. Check the power level. Print 'true' or 'false'." },
      { title: "Space: Subspace Grid", desc: "Subspace jumps require coordinates aligned to powers of two. Verify the coordinate. Print 'true' or 'false'." },
      { title: "Hacker: Buffer Overflow", desc: "Determine if the payload size is a power of two to accurately trigger the buffer overflow. Print 'true' or 'false'." }
    ]
  },
  {
    id: 'reverse-integer',
    difficulty: 'medium',
    logic: (n) => {
      const sign = n < 0 ? -1 : 1;
      let rev = parseInt(Math.abs(n).toString().split('').reverse().join(''));
      if (rev > 2**31 - 1) return 0;
      return rev * sign;
    },
    genInput: () => {
      let n = randInt(-100000, 100000);
      if (Math.random() > 0.9) n = 1534236469;
      return n.toString();
    },
    processOutput: (res) => res.toString(),
    parseInput: (s) => Number(s),
    themes: [
      { title: "Classic: Reverse Integer", desc: "Given a signed 32-bit integer x, return x with its digits reversed. If reversing x causes it to go outside the 32-bit range, return 0." },
      { title: "Cyberpunk: Memory Rewind", desc: "Rewind the 32-bit memory address register by reversing its digits. Return 0 on buffer limit exceed." },
      { title: "Fantasy: Time Reversal", desc: "Reverse the age of an ancient artifact. If the reversed age exceeds the epoch limit, it turns to dust (return 0)." },
      { title: "Space: Coordinate Flip", desc: "Flip the spaceship's coordinate vector. If the flip pushes it beyond the known sector limits, return 0." },
      { title: "Hacker: Reverse Shell Port", desc: "Reverse the port number to find the hidden backdoor. If the port exceeds 32-bit limits, return 0." }
    ]
  },
  {
    id: 'move-zeroes',
    difficulty: 'easy',
    logic: (arr) => {
      let nonZero = arr.filter(x => x !== 0);
      let zeroes = Array(arr.length - nonZero.length).fill(0);
      return [...nonZero, ...zeroes].join(' ');
    },
    genInput: () => {
      const n = randInt(10, 20);
      const arr = randArray(n, 0, 5);
      return arr.join(' ');
    },
    processOutput: (res) => res,
    parseInput: (s) => s.split(' ').map(Number),
    themes: [
      { title: "Classic: Move Zeroes", desc: "Given an integer array, move all 0's to the end of it while maintaining the relative order of the non-zero elements." },
      { title: "Cyberpunk: Defrag Drive", desc: "Defragment the hard drive array by moving all empty sectors (0s) to the end, keeping data sectors in order." },
      { title: "Fantasy: Purify Inventory", desc: "Sort your inventory array by pushing all depleted items (0s) to the bottom of the bag." },
      { title: "Space: Gravity Sort", desc: "Push all empty vacuum blocks (0s) to the back of the cargo hold while maintaining the cargo array order." },
      { title: "Hacker: Null Byte Shift", desc: "Shift all null bytes (0s) to the end of the payload string array to prevent premature termination." }
    ]
  },
  {
    id: 'longest-substring',
    difficulty: 'medium',
    logic: (s) => {
      let max = 0, start = 0;
      let map = new Map();
      for(let i=0; i<s.length; i++) {
        if(map.has(s[i])) start = Math.max(map.get(s[i]) + 1, start);
        max = Math.max(max, i - start + 1);
        map.set(s[i], i);
      }
      return max;
    },
    genInput: () => {
      const s = ["abcabcbb", "bbbbb", "pwwkew", "abcdefg", "aab"];
      return s[randInt(0, s.length-1)];
    },
    processOutput: (res) => res.toString(),
    parseInput: (s) => s,
    themes: [
      { title: "Classic: Longest Substring", desc: "Given a string, find the length of the longest substring without repeating characters." },
      { title: "Cyberpunk: Maximum Encryption Chain", desc: "Find the length of the longest chain of unique encryption characters in the firewall log." },
      { title: "Fantasy: Unique Spell Components", desc: "Find the maximum number of unique consecutive ingredients you can add to the cauldron." },
      { title: "Space: Signal Diversity", desc: "Find the length of the longest segment of an alien signal transmission that contains no repeating frequencies." },
      { title: "Hacker: Non-Repeating Payload", desc: "Determine the maximum contiguous block of unique bytes in the intercepted exploit payload." }
    ]
  },
  {
    id: 'climbing-stairs',
    difficulty: 'easy',
    logic: (n) => {
      if(n<=2) return n;
      let a = 1, b = 2;
      for(let i=3; i<=n; i++){
        let c = a+b;
        a = b; b = c;
      }
      return b;
    },
    genInput: () => randInt(2, 40).toString(),
    processOutput: (res) => res.toString(),
    parseInput: (s) => Number(s),
    themes: [
      { title: "Classic: Climbing Stairs", desc: "You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?" },
      { title: "Cyberpunk: Firewalls", desc: "You are breaching a firewall with n layers. You can crack 1 or 2 layers per hack. How many distinct ways can you breach the system?" },
      { title: "Fantasy: Mountain Trial", desc: "You climb the Mountain of Doom (n steps). You can jump 1 or 2 steps per leap. Find the total possible leap combinations." },
      { title: "Space: Air-lock Sequencing", desc: "You must pressurize n air-lock sections. You can process 1 or 2 sections per minute. How many valid sequences exist?" },
      { title: "Hacker: Directory Brute Force", desc: "You are navigating a directory tree n levels deep. You can jump 1 or 2 levels down per command. How many path combinations are there?" }
    ]
  },
  {
    id: 'first-missing-positive',
    difficulty: 'hard',
    logic: (arr) => {
      let n = arr.length;
      let copy = [...arr];
      for (let i = 0; i < n; i++) {
        while (copy[i] > 0 && copy[i] <= n && copy[copy[i] - 1] !== copy[i]) {
          let temp = copy[copy[i] - 1];
          copy[copy[i] - 1] = copy[i];
          copy[i] = temp;
        }
      }
      for (let i = 0; i < n; i++) {
        if (copy[i] !== i + 1) return i + 1;
      }
      return n + 1;
    },
    genInput: () => {
      const n = randInt(5, 20);
      let arr = randArray(n, -10, 20);
      if(Math.random() > 0.5) arr = [1,2,3,4,5];
      return arr.join(' ');
    },
    processOutput: (res) => res.toString(),
    parseInput: (s) => s.split(' ').map(Number),
    themes: [
      { title: "Classic: First Missing Positive", desc: "Given an unsorted integer array, return the smallest missing positive integer." },
      { title: "Cyberpunk: First Available Node", desc: "Find the lowest available positive integer Node ID in the unsorted network cluster array." },
      { title: "Fantasy: Lowest Missing Level", desc: "Find the lowest positive integer spell level that is missing from the ancient wizard's grimoire array." },
      { title: "Space: Next Habitable Planet", desc: "Find the smallest positive integer catalog ID of a habitable planet missing from the database." },
      { title: "Hacker: Lowest Unpatched Port", desc: "Find the smallest positive integer port number that was missed in the security patch array." }
    ]
  },
  {
    id: 'product-except-self',
    difficulty: 'medium',
    logic: (arr) => {
      let n = arr.length;
      let res = Array(n).fill(1);
      let left = 1, right = 1;
      for (let i = 0; i < n; i++) {
        res[i] *= left;
        left *= arr[i];
      }
      for (let i = n - 1; i >= 0; i--) {
        res[i] *= right;
        right *= arr[i];
      }
      return res.join(' ');
    },
    genInput: () => {
      return randArray(randInt(4, 10), 1, 9).join(' ');
    },
    processOutput: (res) => res,
    parseInput: (s) => s.split(' ').map(Number),
    themes: [
      { title: "Classic: Product of Array Except Self", desc: "Given an integer array, return an array such that answer[i] is equal to the product of all the elements of nums except nums[i]." },
      { title: "Cyberpunk: Malware Propagation", desc: "Calculate the total infection rate multiplier for every sector except itself (product of all other sector rates)." },
      { title: "Fantasy: Aura Interference", desc: "Calculate the magical interference on each rune, which is the product of the power of all other runes in the circle." },
      { title: "Space: Gravity Slingshot", desc: "Calculate the slingshot velocity for each planet, which is the product of the gravitational pull of all other planets." },
      { title: "Hacker: Cryptographic Key Combo", desc: "Derive the sub-key for each array index by multiplying all other array values together." }
    ]
  }
];

const problems = [];
let problemIdCounter = 1;

coreAlgorithms.forEach(algo => {
  algo.themes.forEach((theme) => {
    
    // Generate exactly 5 test cases mathematically
    const testCases = [];
    for(let i=0; i<5; i++) {
      const inputStr = algo.genInput();
      const parsedInput = algo.parseInput(inputStr);
      const outputVal = algo.logic(parsedInput);
      const outputStr = algo.processOutput(outputVal);
      
      testCases.push({
        input: inputStr,
        expectedOutput: outputStr
      });
    }

    // Build the Markdown description
    let fullDesc = `## ${theme.title}\n\n${theme.desc}\n\n### Input Data\nRead from standard input (stdin). See examples below.\n\n### Output Data\nPrint strictly to standard output (stdout).`;
    fullDesc += `\n\n### Example 1\n**Input:**\n\`\`\`\n${testCases[0].input}\n\`\`\`\n**Output:**\n\`\`\`\n${testCases[0].expectedOutput}\n\`\`\``;
    fullDesc += `\n\n### Example 2\n**Input:**\n\`\`\`\n${testCases[1].input}\n\`\`\`\n**Output:**\n\`\`\`\n${testCases[1].expectedOutput}\n\`\`\``;

    problems.push({
      id: `prob-${problemIdCounter++}`,
      title: theme.title,
      difficulty: algo.difficulty,
      description: fullDesc,
      starterCode: "// Write your code here to read from stdin and print to stdout.\n// Do not use a hardcoded solution.",
      testCases: testCases
    });
  });
});

const outputPath = path.join(__dirname, '..', 'data', 'trusted_problems.json');
fs.writeFileSync(outputPath, JSON.stringify(problems, null, 2));

console.log(`Successfully generated ${problems.length} highly reliable problems at ${outputPath}`);
