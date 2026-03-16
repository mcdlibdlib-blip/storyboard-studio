// =====================
// STATE
// =====================
const state = {
  apiKey:     localStorage.getItem('sb_api_key') || '',
  openaiKey:  localStorage.getItem('sb_openai_key') || '',
  images: [],           // Array of { file, dataUrl }
  analysisResult: null, // Parsed analysis JSON
  storyboard: null,     // Parsed storyboard JSON
};

// =====================
// DOM REFS
// =====================
const $ = id => document.getElementById(id);

const apiModal          = $('apiModal');
const apiKeyInput       = $('apiKeyInput');
const btnSettings       = $('btnSettings');
const btnSaveApi        = $('btnSaveApi');
const btnCancelApi      = $('btnCancelApi');
const uploadArea        = $('uploadArea');
const fileInput         = $('fileInput');
const uploadPlaceholder = $('uploadPlaceholder');
const previewGrid       = $('previewGrid');
const btnAnalyze        = $('btnAnalyze');
const analysisResult    = $('analysisResult');
const btnToStep2        = $('btnToStep2');
const sectionUpload     = $('sectionUpload');
const sectionBrief      = $('sectionBrief');
const sectionStoryboard = $('sectionStoryboard');
const analysisBadge     = $('analysisBadge');
const btnBackToStep1    = $('btnBackToStep1');
const btnGenerate       = $('btnGenerate');
const scenesContainer   = $('scenesContainer');
const styleBar          = $('styleBar');
const directionCard     = $('directionCard');
const directionContent  = $('directionContent');
const sbSubtitle        = $('sbSubtitle');
const btnRegenerate     = $('btnRegenerate');
const btnNewProject     = $('btnNewProject');
const step1Ind          = $('step1Indicator');
const step2Ind          = $('step2Indicator');
const step3Ind          = $('step3Indicator');
const toast             = $('toast');

// =====================
// TOAST
// =====================
let toastTimer;
function showToast(msg, type = '') {
  toast.textContent = msg;
  toast.className = 'toast show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.className = 'toast'; }, 3500);
}

// =====================
// API KEY MODAL
// =====================
function openApiModal() {
  apiKeyInput.value = state.apiKey;
  $('openaiKeyInput').value = state.openaiKey;
  apiModal.classList.add('open');
  apiKeyInput.focus();
}

function closeApiModal() { apiModal.classList.remove('open'); }

btnSettings.addEventListener('click', openApiModal);
btnCancelApi.addEventListener('click', closeApiModal);
apiModal.addEventListener('click', e => { if (e.target === apiModal) closeApiModal(); });

btnSaveApi.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (!key) { showToast('Anthropic API 키를 입력하세요', 'error'); return; }
  if (!key.startsWith('sk-')) { showToast('올바른 Anthropic API 키 형식이 아닙니다', 'error'); return; }
  state.apiKey = key;
  localStorage.setItem('sb_api_key', key);

  const openaiKey = $('openaiKeyInput').value.trim();
  state.openaiKey = openaiKey;
  if (openaiKey) localStorage.setItem('sb_openai_key', openaiKey);
  else localStorage.removeItem('sb_openai_key');

  closeApiModal();
  showToast('API 키가 저장되었습니다', 'success');
});

// Auto-open modal if no key saved
if (!state.apiKey) setTimeout(openApiModal, 600);

// =====================
// IMAGE UPLOAD
// =====================
uploadArea.addEventListener('click', e => {
  if (e.target.classList.contains('preview-remove')) return;
  fileInput.click();
});

uploadArea.addEventListener('dragover', e => {
  e.preventDefault();
  uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));

uploadArea.addEventListener('drop', e => {
  e.preventDefault();
  uploadArea.classList.remove('dragover');
  handleFiles(Array.from(e.dataTransfer.files));
});

fileInput.addEventListener('change', () => {
  handleFiles(Array.from(fileInput.files));
  fileInput.value = '';
});

