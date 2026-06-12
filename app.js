const STORAGE_KEY = "mundial_bracket_2026_v1";
const SOURCE_URL = "https://raw.githubusercontent.com/openfootball/world-cup.json/master/2026/worldcup.json";

const state = {
  matches: [],
  meta: {
    source: "",
    loadedAt: "",
    name: "",
  },
};

const elements = {
  loadWebBtn: document.getElementById("load-web-btn"),
  exportBtn: document.getElementById("export-btn"),
  importFile: document.getElementById("import-file"),
  groupMatchesBody: document.getElementById("group-matches-body"),
  knockoutMatchesBody: document.getElementById("knockout-matches-body"),
  calcBtn: document.getElementById("calc-btn"),
  groupStandings: document.getElementById("group-standings"),
  qualified: document.getElementById("qualified"),
  bracket: document.getElementById("bracket"),
  champion: document.getElementById("champion"),
  warnings: document.getElementById("warnings"),
  status: document.getElementById("status"),
  emptyStateTemplate: document.getElementById("empty-state-template"),
  knockoutEmptyStateTemplate: document.getElementById("knockout-empty-state-template"),
  groupEmptyTemplate: document.getElementById("group-empty-template"),
  bracketEmptyTemplate: document.getElementById("bracket-empty-template"),
};

const KO_ORDER = [
  "Round of 32",
  "Round of 16",
  "Quarter-final",
  "Semi-final",
  "Match for third place",
  "Final",
];

const TEAM_FLAG_CODES = {
  Algeria: "dz",
  Argentina: "ar",
  Australia: "au",
  Austria: "at",
  Belgium: "be",
  "Bosnia & Herzegovina": "ba",
  Brazil: "br",
  Canada: "ca",
  "Cape Verde": "cv",
  Colombia: "co",
  Croatia: "hr",
  "Czech Republic": "cz",
  "DR Congo": "cd",
  Ecuador: "ec",
  Egypt: "eg",
  France: "fr",
  Germany: "de",
  Ghana: "gh",
  Haiti: "ht",
  Iran: "ir",
  Iraq: "iq",
  "Ivory Coast": "ci",
  Japan: "jp",
  Jordan: "jo",
  Mexico: "mx",
  Morocco: "ma",
  Netherlands: "nl",
  "New Zealand": "nz",
  Norway: "no",
  Panama: "pa",
  Paraguay: "py",
  Portugal: "pt",
  Qatar: "qa",
  "Saudi Arabia": "sa",
  Senegal: "sn",
  "South Africa": "za",
  "South Korea": "kr",
  Spain: "es",
  Sweden: "se",
  Switzerland: "ch",
  Tunisia: "tn",
  Turkey: "tr",
  Uruguay: "uy",
  USA: "us",
  Uzbekistan: "uz",
  "Curaçao": "cw",
};

const TEAM_FLAG_URLS = {
  England: "https://upload.wikimedia.org/wikipedia/en/b/be/Flag_of_England.svg",
  Scotland: "https://upload.wikimedia.org/wikipedia/commons/1/10/Flag_of_Scotland.svg",
};

