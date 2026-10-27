let targetAmount = 1000;
let savedAmount = 0;
let currency = '€';

let addHistory = [];
let subHistory = [];

let winShown = false;

const goalNameInput      = document.getElementById('goalName');
const targetInput        = document.getElementById('targetInput');
const currencySelector   = document.getElementById('currencySelector');
const targetBadge        = document.getElementById('targetBadge');
const targetDisplay      = document.getElementById('targetDisplay');
const savedDisplay       = document.getElementById('savedDisplay');
const remainingDisplay   = document.getElementById('remainingDisplay');
const progressFill       = document.getElementById('progressFill');
const percentDisplay     = document.getElementById('percentDisplay');

const addAmountInput     = document.getElementById('addAmount');
const addSourceInput     = document.getElementById('addSource');
const subAmountInput     = document.getElementById('subAmount');
const subReasonInput     = document.getElementById('subReason');
const addBtn             = document.getElementById('addBtn');
const subBtn             = document.getElementById('subBtn');

const addList            = document.getElementById('addList');
const subList            = document.getElementById('subList');
const addCount           = document.getElementById('addCount');
const subCount           = document.getElementById('subCount');

const winOverlay         = document.getElementById('winOverlay');

const saveGoalBtn        = document.getElementById('saveGoalBtn');
const resetBtn           = document.getElementById('resetBtn');

/* ---------------------------------------------------------
   Betrag parsen – akzeptiert:
   100          → 100
   100,00       → 100
   1.000        → 1000
   1.000,50     → 1000.5
   1000.50      → 1000.5
   1,000.50     → 1000.5
   € 500        → 500
   --------------------------------------------------------- */
function parseAmount(str) {
  if (str === null || str === undefined) return NaN;

  let cleaned = String(str).trim();

  // Währungssymbole und Leerzeichen entfernen
  cleaned = cleaned.replace(/[€$£\s]/g, '');

  if (cleaned === '') return NaN;

  // Deutsches Format: 1.000,50 oder 1.000 oder 100,50
  if (/^\d{1,3}(\.\d{3})*(,\d+)?$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  }
  // Englisches Format mit Komma als Tausendertrenner: 1,000.50
  else if (/^\d{1,3}(,\d{3})*(\.\d+)?$/.test(cleaned)) {
    cleaned = cleaned.replace(/,/g, '');
  }
  // Nur Komma als Dezimaltrenner: 100,50
  else if (/^\d+,\d+$/.test(cleaned)) {
    cleaned = cleaned.replace(',', '.');
  }

  const val = parseFloat(cleaned);
  return isNaN(val) ? NaN : val;
}

/* ---------------------------------------------------------
   Zahl fürs Target-Eingabefeld formatieren
   – kein Währungssymbol
   – Ganzzahlen ohne Dezimalstellen (1000 statt 1000,00)
   – Dezimalstellen mit Komma
   --------------------------------------------------------- */
function formatTargetInput(value) {
  const num = Number(value) || 0;
  if (Number.isInteger(num)) {
    return String(num); // z.B. "1000"
  }
  return String(num).replace('.', ','); // z.B. "1000,5"
}

