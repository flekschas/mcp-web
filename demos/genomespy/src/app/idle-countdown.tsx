import type { MCPWeb } from '@mcp-web/core';
import { useEffect, useState } from 'react';

/** Only the last 10 minutes are counted down. */
const COUNTDOWN_WINDOW_MS = 10 * 60 * 1000;

/**
 * Time left until the page disconnects for lack of use, or "Idle" once it
 * has. Using the page reconnects it.
 */
export function IdleCountdown({
  mcpWeb,
  idle,
  className,
}: {
  mcpWeb: MCPWeb;
  idle: boolean;
  className?: string;
}) {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (idle) {
    return (
      <span
        className={className}
        title="Disconnected after inactivity. Use the page to reconnect."
      >
        Idle
      </span>
    );
  }

  const disconnectAt = mcpWeb.idleDisconnectAt;
  if (disconnectAt === undefined) return null;

  const remainingMs = Math.max(0, disconnectAt - now);
  if (remainingMs > COUNTDOWN_WINDOW_MS) return null;

  const seconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const label = `${minutes}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <span
      className={className}
      title="Disconnects when the time runs out without tool calls or use of the page"
    >
      {label}
    </span>
  );
}
