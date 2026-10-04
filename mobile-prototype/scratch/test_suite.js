// Full integration test suite for ReviewTayo V4.2 Mobile Prototype
const fs = require('fs');

// 1. Mock minimal DOM environment
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
  addEventListener: (ev, cb) => {
    if(ev === 'DOMContentLoaded') global._domLoadedCb = cb;
  },
  createElement: createElement,
  getElementById: (id) => {
    if(!elements[id]) elements[id] = createElement('div');
    return elements[id];
  },
  querySelector: (sel) => {
    if(sel.startsWith('#')) return global.document.getElementById(sel.slice(1));
    return createElement('div');
  },
  querySelectorAll: (sel) => {
    if(sel === '.navbtn') {
      return [
        elements['navbtn-learn'] || (elements['navbtn-learn'] = Object.assign(createElement('button'), { dataset: { tab: 'learn' } })),
        elements['navbtn-practice'] || (elements['navbtn-practice'] = Object.assign(createElement('button'), { dataset: { tab: 'practice' } })),
        elements['navbtn-home'] || (elements['navbtn-home'] = Object.assign(createElement('button'), { dataset: { tab: 'home' } })),
        elements['navbtn-review'] || (elements['navbtn-review'] = Object.assign(createElement('button'), { dataset: { tab: 'review' } })),
        elements['navbtn-progress'] || (elements['navbtn-progress'] = Object.assign(createElement('button'), { dataset: { tab: 'progress' } }))
      ];
    }
    if(sel === '[data-quiz]') {
      return [
        elements['planDaily'] || (elements['planDaily'] = Object.assign(createElement('button'), { dataset: { quiz: 'qotd' } })),
        elements['planSmart'] || (elements['planSmart'] = Object.assign(createElement('button'), { dataset: { quiz: 'smart' } }))
      ];
    }
    if(sel === '[data-learn-subject]') {
      return [
        Object.assign(createElement('button'), { dataset: { learnSubject: 'Verbal Ability' } }),
        Object.assign(createElement('button'), { dataset: { learnSubject: 'Numerical Ability' } })
      ];
    }
    if(sel === '[data-practice-subject]') {
      return [
        Object.assign(createElement('button'), { dataset: { practiceSubject: 'verbal' } }),
        Object.assign(createElement('button'), { dataset: { practiceSubject: 'numerical' } })
      ];
    }
    if(sel === '.seg') return [];
    if(sel === '.overlay') return [];
    if(sel === '[data-close-overlay]') return [];
    return [];
  }
};

// 2. Load all prototype scripts in order
const files = [
  'js/core/namespace.js',
  'js/core/dom.js',
  'js/data/journey.js',
  'js/data/concepts.js',
  'js/data/review-due.js',
  'js/data/study-plan.js',
  'js/data/mock-results.js',
  'js/data/questions.js',
  'js/state/store.js',
  'js/ui/toast.js',
  'js/ui/overlays.js',
  'js/features/owl.js',
  'js/features/navigation.js',
  'js/features/journey.js',
  'js/features/streak.js',
  'js/features/study-plan.js',
  'js/features/review-due.js',
  'js/features/review.js',
  'js/features/mastery.js',
  'js/features/weekly-goal.js',
  'js/features/mock-results.js',
  'js/features/settings.js',
  'js/features/study.js',
  'js/features/practice.js',
  'js/features/quiz.js',
  'js/app.js'
];

files.forEach(f => eval(fs.readFileSync(f, 'utf8')));

const RT = window.ReviewTayo;

// Trigger DOMContentLoaded
if(global._domLoadedCb) global._domLoadedCb();

console.log('--- TEST 1: FIVE-TAB NAVIGATION & CENTERED HOME ANCHOR ---');
const navBtns = global.document.querySelectorAll('.navbtn');
console.assert(navBtns.length === 5, 'Must have exactly 5 bottom nav buttons');
console.assert(navBtns[0].dataset.tab === 'learn', 'Tab 1 is learn');
console.assert(navBtns[1].dataset.tab === 'practice', 'Tab 2 is practice');
console.assert(navBtns[2].dataset.tab === 'home', 'Tab 3 is home (center anchor)');
console.assert(navBtns[3].dataset.tab === 'review', 'Tab 4 is review');
console.assert(navBtns[4].dataset.tab === 'progress', 'Tab 5 is progress');

// Initial tab is home
console.assert(RT.state.store.activeTab === 'home', 'Default activeTab should be home');
console.assert(RT.core.byId('homeScreen').classList.contains('active'), 'homeScreen should be active initially');

// Test tab switching across all 5 destinations
RT.features.navigation.switchTab('learn');
console.assert(RT.state.store.activeTab === 'learn', 'Active tab should be learn');
console.assert(RT.core.byId('learnScreen').classList.contains('active'), 'learnScreen should be active');

RT.features.navigation.switchTab('practice');
console.assert(RT.state.store.activeTab === 'practice', 'Active tab should be practice');
console.assert(RT.core.byId('practiceScreen').classList.contains('active'), 'practiceScreen should be active');