function handleFiles(files) {
  const imageFiles = files.filter(f => f.type.startsWith('image/'));
  if (!imageFiles.length) { showToast('이미지 파일만 업로드 가능합니다', 'error'); return; }

  const remaining = 3 - state.images.length;
  if (remaining <= 0) { showToast('최대 3장까지 업로드 가능합니다', 'error'); return; }

  imageFiles.slice(0, remaining).forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      state.images.push({ file, dataUrl: e.target.result });
      renderPreviews();
      updateAnalyzeBtn();
    };
    reader.readAsDataURL(file);
  });

  if (imageFiles.length > remaining) {
    showToast(`최대 3장까지 가능합니다. ${remaining}장만 추가됩니다.`, '');
  }
}

function renderPreviews() {
  previewGrid.innerHTML = '';
  uploadPlaceholder.style.display = state.images.length ? 'none' : 'flex';

  state.images.forEach((img, i) => {
    const item = document.createElement('div');
    item.className = 'preview-item';
    item.innerHTML = `
      <img src="${img.dataUrl}" alt="preview ${i + 1}" />
      <button class="preview-remove" data-index="${i}" title="제거">✕</button>
    `;
    previewGrid.appendChild(item);
  });

  previewGrid.querySelectorAll('.preview-remove').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      state.images.splice(parseInt(btn.dataset.index), 1);
      renderPreviews();
      updateAnalyzeBtn();
    });
  });
}

function updateAnalyzeBtn() {
  btnAnalyze.disabled = state.images.length === 0;
}

// =====================
// STEP NAVIGATION
// =====================
function goToStep(n) {
  sectionUpload.hidden     = n !== 1;
  sectionBrief.hidden      = n !== 2;
  sectionStoryboard.hidden = n !== 3;

  step1Ind.className = 'step' + (n === 1 ? ' active' : ' done');
  step2Ind.className = 'step' + (n === 2 ? ' active' : n > 2 ? ' done' : '');
  step3Ind.className = 'step' + (n === 3 ? ' active' : '');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

btnToStep2.addEventListener('click', () => goToStep(2));
btnBackToStep1.addEventListener('click', () => goToStep(1));

// =====================
// CATEGORY SELECTION
// =====================
const CATEGORY_META = {
  emotional:  { name: '감성적',           guide: '잔잔하고 서정적인 감동 중심. 느린 컷, 자연광, 감성적 음악. 감정이입과 공감을 극대화하는 연출.' },
  humor:      { name: '유머 & 위트',       guide: '재치있는 상황 설정과 반전. 밝고 경쾌한 컷 편집, 코믹한 타이밍과 카피. 바이럴 가능성을 고려한 연출.' },
  energetic:  { name: '에너지 & 다이나믹', guide: '빠른 컷 편집, 역동적인 카메라 무브먼트, 강렬한 비트 음악. 속도감과 흥분감을 극대화.' },
  visual:     { name: '비주얼 임팩트',     guide: '압도적인 화면 구성, 강렬한 색감 대비, 시각적 충격. 매 씬이 독립적인 아트워크처럼 기억에 남도록 연출.' },
  luxury:     { name: '럭셔리 & 프리미엄', guide: '절제된 색감(모노크롬·골드), 느린 슬로모션, 미니멀한 카피. 침묵과 여백을 활용한 우아한 연출.' },
  lifestyle:  { name: '라이프스타일',      guide: '자연스럽고 따뜻한 일상 장면. 핸드헬드 카메라, 자연광, 실제 공간. 진정성 있는 스토리텔링.' },
  cinematic:  { name: '시네마틱',          guide: '영화적 조명과 구도, 강한 내러티브 흐름. 인물 중심 드라마와 감정 아크. 영화 예고편 스타일의 연출.' },
  minimal:    { name: '미니멀 & 심플',     guide: '흰 공간과 단색 배경, 텍스트 중심 구성. 복잡함을 걷어낸 명료한 메시지 전달. 모던하고 지적인 톤.' },
};

const selectedCategories = new Set();

document.getElementById('categoryGrid').addEventListener('click', e => {
  const card = e.target.closest('.cat-card');
  if (!card) return;
  const id = card.dataset.id;
  if (selectedCategories.has(id)) {
    selectedCategories.delete(id);
    card.classList.remove('selected');
  } else {
    selectedCategories.add(id);
    card.classList.add('selected');
  }
});

// =====================
// CLAUDE API
// =====================
async function callClaude(messages, system = '', maxTokens = 4096) {
  if (!state.apiKey) { openApiModal(); throw new Error('API 키가 필요합니다'); }

  const body = {
    model: 'claude-opus-4-6',
    max_tokens: maxTokens,
    messages,
  };
  if (system) body.system = system;

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': state.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    const msg = err.error?.message || `API 오류 (${resp.status})`;
    if (resp.status === 401) throw new Error('API 키가 유효하지 않습니다. 설정을 확인해주세요.');
    throw new Error(msg);
  }

  const data = await resp.json();
  return data.content.find(b => b.type === 'text')?.text || '';
}

