(() => {
  const dialog = document.getElementById('notes-dialog');
  const text = document.getElementById('notes-text');
  let activeButton;
  let activeInput;

  const syncNotes = (row, value) => {
    const parts = value.split(';').map((part) => part.trim()).filter(Boolean);
    const notes = parts.filter((part) => part.toLowerCase() !== 'con extras');
    if (Number(row.querySelector('[name="extrasCents"]').value) > 0) notes.push('con extras');
    const input = row.querySelector('[name="notes"]');
    input.value = notes.join('; ');
    row.querySelector('[data-notes-target]').textContent = input.value ? 'Editar notas ✓' : 'Añadir notas';
  };

  document.querySelectorAll('.menu-product').forEach((row) => {
    row.querySelector('form[id^="add-"]').addEventListener('submit', () => {
      row.classList.remove('menu-product--selected');
    });
  });

  const extrasDialog = document.getElementById('extras-dialog');
  let extrasButton;
  let extrasAmount = 0;
  const renderExtras = () => {
    document.getElementById('extras-total').textContent = (extrasAmount / 100).toFixed(2).replace('.', ',') + ' €';
    extrasDialog.querySelectorAll('[data-extras-step]').forEach((button) => {
      if (Number(button.dataset.extrasStep) < 0) button.disabled = extrasAmount === 0;
    });
  };
  document.querySelectorAll('[data-extras-open]').forEach((button) => {
    button.addEventListener('click', () => {
      extrasButton = button;
      extrasAmount = Number(button.closest('.menu-product').querySelector('[name="extrasCents"]').value);
      document.getElementById('extras-product-name').textContent = button.dataset.productName;
      renderExtras();
      extrasDialog.showModal();
    });
  });
  extrasDialog.querySelectorAll('[data-extras-step]').forEach((button) => {
    button.addEventListener('click', () => {
      extrasAmount = Math.max(0, extrasAmount + Number(button.dataset.extrasStep));
      renderExtras();
    });
  });
  document.getElementById('extras-dialog-form').addEventListener('submit', (event) => {
    event.preventDefault();
    if (!extrasButton) return;
    const row = extrasButton.closest('.menu-product');
    row.querySelector('[name="extrasCents"]').value = String(extrasAmount);
    syncNotes(row, row.querySelector('[name="notes"]').value);
    extrasButton.textContent = extrasAmount > 0
      ? 'Editar extras (' + (extrasAmount / 100).toFixed(2).replace('.', ',') + ' €)'
      : 'Añadir extras';
    row.classList.toggle('menu-product--selected', extrasAmount > 0 || Boolean(row.querySelector('[name="notes"]').value));
    extrasDialog.close();
  });
  document.getElementById('extras-cancel').addEventListener('click', () => extrasDialog.close());
  extrasDialog.addEventListener('close', () => {
    extrasButton?.focus();
    extrasButton = null;
  });

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
    syncNotes(activeButton.closest('.menu-product'), text.value);
    dialog.close();
  });

  document.getElementById('notes-cancel').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    activeButton?.closest('.menu-product').classList.add('menu-product--selected');
    activeButton?.focus();
    activeInput = null;
  });
})();
