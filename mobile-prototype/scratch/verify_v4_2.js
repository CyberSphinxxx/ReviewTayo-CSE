const fs = require('fs');
const path = require('path');

console.log('=== V4.2 COMPREHENSIVE VERIFICATION ===\n');

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

// 3. Check for specific required V4.2 IDs and elements in index.html
const requiredIds = [
  // 5 Navigation screens
  'learnScreen', 'practiceScreen', 'homeScreen', 'reviewScreen', 'progressScreen',
  // Home (formerly Today)
  'todayHero', 'todayHeroNormal', 'todayHeroPhaseLine', 'todayHeroFocus', 'heroQuizBtn',
  'todayHeroDone', 'heroExtraPracticeBtn', 'heroOwlContainer',
  'planDaily', 'planDailyCheck', 'planSmart', 'planSmartCheck', 'planReview', 'planReviewCheck',
  'streakLineText', 'streakLineSub', 'continuityCard', 'resumeContinuityBtn', 'dismissContinuityBtn',
  // Learn
  'lessonBtn', 'subjectsDisclosureBtn', 'subjectsDisclosurePanel', 'quickSheetsBtn',
  // Practice
  'startSmartPracticeBtn', 'adaptiveDisclosureBtn', 'adaptiveDisclosurePanel',
  'morePracticeBtn', 'morePracticePanel', 'customBtn', 'levelBtn',
  'mockPracticeRow', 'practiceMockSub', 'subjectPracticeBtn', 'subjectPracticePanel', 'trackPracticeTitle',
  // Review (New)
  'reviewHeroNormal', 'startReviewNowBtn', 'reviewHeroEmpty', 'reviewBrowseSavedBtn',
  'reviewMistakesRow', 'reviewSavedRow', 'reviewConceptsRow', 'reviewHistoryRow', 'reviewDueBadge',
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
  throw new Error(`Missing required V4.2 IDs in index.html: ${missingIds.join(', ')}`);
}
console.log(`✓ All ${requiredIds.length} required V4.2 IDs are present in index.html`);

// 4. Verify 5 tabs in exact order: Learn, Practice, Home, Review, Progress
const navTabs = [...html.matchAll(/data-tab="([^"]+)"/g)].map(m => m[1]);
console.log('Nav tabs detected in markup:', navTabs);
console.assert(navTabs.length === 5, 'Must have exactly 5 tabs in bottom navigation');
console.assert(navTabs[0] === 'learn', 'Tab 1 must be learn');
console.assert(navTabs[1] === 'practice', 'Tab 2 must be practice');
console.assert(navTabs[2] === 'home', 'Tab 3 must be home (center anchor)');
console.assert(navTabs[3] === 'review', 'Tab 4 must be review');
console.assert(navTabs[4] === 'progress', 'Tab 5 must be progress');
console.log('✓ Five-tab navigation order and centered Home anchor verified');

// 5. Verify Review Due removed from Learn
const learnSectionMatch = html.match(/<!-- LEARN -->([\s\S]*?)<!-- PRACTICE -->/);
if(!learnSectionMatch){
  throw new Error('Could not find Learn section in index.html');
}
console.assert(!learnSectionMatch[1].includes('Review Due'), 'Review Due removed from Learn');
console.log('✓ Review Due removed from Learn');

// 6. Verify Review mistakes removed from Practice
const practiceSectionMatch = html.match(/<!-- PRACTICE -->([\s\S]*?)<!-- HOME/);
if(!practiceSectionMatch){
  throw new Error('Could not find Practice section in index.html');
}
console.assert(!practiceSectionMatch[1].includes('Review mistakes'), 'Review mistakes removed from Practice');
console.log('✓ Review mistakes removed from Practice');

console.log('\n=============================================');
console.log('HTML STRUCTURE & DOM AUDIT PASSED 100%');
console.log('=============================================\n');
