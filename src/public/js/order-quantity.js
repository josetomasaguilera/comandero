(() => {
  let queue = Promise.resolve();
  const ticket = document.querySelector('.ticket');
  if (!ticket) return;

  const error = document.createElement('p');
  error.setAttribute('role', 'alert');
  error.hidden = true;
  ticket.before(error);

  document.addEventListener('submit', (event) => {
    const form = event.target.closest('form[data-order-quantity]');
    if (!form) return;
    event.preventDefault();
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