function extractJSON(text) {
  // 1. Try markdown code block
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) {
    try { return JSON.parse(codeBlock[1].trim()); } catch (e) { /* fall through */ }
  }
  // 2. Try first complete JSON object (greedy match from first { to last })
  const firstBrace = text.indexOf('{');
  const lastBrace  = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try { return JSON.parse(text.slice(firstBrace, lastBrace + 1)); } catch (e) { /* fall through */ }
  }
  // 3. Last resort
  try { return JSON.parse(text.trim()); } catch (e) {
    throw new Error('AI 응답을 파싱할 수 없습니다. 다시 시도해주세요.');
  }
}

// =====================
// STEP 1: ANALYZE IMAGES
// =====================
function setBtnLoading(btn, loading) {
  btn.querySelector('.btn-text').hidden = loading;
  btn.querySelector('.btn-loader').hidden = !loading;
  btn.disabled = loading;
}

// =====================
// GENERATION TIMER
// =====================
let genTimerInterval = null;

// Estimated durations per video length (seconds) — conservative upper bounds
const EST_DURATION = { '15초': 35, '30초': 50, '60초': 65, '3분': 80 };

function startGenTimer(duration) {
  const totalSec   = EST_DURATION[duration] || 50;
  const startTime  = Date.now();
  const timerEl    = $('genTimer');
  const progressEl = $('genProgress');
  const barEl      = $('genProgressBar');
  const timeLeftEl = $('genTimeLeft');
  const statusEl   = $('genStatus');

  const statusMessages = [
    '스타일 가이드 분석 중...',
    '씬 구성을 설계하고 있습니다...',
    'AI가 각 씬을 작성하고 있습니다...',
    '카피와 아트 디렉션을 다듬는 중...',
    '마무리 작업 중...',
  ];

  progressEl.hidden = false;
  barEl.style.setProperty('--pct', '0%');

  genTimerInterval = setInterval(() => {
    const elapsed = (Date.now() - startTime) / 1000;

    // Asymptotic progress: approaches 90% quickly, then slows dramatically
    // Never freezes at a fixed value — always keeps moving
    const pct = 1 - Math.exp(-elapsed / (totalSec * 0.6));
    const displayPct = Math.min(pct * 92, 92); // cap at 92% until actually done

    barEl.style.setProperty('--pct', displayPct.toFixed(1) + '%');

    // Elapsed timer in button
    timerEl.textContent = `(${Math.floor(elapsed)}s)`;

    // Time remaining: only show estimate while we're still within range
    const left = Math.ceil(totalSec - elapsed);
    if (left > 5) {
      timeLeftEl.textContent = `약 ${left}초 남음`;
    } else if (left > 0) {
      timeLeftEl.textContent = '거의 다 됐어요...';
    } else {
      timeLeftEl.textContent = '응답 대기 중...';
    }

    // Status message cycles based on real elapsed time, not estimated pct
    const phase = Math.min(Math.floor(elapsed / (totalSec / statusMessages.length)), statusMessages.length - 1);
    statusEl.textContent = statusMessages[phase];
  }, 500);
}

function stopGenTimer() {
  if (genTimerInterval) {
    clearInterval(genTimerInterval);
    genTimerInterval = null;
  }
  // Fill bar to 100%
  const barEl = $('genProgressBar');
  if (barEl) barEl.style.setProperty('--pct', '100%');
  setTimeout(() => {
    const progressEl = $('genProgress');
    if (progressEl) progressEl.hidden = true;
    const timerEl = $('genTimer');
    if (timerEl) timerEl.textContent = '';
  }, 600);
}

// =====================
// COMPLETION SOUND
// =====================
function playCompletionSound() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [
      { freq: 523.25, start: 0,    dur: 0.15 }, // C5
      { freq: 659.25, start: 0.15, dur: 0.15 }, // E5
      { freq: 783.99, start: 0.30, dur: 0.25 }, // G5
    ];
    notes.forEach(({ freq, start, dur }) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.05);
    });
  } catch (e) {
    // AudioContext not available — ignore silently
  }
}

