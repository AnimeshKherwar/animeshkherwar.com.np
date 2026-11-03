/* BOC - Bureau redesign - Animesh - 03.11.2026 */
(() => {
  'use strict';
  const body = document.body;
  if (!body.classList.contains('bureau')) return;
  const engine = window.LAB;
  const experiments = engine ? engine.experiments : (window.LAB_EXPERIMENTS || []);
  const root = body.dataset.root || './';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const url = exp => root + 'experiments/' + encodeURIComponent(exp.slug) + '/';
  const visited = engine ? engine.store.get('visited', {}) : {};
  const header = document.querySelector('[data-lab-header]');
  if (header) {
    const passport = header.querySelector('[data-passport]');
    if (passport) {
      const badge = passport.querySelector('[data-ach-count]');
      passport.replaceChildren(document.createTextNode('Visitor record '));
      if (badge) passport.appendChild(badge);
    }
    const mute = header.querySelector('[data-mute]');
    if (mute) {
      const update = () => { const muted = engine && engine.store.get('muted', false); mute.setAttribute('aria-label', muted ? 'Enable sound' : 'Mute sound'); mute.setAttribute('aria-pressed', String(!muted)); };
      update(); mute.addEventListener('click', update);
    }
  }
  // Improve the existing passport without replacing its engine or storage.
  let previousFocus = null;
  const modalObserver = new MutationObserver(() => {
    const modal = document.querySelector('.modal');
    if (modal && !modal.hasAttribute('data-bureau-dialog')) {
      previousFocus = document.activeElement;
      modal.setAttribute('data-bureau-dialog', '');
      modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-label', 'Visitor record');
      const close = modal.querySelector('[data-close]');
      if (close) { close.setAttribute('aria-label', 'Close visitor record'); close.focus(); }
      modal.addEventListener('keydown', event => {
        if (event.key !== 'Tab') return;
        const nodes = [...modal.querySelectorAll('button, a[href], input, [tabindex="0"]')].filter(n => !n.disabled && n.getClientRects().length);
        if (!nodes.length) return;
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      });
    } else if (!modal && previousFocus) { if (previousFocus.isConnected) previousFocus.focus(); previousFocus = null; }
  });
  modalObserver.observe(body, {childList:true});
  const files = document.querySelector('[data-bureau-files]');
  if (!files) return;
  const count = document.querySelector('[data-bureau-count]');
  if (count) count.textContent = experiments.length;
  const feature = document.querySelector('[data-bureau-feature]');
  const selected = experiments.find(exp => exp.slug === 'the-button') || experiments[0];
  if (feature && selected) {
    feature.hidden = false;
    feature.innerHTML = `<div class="feature-reference"><strong>Selected investigation</strong>FILE ${escape(selected.id)}<br>Public access</div><div><h2 class="feature-title">${escape(selected.title)}</h2><p class="feature-description">${escape(selected.blurb || selected.tagline)}</p></div><a class="feature-action" href="${escape(url(selected))}">Open the case <span aria-hidden="true">↗</span></a>`;
  }
  let filter = 'all';
  const search = document.querySelector('[data-bureau-search]');
  const buttons = [...document.querySelectorAll('[data-filter]')];
  function render() {
    const query = (search ? search.value : '').trim().toLocaleLowerCase();
    const matches = experiments.filter(exp => {
      const text = [exp.title, exp.blurb, exp.tagline, exp.id].join(' ').toLocaleLowerCase();
      return text.includes(query) && (filter !== 'unvisited' || !visited[exp.id]) && (filter !== 'touch' || exp.device === 'all');
    });
    files.innerHTML = matches.map(exp => `<a class="bureau-file" href="${escape(url(exp))}"><span class="file-number">${escape(exp.id)}</span><div><h3 class="file-title">${escape(exp.title)}</h3><p class="file-description">${escape(exp.blurb || exp.tagline)}</p></div><div class="file-status">${visited[exp.id] ? 'Previously inspected' : 'Awaiting inspection'}<span>${exp.device === 'desktop' ? 'Desktop only' : exp.device === 'all' ? 'Desktop + touch' : 'Check device requirements'}</span></div><span class="file-arrow" aria-hidden="true">↗</span></a>`).join('');
    document.querySelector('[data-bureau-empty]').hidden = matches.length > 0;
    document.querySelector('[data-bureau-result]').textContent = `${matches.length} of ${experiments.length} files available${query ? ' for this enquiry' : ''}.`;
  }
  if (search) search.addEventListener('input', render);
  buttons.forEach(button => button.addEventListener('click', () => {
    filter = button.dataset.filter;
    buttons.forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    render();
  }));
  render();
  if (engine && experiments.length) engine.unlock('welcome');
})();
/* EOC - Bureau redesign - Animesh - 03.11.2026 */