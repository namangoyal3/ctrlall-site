/* The interactive mock-ups. One state object; the Mac window and the phone
   both render the same chat, so an answer on either side shows on both. */
(function () {
  'use strict';

  var state = {
    permission: null,          // null | 'allow' | 'deny'
    pane: 'chat',
    goal: { engine: 'Claude Code', running: false, step: 0 },
    routines: {
      triage: { name: 'Morning issue triage', every: 'every 12h', paused: false, last: 'in 11h' },
      audit: { name: 'Nightly dependency audit', every: 'every 24h', paused: false, last: 'in 23h' },
      changelog: { name: 'Weekly changelog', every: 'every 168h', paused: false, last: 'in 167h' }
    },
    seen: {}                   // distinct interactions, for the waitlist prompt
  };

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  // ---- the waitlist prompt: after three different kinds of interaction ----
  var PROMPT_AFTER = 3;
  function noteInteraction(kind) {
    state.seen[kind] = true;
    if (Object.keys(state.seen).length < PROMPT_AFTER) return;
    if (state.prompted) return;
    state.prompted = true;
    var already = false;
    try { already = !!localStorage.getItem('ctrlall-waitlist') || sessionStorage.getItem('ctrlall-prompted') === '1'; } catch (_) {}
    if (already) return;
    setTimeout(openWaitlist, 700);
  }
  function openWaitlist() {
    var d = $('#wl');
    if (!d || d.open) return;
    try { sessionStorage.setItem('ctrlall-prompted', '1'); } catch (_) {}
    if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
    var input = $('input[type=email]', d);
    if (input) setTimeout(function () { input.focus(); }, 300);
  }
  window.ctrlallOpenWaitlist = openWaitlist;

  // ---- chat (Mac + phone) ----
  function renderChat() {
    var p = state.permission;
    $$('[data-perm-card]').forEach(function (card) {
      $('.acts', card).classList.toggle('hide', !!p);
      var ans = $('.answered', card);
      ans.classList.toggle('hide', !p);
      if (p) ans.innerHTML = '<b>Answered</b>' + (p === 'allow' ? 'Allow' : 'Deny');
    });
    $$('[data-edit-status]').forEach(function (el) {
      el.textContent = p === 'allow' ? 'Done' : p === 'deny' ? 'Stopped' : 'Waiting';
      el.className = 'st ' + (p ? 'ok' : 'wait');
    });
    $$('[data-after-allow]').forEach(function (el) { el.classList.toggle('hide', p !== 'allow'); });
    $$('[data-after-deny]').forEach(function (el) { el.classList.toggle('hide', p !== 'deny'); });
    $$('[data-diff]').forEach(function (el) { el.innerHTML = p === 'allow' ? '<b>+1</b> <span>-0</span>' : '<b>+0</b> <span>-0</span>'; });
  }
  $$('[data-perm]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      state.permission = btn.getAttribute('data-perm');
      renderChat();
      noteInteraction('permission');
    });
  });
  $$('[data-reset-chat]').forEach(function (btn) {
    btn.addEventListener('click', function () { state.permission = null; renderChat(); });
  });

  // ---- sidebar panes ----
  function showPane(name) {
    state.pane = name;
    $$('.pane').forEach(function (p) {
      if (p.getAttribute('data-pane') === name) p.setAttribute('data-active', ''); else p.removeAttribute('data-active');
    });
    $$('.sb nav button').forEach(function (b) {
      b.setAttribute('aria-current', b.getAttribute('data-nav') === name ? 'true' : 'false');
    });
    if (name === 'terminal') { var i = $('#term-in'); if (i && window.innerWidth > 860) i.focus(); }
  }
  $$('[data-nav]').forEach(function (b) {
    b.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); b.click(); } });
    b.addEventListener('click', function () {
      var name = b.getAttribute('data-nav');
      showPane(name);
      if (name !== 'chat') noteInteraction('pane:' + name);
    });
  });

  // ---- goals ----
  var STEPS = ['Interview: PRD.md and PLAN.md written', 'Phase 1 of 3: building in goal/add-csv-export', 'Tests green, checkpoint committed', 'Phase 2 of 3: building', 'Tests green, checkpoint committed', 'Phase 3 of 3: building', 'Tests green, merged with --no-ff'];
  function renderGoal() {
    var g = state.goal;
    $$('[data-engine]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-engine') === g.engine ? 'true' : 'false'); });
    $('#goal-form').classList.toggle('hide', g.running);
    $('#goal-run').classList.toggle('hide', !g.running);
    $('#goal-engine').textContent = g.engine;
    $$('#goal-rail li').forEach(function (li, i) {
      li.classList.toggle('on', i <= g.step);
      li.classList.toggle('done', i < g.step);
      var t = $('small', li);
      if (t) t.textContent = i < g.step ? 'done' : i === g.step ? (i === STEPS.length - 1 ? 'done' : 'now') : '';
    });
  }
  $$('[data-engine]').forEach(function (b) {
    b.addEventListener('click', function () { state.goal.engine = b.getAttribute('data-engine'); renderGoal(); });
  });
  var goalTimer = null;
  function startGoal() {
    state.goal.running = true; state.goal.step = 0; renderGoal();
    noteInteraction('goal');
    clearInterval(goalTimer);
    goalTimer = setInterval(function () {
      if (state.goal.step >= STEPS.length - 1) { clearInterval(goalTimer); return; }
      state.goal.step += 1; renderGoal();
    }, 900);
  }
  var startBtn = $('#goal-start'); if (startBtn) startBtn.addEventListener('click', startGoal);
  var againBtn = $('#goal-again'); if (againBtn) againBtn.addEventListener('click', function () { clearInterval(goalTimer); state.goal.running = false; renderGoal(); });

  // ---- routines ----
  function renderRoutines() {
    Object.keys(state.routines).forEach(function (id) {
      var r = state.routines[id]; var li = $('[data-routine="' + id + '"]'); if (!li) return;
      $('.dot', li).classList.toggle('paused', r.paused);
      $('.when', li).textContent = r.paused ? 'paused' : r.every + ' · ' + r.last;
      $('.pause', li).textContent = r.paused ? 'Resume' : 'Pause';
      $('.run', li).textContent = r.runningLabel || 'Run now';
      $('.run', li).disabled = !!r.runningLabel;
    });
  }
  $$('[data-routine]').forEach(function (li) {
    var id = li.getAttribute('data-routine');
    $('.run', li).addEventListener('click', function () {
      var r = state.routines[id];
      r.runningLabel = 'Running…'; renderRoutines(); noteInteraction('routine');
      setTimeout(function () { r.runningLabel = 'Ran just now'; r.last = 'ran just now'; renderRoutines(); }, 1400);
      setTimeout(function () { r.runningLabel = null; renderRoutines(); }, 3200);
    });
    $('.pause', li).addEventListener('click', function () {
      var r = state.routines[id]; r.paused = !r.paused; renderRoutines(); noteInteraction('routine');
    });
  });

  // ---- terminal ----
  var CMDS = {
    'ls': 'app.js\nREADME.md\npackage.json',
    'ls -la': 'total 24\ndrwxr-xr-x   6 you  staff   192  8 Oct 02:07 .\ndrwxr-x---+ 560 you  staff 17920  8 Oct 12:54 ..\ndrwxr-xr-x   3 you  staff    96  8 Oct 02:07 .claude\ndrwxr-xr-x  13 you  staff   416  8 Oct 12:54 .git\n-rw-r--r--   1 you  staff   105  7 Sep 17:30 app.js',
    'git status': 'On branch main\nChanges not staged for commit:\n  (use "git add <file>..." to update what will be committed)\n\tmodified:   app.js\n\nno changes added to commit (use "git add" and/or "git commit -a")',
    'ctrlall doctor': 'PROVIDER     BINARY        STATUS\nclaude       claude        <ok>ready</ok>  ~/.local/bin/claude\ncodex        codex         <ok>ready</ok>  ~/.local/bin/codex\nopencode     opencode      <ok>ready</ok>  ~/.opencode/bin/opencode\ngrok         grok          <ok>ready</ok>  ~/.grok/bin/grok\nhermes       hermes        <ok>ready</ok>  ~/.local/bin/hermes\nkimi         kimi          <ok>ready</ok>  ~/.kimi-code/bin/kimi\ncursor       cursor-agent  <warn>not installed</warn>\ngemini       gemini        <warn>not installed</warn>\nlocal        opencode      <ok>ready</ok>  Ollama at 127.0.0.1:11434',
    'ctrlall relay show': 'relay    wss://relay.ctrlall.app   scope: public\nbridge   running / connected\nphones   1 connected',
    'help': 'This demo knows: ls, git status, ctrlall doctor, ctrlall relay show, clear.'
  };
  var termOut = $('#term-out'); var termForm = $('#term-form'); var termIn = $('#term-in');
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&lt;(\/?)(ok|warn|dim)&gt;/g, '<$1span class="$2">').replace(/<(\/?)span class="(ok|warn|dim)">/g, function (m, c, k) { return c ? '</span>' : '<span class="' + k + '">'; }); }
  function runCmd(cmd) {
    cmd = cmd.trim(); if (!cmd) return;
    if (cmd === 'clear') { termOut.innerHTML = ''; return; }
    var out = CMDS[cmd];
    if (out === undefined) out = 'zsh: command not found: ' + cmd.split(' ')[0] + '\n<dim>' + CMDS.help + '</dim>';
    termOut.innerHTML += '<span class="ok">you@mac</span> <span class="dim">ps-e2e-demo %</span> ' + esc(cmd) + '\n' + esc(out) + '\n';
    termOut.parentNode.scrollTop = termOut.parentNode.scrollHeight;
    noteInteraction('terminal');
  }
  if (termForm) termForm.addEventListener('submit', function (e) { e.preventDefault(); runCmd(termIn.value); termIn.value = ''; });
  $$('[data-cmd]').forEach(function (b) { b.addEventListener('click', function () { runCmd(b.getAttribute('data-cmd')); if (termIn && window.innerWidth > 860) termIn.focus(); }); });

  // ---- dialog close ----
  var dlg = $('#wl');
  if (dlg) {
    $$('[data-close]', dlg).forEach(function (b) { b.addEventListener('click', function () { dlg.close(); }); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  }

  renderChat(); renderGoal(); renderRoutines(); showPane('chat');
})();