btnAnalyze.addEventListener('click', async () => {
  if (!state.images.length) return;

  setBtnLoading(btnAnalyze, true);
  analysisResult.hidden = true;

  try {
    const content = [];

    state.images.forEach((img, i) => {
      const [header, data] = img.dataUrl.split(',');
      const mediaType = header.match(/:(.*?);/)[1];
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: mediaType, data },
      });
      if (i < state.images.length - 1) {
        content.push({ type: 'text', text: `이미지 ${i + 1} 분석 완료. 다음 이미지:` });
      }
    });

    content.push({
      type: 'text',
      text: `위 이미지(들)를 분석하여 다음 JSON 형식으로 결과를 반환해주세요.

\`\`\`json
{
  "colors": {
    "palette": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
    "dominant": "#hex",
    "description": "컬러 팔레트 설명 (2-3문장)"
  },
  "art_style": {
    "tags": ["태그1", "태그2", "태그3"],
    "description": "아트 스타일 설명 (2-3문장)"
  },
  "tone_manner": {
    "tags": ["태그1", "태그2", "태그3"],
    "description": "톤앤매너 설명 (2-3문장)"
  },
  "mood": {
    "description": "감성과 무드 설명 (3-4문장)"
  },
  "summary": "전체 비주얼 아이덴티티 요약 및 광고 스토리보드 제작을 위한 스타일 가이드 (4-5문장)"
}
\`\`\`

반드시 JSON 코드 블록만 반환하세요.`,
    });

    const rawText = await callClaude(
      [{ role: 'user', content }],
      '당신은 광고 크리에이티브 디렉터이자 시각 분석 전문가입니다. 이미지의 컬러 팔레트, 아트 스타일, 톤앤매너를 정밀 분석합니다. 반드시 JSON만 응답하세요.'
    );

    state.analysisResult = extractJSON(rawText);
    renderAnalysisResult(state.analysisResult);
    analysisResult.hidden = false;

    setTimeout(() => analysisResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 150);

  } catch (err) {
    console.error(err);
    showToast('분석 실패: ' + err.message, 'error');
  } finally {
    setBtnLoading(btnAnalyze, false);
    updateAnalyzeBtn();
  }
});

function renderAnalysisResult(r) {
  // Color swatches
  const swatchesEl = $('colorSwatches');
  swatchesEl.innerHTML = '';
  (r.colors?.palette || []).forEach(hex => {
    const s = document.createElement('div');
    s.className = 'swatch';
    s.style.background = hex;
    s.innerHTML = `<span class="swatch-tooltip">${hex}</span>`;
    swatchesEl.appendChild(s);
  });
  $('colorText').textContent = r.colors?.description || '';

  // Art style
  $('artTags').innerHTML = (r.art_style?.tags || []).map(t => `<span class="tag">${t}</span>`).join('');
  $('artText').textContent = r.art_style?.description || '';

  // Tone & Manner
  $('toneTags').innerHTML = (r.tone_manner?.tags || []).map(t => `<span class="tag">${t}</span>`).join('');
  $('toneText').textContent = r.tone_manner?.description || '';

  // Mood
  $('moodText').textContent = r.mood?.description || '';

  // Summary
  $('resultSummary').textContent = r.summary || '';

  // Analysis badge for step 2
  const allTags = [...(r.art_style?.tags || []), ...(r.tone_manner?.tags || [])].slice(0, 5);
  analysisBadge.textContent = `분석 완료: ${allTags.join(' · ')}`;
}

