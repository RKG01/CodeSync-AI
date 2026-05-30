import React from 'react';

export default function TestResultsPanel({ result }) {
  if (!result) {
    return (
      <div className="test-results-empty">
        <div className="test-results-icon">🧪</div>
        <p>Submit your code to see test results</p>
      </div>
    );
  }

  const allPassed = result.testsPassed === result.totalTests;

  return (
    <div className="test-results-panel">
      {/* Summary */}
      <div className={`test-results-summary ${allPassed ? 'all-passed' : 'partial'}`}>
        <span className="summary-icon">{allPassed ? '🎉' : '🧪'}</span>
        <span className="summary-text">
          {result.testsPassed}/{result.totalTests} test cases passed
        </span>
        {allPassed && <span className="summary-label">Perfect!</span>}
      </div>

      {/* Individual Results */}
      <div className="test-results-list">
        {result.results?.map((r, i) => (
          <div key={i} className={`test-result-card ${r.passed ? 'passed' : 'failed'}`}>
            <div className="test-result-header">
              <span className="test-result-status">
                {r.passed ? '✅' : '❌'} Test Case {r.testCase || i + 1}
              </span>
              <span className={`test-result-badge ${r.passed ? 'pass' : 'fail'}`}>
                {r.passed ? 'PASS' : 'FAIL'}
              </span>
            </div>

            {r.input !== '(hidden)' ? (
              <div className="test-result-details">
                <div className="test-result-row">
                  <span className="test-result-label">Input</span>
                  <pre className="test-result-value">{r.input}</pre>
                </div>
                <div className="test-result-row">
                  <span className="test-result-label">Expected</span>
                  <pre className="test-result-value">{r.expected}</pre>
                </div>
                <div className="test-result-row">
                  <span className="test-result-label">Your Output</span>
                  <pre className={`test-result-value ${r.passed ? '' : 'mismatch'}`}>
                    {r.actual || '(no output)'}
                  </pre>
                </div>
                {r.error && (
                  <div className="test-result-row">
                    <span className="test-result-label error-label">Error</span>
                    <pre className="test-result-value error-value">{r.error}</pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="test-result-hidden">
                <span>🔒 Hidden test case</span>
                {!r.passed && r.actual && (
                  <pre className="test-result-value mismatch">Your output: {r.actual}</pre>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