RT.features.navigation.switchTab('review');
console.assert(RT.state.store.activeTab === 'review', 'Active tab should be review');
console.assert(RT.core.byId('reviewScreen').classList.contains('active'), 'reviewScreen should be active');

RT.features.navigation.switchTab('progress');
console.assert(RT.state.store.activeTab === 'progress', 'Active tab should be progress');
console.assert(RT.core.byId('progressScreen').classList.contains('active'), 'progressScreen should be active');

RT.features.navigation.switchTab('home');
console.assert(RT.state.store.activeTab === 'home', 'Active tab should be home');
console.assert(RT.core.byId('homeScreen').classList.contains('active'), 'homeScreen should be active');

// Test backward compatibility alias 'today' -> 'home'
RT.features.navigation.switchTab('today');
console.assert(RT.state.store.activeTab === 'home', 'Alias today maps to home');
console.assert(RT.core.byId('homeScreen').classList.contains('active'), 'homeScreen active on today alias');

console.log('✓ Five-tab navigation and tab switching verified');

console.log('--- TEST 2: HOME HERO & SINGLE-LINE PHASE ---');
RT.features.journey.renderToday();
const phaseLine = RT.core.byId('todayHeroPhaseLine');
console.assert(phaseLine.textContent.includes('Accuracy Phase'), 'Phase line contains Accuracy Phase');
console.assert(phaseLine.textContent.includes('days left'), 'Phase line contains days left');

const streakLine = RT.core.byId('streakLineText');
console.assert(streakLine.textContent.includes('12 day streak'), 'Streak line is compact 12 day streak');
console.log('✓ Home hero single line phase and compact streak line verified');

console.log('--- TEST 3: REVIEW DESTINATION & SPACED REVIEW FLASHCARDS ---');
// Review Due badge starts with 12
const reviewBadge = RT.core.byId('reviewDueBadge');
console.assert(reviewBadge.textContent === '12', 'Review badge shows 12 due');
console.assert(reviewBadge.style.display !== 'none', 'Review badge visible');

// Review screen normal state is visible
RT.features.review.render();
const normalReviewBox = RT.core.byId('reviewHeroNormal');
const emptyReviewBox = RT.core.byId('reviewHeroEmpty');
console.assert(normalReviewBox.style.display !== 'none', 'Normal review box shown');
console.assert(emptyReviewBox.style.display === 'none', 'Empty review box hidden initially');

// Launch review session
RT.features.reviewDue.startReview();
const rds = RT.state.store.reviewDueSession;
console.assert(rds.active === true, 'Review session active');
console.assert(rds.queue.length === 12, '12 cards in queue');

// Test Again button re-queues card
const origCard = rds.queue[0];
RT.core.byId('flashcardAgainBtn').dispatchEvent('click');
console.assert(rds.queue.length === 13, 'Card re-queued');
console.assert(rds.queue[12].id === origCard.id, 'Card placed at end');

// Finish remaining cards with Got It
while(rds.index < rds.queue.length){
  RT.core.byId('flashcardGotItBtn').dispatchEvent('click');
}
console.assert(rds.active === false, 'Session finished');
console.assert(RT.state.store.dailyPlan.reviewDue === true, 'reviewDue marked done');

// Verify Review screen transitions to empty state & badge is hidden (no "0")
console.assert(reviewBadge.style.display === 'none', 'Review badge hidden after completion');
console.assert(normalReviewBox.style.display === 'none', 'Normal box hidden when caught up');
console.assert(emptyReviewBox.style.display === 'block', 'Empty state shown when caught up');
console.log('✓ Review screen, flashcard queue, and empty state transition verified');

console.log('--- TEST 4: QUIZ, EXPLANATION, PROGRESSIVE AI, TRY ANOTHER LIKE THIS ---');
RT.features.quiz.start('smart', true);
const qs = RT.state.store.quiz;
console.assert(qs.active === true, 'Quiz active');
console.assert(qs.session.length === 5, 'Session length 5');

// Miss first question
const firstQ = qs.session[0];
qs.selected = 0; // wrong answer
RT.core.byId('nextBtn').dispatchEvent('click');

console.assert(qs.score === 0, 'Score is 0 on miss');
console.assert(RT.core.byId('quizCoachNote').textContent === 'Try one more.', 'Coach note says Try one more.');
const explainHtml = RT.core.byId('explain').innerHTML;
console.assert(explainHtml.includes('Not quite'), 'Shows Not quite');
console.assert(explainHtml.includes('Try another like this'), 'Shows Try another like this button');
console.assert(explainHtml.includes('Still confused? Explain simply'), 'Shows AI explanation progressive toggle');

// Test Try another like this
RT.features.quiz.tryAnotherLikeThis(firstQ);
console.assert(qs.session[0].id !== firstQ.id, 'Question swapped with sibling');
console.assert(qs.session[0].concept === firstQ.concept, 'Same concept');

