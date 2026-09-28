// Quiz App Logic
let currentPartIndex = 0;
let currentQuestionIndex = 0;
let userAnswers = {}; // { [partIndex]: { [qIndex]: { selectedKey, isCorrect } } }

// Load saved progress from localStorage
function loadSavedProgress() {
  try {
    const saved = localStorage.getItem('ACCA_F1_QUIZ_PROGRESS');
    if (saved) {
      userAnswers = JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error loading progress:', e);
    userAnswers = {};
  }
}

function saveProgress() {
  try {
    localStorage.setItem('ACCA_F1_QUIZ_PROGRESS', JSON.stringify(userAnswers));
  } catch (e) {
    console.error('Error saving progress:', e);
  }
}

// Confetti Effect
function triggerConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ['#6366f1', '#a855f7', '#ec4899', '#10b981', '#f59e0b', '#06b6d4'];

  for (let i = 0; i < 150; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedY: Math.random() * 5 + 3,
      speedX: Math.random() * 4 - 2,
      rotation: Math.random() * 360,
      rotationSpeed: Math.random() * 10 - 5
    });
  }

  let animationFrame;
  let startTime = Date.now();

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;

    particles.forEach(p => {
      p.y += p.speedY;
      p.x += p.speedX;
      p.rotation += p.rotationSpeed;

      if (p.y < canvas.height) {
        alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
    });

    if (alive && Date.now() - startTime < 4000) {
      animationFrame = requestAnimationFrame(render);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cancelAnimationFrame(animationFrame);
    }
  }

  render();
}

// Global Stats Calculation
function updateGlobalStats() {
  if (!window.QUIZ_DATA) return;
  let totalParts = window.QUIZ_DATA.length;
  let completedParts = 0;
  let totalAnswered = 0;
  let totalCorrect = 0;

  window.QUIZ_DATA.forEach((part, pIdx) => {
    const pAnswers = userAnswers[pIdx] || {};
    const answeredCount = Object.keys(pAnswers).length;
    if (answeredCount >= part.questions.length && part.questions.length > 0) {
      completedParts++;
    }
    totalAnswered += answeredCount;
    Object.values(pAnswers).forEach(ans => {
      if (ans.isCorrect) totalCorrect++;
    });
  });

  const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  document.getElementById('stat-parts').textContent = `${completedParts} / ${totalParts}`;
  document.getElementById('stat-accuracy').textContent = `${accuracy}%`;
}

// Render Dashboard Cards
function renderDashboard() {
  document.getElementById('dashboard-view').style.display = 'block';
  document.getElementById('quiz-view').style.display = 'none';
  document.getElementById('result-view').style.display = 'none';

  const grid = document.getElementById('cards-grid');
  grid.innerHTML = '';

  window.QUIZ_DATA.forEach((partData, idx) => {
    const card = document.createElement('div');
    card.className = 'quiz-card';
    card.onclick = (e) => {
      if (!e.target.closest('.btn-pdf')) {
        startQuiz(idx);
      }
    };

    const pAnswers = userAnswers[idx] || {};
    const totalQ = partData.questions.length;
    const answeredCount = Object.keys(pAnswers).length;
    let correctCount = 0;
    Object.values(pAnswers).forEach(a => { if (a.isCorrect) correctCount++; });

    const percent = totalQ > 0 ? Math.round((answeredCount / totalQ) * 100) : 0;
    const isCompleted = answeredCount >= totalQ;

    card.innerHTML = `
      <div>
        <div class="card-top">
          <span class="card-part-tag">${partData.title}</span>
          <span class="card-count-badge">📝 ${totalQ} câu</span>
        </div>
        <h3 class="card-title">${partData.name}</h3>
        <p class="card-range">Phạm vi câu hỏi: ${partData.question_range}</p>
        
        <div class="card-progress-box">
          <div class="progress-info">
            <span>${isCompleted ? 'Hoàn thành' : (answeredCount > 0 ? 'Đang làm dở' : 'Chưa làm')}</span>
            <span>${answeredCount}/${totalQ} câu ${isCompleted ? `(${correctCount}/${totalQ} đúng)` : ''}</span>
          </div>
          <div class="progress-bar-track">
            <div class="progress-bar-fill" style="width: ${percent}%;"></div>
          </div>
        </div>
      </div>

      <div class="card-bottom-actions">
        <button class="btn-start" onclick="startQuiz(${idx})">
          ${isCompleted ? '🔄 Làm lại' : (answeredCount > 0 ? '▶ Tiếp tục' : '🚀 Bắt đầu ôn tập')}
        </button>
        ${partData.pdf_file ? `
        <a href="${partData.pdf_file}" target="_blank" class="btn-pdf" title="Xem / Tải file PDF của phần này">
          📄 PDF
        </a>` : ''}
      </div>
    `;

    grid.appendChild(card);
  });

  updateGlobalStats();
}