// =====================
// STEP 2: GENERATE STORYBOARD
// =====================
btnGenerate.addEventListener('click', async () => {
  const product = $('productName').value.trim();
  const message = $('coreMessage').value.trim();

  if (!selectedCategories.size) { showToast('광고 무드를 하나 이상 선택해주세요', 'error'); document.getElementById('categoryGrid').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
  if (!product) { showToast('제품/서비스명을 입력해주세요', 'error'); $('productName').focus(); return; }
  if (!message) { showToast('핵심 메시지를 입력해주세요', 'error'); $('coreMessage').focus(); return; }

  setBtnLoading(btnGenerate, true);
  const duration = $('adDuration').value;
  startGenTimer(duration);

  try {
    const target   = $('targetAudience').value.trim();
    const notes    = $('extraNotes').value.trim();
    const r        = state.analysisResult;
    const styleGuide = r ? `
**분석된 비주얼 스타일:**
- 컬러 팔레트: ${r.colors?.palette?.join(', ')} — ${r.colors?.description}
- 아트 스타일: ${r.art_style?.tags?.join(', ')} — ${r.art_style?.description}
- 톤앤매너: ${r.tone_manner?.tags?.join(', ')} — ${r.tone_manner?.description}
- 무드: ${r.mood?.description}
- 스타일 가이드: ${r.summary}
` : '(레퍼런스 이미지 없음)';

    const sceneCount = duration === '15초' ? 4 : duration === '30초' ? 6 : duration === '60초' ? 8 : 10;

    const categoryGuide = [...selectedCategories]
      .map(id => `- ${CATEGORY_META[id].name}: ${CATEGORY_META[id].guide}`)
      .join('\n');

    const prompt = `다음 광고 정보를 바탕으로 ${sceneCount}개 씬의 스토리보드를 생성하세요.

**광고 정보:**
- 제품/서비스: ${product}
- 핵심 메시지: ${message}
- 타겟 오디언스: ${target || '미정'}
- 영상 길이: ${duration}
- 추가 요청: ${notes || '없음'}

**선택된 광고 무드 (반드시 이 방향성을 스토리보드 전체에 일관되게 반영하세요):**
${categoryGuide}

${styleGuide}

반드시 아래 JSON 형식으로만 응답하세요:

\`\`\`json
{
  "title": "광고 제목",
  "concept": "광고 컨셉 한 줄 설명",
  "style_keywords": ["키워드1", "키워드2", "키워드3", "키워드4"],
  "scenes": [
    {
      "number": 1,
      "title": "씬 제목",
      "duration": "0:00-0:05",
      "shot_type": "와이드샷",
      "visual_description": "화면 묘사 (2-3문장)",
      "camera_movement": "카메라 무브먼트",
      "lighting": "조명",
      "color_direction": ["#hex1", "#hex2"],
      "copy": "카피 텍스트 또는 없음",
      "narration": "나레이션 또는 없음",
      "sound": "사운드 설명",
      "emotion": "전달 감정",
      "art_direction": "아트 디렉션 노트"
    }
  ],
  "direction": {
    "overall_mood": "전체 무드",
    "color_grade": "컬러 그레이딩",
    "music_direction": "음악 방향",
    "pacing": "편집 페이싱",
    "key_visual": "핵심 비주얼"
  }
}
\`\`\``;

    const rawText = await callClaude(
      [{ role: 'user', content: prompt }],
      '당신은 15년 경력의 광고 크리에이티브 디렉터입니다. 브랜드 비주얼 아이덴티티를 완벽히 반영한 감각적이고 구체적인 스토리보드를 작성합니다. 반드시 JSON만 응답하세요.',
      8192
    );

    state.storyboard = extractJSON(rawText);
    stopGenTimer();
    playCompletionSound();
    goToStep(3);
    renderStoryboard(state.storyboard, product, duration);
    // Generate illustrations asynchronously after cards are rendered
    generateSceneIllustrations(state.storyboard.scenes);

  } catch (err) {
    console.error('[생성 오류]', err);
    stopGenTimer();
    const msg = err.message || '알 수 없는 오류';
    showToast('생성 실패: ' + msg, 'error');
  } finally {
    setBtnLoading(btnGenerate, false);
  }
});

// =====================
// RENDER STORYBOARD
// =====================
function renderStoryboard(sb, productName, duration) {
  sbSubtitle.textContent = `${productName} · ${duration} · ${sb.concept || ''}`;

  // Style tags bar
  styleBar.innerHTML = '';

  // Selected mood categories first
  [...selectedCategories].forEach(id => {
    const el = document.createElement('span');
    el.className = 'tag tag-mood';
    el.textContent = CATEGORY_META[id]?.name || id;
    styleBar.appendChild(el);
  });

  (sb.style_keywords || []).forEach(k => {
    const el = document.createElement('span');
    el.className = 'tag';
    el.textContent = k;
    styleBar.appendChild(el);
  });

  if (state.analysisResult) {
    const r = state.analysisResult;
    [...(r.art_style?.tags || []), ...(r.tone_manner?.tags || [])].forEach(t => {
      const el = document.createElement('span');
      el.className = 'tag';
      el.style.opacity = '0.5';
      el.textContent = t;
      styleBar.appendChild(el);
    });
  }

  // Scene cards
  scenesContainer.innerHTML = '';
  (sb.scenes || []).forEach(scene => scenesContainer.appendChild(createSceneCard(scene)));

  // Direction guide
  if (sb.direction) {
    const d = sb.direction;
    directionContent.innerHTML = `
      <div class="direction-grid">
        ${[
          ['전체 무드', d.overall_mood],
          ['컬러 그레이딩', d.color_grade],
          ['음악 방향', d.music_direction],
          ['편집 페이싱', d.pacing],
          ['핵심 비주얼', d.key_visual],
        ].map(([h, v]) => v ? `
          <div class="direction-item">
            <h5>${h}</h5>
            <p>${v}</p>
          </div>` : '').join('')}
      </div>`;
    directionCard.hidden = false;
  }
}

function createSceneCard(scene) {
  const shotType  = scene.shot_type || '';
  const shotClass = shotType.includes('와이드') ? 'wide'
    : shotType.includes('클로즈') ? 'close'
    : shotType.includes('미디엄') ? 'medium'
    : 'other';

  const colors    = scene.color_direction || [];
  const colorDots = colors.map(c => `<div class="scene-color" style="background:${c}" title="${c}"></div>`).join('');
  const svgArt    = generateSceneArt(scene, shotClass);

  const card = document.createElement('div');
  card.className = 'scene-card';
  card.innerHTML = `
    <div class="scene-header">
      <div class="scene-num">${scene.number || '?'}</div>
      <div class="scene-title">${scene.title || `씬 ${scene.number}`}</div>
      <div class="scene-time">${scene.duration || ''}</div>
    </div>
    <div class="scene-body">
      <div class="scene-visual">
        <div class="scene-visual-frame" data-scene="${scene.number}">${svgArt}</div>
        <div class="scene-shot-info">
          <span class="shot-badge ${shotClass}">${shotType || '샷 미정'}</span>
          ${scene.camera_movement ? `<span class="shot-badge other">${scene.camera_movement}</span>` : ''}
        </div>
        ${colors.length ? `<div class="scene-colors">${colorDots}</div>` : ''}
      </div>
      <div class="scene-details">
        <div class="detail-row">
          <span class="detail-label">비주얼</span>
          <span class="detail-value">${scene.visual_description || '-'}</span>
        </div>
        ${scene.copy && scene.copy !== '없음' ? `
        <div class="detail-row highlight">
          <span class="detail-label">카피</span>
          <span class="detail-value">"${scene.copy}"</span>
        </div>` : ''}
        ${scene.narration && scene.narration !== '없음' ? `
        <div class="detail-row">
          <span class="detail-label">나레이션</span>
          <span class="detail-value">${scene.narration}</span>
        </div>` : ''}
        <div class="detail-row">
          <span class="detail-label">사운드</span>
          <span class="detail-value">${scene.sound || '-'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">조명</span>
          <span class="detail-value">${scene.lighting || '-'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">감정</span>
          <span class="detail-value">${scene.emotion || '-'}</span>
        </div>
        ${scene.art_direction ? `
        <div class="detail-row">
          <span class="detail-label">아트 디렉션</span>
          <span class="detail-value">${scene.art_direction}</span>
        </div>` : ''}
      </div>
    </div>`;
  return card;
}

// =====================
// AI ILLUSTRATION GENERATION (DALL-E 3)
// =====================
async function generateSceneIllustrations(scenes) {
  // All frames to loading state
  scenes.forEach(s => {
    const frame = document.querySelector(`[data-scene="${s.number}"]`);
    if (frame) frame.classList.add('frame-loading');
  });

  // ~12s per scene sequentially
  const perScene = 12;
  const estSec   = scenes.length * perScene;
  const startTime = Date.now();

  // Banner
  const banner = document.createElement('div');
  banner.id = 'illustBanner';
  banner.className = 'illust-banner';
  banner.innerHTML = `
    <div class="illust-banner-top">
      <div class="illust-banner-left">
        <svg class="spinner" viewBox="0 0 24 24" width="15" height="15"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="30 70"/></svg>
        <span id="illustStatus">DALL-E 3로 스토리보드 일러스트를 그리고 있습니다...</span>
      </div>
      <span id="illustTimeLeft" class="illust-time"></span>
    </div>
    <div class="illust-bar-wrap">
      <div class="illust-bar-fill" id="illustBarFill"></div>
    </div>`;
  scenesContainer.insertAdjacentElement('beforebegin', banner);

  // Progress ticker (time-based)
  const illustInterval = setInterval(() => {
    const elapsed = (Date.now() - startTime) / 1000;
    const left    = Math.ceil(estSec - elapsed);
    const timeEl  = document.getElementById('illustTimeLeft');
    if (timeEl) {
      timeEl.textContent = left > 5 ? `약 ${left}초 남음` : left > 0 ? '거의 다 됐어요...' : '마무리 중...';
    }
  }, 500);

  function updateBannerProgress(done, total) {
    const pct = (done / total) * 100;
    const barFill = document.getElementById('illustBarFill');
    if (barFill) barFill.style.width = pct.toFixed(0) + '%';
    const statusEl = document.getElementById('illustStatus');
    if (statusEl) statusEl.textContent = done < total
      ? `씬 ${done}/${total} 완료 — 다음 씬 그리는 중...`
      : `${total}개 씬 일러스트 완성!`;
  }

  try {
    if (!state.openaiKey) {
      showToast('⚙️ OpenAI API 키를 설정하면 AI 일러스트가 생성됩니다', 'info');
      throw new Error('NO_OPENAI_KEY');
    }

    // Generate each scene sequentially (DALL-E 3 rate limits)
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const frame = document.querySelector(`[data-scene="${scene.number}"]`);

      try {
        const b64 = await generateDalleImage(scene);
        if (frame) {
          frame.classList.remove('frame-loading');
          frame.innerHTML = `<img src="data:image/png;base64,${b64}" alt="씬 ${scene.number}" />`;
        }
      } catch (err) {
        console.warn(`씬 ${scene.number} 이미지 생성 실패:`, err.message);
        showToast(`씬 ${scene.number} 생성 실패: ${err.message}`, 'error');
        if (frame) frame.classList.remove('frame-loading');
      }

      updateBannerProgress(i + 1, scenes.length);
    }

  } catch (err) {
    if (err.message !== 'NO_OPENAI_KEY') {
      console.warn('일러스트 생성 실패:', err);
      showToast('일러스트 생성 중 오류: ' + err.message, 'error');
    }
    scenes.forEach(s => {
      const frame = document.querySelector(`[data-scene="${s.number}"]`);
      if (frame) frame.classList.remove('frame-loading');
    });
  } finally {
    clearInterval(illustInterval);
    const barFill = document.getElementById('illustBarFill');
    if (barFill) barFill.style.width = '100%';
    setTimeout(() => document.getElementById('illustBanner')?.remove(), 700);
  }
}