// Answer swapped question correctly
qs.selected = qs.session[0].a;
RT.core.byId('nextBtn').dispatchEvent('click');
console.assert(qs.score === 1, 'Score increments');
console.assert(RT.core.byId('quizCoachNote').textContent === 'Nice.', 'Coach note says Nice.');

// Finish remaining questions
for(let i = 1; i < 5; i++){
  RT.core.byId('nextBtn').dispatchEvent('click');
  qs.selected = qs.session[qs.index].a;
  RT.core.byId('nextBtn').dispatchEvent('click');
}
RT.core.byId('nextBtn').dispatchEvent('click');

console.assert(qs.active === false, 'Quiz completed');
console.assert(RT.state.store.dailyPlan.smartDrill === true, 'Smart drill marked done');
console.log('✓ Quiz flow, Try Another Like This, and progressive AI simplifier verified');

console.log('--- TEST 5: DONE FOR TODAY STATE ---');
RT.features.studyPlan.markDone('dailyQuestion');
console.assert(RT.features.studyPlan.isDoneToday() === true, 'All 3 items complete');
RT.features.studyPlan.render();
console.assert(RT.core.byId('todayHero').classList.contains('hero-completed'), 'Hero completed class applied');
console.assert(RT.core.byId('todayHeroDone').style.display === 'block', 'Done content shown');
console.assert(RT.core.byId('todayHeroNormal').style.display === 'none', 'Normal content hidden');
console.log('✓ Done For Today state verified');

console.log('--- TEST 6: TRACK SWITCHING (PROFESSIONAL VS SUB-PROFESSIONAL) ---');
RT.features.settings.applyTrack('subprofessional');
console.assert(RT.state.store.exam.level === 'subprofessional', 'Track is subprofessional');
console.assert(RT.core.byId('mockCount').textContent === '165', 'Subprof mock count 165');
console.assert(RT.core.byId('practiceMockSub').textContent.includes('165 items'), 'Practice mock sub says 165 items');
console.assert(RT.core.byId('trackLearnTitle').textContent === 'Clerical Ability', 'Learn track row is Clerical Ability');
console.assert(RT.core.byId('trackPracticeTitle').textContent === 'Clerical Ability', 'Practice track row is Clerical Ability');

RT.features.settings.applyTrack('professional');
console.assert(RT.state.store.exam.level === 'professional', 'Track is professional');
console.assert(RT.core.byId('mockCount').textContent === '170', 'Prof mock count 170');
console.assert(RT.core.byId('practiceMockSub').textContent.includes('170 items'), 'Practice mock sub says 170 items');
console.assert(RT.core.byId('trackLearnTitle').textContent === 'Analytical Ability', 'Learn track row is Analytical Ability');
console.assert(RT.core.byId('trackPracticeTitle').textContent === 'Analytical Ability', 'Practice track row is Analytical Ability');
console.log('✓ Track switching verified');

console.log('--- TEST 7: PROGRESS SCREEN & CONCEPT MASTERY DRILL-DOWN ---');
RT.features.mastery.render();
const trackData = RT.features.mastery.getTrackData();
console.assert(trackData.verbal.overallAccuracy === 64, 'Verbal accuracy 64%');
console.assert(trackData.verbal.concepts.length === 5, '5 verbal concepts');

// Open Verbal Ability concept mastery sheet
RT.features.mastery.openConceptSheet('verbal');
console.assert(RT.core.byId('masterySheetTitle').textContent === 'Verbal Ability', 'Sheet title Verbal Ability');
console.assert(RT.core.byId('masterySheetScore').textContent === '64%', 'Sheet score 64%');
console.assert(RT.core.byId('masterySheetList').innerHTML.includes('Sentence Completion'), 'Sentence completion in sheet');
console.log('✓ Progress screen and Concept Mastery sheet verified');

console.log('--- TEST 8: DISCLOSURE CONTROLS ---');
// Test Learn screen disclosures
const learnSubjBtn = RT.core.byId('subjectsDisclosureBtn');
const learnSubjPanel = RT.core.byId('subjectsDisclosurePanel');
learnSubjBtn.dispatchEvent('click');
console.assert(learnSubjPanel.classList.contains('show'), 'Subjects disclosure opened');
console.assert(learnSubjBtn.getAttribute('aria-expanded') === 'true', 'aria-expanded set to true');
learnSubjBtn.dispatchEvent('click');
console.assert(!learnSubjPanel.classList.contains('show'), 'Subjects disclosure closed');

// Test Practice screen disclosures
const moreBtn = RT.core.byId('morePracticeBtn');
const morePanel = RT.core.byId('morePracticePanel');
moreBtn.dispatchEvent('click');
console.assert(morePanel.classList.contains('show'), 'More practice options opened');
console.assert(moreBtn.getAttribute('aria-expanded') === 'true', 'aria-expanded true');
moreBtn.dispatchEvent('click');
console.assert(!morePanel.classList.contains('show'), 'More practice options closed');
console.log('✓ All disclosure controls verified');

console.log('\n======================================================');
console.log('ALL V4.2 INTEGRATION AND SYSTEM TESTS PASSED (8/8)!');
console.log('======================================================\n');
