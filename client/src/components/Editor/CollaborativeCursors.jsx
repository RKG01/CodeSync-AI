import React from 'react';

/**
 * Collaborative cursors are handled via Yjs awareness + MonacoBinding.
 * This component provides custom CSS styles for remote cursor decorations
 * that are injected by y-monaco.
 */

const CURSOR_STYLES = `
  .yRemoteSelection {
    opacity: 0.25;
    border-radius: 2px;
  }

  .yRemoteSelectionHead {
    position: absolute;
    border-left: 2px solid;
    border-color: inherit;
    height: 100%;
    box-sizing: border-box;
  }

  .yRemoteSelectionHead::after {
    content: attr(data-username);
    position: absolute;
    top: -1.4em;
    left: -2px;
    padding: 1px 6px;
    border-radius: 3px 3px 3px 0;
    font-size: 10px;
    font-family: var(--font-sans);
    font-weight: 500;
    white-space: nowrap;
    color: white;
    background: inherit;
    pointer-events: none;
    animation: fadeIn 0.2s ease-out;
    line-height: 1.4;
    z-index: 10;
  }

  /* Remote cursor colors */
  .yRemoteSelection-0 { background-color: rgba(59, 130, 246, 0.25); }
  .yRemoteSelectionHead-0 { border-color: #3b82f6; }
  .yRemoteSelectionHead-0::after { background: #3b82f6; }

  .yRemoteSelection-1 { background-color: rgba(139, 92, 246, 0.25); }
  .yRemoteSelectionHead-1 { border-color: #8b5cf6; }
  .yRemoteSelectionHead-1::after { background: #8b5cf6; }

  .yRemoteSelection-2 { background-color: rgba(6, 182, 212, 0.25); }
  .yRemoteSelectionHead-2 { border-color: #06b6d4; }
  .yRemoteSelectionHead-2::after { background: #06b6d4; }

  .yRemoteSelection-3 { background-color: rgba(16, 185, 129, 0.25); }
  .yRemoteSelectionHead-3 { border-color: #10b981; }
  .yRemoteSelectionHead-3::after { background: #10b981; }

  .yRemoteSelection-4 { background-color: rgba(245, 158, 11, 0.25); }
  .yRemoteSelectionHead-4 { border-color: #f59e0b; }
  .yRemoteSelectionHead-4::after { background: #f59e0b; }

  .yRemoteSelection-5 { background-color: rgba(236, 72, 153, 0.25); }
  .yRemoteSelectionHead-5 { border-color: #ec4899; }
  .yRemoteSelectionHead-5::after { background: #ec4899; }

  .yRemoteSelection-6 { background-color: rgba(239, 68, 68, 0.25); }
  .yRemoteSelectionHead-6 { border-color: #ef4444; }
  .yRemoteSelectionHead-6::after { background: #ef4444; }

  .yRemoteSelection-7 { background-color: rgba(249, 115, 22, 0.25); }
  .yRemoteSelectionHead-7 { border-color: #f97316; }
  .yRemoteSelectionHead-7::after { background: #f97316; }
`;

export default function CollaborativeCursors() {
  return <style>{CURSOR_STYLES}</style>;
}
