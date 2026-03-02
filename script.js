const unlockGate = sessionStorage.getItem('fromLock');
if (unlockGate !== '1') {
  window.location.replace('index.html');
}
sessionStorage.removeItem('fromLock');

const canvas = document.getElementById('particles');
const ctx = canvas.getContext('2d');

let dpr = 1;
let particles = [];
let targets = [];
let textTargets = [];
let heartTargets = [];
let highlightedTextTargets = [];
let forming = false;
let formationProgress = 0;
let pulse = 0;

const FORM_DELAY_MS = 3200;
const FORM_PROGRESS_STEP = 0.0017;
const TEXT_PARTICLE_RATIO = 0.5;
const MOBILE_TEXT_PARTICLE_RATIO = 0.46;
const isMobile = window.matchMedia('(max-width: 768px)').matches;

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (!particles.length) {
    const count = isMobile
      ? Math.max(1300, Math.min(2100, Math.floor((w * h) / 520)))
      : Math.max(2200, Math.min(3800, Math.floor((w * h) / 470)));
    createParticles(count);
  }

  if (forming) {
    targets = buildTargets(w, h);
    assignTargets();
  }
}

function createParticles(count) {
  const w = window.innerWidth;
  const h = window.innerHeight;

  particles = Array.from({ length: count }, () => ({
    x: rand(0, w),
    y: rand(0, h),
    vx: rand(-1.1, 1.1),
    vy: rand(-1.1, 1.1),
    tx: rand(0, w),
    ty: rand(0, h),
    targetType: 'heart',
    emphasis: false,
    size: rand(1.4, 2.9),
    redMix: rand(0, 1),
  }));
}

function heartCurve(t) {
  const x = 16 * Math.pow(Math.sin(t), 3);
  const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
  return { x, y };
}

function buildHeartTargets(cx, cy, scale) {
  const pts = [];

  for (let i = 0; i < 2200; i += 1) {
    const t = rand(0, Math.PI * 2);
    const fill = Math.sqrt(Math.random());
    const c = heartCurve(t);
    pts.push({
      x: cx + c.x * scale * fill,
      y: cy - c.y * scale * fill,
      type: 'heart',
    });
  }

  for (let t = 0; t < Math.PI * 2; t += 0.008) {
    const c = heartCurve(t);
    pts.push({
      x: cx + c.x * scale,
      y: cy - c.y * scale,
      type: 'heart',
    });
  }

  return pts;
}

function buildTextTargets(text, w, h) {
  const off = document.createElement('canvas');
  off.width = Math.max(1, Math.floor(w));
  off.height = Math.max(1, Math.floor(h));

  const octx = off.getContext('2d');
  const fontSize = Math.max(56, Math.floor(w * 0.092));
  octx.clearRect(0, 0, off.width, off.height);
  octx.fillStyle = '#ffffff';
  octx.textAlign = 'center';
  octx.textBaseline = 'middle';
  octx.font = `700 ${fontSize}px Montserrat, sans-serif`;
  octx.fillText(text, off.width / 2, off.height / 2);

  const data = octx.getImageData(0, 0, off.width, off.height).data;
  const pts = [];
  const gap = Math.max(2, Math.floor(w / 560));

  for (let y = 0; y < off.height; y += gap) {
    for (let x = 0; x < off.width; x += gap) {
      if (data[(y * off.width + x) * 4 + 3] > 90) {
        pts.push({ x, y, type: 'text' });
      }
    }
  }

  return pts;
}

function buildTargets(w, h) {
  heartTargets = buildHeartTargets(w * 0.5, h * 0.395, Math.min(w, h) * 0.0139);

  const textWidth = Math.min(w * 0.92, 1040);
  const textHeight = Math.max(120, h * 0.18);
  const rawText = buildTextTargets('Eu Te Amo Isa', textWidth, textHeight);
  const textOffsetX = (w - textWidth) / 2;
  const textOffsetY = h * 0.685;

  textTargets = rawText.map((p) => {
    const nx = p.x / textWidth;
    const isE = Math.abs(nx - 0.095) < 0.04;
    const isS = Math.abs(nx - 0.81) < 0.04;
    const isA = Math.abs(nx - 0.9) < 0.038;

    return {
      x: p.x + textOffsetX,
      y: p.y + textOffsetY,
      type: 'text',
      highlight: isE || isS || isA,
    };
  });

  highlightedTextTargets = textTargets.filter((t) => t.highlight);

  return heartTargets.concat(textTargets);
}

