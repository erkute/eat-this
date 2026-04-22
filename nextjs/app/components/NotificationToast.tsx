'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export default function NotificationToast() {
  const [text, setText] = useState('');
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, duration = 3000) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setText(message);
    setVisible(true);
    timerRef.current = setTimeout(() => setVisible(false), duration);
  }, []);

  useEffect(() => {
    window.showNotification = show;
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [show]);

  return (
    <div className={`notification${visible ? ' show' : ''}`} aria-live="polite" aria-atomic="true">
      {text}
    </div>
  );
}
