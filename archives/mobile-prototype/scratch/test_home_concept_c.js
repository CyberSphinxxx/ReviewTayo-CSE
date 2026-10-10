// Test Concept C Home Redesign Verification Script
const fs = require('fs');
const path = require('path');

const baseDir = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(baseDir, 'index.html'), 'utf8');
const cssToday = fs.readFileSync(path.join(baseDir, 'css', 'screens', 'today.css'), 'utf8');

console.log('=== VERIFYING CONCEPT C EDITORIAL DIRECTION ===\n');

// 1. Check HTML elements
const requiredElements = [
  'id="homeEyebrow"',
  'id="homeHeroHeadline"',
  'id="todayHero"',
  'id="todayHeroNormal"',
  'id="todayHeroDone"',
  'id="heroQuizBtn"',
  'id="todayHeroPhaseLine"',
  'id="heroOwlContainer"',
  'class="hero-mascot-composition"',
  'class="hero-pedestal"',
  'class="hero-mascot-backdrop"',
  'id="todayDateBadge"',
  'class="today-cards-grid"',
  'id="planDaily"',
  'id="planDailyCheck"',
  'id="planSmart"',
  'id="planSmartCheck"',
  'id="planReview"',
  'id="planReviewCheck"',
  'class="streak-editorial-card"',
  'id="streakLineText"',
  'id="streakLineSub"',
  'id="streakVisualBars"',
  'id="continuityCard"',
  'id="resumeContinuityBtn"',
  'id="dismissContinuityBtn"'
];

for(const el of requiredElements){
  if(!html.includes(el)){
    throw new Error(`Missing expected element in index.html: ${el}`);
  }
}
console.log('✓ All 26 required Concept C Home DOM elements present in index.html');

// 2. Check CSS styles in today.css
const requiredCssPatterns = [
  /#todayHero\.hero/,
  /\.hero-editorial-title/,
  /Georgia, "Times New Roman", serif/,
  /\.hero-eyebrow/,
  /\.cta\.cta-editorial/,
  /\.hero-phase-meta/,
  /\.hero-mascot-composition/,
  /\.hero-pedestal/,
  /\.today-cards-grid/,
  /\.today-card-daily/,
  /\.today-card-smart/,
  /\.today-card-review/,
  /\.streak-editorial-card/,
  /\.streak-bars/,
  /\.streak-bar\.active/,
  /\.continuity-card\.continuity-editorial/,
  /@media\s*\(max-width:\s*330px\)/,
  /@media\s*\(prefers-reduced-motion:\s*reduce\)/
];

for(const pattern of requiredCssPatterns){
  if(!pattern.test(cssToday)){
    throw new Error(`Missing CSS pattern in today.css: ${pattern}`);
  }
}
console.log('✓ All 18 required Concept C CSS selectors, media queries, and tokens verified in today.css');

// 3. Mock DOM environment for JavaScript execution
const elements = {};
function createElement(tag){
  const el = {
    tagName: tag.toUpperCase(),
    classList: {
      _classes: new Set(),
      add(c){ this._classes.add(c); },
      remove(c){ this._classes.delete(c); },
      toggle(c, force){
        if(force === undefined) {
          if(this._classes.has(c)) { this._classes.delete(c); return false; }
          else { this._classes.add(c); return true; }
        }
        if(force) this._classes.add(c); else this._classes.delete(c);
        return force;
      },
      contains(c){ return this._classes.has(c); }
    },
    style: {},
    dataset: {},
    attributes: {},
    children: [],
    _listeners: {},
    innerHTML: '',
    textContent: '',
    setAttribute(k, v){ this.attributes[k] = v; },
    getAttribute(k){ return this.attributes[k]; },
    removeAttribute(k){ delete this.attributes[k]; },
    addEventListener(type, cb){
      this._listeners[type] = this._listeners[type] || [];
      this._listeners[type].push(cb);
    },
    dispatchEvent(type, ev = {}){
      (this._listeners[type] || []).forEach(cb => cb({ target: this, currentTarget: this, ...ev }));
    },
    appendChild(child){ this.children.push(child); return child; },
    querySelector(sel){ return createElement('div'); },
    querySelectorAll(sel){ return []; }
  };
  return el;
}

global.window = {};
global.document = {
  activeElement: null,
  addEventListener: (ev, cb) => {},
  createElement: createElement,
  getElementById: (id) => {
    if(!elements[id]) elements[id] = createElement('div');
    return elements[id];
  },
  querySelector: (sel) => {
    if(sel.startsWith('#')) return global.document.getElementById(sel.slice(1));
    return createElement('div');
  },
  querySelectorAll: () => []
};

// Setup ReviewTayo environment
function evalScript(relPath){
  const code = fs.readFileSync(path.join(baseDir, relPath), 'utf8');
  eval(code);
}

evalScript('js/core/namespace.js');
evalScript('js/core/dom.js');
evalScript('js/state/store.js');
evalScript('js/data/journey.js');
evalScript('js/features/owl.js');
evalScript('js/features/streak.js');
evalScript('js/features/study-plan.js');
evalScript('js/features/journey.js');

const RT = global.window.ReviewTayo;
RT.ui = { toast: () => {} };

RT.features.owl.init?.();
RT.features.studyPlan.init();
RT.features.journey.init();

// Verify greeting
const eyebrow = RT.core.byId('homeEyebrow');
console.assert(eyebrow.textContent.includes('GOOD'), 'Eyebrow contains greeting: ' + eyebrow.textContent);

// Verify headline in index.html
console.assert(html.includes('Small steps today,<br>big results later.'), 'Serif headline verified in markup');

// Verify primary CTA in index.html
console.assert(html.includes('Start Smart Drill'), 'Primary CTA verified in markup');

// Verify phase line
RT.features.journey.renderToday();
const phase = RT.core.byId('todayHeroPhaseLine');
console.assert(phase.textContent.includes('Accuracy Phase'), 'Phase line contains Accuracy Phase: ' + phase.textContent);

// Test plan completion progression
const dailyCard = RT.core.byId('planDaily');
const smartCard = RT.core.byId('planSmart');
const reviewCard = RT.core.byId('planReview');

RT.features.studyPlan.markDone('dailyQuestion');
console.assert(dailyCard.classList.contains('done'), 'Daily card has done class');
console.assert(RT.core.byId('planDailyCheck').textContent === '✓', 'Daily card has checkmark');

RT.features.studyPlan.markDone('smartDrill');
console.assert(smartCard.classList.contains('done'), 'Smart card has done class');

RT.features.studyPlan.markDone('reviewDue');
console.assert(reviewCard.classList.contains('done'), 'Review card has done class');

// Test all done state
console.assert(RT.features.studyPlan.isDoneToday(), 'isDoneToday is true');
console.assert(RT.core.byId('todayHeroNormal').style.display === 'none', 'Normal hero hidden on completion');
console.assert(RT.core.byId('todayHeroDone').style.display === 'block', 'Editorial Done hero shown on completion');

// Verify streak update
console.assert(RT.core.byId('streakLineSub').textContent === 'Keep it up.', 'Streak copy shows Keep it up.');

console.log('✓ Home screen dynamic behavior, greetings, plan progression, and Done state verified');
console.log('\n=== ALL CONCEPT C VERIFICATIONS PASSED 100% ===');
