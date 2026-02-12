/**
 * ui.js — Predictor Overlay UI
 *
 * Injects a glassmorphism-styled overlay panel into the Pokémon Showdown
 * battle page, displaying real-time predictions and recommendations.
 */

const PredictorUI = (() => {
  let panel = null;
  let isDragging = false;
  let isMinimized = false;
  let dragOffset = { x: 0, y: 0 };

  /**
   * Create and inject the overlay panel
   */
  function create() {
    if (panel) return;

    panel = document.createElement('div');
    panel.id = 'showdown-predictor';
    panel.innerHTML = `
      <div class="sp-header" id="sp-drag-handle">
        <span class="sp-title">🔮 Battle Predictor</span>
        <div class="sp-header-controls">
          <span class="sp-archetype-badge" id="sp-archetype">—</span>
          <button class="sp-btn-minimize" id="sp-minimize" title="Minimize">▬</button>
        </div>
      </div>
      <div class="sp-body" id="sp-body">
        <div class="sp-section sp-speed-section" id="sp-speed-section">
          <div class="sp-speed-indicator" id="sp-speed-indicator">
            <span class="sp-speed-icon">⚡</span>
            <span class="sp-speed-text" id="sp-speed-text">Analyzing speed...</span>
          </div>
        </div>

        <div class="sp-section">
          <div class="sp-section-header">
            <span class="sp-section-icon">🎯</span>
            <span>Opponent Prediction</span>
          </div>
          <div class="sp-switch-prob" id="sp-switch-prob">
            <span class="sp-label">Switch probability:</span>
            <span class="sp-badge sp-badge-low" id="sp-switch-badge">—</span>
          </div>
          <div class="sp-predicted-move" id="sp-predicted-move">
            <span class="sp-label">Predicted move:</span>
            <span class="sp-value" id="sp-pred-move-name">—</span>
          </div>
          <div class="sp-pred-damage" id="sp-pred-damage">
            <span class="sp-label">Estimated damage to us:</span>
            <span class="sp-value sp-damage-value" id="sp-pred-dmg-val">—</span>
          </div>
          <div class="sp-opp-moves-list" id="sp-opp-moves-list"></div>
        </div>

        <div class="sp-section sp-rec-section">
          <div class="sp-section-header">
            <span class="sp-section-icon">✅</span>
            <span>Recommended Move</span>
          </div>
          <div class="sp-recommended" id="sp-recommended">
            <div class="sp-rec-move" id="sp-rec-move">—</div>
            <div class="sp-rec-reason" id="sp-rec-reason">Analyzing...</div>
            <div class="sp-rec-damage" id="sp-rec-damage">—</div>
          </div>
          <div class="sp-all-moves" id="sp-all-moves"></div>
        </div>

        <div class="sp-section sp-field-section">
          <div class="sp-section-header">
            <span class="sp-section-icon">🌍</span>
            <span>Field Conditions</span>
          </div>
          <div class="sp-field-state" id="sp-field-state">Clear</div>
        </div>

        <div class="sp-section sp-teams-section">
          <div class="sp-section-header">
            <span class="sp-section-icon">📊</span>
            <span>Known Info</span>
          </div>
          <div class="sp-teams-compact" id="sp-teams-compact"></div>
        </div>

        <div class="sp-footer">
          <span class="sp-turn" id="sp-turn">Turn 0</span>
          <span class="sp-status" id="sp-status">Waiting for battle...</span>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    // Make draggable
    setupDrag();

    // Minimize toggle
    document.getElementById('sp-minimize').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMinimize();
    });

    console.log('[ShowdownPredictor] UI: Panel created');
  }

  /**
   * Toggle minimize state
   */
  function toggleMinimize() {
    isMinimized = !isMinimized;
    const body = document.getElementById('sp-body');
    const btn = document.getElementById('sp-minimize');

    if (isMinimized) {
      body.style.display = 'none';
      panel.classList.add('sp-minimized');
      btn.textContent = '▲';
      btn.title = 'Expand';
    } else {
      body.style.display = 'block';
      panel.classList.remove('sp-minimized');
      btn.textContent = '▬';
      btn.title = 'Minimize';
    }
  }

  /**
   * Setup drag functionality
   */
  function setupDrag() {
    const handle = document.getElementById('sp-drag-handle');

    handle.addEventListener('mousedown', (e) => {
      if (e.target.closest('.sp-btn-minimize')) return;
      isDragging = true;
      dragOffset.x = e.clientX - panel.offsetLeft;
      dragOffset.y = e.clientY - panel.offsetTop;
      panel.style.transition = 'none';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const x = Math.max(0, Math.min(window.innerWidth - 300, e.clientX - dragOffset.x));
      const y = Math.max(0, Math.min(window.innerHeight - 50, e.clientY - dragOffset.y));
      panel.style.left = x + 'px';
      panel.style.top = y + 'px';
      panel.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      panel.style.transition = '';
    });
  }

  /**
   * Update the UI with analysis results
   */
  function update(analysis) {
    if (!panel || !analysis) return;

    // Turn
    const turnEl = document.getElementById('sp-turn');
    if (turnEl) turnEl.textContent = `Turn ${analysis.turnNumber}`;

    // Status
    const statusEl = document.getElementById('sp-status');
    if (statusEl) {
      statusEl.textContent = analysis.myActive && analysis.opponentActive
        ? `${analysis.myActive} vs ${analysis.opponentActive}`
        : 'Waiting for battle...';
    }

    // Archetype badge
    const archetypeEl = document.getElementById('sp-archetype');
    if (archetypeEl && analysis.oppArchetype) {
      archetypeEl.textContent = analysis.oppArchetype;
      archetypeEl.className = 'sp-archetype-badge sp-arch-' + analysis.oppArchetype.toLowerCase();
    }

    // Switch prediction
    updateSwitchPrediction(analysis.switchPrediction);

    // Opponent moves
    updateOpponentMoves(analysis.oppMoves);

    // Speed analysis
    updateSpeedAnalysis(analysis.speedAnalysis);

    // Recommendations
    updateRecommendations(analysis.recommendations);

    // Field state
    updateFieldState(analysis.field);

    // Teams
    updateTeamsCompact(analysis);
  }

  function updateSwitchPrediction(pred) {
    if (!pred) return;

    const badge = document.getElementById('sp-switch-badge');
    if (badge) {
      badge.textContent = pred.probability;
      badge.className = 'sp-badge';
      if (pred.probability === 'HIGH') badge.classList.add('sp-badge-high');
      else if (pred.probability === 'MEDIUM') badge.classList.add('sp-badge-med');
      else badge.classList.add('sp-badge-low');

      badge.title = pred.reason || '';
    }
  }

  function updateOpponentMoves(moves) {
    // Top predicted move
    const predMoveEl = document.getElementById('sp-pred-move-name');
    const predDmgEl = document.getElementById('sp-pred-dmg-val');
    const listEl = document.getElementById('sp-opp-moves-list');

    if (!moves || moves.length === 0) {
      if (predMoveEl) predMoveEl.textContent = 'Unknown / No active';
      if (predDmgEl) predDmgEl.textContent = '—';
      if (listEl) listEl.innerHTML = '<div class="sp-opp-move-row">No move data available</div>';
      return;
    }

    if (predMoveEl && moves[0]) {
      predMoveEl.textContent = `${moves[0].name} (${moves[0].probability}%)`;
    }
    if (predDmgEl && moves[0]) {
      const dmg = moves[0].damage;
      predDmgEl.textContent = dmg.max > 0 ? `${dmg.min}-${dmg.max}%` : 'Status';
      predDmgEl.className = 'sp-value sp-damage-value';
      if (dmg.max >= 50) predDmgEl.classList.add('sp-dmg-high');
      else if (dmg.max >= 25) predDmgEl.classList.add('sp-dmg-med');
    }

    // All opponent moves
    if (listEl) {
      listEl.innerHTML = moves.slice(0, 4).map(m => {
        const moveInfo = lookupMove(m.name);
        const typeClass = moveInfo ? `sp-type-${moveInfo.type.toLowerCase()}` : '';
        const dmgText = m.damage.max > 0 ? `${m.damage.min}-${m.damage.max}%` : 'Status';
        return `
          <div class="sp-opp-move-row">
            <span class="sp-move-name ${typeClass}">${m.name}</span>
            <span class="sp-move-prob">${m.probability}%</span>
            <span class="sp-move-dmg">${dmgText}</span>
          </div>
        `;
      }).join('');
    }
  }

  function updateSpeedAnalysis(speed) {
    const section = document.getElementById('sp-speed-section');
    const indicator = document.getElementById('sp-speed-indicator');
    const textEl = document.getElementById('sp-speed-text');

    if (!speed || !indicator || !textEl) return;

    textEl.textContent = speed.detail;

    indicator.className = 'sp-speed-indicator';
    if (speed.verdict === 'OUTSPED') {
      indicator.classList.add('sp-speed-danger');
      section.classList.add('sp-speed-danger-section');
    } else if (speed.verdict === 'FASTER') {
      indicator.classList.add('sp-speed-safe');
      section.classList.remove('sp-speed-danger-section');
    } else {
      indicator.classList.add('sp-speed-tie');
      section.classList.remove('sp-speed-danger-section');
    }
  }

  function updateRecommendations(recs) {
    const moveEl = document.getElementById('sp-rec-move');
    const reasonEl = document.getElementById('sp-rec-reason');
    const dmgEl = document.getElementById('sp-rec-damage');
    const allMovesEl = document.getElementById('sp-all-moves');

    if (!recs || recs.length === 0) {
      if (moveEl) moveEl.textContent = '—';
      if (reasonEl) reasonEl.textContent = 'No recommendations available';
      if (dmgEl) dmgEl.textContent = '';
      if (allMovesEl) allMovesEl.innerHTML = '';
      return;
    }

    const topRec = recs[0];

    if (moveEl) moveEl.textContent = topRec.name;
    if (reasonEl) reasonEl.textContent = topRec.reason || 'Best damage output';
    if (dmgEl) {
      const dmg = topRec.damage;
      dmgEl.textContent = dmg.max > 0 ? `${dmg.min}-${dmg.max}% damage` : 'Status move';
    }

    // All move options
    if (allMovesEl) {
      allMovesEl.innerHTML = recs.map((r, i) => {
        const moveInfo = lookupMove(r.name);
        const typeClass = moveInfo ? `sp-type-${moveInfo.type.toLowerCase()}` : '';
        const isTop = i === 0;
        const dmgText = r.damage.max > 0 ? `${r.damage.min}-${r.damage.max}%` : 'Status';
        const effText = r.damage.effectiveness > 1 ? ' ⬆' : r.damage.effectiveness < 1 && r.damage.effectiveness > 0 ? ' ⬇' : r.damage.effectiveness === 0 ? ' ∅' : '';
        return `
          <div class="sp-move-option ${isTop ? 'sp-move-best' : ''}">
            <span class="sp-move-name ${typeClass}">${r.name}</span>
            <span class="sp-move-score">${r.score}pts</span>
            <span class="sp-move-dmg">${dmgText}${effText}</span>
          </div>
        `;
      }).join('');
    }
  }

  function updateFieldState(field) {
    if (!field) return;
    const el = document.getElementById('sp-field-state');
    if (!el) return;

    const parts = [];
    if (field.weather) parts.push(getWeatherEmoji(field.weather) + ' ' + field.weather);
    if (field.terrain) parts.push('🌱 ' + field.terrain + ' Terrain');
    if (field.trickRoom) parts.push('🔄 Trick Room');
    if (field.tailwind?.my) parts.push('💨 Our Tailwind');
    if (field.tailwind?.opponent) parts.push('💨 Their Tailwind');

    // Hazards
    if (field.myHazards?.stealthRock) parts.push('🪨 SR (our side)');
    if (field.myHazards?.spikes > 0) parts.push(`↓ Spikes×${field.myHazards.spikes} (our)`)
    if (field.opponentHazards?.stealthRock) parts.push('🪨 SR (their side)');
    if (field.opponentHazards?.spikes > 0) parts.push(`↓ Spikes×${field.opponentHazards.spikes} (their)`);

    el.textContent = parts.length > 0 ? parts.join(' · ') : 'Clear field';
  }

  function getWeatherEmoji(weather) {
    switch (weather) {
      case 'Sun': return '☀️';
      case 'Rain': return '🌧️';
      case 'Sand': return '🏜️';
      case 'Snow': case 'Hail': return '❄️';
      default: return '🌤️';
    }
  }

  function updateTeamsCompact(analysis) {
    const el = document.getElementById('sp-teams-compact');
    if (!el) return;

    const state = ShowdownScraper.state;

    let html = '<div class="sp-team-row"><strong>Opponent team:</strong></div>';
    const oppEntries = Object.entries(state.opponentTeam);
    if (oppEntries.length === 0) {
      html += '<div class="sp-team-mon">No data yet — hover over Pokémon</div>';
    } else {
      oppEntries.forEach(([name, mon]) => {
        const data = lookupPokemon(name);
        const types = data ? data.types.join('/') : '???';
        const movesStr = mon.moves.length > 0 ? mon.moves.join(', ') : 'No moves seen';
        const hpClass = mon.hp <= 0 ? 'sp-hp-fainted' : mon.hp < 25 ? 'sp-hp-low' : mon.hp < 50 ? 'sp-hp-med' : '';
        const isActive = name === state.opponentActive ? ' sp-active' : '';

        html += `
          <div class="sp-team-mon${isActive}">
            <span class="sp-mon-name">${name}</span>
            <span class="sp-mon-types">${types}</span>
            <span class="sp-mon-hp ${hpClass}">${Math.round(mon.hp)}%</span>
            ${mon.item ? `<span class="sp-mon-item">📦 ${mon.item}</span>` : ''}
            ${mon.ability ? `<span class="sp-mon-ability">⭐ ${mon.ability}</span>` : ''}
            <div class="sp-mon-moves">${movesStr}</div>
          </div>
        `;
      });
    }

    el.innerHTML = html;
  }

  /**
   * Destroy the overlay
   */
  function destroy() {
    if (panel) {
      panel.remove();
      panel = null;
    }
  }

  return {
    create,
    update,
    destroy,
    toggleMinimize
  };
})();
