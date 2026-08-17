// Everything that touches the DOM.
//
// Values are written with textContent, never innerHTML: the data comes from a
// spreadsheet that any student can edit, and a pasted <script> tag should show
// up as text rather than run.


const money = new Intl.NumberFormat('en-IE', {
  style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
});

const longDate = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
});

export function renderCards(container, rows, options) {
  container.replaceChildren(...rows.map((row) => card(row, options)));
}

function card(row, { state, shortlist, onToggleStar }) {
  const article = el('article', 'card');
  if (row.deadlinePassed) article.classList.add('is-past');
  if (shortlist.has(row.id)) article.classList.add('is-starred');

  // --- heading -----------------------------------------------------------
  const head = el('div', 'card-head');

  const titles = el('div', 'card-titles');
  const title = el('h2', 'card-title');
  title.textContent = row.programme;
  if (row.degreeType) title.append(el('span', 'degree', row.degreeType));
  titles.append(title);
  titles.append(el('p', 'card-uni', row.university));
  titles.append(el('p', 'card-place', [row.city, row.country].filter(Boolean).join(', ')));
  head.append(titles);
  head.append(starButton(row, shortlist, onToggleStar, article));

  article.append(head);

  article.append(requirements(row));

  // --- facts -------------------------------------------------------------
  const facts = el('dl', 'facts');

  const deadlineValue = el('dd', deadlineClass(row));
  deadlineValue.textContent = row.deadline ? longDate.format(row.deadline) : 'Not published';
  if (row.isUrgent) deadlineValue.append(el('span', 'badge-urgent', countdown(row.daysUntilDeadline)));
  if (row.deadlinePassed) deadlineValue.append(el('span', 'badge-past', 'passed'));
  facts.append(el('dt', '', 'Deadline'), deadlineValue);

  if (row.deadlinePassed) {
    fact(facts, '', 'Check the official page for the next cycle.', 'sub');
  }
  if (row.deadlineNotes) fact(facts, '', row.deadlineNotes, 'sub');

  const tuition = row.tuitionEu === null
    ? 'Not published'
    : (row.tuitionEu === 0 ? 'No tuition fee' : `${money.format(row.tuitionEu)} / year`);
  fact(facts, 'Tuition (EU)', tuition, row.tuitionEu === null ? 'unknown' : '');

  if (row.livingCostMonthly !== null) {
    fact(facts, 'Living costs', `${money.format(row.livingCostMonthly)} / month`);
  }
  if (row.languages.length) fact(facts, 'Taught in', row.languages.join(', '));
  if (row.applicationSystem) fact(facts, 'Apply via', row.applicationSystem);

  article.append(facts);

  // --- why a row survived a filter it looks like it should have failed ---
  if (state.maxTuition !== null && row.tuitionEu === null) {
    article.append(el('p', 'note', 'Shown despite the tuition filter — we do not have a fee for this one.'));
  }
  if (state.myIbPoints !== null && row.ibPointsMin === null) {
    article.append(el('p', 'note', 'Shown despite the points filter — no published minimum.'));
  }

  // --- provenance, on every card, never hidden --------------------------
  article.append(provenance(row));
  return article;
}

// The block this whole site exists for. Four kinds of requirement, each on its
// own row, and a row only appears when there is something to say.
function requirements(row) {
  const block = el('div', 'ib-block');
  block.append(el('p', 'ib-label', 'Requirements'));

  const nothingAtAll = row.ibPointsMin === null &&
                       row.noSubjectsRequired &&
                       row.otherRequirements.length === 0 &&
                       row.englishRequirement.length === 0;

  if (nothingAtAll) {
    // The baseline differs by country, so it comes from the universities tab.
    // Falling back to a country-neutral sentence keeps this honest the day a
    // non-Dutch university is added.
    const baseline = row.baselineRequirement || 'a qualifying secondary school diploma';
    block.append(el('p', 'req-none', `No requirements beyond ${baseline}`));
    return block;
  }

  const list = el('dl', 'req');

  // --- points ------------------------------------------------------------
  if (row.ibPointsMin === null) {
    // Worth stating rather than omitting: "there is no points threshold" is
    // news to an IB student who assumes every university has one.
    reqRow(list, 'Points', [el('span', 'req-quiet', 'No minimum published')]);
  } else {
    const value = el('span', 'req-points');
    value.append(el('span', 'req-number', String(row.ibPointsMin)));
    value.append(el('span', 'req-unit', 'IB points'));
    reqRow(list, 'Points', [value]);
  }

  // --- subjects ----------------------------------------------------------
  if (row.noSubjectsRequired) {
    reqRow(list, 'Subjects', [el('span', 'req-quiet', 'None required')]);
  } else if (row.ibSubjects) {
    reqRow(list, 'Subjects', [document.createTextNode(row.ibSubjects)]);
  } else {
    reqRow(list, 'Subjects', [el('span', 'req-unknown', 'Not checked yet')]);
  }

  // --- other -------------------------------------------------------------
  if (row.otherRequirements.length) {
    reqRow(list, 'Other', row.otherRequirements.map((t) => el('span', 'req-tag', t)));
  }

  // --- language ----------------------------------------------------------
  if (row.englishRequirement.length) {
    reqRow(list, 'Language', row.englishRequirement.map((t) => el('span', 'req-lang', t)));
  }

  block.append(list);
  return block;
}

function reqRow(dl, label, nodes) {
  dl.append(el('dt', 'req-label', label));
  const dd = el('dd', 'req-value');
  dd.append(...nodes);
  dl.append(dd);
}

