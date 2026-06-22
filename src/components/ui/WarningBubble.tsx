/**
 * WarningBubble
 *
 * A temporary notification that appears with a message
 * and auto-dismisses after a configurable duration.
 *
 * Renders nothing when message is null.
 */

import { useEffect, useState } from 'react';

interface WarningBubbleProps {
  message: string | null;
  /** Auto-dismiss after this many milliseconds. Default: 5000 */
  duration?: number;
}

export function WarningBubble({
  message,
  duration = 5000,
}: WarningBubbleProps) {
  const [visible, setVisible] = useState(false);
  const [displayMessage, setDisplayMessage] = useState<string | null>(null);

  useEffect(() => {
    if (message) {
      setDisplayMessage(message);
      setVisible(true);

      const timer = setTimeout(() => {
        setVisible(false);
      }, duration);

      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [message, duration]);

  if (!visible || !displayMessage) return null;

  return (
    <div className='absolute top-4 right-4 z-20 bg-amber-50 border border-amber-300 text-amber-800 px-4 py-2 rounded-lg text-sm shadow-sm transition-opacity duration-300'>
      {displayMessage}
    </div>
  );
}