async function generateDalleImage(scene) {
  const shotMap = {
    '와이드': 'extreme wide shot, landscape panorama',
    '미디엄': 'medium shot, character upper body',
    '클로즈': 'close-up shot, face or object detail',
    '조감': 'bird\'s eye view, top-down angle',
    'POV':   'POV shot, first person perspective',
  };
  const shotKey  = Object.keys(shotMap).find(k => (scene.shot_type || '').includes(k)) || '미디엄';
  const shotDesc = shotMap[shotKey] || 'medium shot';

  const prompt = [
    'Professional advertising storyboard illustration.',
    'Black and white pencil and ink sketch style, grayscale only.',
    'Bold clean line art, cross-hatching for shadows, cinematic lighting.',
    `${shotDesc}.`,
    scene.visual_description || '',
    scene.emotion ? `Emotion: ${scene.emotion}.` : '',
    'Style: high-quality advertising storyboard art similar to film industry pre-production.',
    'Dynamic composition, expressive characters with detailed faces, motion lines where appropriate.',
    'White background with bold black ink strokes. No color.',
  ].filter(Boolean).join(' ');

  const resp = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${state.openaiKey}`,
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1792x1024',
      quality: 'standard',
      response_format: 'b64_json',
    }),
  });

  if (!resp.ok) {
    const errBody = await resp.json().catch(() => ({}));
    throw new Error(errBody.error?.message || `OpenAI 오류 (${resp.status})`);
  }

  const data = await resp.json();
  return data.data[0].b64_json;
}

function generateSceneArt(scene, shotClass) {
  const colors = scene.color_direction || [];
  const c1     = colors[0] || '#1e1e2e';
  const c2     = colors[1] || '#2e2e4a';
  const n      = scene.number;

  const arts = {
    wide: `<svg viewBox="0 0 240 135" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <defs><linearGradient id="g${n}w" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/>
      </linearGradient></defs>
      <rect width="240" height="135" fill="url(#g${n}w)"/>
      <rect x="0" y="88" width="240" height="47" fill="rgba(0,0,0,0.35)"/>
      <ellipse cx="60" cy="88" rx="20" ry="8" fill="rgba(255,255,255,0.05)"/>
      <rect x="60" y="46" width="3" height="44" fill="rgba(255,255,255,0.1)"/>
      <rect x="175" y="52" width="2.5" height="38" fill="rgba(255,255,255,0.07)"/>
      <path d="M0,88 Q60,80 120,85 Q180,90 240,88" stroke="rgba(255,255,255,0.05)" fill="none" stroke-width="1"/>
    </svg>`,

    medium: `<svg viewBox="0 0 240 135" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <defs><linearGradient id="g${n}m" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/>
      </linearGradient></defs>
      <rect width="240" height="135" fill="url(#g${n}m)"/>
      <ellipse cx="120" cy="62" rx="25" ry="25" fill="rgba(255,255,255,0.07)"/>
      <rect x="95" y="87" width="50" height="55" rx="4" fill="rgba(255,255,255,0.05)"/>
      <ellipse cx="120" cy="60" rx="16" ry="16" fill="rgba(255,255,255,0.1)"/>
      <line x1="0" y1="87" x2="240" y2="87" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
    </svg>`,

    close: `<svg viewBox="0 0 240 135" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <defs><radialGradient id="g${n}c" cx="50%" cy="50%" r="65%">
        <stop offset="0%" stop-color="${c2}" stop-opacity="0.85"/>
        <stop offset="100%" stop-color="${c1}"/>
      </radialGradient></defs>
      <rect width="240" height="135" fill="url(#g${n}c)"/>
      <ellipse cx="120" cy="67" rx="58" ry="52" fill="rgba(255,255,255,0.03)"/>
      <ellipse cx="120" cy="67" rx="38" ry="34" fill="rgba(255,255,255,0.05)"/>
      <ellipse cx="120" cy="67" rx="20" ry="18" fill="rgba(255,255,255,0.09)"/>
      <ellipse cx="120" cy="67" rx="8" ry="7" fill="rgba(255,255,255,0.14)"/>
    </svg>`,

    other: `<svg viewBox="0 0 240 135" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <defs><linearGradient id="g${n}o" x1="1" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/>
      </linearGradient></defs>
      <rect width="240" height="135" fill="url(#g${n}o)"/>
      <rect x="18" y="18" width="204" height="99" rx="2" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
      <line x1="80" y1="18" x2="80" y2="117" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
      <line x1="160" y1="18" x2="160" y2="117" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
      <line x1="18" y1="63" x2="222" y2="63" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
      <circle cx="120" cy="67" r="10" fill="rgba(255,255,255,0.1)"/>
      <circle cx="120" cy="67" r="5" fill="rgba(255,255,255,0.15)"/>
    </svg>`,
  };

  return arts[shotClass] || arts.other;
}

// =====================
// REGENERATE / NEW PROJECT
// =====================
btnRegenerate.addEventListener('click', () => goToStep(2));

btnNewProject.addEventListener('click', () => {
  state.images        = [];
  state.analysisResult = null;
  state.storyboard    = null;

  renderPreviews();
  updateAnalyzeBtn();
  analysisResult.hidden    = true;
  directionCard.hidden     = true;
  scenesContainer.innerHTML = '';

  $('productName').value   = '';
  $('coreMessage').value   = '';
  $('targetAudience').value = '';
  $('adDuration').value    = '30초';
  $('extraNotes').value    = '';

  goToStep(1);
});