function assignTargets() {
  if (!targets.length || !heartTargets.length || !textTargets.length) return;

  const ratio = isMobile ? MOBILE_TEXT_PARTICLE_RATIO : TEXT_PARTICLE_RATIO;
  const textCount = Math.floor(particles.length * ratio);
  const highlightCount = Math.min(
    textCount,
    Math.floor(textCount * 0.4),
    highlightedTextTargets.length ? textCount : 0
  );

  for (let i = 0; i < particles.length; i += 1) {
    const p = particles[i];

    if (i < textCount) {
      const useHighlight = i < highlightCount && highlightedTextTargets.length;
      const pool = useHighlight ? highlightedTextTargets : textTargets;
      const t = pool[(i * 17) % pool.length];
      const spread = isMobile ? 0.18 : 0.35;
      p.tx = t.x + rand(-spread, spread);
      p.ty = t.y + rand(-spread, spread);
      p.targetType = 'text';
      p.emphasis = Boolean(t.highlight);
    } else {
      const t = heartTargets[(i * 13) % heartTargets.length];
      p.tx = t.x + rand(-0.7, 0.7);
      p.ty = t.y + rand(-0.7, 0.7);
      p.targetType = 'heart';
      p.emphasis = false;
    }
  }
}

function updateParticles() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  if (forming) {
    const progressStep = isMobile ? FORM_PROGRESS_STEP * 1.25 : FORM_PROGRESS_STEP;
    formationProgress = Math.min(1, formationProgress + progressStep);
  }

  for (const p of particles) {
    if (forming) {
      const isText = p.targetType === 'text';
      const pullBase = 0.0032 + formationProgress * 0.022;
      const mobileTextBoost = isMobile && isText ? 1.1 : 1;
      const pull = isText ? pullBase * 1.45 * mobileTextBoost : pullBase;
      const damping = isText
        ? (0.955 - formationProgress * 0.13 - (isMobile ? 0.03 : 0))
        : (0.965 - formationProgress * 0.11);

      p.vx += (p.tx - p.x) * pull;
      p.vy += (p.ty - p.y) * pull;
      p.vx *= damping;
      p.vy *= damping;

      if (isText && formationProgress > 0.72) {
        // Snap final para manter o texto sempre legivel.
        const snap = isMobile ? 0.32 : 0.2;
        p.x += (p.tx - p.x) * snap;
        p.y += (p.ty - p.y) * snap;
        p.vx *= 0.45;
        p.vy *= 0.45;
      }
    } else {
      p.vx += rand(-0.045, 0.045);
      p.vy += rand(-0.045, 0.045);
      p.vx = Math.max(-1.1, Math.min(1.1, p.vx));
      p.vy = Math.max(-1.1, Math.min(1.1, p.vy));
    }

    p.x += p.vx;
    p.y += p.vy;

    if (p.x < -2) p.x = w + 2;
    if (p.x > w + 2) p.x = -2;
    if (p.y < -2) p.y = h + 2;
    if (p.y > h + 2) p.y = -2;
  }
}

function drawGlow(w, h) {
  if (!forming) return;

  pulse += 0.03;
  const heartAlpha = 0.16 + Math.sin(pulse) * 0.03;

  const heartGlow = ctx.createRadialGradient(
    w * 0.5,
    h * 0.405,
    30,
    w * 0.5,
    h * 0.405,
    Math.min(w, h) * 0.31
  );
  heartGlow.addColorStop(0, `rgba(255, 70, 120, ${heartAlpha})`);
  heartGlow.addColorStop(0.45, 'rgba(255, 70, 120, 0.09)');
  heartGlow.addColorStop(1, 'rgba(255, 70, 120, 0)');

  ctx.fillStyle = heartGlow;
  ctx.fillRect(0, 0, w, h);
}

function drawParticles() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  ctx.fillStyle = forming ? 'rgba(0, 0, 0, 0.34)' : 'rgba(0, 0, 0, 0.48)';
  ctx.fillRect(0, 0, w, h);

  drawGlow(w, h);

  for (const p of particles) {
    const textMode = forming && p.targetType === 'text';
    const red = Math.floor(228 + p.redMix * 27);
    const green = Math.floor(18 + p.redMix * 72);
    const blue = Math.floor(38 + p.redMix * 48);
    const textAlpha = p.emphasis ? 1 : 0.96;
    const color = textMode ? `rgba(255,255,255,${textAlpha})` : `rgba(${red},${green},${blue},0.72)`;
    const sizeBoost = p.emphasis ? (isMobile ? 1.55 : 2.05) : (isMobile ? 1.18 : 1.7);
    const size = textMode ? p.size * sizeBoost : p.size;

    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.shadowColor = textMode ? 'rgba(0,0,0,0)' : `rgba(${red},${Math.floor(green + 8)},${Math.floor(blue + 8)},0.82)`;
    ctx.shadowBlur = textMode ? 0 : 8;
    ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.shadowBlur = 0;
}

function animate() {
  updateParticles();
  drawParticles();
  requestAnimationFrame(animate);
}

window.addEventListener('resize', resize);
resize();
animate();

setTimeout(() => {
  forming = true;
  targets = buildTargets(window.innerWidth, window.innerHeight);
  assignTargets();
}, FORM_DELAY_MS);

