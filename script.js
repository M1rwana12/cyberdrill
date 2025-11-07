// === КОНФІГУРАЦІЯ ===
const CLIENT_ID = "Iv23liOFQSm9NgLpBcY0";
const REDIRECT_URI = encodeURIComponent(window.location.origin + window.location.pathname);
const OAUTH_PROXY = "https://cyberdrill-oauth.senja32082.workers.dev";
let GIST_ID = null;

let user = null, accessToken = null, score = 0, streak = 0;
let currentMission = 0, timerInterval = null;

// === МІСІЇ (5-6 ВИПРАВЛЕНО) ===
const missions = [
  null,
  { 
    title: "1. Фішинг-лист", 
    image: "assets/phishing-email.jpg", 
    correct: 1, 
    answers: ["@gmail.com", "Терміновість", "Логотип", "Граматика"], 
    hint: "Фішинг тисне на емоції", 
    hotzone: {x: 200, y: 150, w: 200, h: 100} 
  },
  { 
    title: "2. Селфі з прильотом", 
    image: "assets/selfie-boom.jpg", 
    correct: 0, 
    answers: ["EXIF геолокація", "Фон", "Фільтри", "Світло"], 
    hint: "Фото знає, де ти", 
    hotzone: {x: 300, y: 100, w: 150, h: 200} 
  },
  { 
    title: "3. Zeroize рації", 
    image: "assets/radio-no-zeroize.jpg", 
    correct: 1, 
    answers: ["Вимкнути", "Zeroize", "Змінити частоту", "Сфоткати"], 
    hint: "Zeroize = знищити ключі", 
    hotzone: {x: 250, y: 200, w: 100, h: 80} 
  },
  { 
    title: "4. Пароль на стікері", 
    image: "assets/password-sticker.jpg", 
    correct: 1, 
    answers: ["Стікери", "Пароль видно", "Монітор", "Кабель"], 
    hint: "Пароль = таємниця", 
    hotzone: {x: 350, y: 180, w: 120, h: 60} 
  },
  { 
    title: "5. AI Голос-фішинг", 
    image: "assets/ai-voice.jpg", 
    correct: 2, 
    answers: ["Відкрити", "Перевірити", "Вимкнути", "Записати"], 
    hint: "Завжди перевіряй 2-е джерело!", 
    hotzone: {x: 200, y: 100, w: 200, h: 200} 
  },
  { 
    title: "6. Ransomware Бос", 
    image: "assets/ransomware.jpg", 
    correct: null, 
    answers: [], 
    hint: "Клікни 10 разів за 20с!", 
    boss: true 
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
        return fetch('https://api.github.com/user', { headers: { Authorization: `token ${accessToken}` } });
      }
      throw new Error("No token");
    })
    .then(r => r.json())
    .then(u => {
      user = u;
      document.getElementById('github-user').textContent = `@${u.login}`;
      loadProgress();
      showScreen('menu-screen');
      history.replaceState({}, '', window.location.pathname);
    })
    .catch(() => { alert("Помилка входу"); showScreen('login-screen'); });
}

