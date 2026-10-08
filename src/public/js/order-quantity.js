(() => {
  let queue = Promise.resolve();
  const ticket = document.querySelector('.ticket');
  if (!ticket) return;

  let audioContext;
  const beep = async () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      audioContext ||= new AudioContext();
      if (audioContext.state === 'suspended') await audioContext.resume();
      const oscillator = audioContext.createOscillator();
      const volume = audioContext.createGain();
      const start = audioContext.currentTime;
      oscillator.frequency.value = 880;
      volume.gain.setValueAtTime(0, start);
      volume.gain.linearRampToValueAtTime(0.12, start + 0.005);
      volume.gain.linearRampToValueAtTime(0, start + 0.08);
      oscillator.connect(volume);
      volume.connect(audioContext.destination);
      oscillator.onended = () => {
        oscillator.disconnect();
        volume.disconnect();
      };
      oscillator.start(start);
      oscillator.stop(start + 0.08);
    } catch {
      // Audio availability must not interrupt quantity updates.
    }
  };

  const focusKey = 'order-summary-focus';
  try {
    if (sessionStorage.getItem(focusKey) === window.location.pathname) {
      sessionStorage.removeItem(focusKey);
      window.addEventListener('load', () => {
        ticket.focus({ preventScroll: true });
        ticket.scrollIntoView({ block: 'start' });
      }, { once: true });
    }
  } catch {
    // Storage availability must not interrupt ordering.
  }

  document.addEventListener('submit', (event) => {
    const form = event.target.closest('form[data-catalog-quantity]');
    if (!form) return;
    event.preventDefault();
    try {
      sessionStorage.setItem(focusKey, window.location.pathname);
    } catch {
      // Keep the normal submission available when storage is blocked.
    }
    // Let the short beep finish before the catalog navigates.
    void beep().finally(() => {
      window.setTimeout(() => HTMLFormElement.prototype.submit.call(form), 100);
    });
  });

  const error = document.createElement('p');
  error.setAttribute('role', 'alert');
  error.hidden = true;
  ticket.before(error);

  ticket.addEventListener('submit', (event) => {
    const form = event.target.closest('form[data-order-quantity]');
    if (!form) return;
    event.preventDefault();
    void beep();
    const action = form.action;
    const body = new URLSearchParams(new FormData(form));
    const button = event.submitter;

    // Serialize clicks so each response includes all earlier quantity changes.
    queue = queue.then(async () => {
      error.hidden = true;
      try {
        const response = await fetch(action, {
          method: 'POST',
          body,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        if (!response.ok) throw new Error('Quantity update failed');
        const page = new DOMParser().parseFromString(await response.text(), 'text/html');
        const updated = page.querySelector('.ticket');
        if (!updated) throw new Error('Missing ticket');
        const x = window.scrollX;
        const y = window.scrollY;
        const active = document.activeElement;
        const focusedForm = active?.closest('form[data-order-quantity]');
        const focusedAction = ticket.contains(active) ? focusedForm?.action : null;
        ticket.innerHTML = updated.innerHTML;
        if (focusedAction) {
          const replacement = [...ticket.querySelectorAll('form[data-order-quantity]')]
            .find((candidate) => candidate.action === focusedAction);
          (replacement?.querySelector('button') || ticket.querySelector('button'))
            ?.focus({ preventScroll: true });
        }
        window.scrollTo(x, y);
      } catch {
        error.textContent = 'No se ha podido actualizar el pedido. Revisa la cantidad antes de volver a intentarlo.';
        error.hidden = false;
        if (button?.isConnected) button.focus({ preventScroll: true });
      }
    });
  });
})();
