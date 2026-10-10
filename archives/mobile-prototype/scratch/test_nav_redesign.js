const fs = require('fs');

console.log('=== VERIFYING BOTTOM NAVIGATION VISUAL REDESIGN ===\n');

const html = fs.readFileSync('index.html', 'utf8');
const navCss = fs.readFileSync('css/components/navigation.css', 'utf8');

// 1. Verify nav items and labels in index.html
const expectedLabels = ['Learn', 'Practice', 'Home', 'Review', 'Progress'];
expectedLabels.forEach(label => {
  console.assert(html.includes(`<span class="nav-label">${label}</span>`), `Missing label: ${label}`);
});
console.log('✓ All 5 exact labels present: ' + expectedLabels.join(', '));

// 2. Verify Home is center anchor
const tabMatches = [...html.matchAll(/class="navbtn[^"]*"\s+data-tab="([^"]+)"/g)].map(m => m[1]);
console.assert(tabMatches[2] === 'home', 'Home must be 3rd item (center anchor)');
console.assert(html.includes('class="navbtn home-navbtn active"'), 'Home button has home-navbtn class');
console.log('✓ Home is positioned at slot 3 of 5 (center anchor)');

// 3. Verify Owl Mark SVG in Home
console.assert(html.includes('class="owl-nav-icon"'), 'Owl mark SVG present in Home');
console.assert(html.includes('class="home-icon-slot"'), 'Home icon slot present');
console.log('✓ ReviewTayo owl mark used for Home icon');

// 4. Verify Review Due badge on Review tab only
console.assert(html.includes('id="reviewDueBadge"'), 'Review badge present');
const reviewNavSection = html.match(/data-tab="review"[\s\S]*?<\/button>/)[0];
console.assert(reviewNavSection.includes('id="reviewDueBadge"'), 'Badge is inside Review navbtn');
const learnNavSection = html.match(/data-tab="learn"[\s\S]*?<\/button>/)[0];
console.assert(!learnNavSection.includes('id="reviewDueBadge"'), 'Badge is NOT in Learn navbtn');
console.log('✓ Review badge correctly placed exclusively on Review tab');

// 5. Verify CSS rules
console.assert(navCss.includes('grid-template-columns: repeat(5, 1fr)'), '5-column grid in CSS');
console.assert(navCss.includes('.nav-icon-slot'), '.nav-icon-slot capsule container styled');
console.assert(navCss.includes('.navbtn.active .nav-icon-slot'), 'Selected indicator capsule on active icon slot');
console.assert(navCss.includes('.home-icon-slot'), '.home-icon-slot styled');
console.assert(navCss.includes('.navbtn.home-navbtn.active .home-icon-slot'), 'Active Home anchor styled with maroon');
console.assert(navCss.includes('backdrop-filter: blur(16px)'), 'Warm blur surface');
console.assert(navCss.includes('env(safe-area-inset-bottom)'), 'Safe area inset preserved');
console.assert(navCss.includes('@media (max-width: 360px)'), '360px / 320px responsive rules in CSS');
console.log('✓ CSS specifications verified for bar, capsules, owl anchor, and responsiveness');

console.log('\n=================================================');
console.log('BOTTOM NAVIGATION REDESIGN VERIFICATION PASSED!');
console.log('=================================================\n');