document.getElementById('github-login').onclick = () => {
  window.location.href = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=read:user gist`;
};

// === ЕКРАНИ ===
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (id === 'menu-screen') updateBadges();
}

// === ГРА ===
document.querySelectorAll('[data-mission]').forEach(btn => {
  btn.onclick = () => { currentMission = btn.dataset.mission; startMission(currentMission); };
});

function startMission(id) {
  const m = missions[id];
  document.getElementById('mission-title').textContent = m.title;
  document.getElementById('hint').textContent = m.hint;
  document.getElementById('timer').textContent = '';

  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 600; canvas.height = 400;

  const img = new Image();
  img.src = m.image;
  img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  img.onerror = () => ctx.fillText("Зображення не знайдено", 50, 50);

  // ТАЙМЕР: 15с для челенджу, 30с звичайно, 20с для боса
  const isDaily = (id == 1 && localStorage.getItem('cyberdrill_daily') === new Date().toDateString());
  let timeLeft = isDaily ? 15 : (m.boss ? 20 : 30);
  const timerEl = document.getElementById('timer');
  timerInterval = setInterval(() => {
    timeLeft--;
    timerEl.textContent = `⏰ ${timeLeft}с`;
    if (timeLeft <= 0) endMission(false);
  }, 1000);

  // Відповіді
  const answersDiv = document.getElementById('answers');
  answersDiv.innerHTML = '';
  if (!m.boss && m.answers) {
    m.answers.forEach((a, i) => {
      const btn = document.createElement('button');
      btn.textContent = a;
      btn.onclick = () => checkAnswer(i);
      answersDiv.appendChild(btn);
    });
  }

  // Клік по зоні (всі місії з hotzone)
  if (m.hotzone && !m.boss) {
    canvas.onclick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const h = m.hotzone;
      if (x > h.x && x < h.x + h.w && y > h.y && y < h.y + h.h) {
        endMission(true, isDaily ? 350 : 150); // +200 за челендж
      }
    };
  }

  // Бос-файт (Ransomware)
  if (m.boss) {
    let clicks = 0;
    canvas.onclick = () => {
      clicks++;
      playSound('beep');
      if (clicks >= 10) {
        endMission(true, isDaily ? 500 : 300);
      }
    };
  }

  showScreen('game-screen');
}

function checkAnswer(selected) {
  const m = missions[currentMission];
  const isDaily = (currentMission == 1 && localStorage.getItem('cyberdrill_daily') === new Date().toDateString());
  if (selected === m.correct) {
    endMission(true, isDaily ? 300 : 100);
  } else {
    alert("Ні! Спробуй ще.");
    playSound('explosion');
  }
}

function endMission(success, bonus = 0) {
  clearInterval(timerInterval);
  if (success) {
    score += bonus;
    document.getElementById('score').textContent = score;
    playSound('success');
    saveProgress();
    if (currentMission == 3) unlockBadge('zeroize');
    if (score >= 500) unlockBadge('opsec');
  }
  showScreen('menu-screen');
}

document.getElementById('back-to-menu').onclick = () => { 
  clearInterval(timerInterval); 
  showScreen('menu-screen'); 
};

// === ЗБЕРЕЖЕННЯ ===
async function saveProgress() {
  const data = { score, streak: getStreak(), badges: getBadges(), user: user.login };
  localStorage.setItem(`cyberdrill_${user.login}`, JSON.stringify(data));
  await saveToGist(data);
  updateLeaderboard();
}

async function saveToGist(data) {
  const url = GIST_ID ? `https://api.github.com/gists/${GIST_ID}` : 'https://api.github.com/gists';
  const method = GIST_ID ? 'PATCH' : 'POST';
  const res = await fetch(url, {
    method, 
    headers: { 
      Authorization: `token ${accessToken}`, 
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify({
      description: 'CyberDrill Progress', 
      public: false,
      files: { 'progress.json': { content: JSON.stringify(data) } }
    })
  });
  const json = await res.json();
  if (!GIST_ID) GIST_ID = json.id;
}

function loadProgress() {
  const saved = localStorage.getItem(`cyberdrill_${user.login}`);
  if (saved) {
    const data = JSON.parse(saved);
    score = data.score || 0;
    document.getElementById('score').textContent = score;
    updateStreak();
    updateBadges();
  }
  loadGlobalLeaderboard();
}

// === СТРІК ===
function getStreak() {
  const last = localStorage.getItem('cyberdrill_last') || new Date().toDateString();
  const today = new Date().toDateString();
  if (last === today) return streak;
  localStorage.setItem('cyberdrill_last', today);
  return last === new Date(Date.now() - 86400000).toDateString() ? streak + 1 : 1;
}

function updateStreak() {
  streak = getStreak();
  document.getElementById('streak-count').textContent = streak;
}

// === БЕЙДЖІ ===
function unlockBadge(id) {
  const badges = getBadges();
  if (!badges.includes(id)) {
    badges.push(id);
    localStorage.setItem('cyberdrill_badges', JSON.stringify(badges));
    alert(`Бейдж: ${id === 'zeroize' ? 'Zeroize Master' : 'OPSEC Pro'}!`);
    updateBadges();
  }
}

function getBadges() {
  return JSON.parse(localStorage.getItem('cyberdrill_badges') || '[]');
}

function updateBadges() {
  const badges = getBadges();
  const names = { zeroize: "Zeroize Master", opsec: "OPSEC Pro" };
  const div = document.getElementById('badges');
  div.innerHTML = '<strong>Бейджи:</strong> ' + 
    (badges.map(b => names[b]).filter(Boolean).join(' | ') || 'Немає');
}

// === ЛІДЕРБОРД ===
async function loadGlobalLeaderboard() {
  const res = await fetch('https://api.github.com/gists');
  const gists = await res.json();
  const data = [];
  for (const g of gists) {
    if (g.description === 'CyberDrill Progress' && g.files['progress.json']) {
      const content = await fetch(g.files['progress.json'].raw_url).then(r => r.text());
      const json = JSON.parse(content);
      data.push({ user: json.user, score: json.score || 0 });
    }
  }
  data.sort((a,b) => b.score - a.score);
  const ol = document.getElementById('leaders');
  ol.innerHTML = '';
  data.slice(0,10).forEach(d => {
    const li = document.createElement('li');
    li.textContent = `@${d.user} — ${d.score}`;
    ol.appendChild(li);
  });
}

document.getElementById('leaderboard-btn').onclick = () => { 
  loadGlobalLeaderboard(); 
  showScreen('leaderboard-screen'); 
};
document.getElementById('back-from-leaderboard').onclick = () => showScreen('menu-screen');

// === ЗВУКИ (WAV) ===
function playSound(id) {
  const audio = document.getElementById(id);
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

// === ЩОДЕННИЙ ЧЕЛЕНДЖ (ВИПРАВЛЕНО) ===
document.getElementById('daily-btn').onclick = () => {
  const today = new Date().toDateString();
  const lastDaily = localStorage.getItem('cyberdrill_daily');
  if (lastDaily === today) {
    alert("Челендж вже виконано сьогодні! Повертайся завтра.");
    return;
  }
  alert("ЩОДЕННИЙ ЧЕЛЕНДЖ: Знайди фішинг за 15с! +200 бонусів");
  currentMission = 1;
  localStorage.setItem('cyberdrill_daily', today);
  startMission(1);
};