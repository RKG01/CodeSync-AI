import React, { useEffect, useState } from 'react';

/**
 * Collaborative cursors are handled via Yjs awareness + MonacoBinding.
 * This component provides custom CSS styles for remote cursor decorations
 * that are injected by y-monaco.
 * 
 * y-monaco injects classes like .yRemoteSelection-${clientId} and
 * .yRemoteSelectionHead-${clientId}. We dynamically generate CSS for each
 * active client based on their awareness state.
 */

const BASE_STYLES = `
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
`;

export default function CollaborativeCursors({ awareness }) {
  const [dynamicStyles, setDynamicStyles] = useState('');

  useEffect(() => {
    if (!awareness) return;

    const updateStyles = () => {
      let styles = '';
      const states = awareness.getStates();
      
      states.forEach((state, clientId) => {
        if (state.user && state.user.color) {
          const color = state.user.color;
          const name = state.user.name || 'Anonymous';
          // Convert hex to rgba for the selection background
          let rgba = color;
          if (color.startsWith('#')) {
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            rgba = `rgba(${r}, ${g}, ${b}, 0.25)`;
          }

          styles += `
            .yRemoteSelection-${clientId} { background-color: ${rgba}; }
            .yRemoteSelectionHead-${clientId} { border-color: ${color}; }
            .yRemoteSelectionHead-${clientId}::after { 
              background: ${color}; 
              content: "${name}";
            }
          `;
        }
      });
      
      setDynamicStyles(styles);
    };

    // Initial update
    updateStyles();

    // Listen to changes
    awareness.on('update', updateStyles);

    return () => {
      awareness.off('update', updateStyles);
    };
  }, [awareness]);

  return (
    <style>
      {BASE_STYLES}
      {dynamicStyles}
    </style>
  );
}
