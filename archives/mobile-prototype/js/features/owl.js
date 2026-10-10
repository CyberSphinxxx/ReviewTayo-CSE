(function(RT){
  RT.features = RT.features || {};

  function getSvg(state = 'neutral'){
    // Variations: neutral, happy, thinking, concerned, celebrating, resting
    let eyeLeft = '', eyeRight = '', capAngle = '0', beakModifier = '', extra = '';

    switch(state){
      case 'happy':
        // Upward curved happy eyes (arcs)
        eyeLeft = `
          <circle cx="74" cy="94" r="26" fill="#fff" stroke="#F8DDE2" stroke-width="4"/>
          <path d="M60 97 Q74 81 88 97" fill="none" stroke="#1B0A10" stroke-width="5" stroke-linecap="round"/>
          <circle cx="84" cy="107" r="4.5" fill="#E67E90" opacity="0.6"/>
        `;
        eyeRight = `
          <circle cx="126" cy="94" r="26" fill="#fff" stroke="#F8DDE2" stroke-width="4"/>
          <path d="M112 97 Q126 81 140 97" fill="none" stroke="#1B0A10" stroke-width="5" stroke-linecap="round"/>
          <circle cx="116" cy="107" r="4.5" fill="#E67E90" opacity="0.6"/>
        `;
        capAngle = '5';
        break;

      case 'thinking':
        // One pupil looking up-right, subtle furrowed brow
        eyeLeft = `
          <circle cx="74" cy="94" r="26" fill="#fff" stroke="#F8DDE2" stroke-width="4"/>
          <path d="M56 79 Q74 85 90 82" fill="none" stroke="#6B0F25" stroke-width="4" stroke-linecap="round"/>
          <g class="pupil">
            <circle cx="78" cy="88" r="11" fill="#1B0A10"/>
            <circle cx="81" cy="85" r="3.5" fill="#fff"/>
          </g>
        `;
        eyeRight = `
          <circle cx="126" cy="94" r="26" fill="#fff" stroke="#F8DDE2" stroke-width="4"/>
          <path d="M110 82 Q126 85 144 79" fill="none" stroke="#6B0F25" stroke-width="4" stroke-linecap="round"/>
          <g class="pupil">
            <circle cx="130" cy="88" r="11" fill="#1B0A10"/>
            <circle cx="133" cy="85" r="3.5" fill="#fff"/>
          </g>
        `;
        capAngle = '-6';
        break;

      case 'concerned':
        // Slightly worried brows, wider pupils looking slightly down
        eyeLeft = `
          <circle cx="74" cy="94" r="26" fill="#fff" stroke="#F8DDE2" stroke-width="4"/>
          <path d="M58 83 Q74 77 90 85" fill="none" stroke="#6B0F25" stroke-width="4" stroke-linecap="round"/>
          <g class="pupil">
            <circle cx="74" cy="96" r="13" fill="#1B0A10"/>
            <circle cx="76" cy="93" r="4" fill="#fff"/>
          </g>
        `;
        eyeRight = `
          <circle cx="126" cy="94" r="26" fill="#fff" stroke="#F8DDE2" stroke-width="4"/>
          <path d="M110 85 Q126 77 142 83" fill="none" stroke="#6B0F25" stroke-width="4" stroke-linecap="round"/>
          <g class="pupil">
            <circle cx="126" cy="96" r="13" fill="#1B0A10"/>
            <circle cx="128" cy="93" r="4" fill="#fff"/>
          </g>
        `;
        capAngle = '0';
        break;

      case 'celebrating':
        // Sparkle stars near eyes, joyful closed crescents, tilted cap
        eyeLeft = `
          <circle cx="74" cy="94" r="26" fill="#fff" stroke="#F8DDE2" stroke-width="4"/>
          <path d="M59 96 Q74 78 89 96" fill="none" stroke="#1B0A10" stroke-width="5" stroke-linecap="round"/>
          <circle cx="85" cy="107" r="5" fill="#E67E90" opacity="0.7"/>
        `;
        eyeRight = `
          <circle cx="126" cy="94" r="26" fill="#fff" stroke="#F8DDE2" stroke-width="4"/>
          <path d="M111 96 Q126 78 141 96" fill="none" stroke="#1B0A10" stroke-width="5" stroke-linecap="round"/>
          <circle cx="115" cy="107" r="5" fill="#E67E90" opacity="0.7"/>
        `;
        extra = `
          <path d="M28 65 L32 70 L38 72 L32 74 L28 79 L25 74 L19 72 L25 70 Z" fill="#F6B93B"/>
          <path d="M172 65 L175 70 L181 72 L175 74 L172 79 L169 74 L163 72 L169 70 Z" fill="#F6B93B"/>
        `;
        capAngle = '10';
        break;

      case 'resting':
        // Relaxed closed eyes (gently downward), resting calm
        eyeLeft = `
          <circle cx="74" cy="94" r="26" fill="#fff" stroke="#F8DDE2" stroke-width="4"/>
          <path d="M60 93 Q74 102 88 93" fill="none" stroke="#684A54" stroke-width="4.5" stroke-linecap="round"/>
        `;
        eyeRight = `
          <circle cx="126" cy="94" r="26" fill="#fff" stroke="#F8DDE2" stroke-width="4"/>
          <path d="M112 93 Q126 102 140 93" fill="none" stroke="#684A54" stroke-width="4.5" stroke-linecap="round"/>
        `;
        capAngle = '-3';
        break;

      case 'neutral':
      default:
        // Idle open round eyes with reflection
        eyeLeft = `
          <circle cx="74" cy="94" r="26" fill="#fff" stroke="#F8DDE2" stroke-width="4"/>
          <g class="pupil">
            <circle cx="74" cy="94" r="12" fill="#1B0A10"/>
            <circle cx="78" cy="89" r="4" fill="#fff"/>
          </g>
        `;
        eyeRight = `
          <circle cx="126" cy="94" r="26" fill="#fff" stroke="#F8DDE2" stroke-width="4"/>
          <g class="pupil">
            <circle cx="126" cy="94" r="12" fill="#1B0A10"/>
            <circle cx="130" cy="89" r="4" fill="#fff"/>
          </g>
        `;
        capAngle = '0';
        break;
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 236" class="owl-svg owl-state-${state}" fill="none">
        <!-- Feet -->
        <rect x="66" y="208" width="30" height="14" rx="7" fill="#F6B93B"/>
        <rect x="104" y="208" width="30" height="14" rx="7" fill="#F6B93B"/>
        <!-- Body -->
        <path d="M100 34C152 34 180 74 180 132C180 188 150 214 100 214C50 214 20 188 20 132C20 74 48 34 100 34Z" fill="#8A1630"/>
        <!-- Ear tufts -->
        <path d="M34 56L54 18L88 44Z" fill="#6B0F25"/>
        <path d="M166 56L146 18L112 44Z" fill="#6B0F25"/>
        <!-- Wings -->
        <path d="M22 118C2 150 10 192 44 200C42 172 38 146 22 118Z" fill="#6B0F25"/>
        <path d="M178 118C198 150 190 192 156 200C158 172 162 146 178 118Z" fill="#6B0F25"/>
        <!-- Belly -->
        <ellipse cx="100" cy="162" rx="48" ry="50" fill="#F8DDE2"/>
        <!-- Feathers -->
        <path d="M74 142q13 11 26 0q13 11 26 0M70 166q15 11 30 0q15 11 30 0M78 190q11 9 22 0q11 9 22 0" fill="none" stroke="#DDA3AF" stroke-width="3.5" stroke-linecap="round"/>
        <!-- Head -->
        <ellipse cx="100" cy="94" rx="68" ry="48" fill="#A81B3B"/>
        <!-- Graduation Cap (Rotated dynamically) -->
        <g id="graduation-cap" transform="rotate(${capAngle} 100 34)">
          <path d="M60 34L100 14L140 34L100 54Z" fill="#221219"/>
          <path d="M80 44V58Q100 68 120 58V44" fill="#33202A"/>
          <path d="M140 34V58" stroke="#F6B93B" stroke-width="3.5" stroke-linecap="round"/>
          <circle cx="140" cy="61" r="5" fill="#F6B93B"/>
        </g>
        <!-- Extra elements -->
        ${extra}
        <!-- Eyes -->
        <g class="eye left-eye">${eyeLeft}</g>
        <g class="eye right-eye">${eyeRight}</g>
        <!-- Beak -->
        <path d="M91 108L109 108L100 127Z" fill="#F6B93B" stroke="#F6B93B" stroke-width="4" stroke-linejoin="round"/>
      </svg>
    `;
  }

  function render(selectorOrEl, state = 'neutral'){
    const el = typeof selectorOrEl === 'string' ? RT.core.byId(selectorOrEl) || document.querySelector(selectorOrEl) : selectorOrEl;
    if(!el) return;
    el.innerHTML = getSvg(state);
  }

  RT.features.owl = {
    getSvg,
    render
  };
})(window.ReviewTayo);
