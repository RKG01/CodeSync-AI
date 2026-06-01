import React from 'react';

export default function ProblemPanel({ problem, visibleTestCases, totalTestCases }) {
  if (!problem) {
    return (
      <div className="problem-panel-empty">
        <p>Waiting for problem...</p>
      </div>
    );
  }

  return (
    <div className="problem-panel">
      <h2 className="problem-title">{problem.title}</h2>

      <div className="problem-description">
        {/* Render markdown-ish description */}
        {problem.description.split('\n').map((line, i) => {
          if (line.startsWith('## ')) {
            return <h3 key={i} className="problem-heading">{line.replace('## ', '')}</h3>;
          }
          if (line.startsWith('### ')) {
            return <h4 key={i} className="problem-subheading">{line.replace('### ', '')}</h4>;
          }
          if (line.startsWith('```')) {
            return null; // Skip code fence markers
          }
          if (line.trim() === '') {
            return <br key={i} />;
          }
          // Check if previous/next lines are code fences — render as code
          const lines = problem.description.split('\n');
          const prevCodeFence = lines.slice(0, i).reverse().find(l => l.startsWith('```'));
          const nextCodeFence = lines.slice(i + 1).find(l => l.startsWith('```'));
          const prevFenceIdx = lines.indexOf(prevCodeFence);
          const nextFenceIdx = lines.indexOf(nextCodeFence, i);
          
          if (prevFenceIdx !== -1 && prevFenceIdx < i && nextFenceIdx > i) {
            return <code key={i} className="problem-code-line">{line}</code>;
          }

          return <p key={i} className="problem-text">{line}</p>;
        })}
      </div>

      {/* Visible Test Cases */}
      <div className="problem-testcases">
        <h4 className="problem-subheading">
          Sample Test Cases ({visibleTestCases?.length || 0} of {totalTestCases} shown)
        </h4>
        {visibleTestCases?.map((tc, i) => (
          <div key={i} className="testcase-card">
            <div className="testcase-section">
              <span className="testcase-label">Input</span>
              <pre className="testcase-content">{tc.inputs || tc.input}</pre>
            </div>
            <div className="testcase-section">
              <span className="testcase-label">Expected Output</span>
              <pre className="testcase-content">{tc.expectedOutput}</pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
