(() => {
  const dialog = document.getElementById('notes-dialog');
  const text = document.getElementById('notes-text');
  let activeButton;
  let activeInput;

  document.querySelectorAll('[data-notes-target]').forEach((button) => {
    button.addEventListener('click', () => {
      activeButton = button;
      activeInput = document.getElementById(button.dataset.notesTarget);
      text.value = activeInput.value;
      document.getElementById('notes-product-name').textContent = button.dataset.productName;
      dialog.showModal();
    });
  });

  document.getElementById('notes-dialog-form').addEventListener('submit', (event) => {
    event.preventDefault();
    if (!activeInput) return;
    activeInput.value = text.value.trim();
    activeButton.textContent = activeInput.value ? 'Editar notas ✓' : 'Añadir notas';
    dialog.close();
  });

  document.getElementById('notes-cancel').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    activeButton?.focus();
    activeInput = null;
  });
})();