function formatMoney(value) {
  const symbol = currency === '€' ? '€' : '$';
  const num = Number(value) || 0;
  const formatted = num.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${formatted} ${symbol}`;
}

function formatTimestamp(ts) {
  const d = new Date(ts);
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function updateUI() {
  const targetStr = formatMoney(targetAmount);
  targetBadge.textContent = targetStr;
  targetDisplay.textContent = targetStr;

  savedDisplay.textContent = formatMoney(savedAmount);

  const remaining = Math.max(0, targetAmount - savedAmount);
  remainingDisplay.textContent = formatMoney(remaining);

  let percent = 0;
  if (targetAmount > 0) {
    percent = Math.min(100, (savedAmount / targetAmount) * 100);
  }
  progressFill.style.width = percent + '%';
  percentDisplay.textContent = percent.toFixed(0) + '%';

  subBtn.disabled = savedAmount <= 0;

  if (savedAmount >= targetAmount && targetAmount > 0 && !winShown) {
    triggerWin();
  }
  if (savedAmount < targetAmount) {
    winShown = false;
  }
}

function triggerWin() {
  winShown = true;
  winOverlay.classList.add('active');
  setTimeout(() => {
    winOverlay.classList.remove('active');
  }, 3200);
}

function renderAddHistory() {
  addCount.textContent = addHistory.length;

  if (addHistory.length === 0) {
    addList.innerHTML = '<div class="empty">No deposits yet</div>';
    return;
  }

  const sorted = [...addHistory].sort((a, b) => b.timestamp - a.timestamp);

  addList.innerHTML = sorted.map(item => `
    <div class="entry">
      <div class="entry-top">
        <span class="entry-amount plus">+ ${formatMoney(item.amount)}</span>
        <span class="entry-time">${formatTimestamp(item.timestamp)}</span>
      </div>
      <div class="entry-reason"><span class="label">Source:</span> ${escapeHtml(item.source)}</div>
    </div>
  `).join('');
}

function renderSubHistory() {
  subCount.textContent = subHistory.length;

  if (subHistory.length === 0) {
    subList.innerHTML = '<div class="empty">No withdrawals yet</div>';
    return;
  }

  const sorted = [...subHistory].sort((a, b) => b.timestamp - a.timestamp);

  subList.innerHTML = sorted.map(item => `
    <div class="entry">
      <div class="entry-top">
        <span class="entry-amount minus">− ${formatMoney(item.amount)}</span>
        <span class="entry-time">${formatTimestamp(item.timestamp)}</span>
      </div>
      <div class="entry-reason"><span class="label">Reason:</span> ${escapeHtml(item.reason)}</div>
    </div>
  `).join('');
}

function saveGoal() {
  const goalData = {
    name: goalNameInput.value.trim(),
    currency: currency,
    targetAmount: targetAmount,
    savedAmount: savedAmount,
    addHistory: addHistory,
    subHistory: subHistory
  };
  localStorage.setItem('goalData', JSON.stringify(goalData));

  saveGoalBtn.textContent = 'Saved ✓';
  saveGoalBtn.classList.add('saved');

  setTimeout(() => {
    saveGoalBtn.textContent = 'Save';
    saveGoalBtn.classList.remove('saved');
  }, 1500);
}

function loadGoal() {
  const stored = localStorage.getItem('goalData');
  if (!stored) return;

  try {
    const goalData = JSON.parse(stored);
    goalNameInput.value = goalData.name || 'Dream Goal';
    currency = goalData.currency || '€';
    currencySelector.value = currency;
    targetAmount = Number(goalData.targetAmount) || 1000;
    savedAmount = Number(goalData.savedAmount) || 0;
    addHistory = Array.isArray(goalData.addHistory) ? goalData.addHistory : [];
    subHistory = Array.isArray(goalData.subHistory) ? goalData.subHistory : [];

    targetInput.value = formatTargetInput(targetAmount);
  } catch (e) {
    console.warn('Could not load saved goal', e);
  }
}

/* ---------------------------------------------------------
   Alles zurücksetzen
   --------------------------------------------------------- */
function resetAll() {
  const confirmed = confirm('Do you really want to delete everything? This cannot be undone.');
  if (!confirmed) return;

  // LocalStorage löschen
  localStorage.removeItem('goalData');

  // Variablen zurücksetzen
  targetAmount = 1000;
  savedAmount = 0;
  currency = '€';
  addHistory = [];
  subHistory = [];
  winShown = false;

  // Inputs zurücksetzen
  goalNameInput.value = 'Dream Goal';
  currencySelector.value = '€';
  targetInput.value = '1000';
  addAmountInput.value = '';
  addSourceInput.value = '';
  subAmountInput.value = '';
  subReasonInput.value = '';

  // UI neu rendern
  updateUI();
  renderAddHistory();
  renderSubHistory();

  // Win-Overlay sicherheitshalber ausblenden
  winOverlay.classList.remove('active');

  // Button-Feedback
  resetBtn.textContent = 'Deleted ✓';
  resetBtn.classList.add('saved');
  setTimeout(() => {
    resetBtn.textContent = 'Reset';
    resetBtn.classList.remove('saved');
  }, 1500);
}

currencySelector.addEventListener('change', (e) => {
  currency = e.target.value;
  updateUI();
  renderAddHistory();
  renderSubHistory();
});

goalNameInput.addEventListener('input', () => {});

targetInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    saveGoalBtn.click();
  }
});

addBtn.addEventListener('click', () => {
  const amount = parseAmount(addAmountInput.value);
  const source = addSourceInput.value.trim();

  if (isNaN(amount) || amount <= 0) {
    alert('Please enter a valid amount greater than 0.');
    return;
  }
  if (!source) {
    alert('Please enter a source or reason.');
    return;
  }

  savedAmount += amount;
  addHistory.push({
    amount,
    source,
    timestamp: Date.now()
  });

  addAmountInput.value = '';
  addSourceInput.value = '';

  if (savedAmount < targetAmount) winShown = false;

  updateUI();
  renderAddHistory();
});

subBtn.addEventListener('click', () => {
  const amount = parseAmount(subAmountInput.value);
  const reason = subReasonInput.value.trim();

  if (isNaN(amount) || amount <= 0) {
    alert('Please enter a valid amount greater than 0.');
    return;
  }
  if (!reason) {
    alert('Please enter a reason / purpose.');
    return;
  }
  if (amount > savedAmount) {
    alert(`You cannot withdraw more than your saved amount (${formatMoney(savedAmount)}).`);
    return;
  }

  savedAmount -= amount;
  subHistory.push({
    amount,
    reason,
    timestamp: Date.now()
  });

  subAmountInput.value = '';
  subReasonInput.value = '';

  if (savedAmount < targetAmount) winShown = false;

  updateUI();
  renderSubHistory();
});

saveGoalBtn.addEventListener('click', () => {
  const val = parseAmount(targetInput.value);

  if (!isNaN(val) && val > 0) {
    targetAmount = val;
    targetInput.value = formatTargetInput(targetAmount);
  } else {
    targetInput.value = formatTargetInput(targetAmount);
  }

  if (savedAmount < targetAmount) winShown = false;

  updateUI();
  saveGoal();
});

resetBtn.addEventListener('click', resetAll);

(function init() {
  targetAmount = 1000;
  savedAmount = 0;
  currency = '€';
  currencySelector.value = '€';
  goalNameInput.value = 'Dream Goal';
  targetInput.value = '1000';

  addHistory = [];
  subHistory = [];
  winShown = false;

  loadGoal();

  updateUI();
  renderAddHistory();
  renderSubHistory();
})();