// Start Quiz for a Part
function startQuiz(partIndex) {
  currentPartIndex = partIndex;
  currentQuestionIndex = 0;

  document.getElementById('dashboard-view').style.display = 'none';
  document.getElementById('result-view').style.display = 'none';
  document.getElementById('quiz-view').style.display = 'block';

  const partData = window.QUIZ_DATA[currentPartIndex];
  document.getElementById('quiz-part-title').textContent = partData.name ? `${partData.title}: ${partData.name}` : partData.title;

  renderQuestionNavigator();
  showQuestion(0);
}

// Render Question Navigation Grid (1 to 20)
function renderQuestionNavigator() {
  const container = document.getElementById('nav-grid-items');
  container.innerHTML = '';

  const partData = window.QUIZ_DATA[currentPartIndex];
  const pAnswers = userAnswers[currentPartIndex] || {};

  partData.questions.forEach((q, idx) => {
    const btn = document.createElement('div');
    btn.className = 'nav-item';
    btn.textContent = idx + 1;
    btn.id = `nav-item-${idx}`;

    if (pAnswers[idx]) {
      btn.classList.add(pAnswers[idx].isCorrect ? 'correct' : 'wrong');
    }

    if (idx === currentQuestionIndex) {
      btn.classList.add('current');
    }

    btn.onclick = () => showQuestion(idx);
    container.appendChild(btn);
  });
}

let pendingSelections = [];

function getCorrectKeys(qData) {
  if (Array.isArray(qData.correct_answer)) {
    return qData.correct_answer.map(k => String(k).trim().toUpperCase());
  }
  if (typeof qData.correct_answer === 'string') {
    return qData.correct_answer.split(',').map(k => k.trim().toUpperCase());
  }
  return [String(qData.correct_answer).trim().toUpperCase()];
}

