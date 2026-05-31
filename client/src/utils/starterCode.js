export function getGenericStarterCode(language) {
  if (language === 'javascript' || language === 'typescript') {
    return `const readline = require('readline');\n\nconst rl = readline.createInterface({\n  input: process.stdin,\n  output: process.stdout\n});\n\nlet inputLines = [];\n\nrl.on('line', (line) => {\n  inputLines.push(line);\n});\n\nrl.on('close', () => {\n  const input = inputLines.join('\\n').trim();\n  // Your solution here\n  // Use console.log() to print your final answer\n  \n});`;
  }
  if (language === 'python') {
    return `import sys\ninput_data = sys.stdin.read().strip()\n\n# Your solution here\n# Use print() to output your final answer`;
  }
  if (language === 'cpp') {
    return `#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    // Your solution here\n    // Read using cin, print using cout\n    return 0;\n}`;
  }
  if (language === 'c') {
    return `#include <stdio.h>\n\nint main() {\n    // Your solution here\n    // Read using scanf, print using printf\n    return 0;\n}`;
  }
  if (language === 'go') {
    return `package main\n\nimport (\n\t"fmt"\n\t"io/ioutil"\n\t"os"\n)\n\nfunc main() {\n\tbytes, _ := ioutil.ReadAll(os.Stdin)\n\tinput := string(bytes)\n\n\t// Your solution here\n\t// Use fmt.Println() to print your final answer\n}`;
  }
  return '// Write your solution here';
}
