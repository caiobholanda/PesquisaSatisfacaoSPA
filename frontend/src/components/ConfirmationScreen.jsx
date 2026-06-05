import { useState, useEffect } from 'react';

export default function ConfirmationScreen({ visible, onRestart }) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const id = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(id); onRestart(); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="screen confirm-wrap" style={{ opacity: visible ? 1 : 0 }} aria-live="polite">
      <div className="confirm-band"></div>
      <h1 className="serif confirm-obrigado">Obrigado.</h1>
      <p className="confirm-sub">
        Por compartilhar sua experiência conosco.<br />Esperamos vê-lo em breve no Gran SPA.
      </p>
      <p className="confirm-redirect">Voltando em {countdown}...</p>
    </div>
  );
}
