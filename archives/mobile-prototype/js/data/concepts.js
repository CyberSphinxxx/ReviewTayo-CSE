(function(RT){
  RT.data = RT.data || {};
  RT.data.concepts = {
    professional: {
      verbal: {
        title: 'Verbal Ability',
        shortCode: 'VA',
        overallAccuracy: 64,
        status: 'Needs attention · improving slowly',
        concepts: [
          { name: 'Vocabulary', status: 'strong', accuracy: 82, note: 'Good retention on synonyms and antonyms.' },
          { name: 'Sentence Completion', status: 'developing', accuracy: 61, note: 'Grammatical context clues need practice.' },
          { name: 'Reading Comprehension', status: 'developing', accuracy: 67, note: 'Main-idea questions solid; inferences lagging.' },
          { name: 'Grammar & Correct Usage', status: 'strong', accuracy: 80, note: 'Subject-verb agreement consistently accurate.' },
          { name: 'Paragraph Organization', status: 'learning', accuracy: 52, note: 'Chronological connectors frequently misplaced.' }
        ]
      },
      numerical: {
        title: 'Numerical Ability',
        shortCode: 'NA',
        overallAccuracy: 73,
        status: 'On track · steady progress',
        concepts: [
          { name: 'Basic Arithmetic', status: 'mastered', accuracy: 92, note: 'Fractions, decimals, and whole numbers mastered.' },
          { name: 'Word Problems & Algebra', status: 'developing', accuracy: 64, note: 'Age and rate problems take extra time.' },
          { name: 'Percentages & Discounts', status: 'strong', accuracy: 78, note: 'Markup and markdown formulas well retained.' },
          { name: 'Number Sequences', status: 'strong', accuracy: 76, note: 'Pattern recognition reliable on standard tests.' },
          { name: 'Ratio and Proportion', status: 'developing', accuracy: 65, note: 'Partitive proportions need a refresher.' }
        ]
      },
      analytical: {
        title: 'Analytical Ability',
        shortCode: 'AA',
        overallAccuracy: 78,
        status: 'Your strongest area',
        concepts: [
          { name: 'Logical Statements & Syllogisms', status: 'strong', accuracy: 84, note: 'Valid deductions and Venn relationships clear.' },
          { name: 'Data Interpretation', status: 'strong', accuracy: 80, note: 'Bar and pie chart reading accurate.' },
          { name: 'Analogy & Logic Relations', status: 'mastered', accuracy: 88, note: 'Cause-effect and part-whole analogies mastered.' },
          { name: 'Pattern Recognition', status: 'developing', accuracy: 68, note: 'Matrix transformations need more practice.' }
        ]
      },
      general: {
        title: 'General Information',
        shortCode: 'GI',
        overallAccuracy: 76,
        status: 'On track',
        concepts: [
          { name: 'Philippine Constitution', status: 'strong', accuracy: 82, note: 'Bill of Rights and 3 Branches well understood.' },
          { name: 'RA 6713 Code of Conduct', status: 'strong', accuracy: 79, note: 'Public official ethical norms and duties clear.' },
          { name: 'Peace & Human Rights', status: 'developing', accuracy: 68, note: 'International treaties and domestic protections.' },
          { name: 'Environmental Management', status: 'strong', accuracy: 75, note: 'Clean Air and Ecological Waste management acts.' }
        ]
      }
    },
    subprofessional: {
      verbal: {
        title: 'Verbal Ability',
        shortCode: 'VA',
        overallAccuracy: 64,
        status: 'Needs attention · improving slowly',
        concepts: [
          { name: 'Vocabulary', status: 'strong', accuracy: 82, note: 'Good retention on synonyms and antonyms.' },
          { name: 'Sentence Completion', status: 'developing', accuracy: 61, note: 'Grammatical context clues need practice.' },
          { name: 'Reading Comprehension', status: 'developing', accuracy: 67, note: 'Main-idea questions solid; inferences lagging.' },
          { name: 'Grammar & Correct Usage', status: 'strong', accuracy: 80, note: 'Subject-verb agreement consistently accurate.' },
          { name: 'Paragraph Organization', status: 'learning', accuracy: 52, note: 'Chronological connectors frequently misplaced.' }
        ]
      },
      numerical: {
        title: 'Numerical Ability',
        shortCode: 'NA',
        overallAccuracy: 73,
        status: 'On track · steady progress',
        concepts: [
          { name: 'Basic Arithmetic', status: 'mastered', accuracy: 92, note: 'Fractions, decimals, and whole numbers mastered.' },
          { name: 'Word Problems & Algebra', status: 'developing', accuracy: 64, note: 'Age and rate problems take extra time.' },
          { name: 'Percentages & Discounts', status: 'strong', accuracy: 78, note: 'Markup and markdown formulas well retained.' },
          { name: 'Number Sequences', status: 'strong', accuracy: 76, note: 'Pattern recognition reliable on standard tests.' }
        ]
      },
      clerical: {
        title: 'Clerical Ability',
        shortCode: 'CA',
        overallAccuracy: 81,
        status: 'Your strongest area',
        concepts: [
          { name: 'Alphabetical Filing Rules', status: 'mastered', accuracy: 91, note: 'Standard directory and dictionary rules mastered.' },
          { name: 'Spelling Accuracy', status: 'strong', accuracy: 84, note: 'Easily confused homophones and double letters.' },
          { name: 'Clerical Operations & Verification', status: 'strong', accuracy: 78, note: 'Record checking and mismatch identification.' },
          { name: 'Office Coding & Tabulation', status: 'developing', accuracy: 69, note: 'Code mapping under strict time limits.' }
        ]
      },
      general: {
        title: 'General Information',
        shortCode: 'GI',
        overallAccuracy: 76,
        status: 'On track',
        concepts: [
          { name: 'Philippine Constitution', status: 'strong', accuracy: 82, note: 'Bill of Rights and 3 Branches well understood.' },
          { name: 'RA 6713 Code of Conduct', status: 'strong', accuracy: 79, note: 'Public official ethical norms and duties clear.' },
          { name: 'Peace & Human Rights', status: 'developing', accuracy: 68, note: 'Domestic protections and civic liberties.' },
          { name: 'Environmental Management', status: 'strong', accuracy: 75, note: 'Clean Air and Ecological Waste management acts.' }
        ]
      }
    }
  };
})(window.ReviewTayo);