// Display Question
function showQuestion(qIdx) {
  currentQuestionIndex = qIdx;
  pendingSelections = [];
  const partData = window.QUIZ_DATA[currentPartIndex];
  const qData = partData.questions[qIdx];
  const pAnswers = userAnswers[currentPartIndex] || {};
  const answered = pAnswers[qIdx];
  const correctKeys = getCorrectKeys(qData);
  const isMulti = correctKeys.length > 1;

  // Update current in navigator
  document.querySelectorAll('.nav-item').forEach((item, idx) => {
    item.classList.toggle('current', idx === qIdx);
  });

  document.getElementById('quiz-q-counter').textContent = `Câu ${qIdx + 1} / ${partData.questions.length} (Mã câu: #${qData.id})`;

  // Question badge
  const badgeEl = document.getElementById('q-type-badge');
  if (qData.has_image && qData.diagram_file) {
    badgeEl.className = 'q-badge diagram';
    badgeEl.textContent = qData.badge_text || '📊 Câu hỏi có Sơ đồ / Bảng dữ liệu';
  } else if (isMulti) {
    badgeEl.className = 'q-badge multi';
    badgeEl.textContent = `🎯 Chọn ${correctKeys.length} đáp án đúng`;
  } else {
    badgeEl.className = 'q-badge';
    badgeEl.textContent = '📝 Trắc nghiệm';
  }

  // Question Prompt
  document.getElementById('q-prompt-text').textContent = `${qData.id}. ${qData.question_text || ''}`;

  // Question Image Container: ONLY show if question strictly requires an image
  const imgBox = document.getElementById('q-img-box');
  const imgEl = document.getElementById('q-img-element');
  const imgSrc = (qData.has_image && qData.diagram_file) ? qData.diagram_file : null;

  if (imgSrc) {
    imgBox.style.display = 'block';
    imgEl.src = imgSrc;
    document.getElementById('btn-zoom-img').onclick = () => openLightbox(imgSrc);
  } else {
    imgBox.style.display = 'none';
    imgEl.src = '';
  }

  // Options List
  const optionsList = document.getElementById('options-container');
  optionsList.innerHTML = '';

  const opts = qData.options && qData.options.length > 0 ? qData.options : [
    { key: 'A', text: 'Đáp án A' },
    { key: 'B', text: 'Đáp án B' },
    { key: 'C', text: 'Đáp án C' },
    { key: 'D', text: 'Đáp án D' }
  ];

  const userSelected = answered 
    ? (Array.isArray(answered.selectedKeys) ? answered.selectedKeys : (answered.selectedKey ? [answered.selectedKey] : []))
    : [];

  opts.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.dataset.key = opt.key;

    btn.innerHTML = `
      <span class="opt-key">${opt.key}</span>
      <span class="opt-text">${opt.text}</span>
    `;

    if (answered) {
      btn.classList.add('disabled');
      if (correctKeys.includes(opt.key)) {
        btn.classList.add('is-correct-target');
        if (userSelected.includes(opt.key)) {
          btn.classList.add('selected-correct');
        }
      } else if (userSelected.includes(opt.key)) {
        btn.classList.add('selected-wrong');
      }
    } else {
      btn.onclick = () => selectAnswer(opt.key);
    }

    optionsList.appendChild(btn);
  });

  // Explanation
  const expBox = document.getElementById('explanation-card');
  if (answered) {
    expBox.style.display = 'block';
    let correctText = '';
    if (qData.options) {
      const matchOpts = qData.options.filter(o => correctKeys.includes(o.key));
      if (matchOpts.length > 0) {
        correctText = matchOpts.map(o => o.text).join('<br>');
      }
    }
    if (!correctText) correctText = correctKeys.join(', ');

    expBox.innerHTML = `
      <div style="font-size: 1.05rem; font-weight: 700; color: #10b981; margin-bottom: 6px;">
        ✓ Đáp án đúng:<br>${correctText}
      </div>
      <div id="exp-text" style="line-height: 1.6; color: #e2e8f0; font-size: 0.95rem;">
        ${qData.explanation || 'Đáp án đã được đối soát chính xác theo đề thi gốc.'}
      </div>
    `;
  } else {
    expBox.style.display = 'none';
  }

  // Footer Actions
  document.getElementById('btn-prev-q').style.visibility = qIdx > 0 ? 'visible' : 'hidden';

  const nextBtn = document.getElementById('btn-next-q');
  if (qIdx === partData.questions.length - 1) {
    nextBtn.textContent = '🏁 Hoàn thành phần này';
    nextBtn.onclick = finishPart;
  } else {
    nextBtn.textContent = 'Câu tiếp theo →';
    nextBtn.onclick = () => showQuestion(qIdx + 1);
  }
}

// User selects an answer
function selectAnswer(key) {
  const partData = window.QUIZ_DATA[currentPartIndex];
  const qData = partData.questions[currentQuestionIndex];
  const correctKeys = getCorrectKeys(qData);

  if (!userAnswers[currentPartIndex]) {
    userAnswers[currentPartIndex] = {};
  }

  if (correctKeys.length > 1) {
    // Multi-select mode
    const idx = pendingSelections.indexOf(key);
    if (idx >= 0) {
      pendingSelections.splice(idx, 1);
    } else {
      pendingSelections.push(key);
    }

    // Toggle pending visual class
    document.querySelectorAll('.option-btn').forEach(btn => {
      const k = btn.dataset.key;
      btn.classList.toggle('selected-pending', pendingSelections.includes(k));
    });

    // Check if user has chosen all required selections
    if (pendingSelections.length === correctKeys.length) {
      const isCorrect = (
        pendingSelections.length === correctKeys.length &&
        pendingSelections.every(k => correctKeys.includes(k))
      );

      userAnswers[currentPartIndex][currentQuestionIndex] = {
        selectedKeys: [...pendingSelections],
        selectedKey: pendingSelections[0],
        isCorrect: isCorrect
      };

      saveProgress();

      const navItem = document.getElementById(`nav-item-${currentQuestionIndex}`);
      if (navItem) {
        navItem.classList.add(isCorrect ? 'correct' : 'wrong');
      }

      showQuestion(currentQuestionIndex);
      updateGlobalStats();
    }
  } else {
    // Single-select mode
    const isCorrect = (key === correctKeys[0]);

    userAnswers[currentPartIndex][currentQuestionIndex] = {
      selectedKey: key,
      selectedKeys: [key],
      isCorrect: isCorrect
    };

    saveProgress();

    const navItem = document.getElementById(`nav-item-${currentQuestionIndex}`);
    if (navItem) {
      navItem.classList.add(isCorrect ? 'correct' : 'wrong');
    }

    showQuestion(currentQuestionIndex);
    updateGlobalStats();
  }
}