function normalizeName(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function phaseLabel(match) {
  if (match.group) return `Grupo ${match.group}`;
  if (match.round === "Round of 32") return "Dieciseisavos";
  if (match.round === "Round of 16") return "Octavos";
  if (match.round === "Quarter-final") return "Cuartos";
  if (match.round === "Semi-final") return "Semifinal";
  if (match.round === "Final") return "Final";
  if (match.round === "Match for third place") return "Tercer puesto";
  return match.round || "Fase";
}

function shortPhaseLabel(match) {
  if (match.group) return `G${match.group}`;
  if (match.round === "Round of 32") return "16vos";
  if (match.round === "Round of 16") return "8vos";
  if (match.round === "Quarter-final") return "4tos";
  if (match.round === "Semi-final") return "Semi";
  if (match.round === "Final") return "Final";
  if (match.round === "Match for third place") return "3er";
  return phaseLabel(match);
}

function phaseClassName(match) {
  if (match.group) return "phase-group";
  if (match.round === "Round of 32") return "phase-r32";
  if (match.round === "Round of 16") return "phase-r16";
  if (match.round === "Quarter-final") return "phase-qf";
  if (match.round === "Semi-final") return "phase-sf";
  if (match.round === "Final") return "phase-final";
  if (match.round === "Match for third place") return "phase-third";
  return "phase-generic";
}

function roundRank(match) {
  if (match.group) {
    const groupCode = String(match.group).toUpperCase();
    return 10 + groupCode.charCodeAt(0);
  }

  const idx = KO_ORDER.indexOf(match.round);
  return idx === -1 ? 99 : 50 + idx;
}

function parseUtcTimeToMinutes(timeText) {
  const raw = normalizeName(timeText);
  const m = raw.match(/^(\d{1,2}):(\d{2})\s+UTC([+-]\d{1,2})$/i);
  if (!m) return null;

  const hour = Number(m[1]);
  const minute = Number(m[2]);
  const utcOffset = Number(m[3]);

  if (!Number.isFinite(hour) || !Number.isFinite(minute) || !Number.isFinite(utcOffset)) return null;

  const utcHour = hour - utcOffset;
  return utcHour * 60 + minute;
}

function getChronoTimestamp(match) {
  const dateRaw = normalizeName(match.date);
  const dateMatch = dateRaw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateMatch) return Number.POSITIVE_INFINITY;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const utcMinutes = parseUtcTimeToMinutes(match.time);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return Number.POSITIVE_INFINITY;
  }

  const baseUtc = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  if (utcMinutes === null) return baseUtc;

  return baseUtc + utcMinutes * 60 * 1000;
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    state.matches = Array.isArray(parsed.matches) ? parsed.matches : [];
    state.meta = parsed.meta && typeof parsed.meta === "object" ? parsed.meta : { source: "", loadedAt: "", name: "" };
  } catch {
    state.matches = [];
    state.meta = { source: "", loadedAt: "", name: "" };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function adaptSourcePayload(payload) {
  const base = Array.isArray(payload.matches) ? payload.matches : [];

  return base.map((item, index) => ({
    id: String(item.num || `M-${index + 1}`),
    num: Number(item.num) || null,
    round: normalizeName(item.round),
    group: item.group ? normalizeName(item.group).replace(/^Group\s+/i, "") : null,
    date: normalizeName(item.date),
    time: normalizeName(item.time),
    homeRef: normalizeName(item.team1),
    awayRef: normalizeName(item.team2),
    homeScore: item.score1 === null || item.score1 === undefined ? "" : String(item.score1),
    awayScore: item.score2 === null || item.score2 === undefined ? "" : String(item.score2),
  }));
}

function getGroupMatches() {
  return state.matches.filter((m) => m.group);
}

function getKnockoutMatches() {
  return state.matches.filter((m) => !m.group);
}

function parseScore(value) {
  if (value === "" || value === null || value === undefined) return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Math.max(0, Math.floor(num));
}

function matchHasResult(match) {
  return parseScore(match.homeScore) !== null && parseScore(match.awayScore) !== null;
}

function isDynamicTeamRef(ref) {
  const value = normalizeName(ref);
  return /^[123][A-L]$/i.test(value) || /^3[A-L](\/[A-L])+$/i.test(value) || /^[WL]\d+$/i.test(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getTeamFlagUrl(teamName) {
  const normalized = normalizeName(teamName);
  if (TEAM_FLAG_URLS[normalized]) return TEAM_FLAG_URLS[normalized];

  const code = TEAM_FLAG_CODES[normalized];
  if (!code) return "";
  return `https://flagcdn.com/w40/${code}.png`;
}

function renderTeamHtml(teamName) {
  const safeName = escapeHtml(teamName || "-");
  const flagUrl = getTeamFlagUrl(teamName);

  if (!flagUrl) {
    return `<span class="team-name">${safeName}</span>`;
  }

  return `
    <span class="team-name with-flag">
      <img class="team-flag" src="${flagUrl}" alt="Bandera de ${safeName}" loading="lazy" />
      <span>${safeName}</span>
    </span>
  `;
}

function sortMatches(matches) {
  return [...matches].sort((a, b) => {
    const byTime = getChronoTimestamp(a) - getChronoTimestamp(b);
    if (byTime !== 0) return byTime;

    const byRank = roundRank(a) - roundRank(b);
    if (byRank !== 0) return byRank;

    if (a.group && b.group && a.group !== b.group) {
      return a.group.localeCompare(b.group);
    }

    if (a.num && b.num) return a.num - b.num;
    return a.id.localeCompare(b.id);
  });
}

function renderMatchRows(body, matches, options = {}) {
  const { emptyTemplate, useResolvedTeams = false } = options;
  body.innerHTML = "";

  if (!matches.length) {
    body.appendChild(emptyTemplate.content.cloneNode(true));
    return;
  }

  sortMatches(matches).forEach((match) => {
    const card = document.createElement("article");
    card.className = `match-card ${phaseClassName(match)}`;
    const dateText = [match.date, match.time].filter(Boolean).join(" ");
    const homeLabel = useResolvedTeams ? match.homeTeam || match.homeRef : match.homeRef;
    const awayLabel = useResolvedTeams ? match.awayTeam || match.awayRef : match.awayRef;

    card.innerHTML = `
      <div class="match-card-top">
        <span class="phase-chip">${escapeHtml(shortPhaseLabel(match))}</span>
        <span class="match-date">${escapeHtml(dateText || "-")}</span>
      </div>
      <div class="match-teams">
        <div class="team-row">
          <span class="team-side side-home">L</span>
          <input class="small-input" type="number" min="0" value="${escapeHtml(match.homeScore)}" data-type="homeScore" data-id="${match.id}" />
          ${renderTeamHtml(homeLabel)}
        </div>
        <div class="team-row">
          <span class="team-side side-away">V</span>
          <input class="small-input" type="number" min="0" value="${escapeHtml(match.awayScore)}" data-type="awayScore" data-id="${match.id}" />
          ${renderTeamHtml(awayLabel)}
        </div>
      </div>
      <div class="match-card-bottom">
        ${match.num ? `<div class="subtle">Partido ${match.num}</div>` : "<div></div>"}
      </div>
    `;

    body.appendChild(card);
  });
}

function renderMatches() {
  renderMatchRows(elements.groupMatchesBody, getGroupMatches(), {
    emptyTemplate: elements.emptyStateTemplate,
    useResolvedTeams: false,
  });

  renderMatchRows(elements.knockoutMatchesBody, [], {
    emptyTemplate: elements.knockoutEmptyStateTemplate,
    useResolvedTeams: true,
  });
}

function renderKnockoutMatches(knockoutMatches) {
  renderMatchRows(elements.knockoutMatchesBody, knockoutMatches, {
    emptyTemplate: elements.knockoutEmptyStateTemplate,
    useResolvedTeams: true,
  });
}

function createGroupStats() {
  const groups = new Map();

  getGroupMatches().forEach((match) => {
    if (!groups.has(match.group)) {
      groups.set(match.group, new Map());
    }

    const table = groups.get(match.group);
    [match.homeRef, match.awayRef].forEach((team) => {
      if (!table.has(team)) {
        table.set(team, {
          team,
          group: match.group,
          played: 0,
          points: 0,
          gf: 0,
          ga: 0,
        });
      }
    });

    if (!matchHasResult(match)) return;

    const homeScore = parseScore(match.homeScore);
    const awayScore = parseScore(match.awayScore);

    const home = table.get(match.homeRef);
    const away = table.get(match.awayRef);

    home.played += 1;
    away.played += 1;

    home.gf += homeScore;
    home.ga += awayScore;
    away.gf += awayScore;
    away.ga += homeScore;

    if (homeScore > awayScore) {
      home.points += 3;
    } else if (homeScore < awayScore) {
      away.points += 3;
    } else {
      home.points += 1;
      away.points += 1;
    }
  });

  const rankingByGroup = new Map();

  groups.forEach((teamMap, group) => {
    const ranked = [...teamMap.values()].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const gdA = a.gf - a.ga;
      const gdB = b.gf - b.ga;
      if (gdB !== gdA) return gdB - gdA;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.team.localeCompare(b.team);
    });

    rankingByGroup.set(group, ranked);
  });

  return rankingByGroup;
}

function resolveQualifiedTeams(groupRanking) {
  const winners = new Map();
  const runnersUp = new Map();
  const thirds = [];

  groupRanking.forEach((ranked, group) => {
    if (ranked[0]) winners.set(group, ranked[0]);
    if (ranked[1]) runnersUp.set(group, ranked[1]);
    if (ranked[2]) thirds.push(ranked[2]);
  });

  const bestThirds = thirds
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const gdA = a.gf - a.ga;
      const gdB = b.gf - b.ga;
      if (gdB !== gdA) return gdB - gdA;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.group.localeCompare(b.group);
    })
    .slice(0, 8);

  return {
    winners,
    runnersUp,
    bestThirds,
  };
}