function starButton(row, shortlist, onToggleStar, article) {
  const button = el('button', 'star');
  button.type = 'button';
  setStarState(button, row, shortlist.has(row.id));

  // Flip this one button rather than re-rendering every card. Rebuilding the
  // list to change one glyph measured 172ms, and it threw away the button the
  // user had just focused.
  button.addEventListener('click', () => {
    const starred = onToggleStar(row.id);
    setStarState(button, row, starred);
    article.classList.toggle('is-starred', starred);
  });
  return button;
}

function setStarState(button, row, starred) {
  // An outline bookmark that becomes a solid one. Swapping the symbol is a
  // content change, and content changes always take effect; a card sets
  // content-visibility: auto, and the browser skips style recalculation inside
  // one, so a state carried only by CSS on [aria-pressed] can paint stale.
  // The CSS colour change rides along on top of this, not instead of it.
  if (!button.firstChild) button.append(icon('i-bookmark'));
  button.firstChild.firstChild.setAttribute('href', starred ? '#i-bookmark-fill' : '#i-bookmark');
  button.setAttribute('aria-pressed', String(starred));
  button.setAttribute(
    'aria-label',
    `${starred ? 'Remove' : 'Save'} ${row.programme} at ${row.university} ${starred ? 'from' : 'to'} your shortlist`
  );
}

function provenance(row) {
  const foot = el('div', 'card-foot');
  const verified = el('p', 'verified');

  // One chain, so the text and its badge are chosen together. Two chains let a
  // row claim "Never checked" and "may be out of date" at the same time.
  if (row.isSample) {
    verified.textContent = 'Invented sample row';
    verified.append(el('span', 'badge-danger', 'not real data'));
  } else if (row.needsHumanCheck) {
    verified.textContent = row.lastVerified
      ? `Gathered ${longDate.format(row.lastVerified)}`
      : 'Gathered automatically';
    verified.append(el('span', 'badge-stale', 'nobody has checked this yet'));
  } else if (!row.lastVerified) {
    verified.textContent = 'Never checked';
    verified.append(el('span', 'badge-stale', 'nobody has checked this yet'));
  } else {
    verified.textContent = `Checked ${longDate.format(row.lastVerified)}`;
    if (row.verifiedBy) verified.textContent += ` by ${row.verifiedBy}`;
    if (row.isStale) verified.append(el('span', 'badge-stale', 'may be out of date'));
  }
  foot.append(verified);

  // data.js already ran these through safeUrl and stored null or a normalised
  // href, so there is nothing left to validate here.
  if (row.officialUrl) {
    foot.append(externalLink('official-link', 'Official admissions page', row.officialUrl));
  } else {
    foot.append(el('p', 'note', 'No official link on file — do not rely on this entry.'));
  }
  if (row.studentLifeUrl) {
    foot.append(externalLink('life-link', 'Student life', row.studentLifeUrl));
  }

  return foot;
}

function externalLink(className, label, href) {
  const link = el('a', className, label);
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  // The icon says "this leaves the site" without spending a word on it.
  link.append(icon('i-external'));
  return link;
}

// Icons come from the sprite in index.html, referenced rather than inlined so
// the same path is not repeated 757 times in the DOM.
function icon(id) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#${id}`);
  svg.append(use);
  return svg;
}

function deadlineClass(row) {
  if (row.deadlinePassed) return 'past';
  if (row.isUrgent) return 'urgent';
  if (!row.deadline) return 'unknown';
  return '';
}

function countdown(days) {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

// ------------------------------------------------------------ filter chips

export function renderChips(container, values, selected, onToggle) {
  container.replaceChildren(...values.map((value) => {
    const label = el('label', 'chip');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = value;
    input.checked = selected.has(value);
    input.addEventListener('change', () => onToggle(value, input.checked));
    label.append(input, el('span', '', value));
    return label;
  }));
}

export function renderSortOptions(select, sorts, current) {
  select.replaceChildren(...Object.entries(sorts).map(([value, label]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    option.selected = value === current;
    return option;
  }));
}

// ---------------------------------------------------------------- banners

export function renderSourceBanner(node, meta) {
  const parts = [];

  if (meta.source === 'snapshot') {
    const when = meta.snapshotDate ? longDate.format(meta.snapshotDate) : 'an unknown date';
    parts.push(`Live data is unavailable, so this is a saved copy from ${when}. Deadlines may have moved since.`);
  }

  if (meta.draftCount > 0) {
    const all = meta.draftCount === meta.total;
    parts.push(
      `${all ? 'Every entry' : `${meta.draftCount} of ${meta.total} entries`} was gathered ` +
      `automatically and has not been checked by a person yet. Open the official page before you rely on anything here.`
    );
  }

  if (meta.sampleCount > 0) {
    const all = meta.sampleCount === meta.total;
    parts.push(
      `${all ? 'Every figure on this page is made up' : `${meta.sampleCount} of ${meta.total} entries are made-up sample rows`}. ` +
      `Do not use ${all ? 'it' : 'them'} for real applications.`
    );
  }

  if (parts.length === 0) {
    node.hidden = true;
    return;
  }

  // Invented data is the louder problem, so it sets the tone when both apply.
  node.className = `banner banner-${meta.sampleCount > 0 ? 'danger' : 'warn'}`;
  node.textContent = parts.join(' ');
  node.hidden = false;
}

export function renderIssues(details, summary, list, issues) {
  if (issues.length === 0) {
    details.hidden = true;
    return;
  }
  summary.textContent = `${issues.length} spreadsheet ${issues.length === 1 ? 'problem' : 'problems'}`;
  list.replaceChildren(...issues.map((text) => el('li', '', text)));
  details.hidden = false;
}

// ---------------------------------------------------------------- helpers

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function fact(dl, term, value, className) {
  dl.append(el('dt', '', term), el('dd', className, value));
}