// Previous question
function prevQuestion() {
  if (currentQuestionIndex > 0) {
    showQuestion(currentQuestionIndex - 1);
  }
}

// Finish current part & show celebration view
function finishPart() {
  document.getElementById('quiz-view').style.display = 'none';
  document.getElementById('result-view').style.display = 'block';

  const partData = window.QUIZ_DATA[currentPartIndex];
  const pAnswers = userAnswers[currentPartIndex] || {};
  const total = partData.questions.length;
  let correct = 0;

  Object.values(pAnswers).forEach(a => { if (a.isCorrect) correct++; });
  const wrong = Object.keys(pAnswers).length - correct;
  const skipped = total - Object.keys(pAnswers).length;
  const percent = Math.round((correct / total) * 100);

  document.getElementById('result-part-name').textContent = `${partData.title} (${partData.name})`;
  document.getElementById('result-score-num').textContent = `${correct}`;
  document.getElementById('result-score-total').textContent = `/${total} câu đúng`;
  document.getElementById('r-stat-correct').textContent = correct;
  document.getElementById('r-stat-wrong').textContent = wrong;
  document.getElementById('r-stat-percent').textContent = `${percent}%`;

  // Tailored congratulation & encouragement message
  const msgEl = document.getElementById('result-encouragement-msg');
  if (percent >= 80) {
    msgEl.innerHTML = `🎉 <strong>Xuất sắc tuyệt vời!</strong> Bạn đạt <strong>${percent}%</strong>, kiến thức phần này của bạn cực kỳ vững vàng. Hãy tiếp tục duy trì phong độ đỉnh cao này ở phần tiếp theo nhé!`;
    triggerConfetti();
  } else if (percent >= 50) {
    msgEl.innerHTML = `👏 <strong>Khá tốt!</strong> Bạn đạt <strong>${percent}%</strong>. Bạn đã nắm được đa số kiến thức trọng tâm. Hãy xem lại những câu làm chưa đúng để đạt điểm số tối đa nhé!`;
  } else {
    msgEl.innerHTML = `💪 <strong>Cố gắng lên!</strong> Bạn đạt <strong>${percent}%</strong>. Đừng nản lòng, việc xem kỹ lại lời giải chi tiết và làm lại lần 2 sẽ giúp bạn ghi nhớ rất nhanh!`;
  }

  // Next part button
  const nextPartBtn = document.getElementById('btn-next-part');
  if (currentPartIndex < window.QUIZ_DATA.length - 1) {
    nextPartBtn.style.display = 'block';
    nextPartBtn.textContent = `Tiếp tục sang Phần ${currentPartIndex + 2} →`;
    nextPartBtn.onclick = () => startQuiz(currentPartIndex + 1);
  } else {
    nextPartBtn.style.display = 'none';
  }
}

// Lightbox
function openLightbox(src) {
  const modal = document.getElementById('lightbox-modal');
  const img = document.getElementById('lightbox-img');
  img.src = src;
  modal.style.display = 'flex';
}

function closeLightbox() {
  document.getElementById('lightbox-modal').style.display = 'none';
}

// Keyboard navigation
window.addEventListener('keydown', e => {
  const quizVisible = document.getElementById('quiz-view').style.display === 'block';
  if (!quizVisible) return;

  const key = e.key.toUpperCase();
  if (['A', 'B', 'C', 'D'].includes(key)) {
    const pAnswers = userAnswers[currentPartIndex] || {};
    if (!pAnswers[currentQuestionIndex]) {
      selectAnswer(key);
    }
  } else if (e.key === 'ArrowRight') {
    const partData = window.QUIZ_DATA[currentPartIndex];
    if (currentQuestionIndex < partData.questions.length - 1) {
      showQuestion(currentQuestionIndex + 1);
    }
  } else if (e.key === 'ArrowLeft') {
    if (currentQuestionIndex > 0) {
      showQuestion(currentQuestionIndex - 1);
    }
  }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  loadSavedProgress();
  if (window.QUIZ_DATA && window.QUIZ_DATA.length > 0) {
    renderDashboard();
  } else {
    console.error('window.QUIZ_DATA is not defined!');
  }
});