function assignBestThirdSlots(knockoutMatches, bestThirds) {
  const slots = [];

  knockoutMatches.forEach((match) => {
    if (match.round !== "Round of 32") return;

    ["homeRef", "awayRef"].forEach((side) => {
      const ref = normalizeName(match[side]);
      if (!/^3[A-L](\/[A-L])+$/i.test(ref)) return;

      slots.push({
        key: `${match.id}:${side}`,
        matchId: match.id,
        side,
        options: ref
          .slice(1)
          .split("/")
          .map((g) => g.toUpperCase()),
      });
    });
  });

  const bestByGroup = new Map(bestThirds.map((team) => [team.group, team]));
  const onlyPossible = slots.filter((s) => s.options.some((g) => bestByGroup.has(g)));

  onlyPossible.sort((a, b) => {
    const aCount = a.options.filter((g) => bestByGroup.has(g)).length;
    const bCount = b.options.filter((g) => bestByGroup.has(g)).length;
    return aCount - bCount;
  });

  const usedGroups = new Set();
  const assignment = new Map();

  function dfs(index) {
    if (index >= onlyPossible.length) return true;

    const slot = onlyPossible[index];
    const candidates = slot.options.filter((group) => bestByGroup.has(group) && !usedGroups.has(group));

    for (const group of candidates) {
      usedGroups.add(group);
      assignment.set(slot.key, bestByGroup.get(group).team);

      if (dfs(index + 1)) return true;

      assignment.delete(slot.key);
      usedGroups.delete(group);
    }

    return false;
  }

  dfs(0);
  return assignment;
}

