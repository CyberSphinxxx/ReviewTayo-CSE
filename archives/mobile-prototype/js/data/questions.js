(function(RT){
  RT.data = RT.data || {};
  RT.data.questions = [
    // VERBAL ABILITY - Sentence Completion
    {
      id: 'verbal-unanimous',
      tag: 'Verbal Ability',
      subjectKey: 'verbal',
      concept: 'Sentence Completion',
      conceptStatus: 'developing',
      difficulty: 'standard',
      q: 'Choose the word that best completes the sentence: The committee reached a ____ decision after reviewing all the evidence.',
      c: ['hasty', 'unanimous', 'careless', 'temporary'],
      a: 1,
      e: '“Unanimous” means everyone agreed, which best fits a committee reaching one shared decision.',
      simplified: 'Think of it this way: when 10 out of 10 people raise their hand for the same choice with zero objections, that decision is unanimous.',
      steps: '1. Identify the clue: "committee reached a... decision after reviewing all evidence". 2. Eliminate negative or unfitting options: "hasty" and "careless" contradict careful review. 3. "Unanimous" precisely denotes complete collective agreement.',
      example: 'Example: "The jury reached a unanimous verdict" means every single member voted the exact same way.'
    },
    {
      id: 'verbal-sentence-lucid',
      tag: 'Verbal Ability',
      subjectKey: 'verbal',
      concept: 'Sentence Completion',
      conceptStatus: 'developing',
      difficulty: 'standard',
      relatedTo: 'verbal-unanimous',
      q: 'Choose the word that best completes the sentence: The professor gave such a ____ explanation that even beginners understood the complex theorem.',
      c: ['vague', 'lucid', 'tedious', 'convoluted'],
      a: 1,
      e: '“Lucid” means clear, transparent, and easy to understand.',
      simplified: 'Think of lucid like clear glass or clean water. A lucid explanation is crystal clear, not foggy or confusing.',
      steps: '1. Notice the result: "even beginners understood". 2. The missing adjective must describe clarity. 3. "Vague" and "convoluted" mean unclear; "tedious" means boring. "Lucid" means brilliantly clear.',
      example: 'Example: A lucid instruction leaves zero confusion about what to do next.'
    },
    {
      id: 'verbal-sentence-resolute',
      tag: 'Verbal Ability',
      subjectKey: 'verbal',
      concept: 'Sentence Completion',
      conceptStatus: 'developing',
      difficulty: 'challenging',
      relatedTo: 'verbal-unanimous',
      q: 'Choose the word that best completes the sentence: Despite facing severe public criticism, the director remained ____ in her reform agenda.',
      c: ['vacillating', 'resolute', 'indifferent', 'ambivalent'],
      a: 1,
      e: '“Resolute” means admirably purposeful, determined, and unwavering.',
      simplified: 'Resolute means standing firm like a rock, refusing to back down even when the wind blows hard against you.',
      steps: '1. Notice the contrast word "Despite". 2. Despite criticism, she did not waver. 3. "Vacillating" and "ambivalent" mean indecisive. "Resolute" fits unwavering purpose.',
      example: 'Example: "He was resolute in finishing his exam preparation on schedule."'
    },

    // VERBAL ABILITY - Vocabulary
    {
      id: 'verbal-concise',
      tag: 'Verbal Ability',
      subjectKey: 'verbal',
      concept: 'Vocabulary',
      conceptStatus: 'strong',
      difficulty: 'easy',
      q: 'Which word is closest in meaning to “CONCISE”?',
      c: ['Brief', 'Confusing', 'Lengthy', 'Indirect'],
      a: 0,
      e: '“Concise” means expressing much in few words; brief and to the point.',
      simplified: 'Concise means saying what you need to say without fluff or unnecessary words.',
      steps: '1. Root meaning: concise relates to "cutting" away excess. 2. Look for brevity. 3. "Brief" is the direct synonym.',
      example: 'Example: A concise memo gives the action points in three bullet points rather than three pages.'
    },
    {
      id: 'verbal-vocab-candid',
      tag: 'Verbal Ability',
      subjectKey: 'verbal',
      concept: 'Vocabulary',
      conceptStatus: 'strong',
      difficulty: 'standard',
      relatedTo: 'verbal-concise',
      q: 'Which word is most nearly opposite in meaning to “CANDID”?',
      c: ['Deceptive', 'Blunt', 'Straightforward', 'Sincere'],
      a: 0,
      e: '“Candid” means truthful, open, and frank. The antonym is “Deceptive”.',
      simplified: 'Candid means honest and unfiltered. The opposite is someone hiding the truth or being deceitful.',
      steps: '1. Define candid: honest, open, straightforward. 2. We need the opposite (antonym). 3. Blunt and sincere are synonyms; "Deceptive" is the opposite.',
      example: 'Example: Her candid evaluation shocked them because people usually sugarcoat bad news.'
    },

    // NUMERICAL ABILITY - Basic Arithmetic
    {
      id: 'numerical-notebooks',
      tag: 'Numerical Ability',
      subjectKey: 'numerical',
      concept: 'Basic Arithmetic',
      conceptStatus: 'mastered',
      difficulty: 'easy',
      q: 'If 5 notebooks cost ₱175, how much do 8 notebooks cost at the same rate?',
      c: ['₱240', '₱260', '₱280', '₱300'],
      a: 2,
      e: '₱175 ÷ 5 = ₱35 per notebook. 8 × ₱35 = ₱280.',
      simplified: 'First find the cost of just one notebook (₱175 ÷ 5 = ₱35). Then multiply by 8 (8 × 35 = ₱280).',
      steps: '1. Unit cost: 175 / 5 = 35. 2. Multiply unit cost by target quantity: 35 * 8 = 280.',
      example: 'Quick mental check: 8 * 30 = 240, 8 * 5 = 40. 240 + 40 = 280.'
    },
    {
      id: 'numerical-arithmetic-ratio',
      tag: 'Numerical Ability',
      subjectKey: 'numerical',
      concept: 'Basic Arithmetic',
      conceptStatus: 'mastered',
      difficulty: 'standard',
      relatedTo: 'numerical-notebooks',
      q: 'A printer produces 120 pages in 4 minutes. At this rate, how many pages will it print in 15 minutes?',
      c: ['360', '420', '450', '480'],
      a: 2,
      e: 'Rate = 120 ÷ 4 = 30 pages per minute. In 15 minutes: 15 × 30 = 450 pages.',
      simplified: 'Find how many pages come out in 1 minute (120 ÷ 4 = 30). In 15 minutes, you get 15 × 30 = 450.',
      steps: '1. Rate = Total / Time = 120 / 4 = 30 ppm. 2. Output = Rate * Time = 30 * 15 = 450.',
      example: 'Mental shortcut: 15 minutes is 3 batches of 4 min (12 min = 360) plus 3 min (90) = 450.'
    },

    // NUMERICAL ABILITY - Percentages & Discounts
    {
      id: 'numerical-discount',
      tag: 'Numerical Ability',
      subjectKey: 'numerical',
      concept: 'Percentages & Discounts',
      conceptStatus: 'strong',
      difficulty: 'standard',
      q: 'An office chair originally priced at ₱3,500 is sold with a 20% discount. What is the sale price?',
      c: ['₱2,600', '₱2,700', '₱2,800', '₱2,900'],
      a: 2,
      e: '20% of ₱3,500 is ₱700. Sale price = ₱3,500 − ₱700 = ₱2,800 (or ₱3,500 × 0.80 = ₱2,800).',
      simplified: 'If there is a 20% discount, you pay 80% of the price. 80% of 3,500 is 0.8 × 3,500 = ₱2,800.',
      steps: '1. 10% of 3,500 = 350. 2. 20% = 350 * 2 = 700. 3. 3,500 - 700 = 2,800.',
      example: 'Example: Paying 80 cents on every peso means 8 * 350 = 2,800.'
    },

    // ANALYTICAL ABILITY - Logical Statements
    {
      id: 'analytical-clerks',
      tag: 'Analytical Ability',
      subjectKey: 'analytical',
      concept: 'Logical Statements & Syllogisms',
      conceptStatus: 'strong',
      difficulty: 'standard',
      q: 'Statement: All clerks are employees. Some employees work remotely. Which statement MUST be true?',
      c: ['All clerks work remotely', 'Some clerks work remotely', 'All clerks are employees', 'No employees are clerks'],
      a: 2,
      e: 'The premise directly states that "All clerks are employees." No further inference is required or guaranteed.',
      simplified: 'Do not assume extra facts that are not explicitly stated. The statement itself guarantees that every clerk is an employee.',
      steps: '1. Examine premise 1: All clerks are employees (Clerk circle is inside Employee circle). 2. Premise 2: Some employees work remotely. 3. We cannot know if the remote employees include clerks. Only premise 1 is guaranteed.',
      example: 'Venn Diagram: Clerks are inside Employees. Remote workers overlap with Employees, but may or may not overlap with Clerks.'
    },
    {
      id: 'analytical-logic-syllogism',
      tag: 'Analytical Ability',
      subjectKey: 'analytical',
      concept: 'Logical Statements & Syllogisms',
      conceptStatus: 'strong',
      difficulty: 'challenging',
      relatedTo: 'analytical-clerks',
      q: 'Statements: All mammals breathe air. All whales are mammals. What is the necessary logical conclusion?',
      c: ['All mammals are whales', 'All whales breathe air', 'Some whales do not breathe air', 'Only whales breathe air'],
      a: 1,
      e: 'By transitive property: Whales ⊂ Mammals ⊂ Air-breathers. Therefore, all whales breathe air.',
      simplified: 'If every whale is a mammal, and every mammal breathes air, then every whale must breathe air.',
      steps: '1. A implies B (Whale implies Mammal). 2. B implies C (Mammal implies Air-breather). 3. Therefore, A implies C (Whale implies Air-breather).',
      example: 'Classical syllogism: All A are B; all B are C; therefore all A are C.'
    },

    // GENERAL INFORMATION - Philippine Government & Constitution
    {
      id: 'general-judicial',
      tag: 'General Information',
      subjectKey: 'general',
      concept: 'Philippine Constitution',
      conceptStatus: 'strong',
      difficulty: 'standard',
      q: 'Which branch of the Philippine government is primarily vested with the power to interpret laws and settle legal controversies?',
      c: ['Executive Branch', 'Legislative Branch', 'Judicial Branch', 'Constitutional Commissions'],
      a: 2,
      e: 'Article VIII of the 1987 Constitution vests judicial power in the Supreme Court and lower courts to interpret laws and resolve actual controversies.',
      simplified: 'Think of the three branches like a team: Congress makes the laws, the President enforces the laws, and the Courts (Judicial) act like referees interpreting the rules.',
      steps: '1. Legislative: enacts/makes laws. 2. Executive: enforces/executes laws. 3. Judicial: interprets laws and adjudicates rights.',
      example: 'When two parties disagree on how a tax law applies, the Supreme Court settles the dispute.'
    },
    {
      id: 'general-const-rights',
      tag: 'General Information',
      subjectKey: 'general',
      concept: 'Philippine Constitution',
      conceptStatus: 'strong',
      difficulty: 'standard',
      relatedTo: 'general-judicial',
      q: 'Under Article III, Section 1 of the 1987 Constitution, no person shall be deprived of life, liberty, or property without:',
      c: ['compensation', 'prior executive approval', 'due process of law', 'written public consent'],
      a: 2,
      e: 'Article III, Section 1 states: "No person shall be deprived of life, liberty, or property without due process of law..."',
      simplified: 'The government cannot punish you or take your property without giving you a fair notice and a fair chance to defend yourself.',
      steps: '1. Recall Article III, Section 1 (Due Process Clause). 2. The constitutional safeguard requires procedural and substantive due process of law.',
      example: 'Even in administrative cases, an employee must be informed of charges and allowed to submit an explanation.'
    },

    // GENERAL INFORMATION - RA 6713 Code of Conduct
    {
      id: 'general-ra6713',
      tag: 'General Information',
      subjectKey: 'general',
      concept: 'RA 6713 Code of Conduct',
      conceptStatus: 'strong',
      difficulty: 'standard',
      q: 'Under Republic Act 6713, public officials and employees must respond to letters, telegrams, or other communications within how many working days?',
      c: ['5 working days', '10 working days', '15 working days', '30 working days'],
      a: 2,
      e: 'Section 5(a) of RA 6713 mandates all public officials and employees to act promptly on letters and requests within fifteen (15) working days from receipt.',
      simplified: 'Whenever a citizen writes an official inquiry, the agency must send a response or action within 15 working days.',
      steps: '1. Recall Section 5 of RA 6713 (Duties of Public Officials). 2. Rule: 15 working days from receipt to send reply or action.',
      example: 'If an applicant requests a certificate on Monday, the office has up to 15 working days to provide or explain the status.'
    },

    // CLERICAL ABILITY (for Sub-Professional track)
    {
      id: 'clerical-filing-alpha',
      tag: 'Clerical Ability',
      subjectKey: 'clerical',
      concept: 'Alphabetical Filing Rules',
      conceptStatus: 'mastered',
      difficulty: 'standard',
      q: 'Following standard directory filing rules, which name should appear FIRST?',
      c: ['De la Cruz, Juan', 'Del Rosario, Ana', 'De Jesus, Maria', 'Dela Torre, Pedro'],
      a: 2,
      e: 'In standard filing, spaces are indexed unit by unit: "De", then "Jesus" comes alphabetically before "la Cruz". Therefore, "De Jesus, Maria" is first.',
      simplified: 'Compare letter by letter: "De" comes before "Del" and "Dela". Between "De Jesus" and "De la Cruz", J comes before L.',
      steps: '1. First indexing units: "De", "Del", "Dela". 2. "De" entries come first. 3. Compare second units: "Jesus" vs "la Cruz". J precedes L. 4. De Jesus, Maria is first.',
      example: 'Directory order: De Jesus → De la Cruz → Del Rosario → Dela Torre.'
    },
    {
      id: 'clerical-filing-business',
      tag: 'Clerical Ability',
      subjectKey: 'clerical',
      concept: 'Alphabetical Filing Rules',
      conceptStatus: 'mastered',
      difficulty: 'standard',
      relatedTo: 'clerical-filing-alpha',
      q: 'In filing corporate names, how is the article "The" indexed when it begins a business name like "The Sunshine Bakery"?',
      c: ['Indexed as the first unit', 'Indexed as the last unit or placed in parentheses', 'Completely deleted and ignored', 'Capitalized and placed in the middle'],
      a: 1,
      e: 'Under standard filing rules, "The" at the start of a business name is treated as the last indexing unit (e.g., "Sunshine Bakery, The").',
      simplified: 'Articles like "The", "A", and "An" at the beginning of a company name are moved to the very end so you look up the main keyword.',
      steps: '1. Rule: Leading articles ("The", "A") are shifted to the end. 2. "The Sunshine Bakery" is indexed as "Sunshine Bakery, The".',
      example: 'You look up "The Manila Hotel" under M for "Manila Hotel, The".'
    }
  ];
})(window.ReviewTayo);
