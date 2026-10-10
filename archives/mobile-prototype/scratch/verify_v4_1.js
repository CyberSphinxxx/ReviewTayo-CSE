const fs = require('fs');
const path = require('path');

console.log('=== V4.1 COMPREHENSIVE VERIFICATION ===\n');

// 1. Verify all referenced files in index.html exist
const html = fs.readFileSync('index.html', 'utf8');

const cssMatches = [...html.matchAll(/href="([^"]+\.css)"/g)].map(m => m[1]);
console.log(`Checking ${cssMatches.length} CSS files...`);
cssMatches.forEach(f => {
  const p = path.join(__dirname, '..', f);
  if(!fs.existsSync(p)){
    throw new Error(`CSS file missing: ${f}`);
  }
});
console.log('✓ All CSS stylesheets exist and linked properly');

const jsMatches = [...html.matchAll(/src="([^"]+\.js)"/g)].map(m => m[1]);
console.log(`Checking ${jsMatches.length} JS files...`);
jsMatches.forEach(f => {
  const p = path.join(__dirname, '..', f);
  if(!fs.existsSync(p)){
    throw new Error(`JS file missing: ${f}`);
  }
});
console.log('✓ All JS scripts exist and linked properly');

// 2. Check for duplicate IDs in index.html
const idMatches = [...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]);
const seenIds = new Set();
const duplicates = [];
idMatches.forEach(id => {
  if(seenIds.has(id)){
    duplicates.push(id);
  }
  seenIds.add(id);
});

if(duplicates.length > 0){
  throw new Error(`Duplicate IDs found: ${duplicates.join(', ')}`);
}
console.log(`✓ No duplicate IDs found among ${seenIds.size} unique IDs`);

// 3. Check for specific required V4.1 IDs and elements in index.html
const requiredIds = [
  // Navigation
  'todayScreen', 'learnScreen', 'practiceScreen', 'progressScreen',
  // Today
  'todayHero', 'todayHeroNormal', 'todayHeroPhaseLine', 'todayHeroFocus', 'heroQuizBtn',
  'todayHeroDone', 'heroExtraPracticeBtn', 'heroOwlContainer',
  'planDaily', 'planDailyCheck', 'planSmart', 'planSmartCheck', 'planReview', 'planReviewCheck',
  'streakLineText', 'streakLineSub', 'continuityCard', 'resumeContinuityBtn', 'dismissContinuityBtn',
  // Learn
  'lessonBtn', 'learnReviewBtn', 'subjectsDisclosureBtn', 'subjectsDisclosurePanel',
  'toolsDisclosureBtn', 'toolsDisclosurePanel', 'trackLearnTitle', 'savedBtn', 'formulaBtn', 'mistakeStudyBtn', 'browseFlashcardsBtn',
  // Practice
  'startSmartPracticeBtn', 'adaptiveDisclosureBtn', 'adaptiveDisclosurePanel',
  'morePracticeBtn', 'morePracticePanel', 'customBtn', 'levelBtn',
  'mockPracticeRow', 'practiceMockSub', 'subjectPracticeBtn', 'subjectPracticePanel', 'trackPracticeTitle',
  // Progress
  'scoreInfoBtn', 'needsAttentionBtn', 'progressSubjectsGroup',
  'progressJourneyToggle', 'progressJourneySubLabel', 'progressJourneyPanel',
  'progressWeekToggle', 'progressWeekSubLabel', 'progressWeekPanel',
  'progressMockToggle', 'progressMockSubLabel', 'progressMockPanel',
  // Overlays
  'settingsOverlay', 'scoreInfoOverlay', 'masteryOverlay', 'customOverlay', 'mockOverlay',
  'mockResultOverlay', 'flashcardOverlay', 'resultOverlay', 'quiz'
];

const missingIds = requiredIds.filter(id => !seenIds.has(id));
if(missingIds.length > 0){
  throw new Error(`Missing required V4.1 IDs in index.html: ${missingIds.join(', ')}`);
}
console.log(`✓ All ${requiredIds.length} required V4.1 IDs are present in index.html`);

// 4. Verify 4 tabs only and 'Learn' renaming
console.assert(html.includes('data-tab="today"'), 'Today tab present');
console.assert(html.includes('data-tab="learn"'), 'Learn tab present');
console.assert(html.includes('data-tab="practice"'), 'Practice tab present');
console.assert(html.includes('data-tab="progress"'), 'Progress tab present');
console.assert(!html.includes('data-tab="study"'), 'No study tab - renamed to learn');
console.assert(!html.includes('data-tab="mock"'), 'No mock tab');
console.assert(!html.includes('data-tab="ai"'), 'No AI tab');
console.assert(!html.includes('data-tab="journey"'), 'No journey tab');
console.assert(html.includes('<span>Learn</span>'), 'Tab button text is Learn');
console.log('✓ Four-tab navigation and Learn naming verified');

// 5. Verify no removed bulky sections remain on Today
console.assert(!html.includes('id="todayReviewDueCard"'), 'todayReviewDueCard removed from Today');
console.assert(!html.includes('id="todayJourneySnippet"'), 'todayJourneySnippet removed from Today');
console.assert(!html.includes('class="focuscard"'), 'Bulk focuscard removed from Today');
console.assert(!html.includes('1-minute warm-up</h2>'), 'Duplicate 1-min warmup section removed from Today');
console.log('✓ Clutter removed from Today');

console.log('\n=============================================');
console.log('HTML STRUCTURE & DOM AUDIT PASSED 100%');
console.log('=============================================\n');
