// === КОНФІГУРАЦІЯ ===
const CLIENT_ID = "Iv23liOFQSm9NgLpBcY0";
const REDIRECT_URI = encodeURIComponent(window.location.origin + window.location.pathname);
const OAUTH_PROXY = "https://cyberdrill-oauth.senja32082.workers.dev";

let user = null;
let accessToken = null;
let score = 0;

// === МІСІЇ ===
const missions = [
  null,
  {
    title: "1. Знайди фішинг",
    image: "assets/phishing-email.jpg",
    question: "Яка ознака фішингу?",
    correct: 1,
    answers: ["Домен @gmail.com", "Терміновість", "Правильна граматика", "Офіційний логотип"],
    hint: "Фішинг завжди тисне на емоції"
  },
  {
    title: "2. Селфі з прильотом — що не так?",
    image: "assets/selfie-boom.jpg",
    question: "Чому це небезпечно?",
    correct: 0,
    answers: ["Геолокація в EXIF", "Красивий фон", "Селфі — це круто", "Немає фільтрів"],
    hint: "Фото знає, де ти був"
  },
  {
    title: "3. Рація без Zeroize — виправ",
    image: "assets/radio-no-zeroize.jpg",
    question: "Що треба зробити?",
    correct: 1,
    answers: ["Вимкнути", "Натиснути Zeroize", "Змінити частоту", "Сфоткати"],
    hint: "Zeroize = знищити ключі"
  },
  {
    title: "4. Пароль на стікері",
    image: "assets/password-sticker.jpg",
    question: "Що не так?",
    correct: 1,
    answers: ["Стікери — це мило", "Пароль видно", "Монітор чистий", "Все ок"],
    hint: "Пароль = таємниця"
  }
];

// === OAuth ===
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');

if (code) {
  fetch(`${OAUTH_PROXY}/token?code=${code}`)
    .then(r => r.json())
    .then(data => {
      if (data.access_token) {
        accessToken = data.access_token;
        return fetch('https://api.github.com/user', {
          headers: { Authorization: `token ${accessToken}` }
        });
      }
      throw new Error("No token");
    })
    .then(r => r.json())
    .then(u => {
      user = u;
      document.getElementById('github-user').textContent = `@${u.login}`;
      loadScore();
      showScreen('menu-screen');
      updateBadges();
      history.replaceState({}, '', window.location.pathname);
    })
    .catch(() => {
      alert("Помилка авторизації. Спробуй ще раз.");
      showScreen('login-screen');
    });
}

document.getElementById('github-login').onclick = () => {
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=read:user`;
  window.location.href = authUrl;
};

// === ЕКРАНИ ===
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (id === 'menu-screen') updateBadges();
}

// === ГРА ===
let currentMission = 0;

document.querySelectorAll('[data-mission]').forEach(btn => {
  btn.onclick = () => {
    currentMission = btn.dataset.mission;
    startMission(currentMission);
  };
});

function startMission(id) {
  const m = missions[id];
  document.getElementById('mission-title').textContent = m.title;
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 600; canvas.height = 400;

  const img = new Image();
  img.src = m.image;
  img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  img.onerror = () => ctx.fillText("Зображення не знайдено", 50, 50);

  const answersDiv = document.getElementById('answers');
  answersDiv.innerHTML = '';
  m.answers.forEach((a, i) => {
    const btn = document.createElement('button');
    btn.textContent = a;
    btn.onclick = () => checkAnswer(i);
    answersDiv.appendChild(btn);
  });

  document.getElementById('hint').textContent = m.hint;
  showScreen('game-screen');
}

function checkAnswer(selected) {
  const m = missions[currentMission];
  if (selected === m.correct) {
    alert("Правильно! +100");
    score += 100;
    document.getElementById('score').textContent = score;
    saveScore();

    // БЕЙДЖІ
    const badges = JSON.parse(localStorage.getItem('cyberdrill_badges') || '[]');
    if (currentMission == 3 && !badges.includes('zeroize')) {
      badges.push('zeroize');
      alert("Бейдж: Zeroize Master!");
    }
    if (score >= 300 && !badges.includes('opsec')) {
      badges.push('opsec');
      alert("Бейдж: OPSEC Pro!");
    }
    localStorage.setItem('cyberdrill_badges', JSON.stringify(badges));
    updateBadges();
  } else {
    alert("Ні! Спробуй ще.");
  }
}

document.getElementById('back-to-menu').onclick = () => showScreen('menu-screen');

// === ЛІДЕРБОРД ===
function saveScore() {
  if (!user) return;
  const key = `cyberdrill_score_${user.login}`;
  localStorage.setItem(key, score);
  updateLeaderboard();
}

function loadScore() {
  if (!user) return;
  const key = `cyberdrill_score_${user.login}`;
  score = parseInt(localStorage.getItem(key) || '0');
  document.getElementById('score').textContent = score;
}

function updateLeaderboard() {
  const data = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('cyberdrill_score_')) {
      const login = key.split('_')[2];
      data.push({ user: login, score: parseInt(localStorage.getItem(key)) });
    }
  }
  data.sort((a, b) => b.score - a.score);
  localStorage.setItem('cyberdrill_leaderboard', JSON.stringify(data.slice(0, 10)));
}

function loadLeaderboard() {
  updateLeaderboard();
  const data = JSON.parse(localStorage.getItem('cyberdrill_leaderboard') || '[]');
  const ol = document.getElementById('leaders');
  ol.innerHTML = '';
  data.forEach(d => {
    const li = document.createElement('li');
    li.textContent = `@${d.user} — ${d.score}`;
    ol.appendChild(li);
  });
}

document.getElementById('leaderboard-btn').onclick = () => {
  loadLeaderboard();
  showScreen('leaderboard-screen');
};
document.getElementById('back-from-leaderboard').onclick = () => showScreen('menu-screen');

// === БЕЙДЖІ ===
function updateBadges() {
  const badges = JSON.parse(localStorage.getItem('cyberdrill_badges') || '[]');
  const badgeDiv = document.getElementById('badges');
  const names = { zeroize: "Zeroize Master", opsec: "OPSEC Pro" };
  badgeDiv.innerHTML = '<strong>Бейджи:</strong> ' + 
    (badges.map(b => names[b]).filter(Boolean).join(' | ') || 'Немає');
}