function buildTokenResolver(groupRanking) {
  const qualified = resolveQualifiedTeams(groupRanking);
  const winnerByNum = new Map();
  const loserByNum = new Map();
  const knockout = getKnockoutMatches().sort((a, b) => {
    if (a.num && b.num) return a.num - b.num;
    return roundRank(a) - roundRank(b);
  });

  const warnings = [];
  const thirdAssignments = assignBestThirdSlots(knockout, qualified.bestThirds);

  function resolveSimpleRef(ref, match, side) {
    const r = normalizeName(ref);

    if (/^[123][A-L]$/i.test(r)) {
      const pos = r[0];
      const group = r[1].toUpperCase();
      if (pos === "1") return qualified.winners.get(group)?.team || `1${group}`;
      if (pos === "2") return qualified.runnersUp.get(group)?.team || `2${group}`;

      const directThird = qualified.bestThirds.find((t) => t.group === group);
      return directThird ? directThird.team : `3${group}`;
    }

    if (/^3[A-L](\/[A-L])+$/i.test(r)) {
      const key = `${match.id}:${side}`;
      if (thirdAssignments.has(key)) return thirdAssignments.get(key);
      return `Mejor tercero (${r})`;
    }

    if (/^W\d+$/i.test(r)) {
      const num = Number(r.slice(1));
      return winnerByNum.get(num) || `Ganador ${num}`;
    }

    if (/^L\d+$/i.test(r)) {
      const num = Number(r.slice(1));
      return loserByNum.get(num) || `Perdedor ${num}`;
    }

    return r;
  }

  knockout.forEach((match) => {
    const homeTeam = resolveSimpleRef(match.homeRef, match, "homeRef");
    const awayTeam = resolveSimpleRef(match.awayRef, match, "awayRef");

    const previousHomeTeam = match.homeTeam;
    const previousAwayTeam = match.awayTeam;

    if (
      (isDynamicTeamRef(match.homeRef) && previousHomeTeam && previousHomeTeam !== homeTeam) ||
      (isDynamicTeamRef(match.awayRef) && previousAwayTeam && previousAwayTeam !== awayTeam)
    ) {
      match.homeScore = "";
      match.awayScore = "";
    }

    match.homeTeam = homeTeam;
    match.awayTeam = awayTeam;

    const homeScore = parseScore(match.homeScore);
    const awayScore = parseScore(match.awayScore);

    if (homeScore === null || awayScore === null) return;

    if (!match.group && homeScore === awayScore && match.round !== "Match for third place") {
      warnings.push(`Empate invalido en eliminacion directa: partido ${match.num || "s/n"}.`);
      return;
    }

    if (homeScore > awayScore) {
      if (match.num) {
        winnerByNum.set(match.num, homeTeam);
        loserByNum.set(match.num, awayTeam);
      }
    } else if (homeScore < awayScore) {
      if (match.num) {
        winnerByNum.set(match.num, awayTeam);
        loserByNum.set(match.num, homeTeam);
      }
    } else if (match.round === "Match for third place" && match.num) {
      winnerByNum.set(match.num, homeTeam);
      loserByNum.set(match.num, awayTeam);
    }
  });

  return {
    qualified,
    knockout,
    winnerByNum,
    warnings,
  };
}

