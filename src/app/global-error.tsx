'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <head>
        <title>Karaoke Successor - Error</title>
        <style>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0a1520 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
          }
          .error-container {
            max-width: 500px;
            width: 90%;
            background: rgba(17, 24, 39, 0.9);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 12px;
            padding: 24px;
            text-align: center;
          }
          .error-icon {
            font-size: 48px;
            margin-bottom: 16px;
          }
          .error-title {
            color: #f87171;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 12px;
          }
          .error-message {
            color: rgba(255, 255, 255, 0.7);
            margin-bottom: 24px;
          }
          .error-details {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.2);
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 24px;
            font-family: monospace;
            font-size: 14px;
            color: #f87171;
            word-break: break-word;
          }
          .button-group {
            display: flex;
            gap: 12px;
            justify-content: center;
          }
          .button {
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            border: none;
          }
          .button-primary {
            background: #22D3EE;
            color: black;
          }
          .button-primary:hover {
            background: #67E8F9;
          }
          .button-secondary {
            background: transparent;
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: white;
          }
          .button-secondary:hover {
            background: rgba(255, 255, 255, 0.1);
          }
        `}</style>
      </head>
      <body>
        <div className="error-container">
          <div className="error-icon">💥</div>
          <h1 className="error-title">Critical Error</h1>
          <p className="error-message">
            A critical error occurred. Please try reloading the application.
          </p>
          <div className="error-details">
            {error.message || 'Unknown error'}
          </div>
          <div className="button-group">
            <button className="button button-primary" onClick={() => reset()}>
              Try Again
            </button>
            <button
              className="button button-secondary"
              onClick={() => window.location.reload()}
            >
              Reload App
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
