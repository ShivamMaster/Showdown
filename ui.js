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

        <div class="sp-section sp-my-team-section">
          <div class="sp-section-header">
            <span class="sp-section-icon">🛡️</span>
            <span>My Team (Debug)</span>
          </div>
          <div class="sp-teams-compact" id="sp-my-team-compact"></div>
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
      if (body) body.style.display = 'none';
      if (panel) panel.classList.add('sp-minimized');
      if (btn) {
        btn.textContent = '▲';
        btn.title = 'Expand';
      }
    } else {
      if (body) body.style.display = 'block';
      if (panel) panel.classList.remove('sp-minimized');
      if (btn) {
        btn.textContent = '▬';
        btn.title = 'Minimize';
      }
    }
  }

  /**
   * Setup drag functionality
   */
  function setupDrag() {
    const handle = document.getElementById('sp-drag-handle');
    if (!handle) return;

    handle.addEventListener('mousedown', (e) => {
      if (e.target.closest('.sp-btn-minimize')) return;
      if (!panel) return;
      isDragging = true;
      dragOffset.x = e.clientX - panel.offsetLeft;
      dragOffset.y = e.clientY - panel.offsetTop;
      panel.style.transition = 'none';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging || !panel) return;
      const x = Math.max(0, Math.min(window.innerWidth - 300, e.clientX - dragOffset.x));
      const y = Math.max(0, Math.min(window.innerHeight - 50, e.clientY - dragOffset.y));
      panel.style.left = x + 'px';
      panel.style.top = y + 'px';
      panel.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
      if (!isDragging) return;
      isDragging = false;
      if (panel) panel.style.transition = '';
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
    updateRecommendations(
      analysis.recommendations,
      analysis.switchRecommendations,
      analysis.isForcedSwitch
    );

    // Field state
    updateFieldState(analysis.field);

    // Teams
    // Teams
    updateTeamsCompact(analysis);
    updateMyTeamCompact(analysis);
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

  function updateRecommendations(recs, switchRecs, isForced) {
    const moveEl = document.getElementById('sp-rec-move');
    const reasonEl = document.getElementById('sp-rec-reason');
    const dmgEl = document.getElementById('sp-rec-damage');
    const allMovesEl = document.getElementById('sp-all-moves');

    // Reset fields
    if (moveEl) moveEl.textContent = '—';
    if (reasonEl) reasonEl.textContent = 'Analyzing...';
    if (dmgEl) dmgEl.textContent = '';
    if (allMovesEl) allMovesEl.innerHTML = '';

    // 1. Forced Switch (Revenge Kill)
    if (isForced) {
      if (reasonEl) reasonEl.innerHTML = '<span style="color:#FF5252; font-weight:bold">REVENGE KILLER NEEDED</span>';

      if (switchRecs && switchRecs.length > 0) {
        const topSwitch = switchRecs[0];
        if (moveEl) moveEl.innerHTML = `Switch to <span style="color: #4CAF50">${topSwitch.name}</span>`;
        if (dmgEl) dmgEl.innerHTML = `<small>${topSwitch.reasons.join(', ')}</small>`;

        // Show other options
        if (allMovesEl) {
          allMovesEl.innerHTML = switchRecs.map(s =>
            `<div class="sp-rec-row">
              <span>Switch: ${s.name}</span>
              <span>${s.score} (${s.reasons[0]})</span>
             </div>`
          ).join('');
        }
      } else {
        if (moveEl) moveEl.textContent = 'Any (No clear best)';
        if (dmgEl) dmgEl.textContent = 'No safe switch found';
      }
      return;
    }

    // 2. Normal Turn - Check if we should switch
    let bestAction = null;
    let isSwitch = false;

    const topMove = recs && recs.length > 0 ? recs[0] : null;
    const topSwitch = switchRecs && switchRecs.length > 0 ? switchRecs[0] : null;

    // Threshold: Switch needs to be significantly better than staying in
    // or stay in if move is really good
    if (topMove) {
      bestAction = topMove;
    }

    // If switch score is much higher than move score, recommend switch
    // e.g. move score 60 (2HKO), switch score 90 (OHKO + faster)
    if (topSwitch && topMove) {
      if (topSwitch.score > topMove.score + 15) {
        bestAction = topSwitch;
        isSwitch = true;
      }
    } else if (!topMove && topSwitch) {
      // No valid moves (maybe choiced into disabled move?), suggest switch
      bestAction = topSwitch;
      isSwitch = true;
    }

    if (!bestAction) {
      if (reasonEl) reasonEl.textContent = 'No recommendations available';
      return;
    }

    // Render Best Action
    if (isSwitch) {
      if (moveEl) moveEl.innerHTML = `Switch to <span style="color: #2196F3">${bestAction.name}</span>`;
      if (reasonEl) reasonEl.textContent = 'Better matchup available';
      if (dmgEl) dmgEl.innerHTML = `<small>${bestAction.reasons.join(', ')}</small>`;
    } else {
      if (moveEl) moveEl.textContent = bestAction.name;
      if (reasonEl) reasonEl.textContent = bestAction.reason || 'Best damage output';
      if (dmgEl) {
        const dmg = bestAction.damage;
        if (dmg) dmgEl.textContent = dmg.max > 0 ? `${dmg.min}-${dmg.max}% (Eff: ${dmg.effectiveness}x)` : 'Status move';
      }
    }

    // All options list (Moves + Top Switch)
    if (allMovesEl) {
      let html = '';

      // Add top switch if valid and not already chosen as primary
      if (topSwitch && !isSwitch && topSwitch.score > 45) {
        html += `<div class="sp-rec-row" style="border-left: 3px solid #2196F3; padding-left: 5px; background: rgba(33, 150, 243, 0.1);">
              <span>Switch: ${topSwitch.name}</span>
              <span>${topSwitch.score}</span>
             </div>`;
      }

      if (recs) {
        html += recs.map((r, i) => {
          const moveInfo = lookupMove(r.name);
          const typeClass = moveInfo ? `sp-type-${moveInfo.type.toLowerCase()}` : '';
          const isTop = (i === 0); // Always highlight top move in list
          const dmgText = r.damage.max > 0 ? `${r.damage.min}-${r.damage.max}%` : 'Status';
          const label = isTop ? ' <small style="opacity:0.8">(Best Move)</small>' : '';

          return `
            <div class="sp-move-option ${isTop ? 'sp-move-best' : ''}">
              <span class="sp-move-name ${typeClass}">${r.name}${label}</span>
              <span class="sp-move-score">${r.score}pts</span>
              <span class="sp-move-dmg">${dmgText}</span>
            </div>
          `;
        }).join('');
      }
      allMovesEl.innerHTML = html;
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

        // Stats string
        let statsStr = '';
        if (mon.stats) {
          statsStr = `<div class="sp-mon-stats" style="font-size:0.75em; opacity:0.8; margin-top:2px;">
            Atk ${mon.stats.atk} | Def ${mon.stats.def} | SpA ${mon.stats.spa} | SpD ${mon.stats.spd} | Spe ${mon.stats.spe}
          </div>`;
        }

        html += `
          <div class="sp-team-mon${isActive}">
            <span class="sp-mon-name">${name}</span>
            <span class="sp-mon-types">${types}</span>
            <span class="sp-mon-hp ${hpClass}">${Math.round(mon.hp)}%</span>
            ${mon.item ? `<span class="sp-mon-item">📦 ${mon.item}</span>` : ''}
            ${mon.ability ? `<span class="sp-mon-ability">⭐ ${mon.ability}</span>` : ''}
            ${statsStr}
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

  function updateMyTeamCompact(analysis) {
    const el = document.getElementById('sp-my-team-compact');
    if (!el) return;

    const state = ShowdownScraper.state;
    // Basic list of my team
    const myEntries = Object.entries(state.myTeam);

    if (myEntries.length === 0) {
      el.innerHTML = '<div class="sp-team-mon">No team data found</div>';
      return;
    }

    let html = '';
    myEntries.forEach(([name, mon]) => {
      const data = lookupPokemon(name);
      const types = data ? data.types.join('/') : '???';
      const movesStr = mon.moves.length > 0 ? mon.moves.join(', ') : '';
      const hpClass = mon.hp <= 0 ? 'sp-hp-fainted' : mon.hp < 25 ? 'sp-hp-low' : mon.hp < 50 ? 'sp-hp-med' : '';
      const isActive = name === state.myActive ? ' sp-active' : '';

      // Stats string
      let statsStr = '';
      if (mon.stats) {
        statsStr = `<div class="sp-mon-stats" style="font-size:0.75em; opacity:0.8; margin-top:2px;">
          ${mon.stats.atk}/${mon.stats.def}/${mon.stats.spa}/${mon.stats.spd}/${mon.stats.spe}
        </div>`;
      }

      // Simple row
      html += `
          <div class="sp-team-mon${isActive}">
            <div style="display:flex; justify-content:space-between;">
                <span class="sp-mon-name">${name}</span>
                <span class="sp-mon-hp ${hpClass}">${Math.round(mon.hp)}%</span>
            </div>
            <div style="font-size:0.8em; opacity:0.7">${types}</div>
            ${mon.item ? `<div style="font-size:0.8em">📦 ${mon.item}</div>` : ''}
            ${mon.ability ? `<div style="font-size:0.8em">⭐ ${mon.ability}</div>` : ''}
            ${statsStr}
            <div class="sp-mon-moves" style="font-size:0.8em">${movesStr}</div>
          </div>
        `;
    });
    el.innerHTML = html;
  }

  return {
    create,
    update,
    destroy,
    toggleMinimize
  };
})();