function renderGroupStandings(groupRanking) {
  elements.groupStandings.innerHTML = "";

  const groups = [...groupRanking.keys()].sort();
  if (!groups.length) {
    elements.groupStandings.appendChild(elements.groupEmptyTemplate.content.cloneNode(true));
    return;
  }

  groups.forEach((group) => {
    const ranked = groupRanking.get(group);
    const card = document.createElement("article");
    card.className = "group-card";

    const rows = ranked
      .map((team, idx) => {
        const isTop = idx < 2;
        const isThird = idx === 2;
        return `
          <tr class="${isTop ? "qualify" : isThird ? "third" : ""}">
            <td>${idx + 1}</td>
            <td>${renderTeamHtml(team.team)}</td>
            <td>${team.played}</td>
            <td>${team.points}</td>
            <td>${team.gf}</td>
            <td>${team.ga}</td>
            <td>${team.gf - team.ga}</td>
          </tr>
        `;
      })
      .join("");

    card.innerHTML = `
      <h4>Grupo ${escapeHtml(group)}</h4>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Equipo</th>
              <th>PJ</th>
              <th>Pts</th>
              <th>GF</th>
              <th>GC</th>
              <th>DG</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;

    elements.groupStandings.appendChild(card);
  });
}

function renderQualified(qualified) {
  const winners = [...qualified.winners.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([group, team]) => `<span class="qualified-item"><strong>${group}:</strong> ${renderTeamHtml(team.team)}</span>`)
    .join("");

  const runners = [...qualified.runnersUp.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([group, team]) => `<span class="qualified-item"><strong>${group}:</strong> ${renderTeamHtml(team.team)}</span>`)
    .join("");

  const thirds = qualified.bestThirds
    .map((team) => `<span class="qualified-item"><strong>${team.group}:</strong> ${renderTeamHtml(team.team)}</span>`)
    .join("");

  elements.qualified.innerHTML = `
    <p><strong>1ros de grupo:</strong> ${winners || "-"}</p>
    <p><strong>2dos de grupo:</strong> ${runners || "-"}</p>
    <p><strong>8 mejores terceros:</strong> ${thirds || "-"}</p>
  `;
}

function renderBracket(knockoutMatches, winnerByNum) {
  elements.bracket.innerHTML = "";

  if (!knockoutMatches.length) {
    elements.bracket.appendChild(elements.bracketEmptyTemplate.content.cloneNode(true));
    return;
  }

  const byRound = new Map();
  KO_ORDER.forEach((r) => byRound.set(r, []));

  knockoutMatches.forEach((match) => {
    if (!byRound.has(match.round)) {
      byRound.set(match.round, []);
    }
    byRound.get(match.round).push(match);
  });

  KO_ORDER.forEach((round) => {
    const matches = (byRound.get(round) || []).sort((a, b) => {
      if (a.num && b.num) return a.num - b.num;
      return a.id.localeCompare(b.id);
    });

    if (!matches.length) return;

    const col = document.createElement("section");
    col.className = "bracket-col";
    col.innerHTML = `<h4>${escapeHtml(phaseLabel({ round }))}</h4>`;

    matches.forEach((match) => {
      const homeScore = parseScore(match.homeScore);
      const awayScore = parseScore(match.awayScore);
      let winner = "Pendiente";

      if (homeScore !== null && awayScore !== null) {
        if (homeScore > awayScore) winner = match.homeTeam;
        if (awayScore > homeScore) winner = match.awayTeam;
      }

      if (match.num && winnerByNum.has(match.num)) {
        winner = winnerByNum.get(match.num);
      }

      const card = document.createElement("article");
      card.className = "knock-card";
      card.innerHTML = `
        <p class="subtle">${match.num ? `Partido ${match.num}` : "Partido"}</p>
        <p>${renderTeamHtml(match.homeTeam)} ${homeScore === null ? "-" : homeScore}</p>
        <p>${renderTeamHtml(match.awayTeam)} ${awayScore === null ? "-" : awayScore}</p>
        <p class="winner">Ganador: ${renderTeamHtml(winner)}</p>
      `;

      col.appendChild(card);
    });

    elements.bracket.appendChild(col);
  });
}

function renderChampion(knockoutMatches) {
  const finalMatch = knockoutMatches.find((m) => m.round === "Final");
  if (!finalMatch) {
    elements.champion.classList.add("hidden");
    return;
  }

  const homeScore = parseScore(finalMatch.homeScore);
  const awayScore = parseScore(finalMatch.awayScore);

  if (homeScore === null || awayScore === null || homeScore === awayScore) {
    elements.champion.classList.add("hidden");
    return;
  }

  const champion = homeScore > awayScore ? finalMatch.homeTeam : finalMatch.awayTeam;
  elements.champion.innerHTML = `Campeon proyectado con tus marcadores: ${renderTeamHtml(champion)}`;
  elements.champion.classList.remove("hidden");
}

function renderWarnings(warnings) {
  elements.warnings.innerHTML = "";
  if (!warnings.length) return;

  warnings.forEach((warning) => {
    const p = document.createElement("p");
    p.className = "warning";
    p.textContent = warning;
    elements.warnings.appendChild(p);
  });
}

function calculateTournament() {
  const groupRanking = createGroupStats();
  renderGroupStandings(groupRanking);

  const { qualified, knockout, winnerByNum, warnings } = buildTokenResolver(groupRanking);

  renderKnockoutMatches(knockout);
  renderQualified(qualified);
  renderBracket(knockout, winnerByNum);
  renderChampion(knockout);
  renderWarnings(warnings);
}

function updateStatus(text, type = "info") {
  elements.status.textContent = text;
  elements.status.className = `status ${type}`;
}

async function loadFromWeb() {
  updateStatus("Cargando datos desde internet...", "info");

  try {
    const response = await fetch(SOURCE_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    state.matches = adaptSourcePayload(payload);
    state.meta = {
      source: SOURCE_URL,
      loadedAt: new Date().toISOString(),
      name: normalizeName(payload.name || "World Cup 2026"),
    };

    saveState();
    renderMatches();
    calculateTournament();

    updateStatus(`Datos cargados: ${state.matches.length} partidos.`, "ok");
  } catch (error) {
    updateStatus("No se pudo cargar desde internet. Revisa tu conexion e intenta de nuevo.", "error");
    console.error(error);
  }
}

function handleMatchScoreInput(event) {
  const input = event.target;
  if (input.tagName !== "INPUT") return;

  const id = input.dataset.id;
  const key = input.dataset.type;
  if (!id || !key) return;

  const match = state.matches.find((item) => item.id === id);
  if (!match) return;

  const value = input.value.trim();
  if (value === "") {
    match[key] = "";
  } else {
    const n = Math.max(0, Math.floor(Number(value) || 0));
    match[key] = String(n);
  }

  saveState();
}

function handleKnockoutScoreChange(event) {
  const input = event.target;
  if (input.tagName !== "INPUT") return;

  calculateTournament();
  saveState();
}

function exportData() {
  const payload = {
    meta: state.meta,
    matches: state.matches,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "mundial-2026-llaves.json";
  link.click();

  URL.revokeObjectURL(url);
}

function importData(event) {
  const [file] = event.target.files;
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || "{}"));
      if (!Array.isArray(parsed.matches)) {
        throw new Error("Formato invalido");
      }

      state.matches = parsed.matches.map((m, idx) => ({
        id: String(m.id || `M-${idx + 1}`),
        num: Number(m.num) || null,
        round: normalizeName(m.round),
        group: m.group ? normalizeName(m.group) : null,
        date: normalizeName(m.date),
        time: normalizeName(m.time),
        homeRef: normalizeName(m.homeRef),
        awayRef: normalizeName(m.awayRef),
        homeScore: m.homeScore === null || m.homeScore === undefined ? "" : String(m.homeScore),
        awayScore: m.awayScore === null || m.awayScore === undefined ? "" : String(m.awayScore),
      }));

      state.meta = parsed.meta && typeof parsed.meta === "object" ? parsed.meta : state.meta;

      saveState();
      renderMatches();
      calculateTournament();
      updateStatus(`Datos importados: ${state.matches.length} partidos.`, "ok");
    } catch {
      updateStatus("No se pudo importar el archivo JSON.", "error");
    }

    event.target.value = "";
  };

  reader.readAsText(file);
}

function init() {
  loadState();
  renderMatches();

  if (state.matches.length) {
    calculateTournament();
    updateStatus(`Datos locales cargados: ${state.matches.length} partidos.`, "ok");
  }

  elements.loadWebBtn.addEventListener("click", loadFromWeb);
  elements.exportBtn.addEventListener("click", exportData);
  elements.importFile.addEventListener("change", importData);
  elements.groupMatchesBody.addEventListener("input", handleMatchScoreInput);
  elements.knockoutMatchesBody.addEventListener("input", handleMatchScoreInput);
  elements.knockoutMatchesBody.addEventListener("change", handleKnockoutScoreChange);
  elements.calcBtn.addEventListener("click", calculateTournament);
}

init();
