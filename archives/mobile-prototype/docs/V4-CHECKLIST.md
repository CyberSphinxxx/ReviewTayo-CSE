# ReviewTayo CSE V4 Checklist

## Architecture
- [x] Preserve HTML/CSS/JS only
- [x] Preserve separation of concerns
- [x] No backend added
- [x] No framework added
- [x] index.html still works directly

## Today
- [x] Add CSE Journey phase compact representation
- [x] Add exam countdown integration controlling journey phase & study recommendation
- [x] Add generated daily plan (Daily Question, Smart Drill, Review Due)
- [x] Add Review Due summary card with "Review now"
- [x] Add Daily Question entry with streak preservation
- [x] Add Done For Today state (hero transformation, celebrating/resting owl, subtle extra practice CTA)
- [x] Add Owl mascot state changes on Today (neutral, celebrating, resting, etc.)
- [x] Add dismissible local cross-device continuity mock card ("CONTINUE FROM WEB")

## Study
- [x] Add Review Due section (spaced review queue with count and "Review now" CTA)
- [x] Add spaced-review flashcards interaction overlay/screen
- [x] Add Again / Got It interaction
- [x] Again adds card near end of local queue, Got It moves to next card
- [x] Completing flashcards marks "Review Due" done in Today's plan
- [x] Preserve Continue Lesson (Sentence Completion)
- [x] Preserve Quick Tools (Flashcards, Saved, Quick Sheets, Mistake Notes)
- [x] Preserve Study by Subject with collapsible hierarchy

## Practice
- [x] Preserve Smart Drill as primary
- [x] Make Smart Drill feel adaptive with internal selection mix simulation (40% weak, 25% recent, 20% review-due, 10% maintenance, 5% random)
- [x] Show tiny explanatory mix preview before drill starts (collapsible/small, no manual config)
- [x] Add question difficulty metadata (easy, standard, challenging, exam) and internal difficulty progression
- [x] Add Try Another Like This on wrong answers to load related question in place
- [x] Add Review Concept link in explanation
- [x] Improve explanations (correct/incorrect, correct answer, concise explanation, concept name, concept mastery status)
- [x] Add Contextual AI explanation prototype ("Still confused? [ Explain simply ]", simplified analogy, step-by-step)
- [x] Preserve progressive disclosure (Targeted Practice, collapsed More Practice Options, collapsed Practice by Subject)
- [x] Preserve Mock Exam entry & modal
- [x] Add Post-Session next action (1 primary CTA, max 1 secondary)

## Progress
- [x] Add Study Score with clear non-predictive disclaimer
- [x] Add CSE Journey compact representation
- [x] Add Weekly Goal tracking (Smart Drills 3/4, Weak Review 1/1, Timed Practice 0/1, remaining count)
- [x] Add Subject Accuracy breakdown
- [x] Add Concept Mastery states (Learning, Developing, Strong, Mastered)
- [x] Add Concept Mastery drill-down on subject click via progressive disclosure
- [x] Add Review Queue quick retry card
- [x] Add Recent Mock Result card with score breakdown
- [x] Add mock-generated 7-day action plan

## Gamification Guardrails
- [x] Preserve study streak
- [x] Separate streak from daily goal
- [x] Do not add XP
- [x] Do not add coins
- [x] Do not add hearts
- [x] Do not add leagues
- [x] Do not add leaderboards

## Owl
- [x] Neutral state
- [x] Happy state (on correct answer / streak)
- [x] Thinking state (on wrong answer / reflection)
- [x] Concerned state (on weak concept miss)
- [x] Celebrating state (on daily plan complete)
- [x] Resting state (on done for today)

## Settings & Exam Track
- [x] Professional mode works (Verbal, Numerical, Analytical, General Info, 170 items, 3:10)
- [x] Sub-Professional mode works (Verbal, Numerical, Clerical, General Info, 165 items, 2:40)
- [x] Target date updates journey phase (Foundation, Accuracy, Speed, Mock Week, Final Review)
- [x] Target date updates recommendations, countdown, and study emphasis
- [x] Offline prototype setting preserved

## Prototype Data
- [x] Add concept mastery mock data (`js/data/concepts.js`)
- [x] Add review-due mock data (`js/data/review-due.js`)
- [x] Add journey mock data (`js/data/journey.js`)
- [x] Add question difficulty metadata to questions (`js/data/questions.js`)
- [x] Add related questions for Try Another Like This (`js/data/questions.js`)
- [x] Add mock exam result data and 7-day plan (`js/data/mock-results.js`)
- [x] Add study-plan data / defaults (`js/data/study-plan.js`)

## Accessibility
- [x] Visible keyboard focus
- [x] Semantic buttons and ARIA attributes
- [x] Dialog semantics
- [x] Escape closes dialogs and pauses quiz
- [x] Focus restoration works
- [x] Buttons have accessible names
- [x] Status is not communicated by color alone
- [x] Reduced-motion behavior preserved

## Responsive
- [x] Test 320px
- [x] Test 375px
- [x] Test 390px
- [x] Test 430px
- [x] Bottom navigation does not cover content
- [x] No horizontal overflow

## Verification
- [x] No console errors
- [x] No missing assets
- [x] No duplicate IDs
- [x] All JavaScript syntax passes
- [x] Today tab works
- [x] Study tab works
- [x] Practice tab works
- [x] Progress tab works
- [x] Smart Drill works
- [x] Wrong-answer flow works
- [x] Try Another Like This works
- [x] Review Due works
- [x] Again / Got It works
- [x] Daily plan updates
- [x] Done For Today works
- [x] Mock result works
- [x] 7-day plan appears
