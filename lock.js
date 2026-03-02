const correctCombination = ['1', '9', '1', '2'];
const currentCombination = [0, 0, 0, 0];

const digits = [
  document.getElementById('digit0'),
  document.getElementById('digit1'),
  document.getElementById('digit2'),
  document.getElementById('digit3'),
];

const dialRow = document.getElementById('dialRow');
const unlockBtn = document.getElementById('unlockBtn');
const statusElement = document.getElementById('status');
const lock = document.getElementById('lock');

function renderDigits() {
  digits.forEach((el, i) => {
    el.textContent = String(currentCombination[i]);
  });
}

function updateDigit(index, dir) {
  const value = currentCombination[index];
  currentCombination[index] = dir === 'up' ? (value + 1) % 10 : (value + 9) % 10;
  renderDigits();
}

function checkCombination() {
  if (currentCombination.join('') === correctCombination.join('')) {
    lock.classList.add('unlocked');

    setTimeout(() => {
      sessionStorage.setItem('fromLock', '1');
      window.location.href = 'surpresa.html';
    }, 1000);
  } else {
    lock.classList.remove('unlocked');
    lock.classList.add('shake');

    setTimeout(() => {
      lock.classList.remove('shake');
    }, 350);
  }
}

dialRow.addEventListener('click', (event) => {
  const button = event.target.closest('button.arrow');
  if (!button) return;

  const dial = button.closest('.dial');
  const index = Number(dial?.dataset.index);
  if (!Number.isInteger(index)) return;

  updateDigit(index, button.dataset.dir);
});

unlockBtn.addEventListener('click', checkCombination);

if (statusElement) {
  statusElement.textContent = 'Dica: O Primeiro Olhar';
}

renderDigits();


