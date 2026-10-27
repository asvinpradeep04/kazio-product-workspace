/* ──────────────────────────────────────────────────────────
   renderer.js — Kazio Onboarding + Assessment Engine
────────────────────────────────────────────────────────── */

// ── SAFE SHORTHAND ──────────────────────────────────────
const $ = id => document.getElementById(id);
const $q = sel => document.querySelector(sel);

// Material Symbols are not bundled with the desktop app. Replace their text
// ligatures with local SVGs so every control renders consistently offline.
function renderLocalIcons() {
  const icons = {
    stop_circle: '<circle cx="12" cy="12" r="8.5"/><rect x="9" y="9" width="6" height="6" rx=".8"/>',
    code: '<path d="m8.5 8.5-3.5 3.5 3.5 3.5M15.5 8.5l3.5 3.5-3.5 3.5M13.5 5.5l-3 13"/>',
    cloud_done: '<path d="M7 18h10a4 4 0 0 0 .8-7.9A5.8 5.8 0 0 0 6.7 8.7 4.7 4.7 0 0 0 7 18Z"/><path d="m9.5 13 1.7 1.7 3.5-3.7"/>',
    content_copy: '<rect x="8" y="8" width="9" height="10" rx="1.5"/><path d="M6 15V6.5A1.5 1.5 0 0 1 7.5 5H15"/>',
    delete_sweep: '<path d="M4.5 7h15M10 10v5M14 10v5M8 7l.7-2h6.6l.7 2M7 7l.7 11h8.6L17 7"/><path d="m3.5 18 2 2"/>',
    play_arrow: '<path d="m9 7 7 5-7 5Z" fill="currentColor" stroke="none"/>',
    arrow_back: '<path d="M19 12H5M10 7l-5 5 5 5"/>',
    arrow_forward: '<path d="M5 12h14M14 7l5 5-5 5"/>',
    policy: '<path d="M12 4 5.5 7v5c0 4 2.7 6.6 6.5 8 3.8-1.4 6.5-4 6.5-8V7L12 4Z"/><path d="m9.2 12 1.8 1.8 3.8-4"/>',
    videocam: '<rect x="4" y="7" width="11" height="10" rx="2"/><path d="m15 10 4-2.5v9L15 14"/>',
    desktop_windows: '<rect x="4" y="5" width="16" height="12" rx="1.5"/><path d="M4 8.5h16M10 20h4M12 17v3"/>',
    mic: '<rect x="9" y="4" width="6" height="10" rx="3"/><path d="M6.5 11a5.5 5.5 0 0 0 11 0M12 16.5V20M9 20h6"/>',
    screen_share: '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M12 20v-4M9 20h6M12 8v5M10 10l2-2 2 2"/>',
    network_ping: '<path d="M5 17v-2M9 17v-5M13 17V9M17 17V5"/><path d="M4 19h16"/>'
  };

  document.querySelectorAll('.material-symbols-outlined').forEach(node => {
    const path = icons[node.textContent.trim()];
    if (!path) return;
    node.classList.add('ui-icon');
    node.setAttribute('aria-hidden', 'true');
    node.innerHTML = `<svg viewBox="0 0 24 24" focusable="false">${path}</svg>`;
  });
}

// ── WINDOWS / META KEY DOM TRAP ──────────────────────────
window.addEventListener('keydown', (e) => {
  if (e.key === 'Meta' || e.key === 'OS' || e.code === 'MetaLeft' || e.code === 'MetaRight') {
    e.preventDefault();
    e.stopPropagation();
    if (typeof logViolation === 'function') logViolation('Windows Key press suppressed');
    return false;
  }
}, true);

window.addEventListener('keyup', (e) => {
  if (e.key === 'Meta' || e.key === 'OS' || e.code === 'MetaLeft' || e.code === 'MetaRight') {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
}, true);

// ── APP STATE ───────────────────────────────────────────
const State = {
  screen: 0,
  user: null,
  profile: {
    name: '',
    email: '',
    arena: 'PRODUCT',
    goal: 'GET DISCOVERED',
    family: '',
    track: '',
    experience: '3-5 years',
    industry: '',
    tools: '',
    portfolio: '',
    onboarding_step: '2',
    onboarding_completed: false
  },
  // Workspace
  timer: null,
  remainingSecs: 60 * 60,
  violations: [],
  autoSaveTimer: null,
  challenge: null,
  enteringMarketplace: false,
  // Dashboard filters & state
  activeSkillFilter: 'all',
  activeTabFilter: 'all',
  remoteOnlyFilter: false,
  savedChallengeIds: new Set()
};

// ── SCREEN NAVIGATION ────────────────────────────────────
const SCREEN_IDS = ['s0','s1','s-otp','s2','s3','s4','s5','s6','s7','s-dashboard','s-analytics','s-settings','s-mission-control','s-ai-qa','s-live-defense','s-leaderboard','s-project','s-workspace','s-team-choice','s-team-workbench-flow','s-team-ready','s-submission-success'];
const STEP_MAP = { 0:0, 1:1, 'otp':2, 2:3, 3:4, 4:5, 5:6, 6:7, 7:8, 'dashboard':9, 'analytics':9, 'settings':9, 'mission-control':9, 'ai-qa':9, 'live-defense':9, 'leaderboard':9, 'project':9, 'workspace':9, 'team-choice':9, 'team-flow':9, 'team-ready':9, 'submission-success':9 };

function gotoScreen(key) {
  const id = typeof key === 'number'
    ? (key === -1 ? 's-otp' : `s${key}`)
    : (key === 'workspace' ? 's-workspace' : key === 'dashboard' ? 's-dashboard' : key === 'analytics' ? 's-analytics' : key === 'settings' ? 's-settings' : key === 'mission-control' ? 's-mission-control' : key === 'ai-qa' ? 's-ai-qa' : key === 'live-defense' ? 's-live-defense' : key === 'leaderboard' ? 's-leaderboard' : key === 'project' ? 's-project' : key === 'team-choice' ? 's-team-choice' : key === 'team-flow' ? 's-team-workbench-flow' : key === 'team-ready' ? 's-team-ready' : key === 'submission-success' ? 's-submission-success' : key);

  SCREEN_IDS.forEach(sid => {
    const el = $(sid);
    if (el) el.classList.remove('active');
  });

  const target = $(id);
  if (target) target.classList.add('active');

  // Update stepper
  const dots = document.querySelectorAll('.ob-step');
  const stepIdx = STEP_MAP[key] ?? 0;
  dots.forEach((d, i) => {
    d.classList.remove('active','done');
    if (i < stepIdx) d.classList.add('done');
    if (i === stepIdx) d.classList.add('active');
  });

  // The challenge experience uses its own navigation instead of onboarding.
  const bar = $('onboarding-bar');
  const isAppScreen = key === 'dashboard' || key === 'analytics' || key === 'settings' || key === 'mission-control' || key === 'ai-qa' || key === 'live-defense' || key === 'leaderboard' || key === 'project' || key === 'workspace' || key === 'team-choice' || key === 'team-flow' || key === 'team-ready' || key === 'submission-success';
  const showRail = key === 'dashboard' || key === 'analytics' || key === 'settings' || key === 'mission-control' || key === 'leaderboard' || key === 'project' || key === 'team-choice' || key === 'team-flow' || key === 'team-ready';
  if (bar) bar.style.display = isAppScreen ? 'none' : '';
  $('screens').classList.toggle('app-mode', isAppScreen);
  document.body.classList.toggle('app-mode-active', showRail);

  const rail = $('app-left-rail');
  if (rail) rail.style.display = showRail ? 'flex' : 'none';

  if (key === 'ai-qa' && typeof initAiQaEngine === 'function') {
    initAiQaEngine();
  }
  if (key === 'live-defense' && typeof initLiveDefenseEngine === 'function') {
    initLiveDefenseEngine();
  }
  if (key === 'settings' && typeof initSettingsPage === 'function') {
    initSettingsPage();
  }



  // Update left-rail active button
  if (showRail) {
    let activeNav = 'welcome';
    if (key === 'dashboard') activeNav = 'welcome';
    else if (key === 'analytics') activeNav = 'analytics';
    else if (key === 'settings') activeNav = 'settings';
    else if (key === 'mission-control' || key === 'leaderboard') activeNav = 'mission-control';
    else if (key === 'project') activeNav = 'workspace';
    else if (key === 'team-choice' || key === 'team-flow' || key === 'team-ready') activeNav = 'challenges';

    document.querySelectorAll('.rail-btn').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.leftNav === activeNav);
    });
  }

  if (key === 'team-flow') {
    openTeamFlowTab(State.currentTeamTab || 'join');
  }

  State.screen = key;
}

// ── TOAST ────────────────────────────────────────────────
function toast(msg, isErr = false) {
  const div = document.createElement('div');
  div.className = 'toast' + (isErr ? ' err' : '');
  div.textContent = msg;
  $('toast-area').appendChild(div);
  setTimeout(() => div.remove(), 3400);
}

// ── SUPABASE HELPERS ─────────────────────────────────────
const sb = () => null;
const OAUTH_REDIRECT_URL = 'kazio://auth/callback';
let profileHydration = null;

function profilePayload(overrides = {}) {
  return {
    id: State.user.id,
    full_name: State.profile.name || State.user.user_metadata?.full_name || State.user.user_metadata?.name || '',
    email: State.profile.email || State.user.email || '',
    arena: State.profile.arena || 'PRODUCT',
    goal: State.profile.goal || 'GET DISCOVERED',
    family: State.profile.family || '',
    track: State.profile.track || '',
    experience: State.profile.experience || '3-5 years',
    industry: State.profile.industry || '',
    tools: State.profile.tools || '',
    portfolio: State.profile.portfolio || '',
    onboarding_step: State.profile.onboarding_step || '2',
    onboarding_completed: Boolean(State.profile.onboarding_completed),
    updated_at: new Date().toISOString(),
    ...overrides
  };
}

function applyProfileRecord(profile) {
  if (!profile) return;
  Object.keys(State.profile).forEach(key => {
    if (profile[key] !== null && profile[key] !== undefined) State.profile[key] = profile[key];
  });
  if ($('s6-exp')) $('s6-exp').value = State.profile.experience;
  if ($('s6-industry')) $('s6-industry').value = State.profile.industry;
  if ($('s6-tools')) $('s6-tools').value = State.profile.tools;
  if ($('s6-portfolio')) $('s6-portfolio').value = State.profile.portfolio;
}

function restoreSelectedCard(gridId, value) {
  if (!value) return;
  const grid = $(gridId);
  const selected = grid?.querySelector(`.sel-card[data-val="${CSS.escape(value)}"]`);
  if (!selected) return;
  grid.querySelectorAll('.sel-card').forEach(card => {
    const active = card === selected;
    card.classList.toggle('selected', active);
    const state = card.querySelector('.card-state');
    if (state) state.textContent = active ? 'SELECTED' : 'SELECT';
  });
}

function restoreOnboardingUi() {
  const step = Number.parseInt(State.profile.onboarding_step, 10) || 2;
  restoreSelectedCard('arena-grid', State.profile.arena);
  restoreSelectedCard('goal-grid', State.profile.goal);
  if (step >= 4) {
    renderDynamicGrid('family-grid', getFamilies(), 'family');
    restoreSelectedCard('family-grid', State.profile.family);
  }
  if (step >= 5) {
    renderDynamicGrid('track-grid', getTracks(), 'track');
    restoreSelectedCard('track-grid', State.profile.track);
  }
}

async function establishAuthenticatedSession(session, { resume = true } = {}) {
  const user = session?.user;
  if (!user) return null;
  if (profileHydration?.userId === user.id) return profileHydration.promise;

  State.user = user;
  State.profile.email = user.email || State.profile.email;
  State.profile.name = user.user_metadata?.full_name || user.user_metadata?.name || State.profile.name;
  updateSupabaseBadge();

  const promise = (async () => {
    // A Google user now gets a profile row immediately after authentication,
    // rather than only after completing the final onboarding form.
    const { error: bootstrapError } = await sb().from('profiles').upsert({
      id: user.id,
      full_name: State.profile.name || user.user_metadata?.full_name || user.user_metadata?.name || '',
      email: State.profile.email || user.email || '',
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });
    if (bootstrapError) console.error('[Supabase Profile Bootstrap Error]:', bootstrapError);

    const { data: profile, error: profileError } = await sb()
      .from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (profileError) console.error('[Supabase Profile Load Error]:', profileError);
    else applyProfileRecord(profile);

    restoreOnboardingUi();
    updateSupabaseBadge();
    if (resume) {
      if (State.profile.onboarding_completed) {
        initChallengeDashboard();
        gotoScreen('dashboard');
      } else {
        gotoScreen(Number.parseInt(State.profile.onboarding_step, 10) || 2);
      }
    }
    return user;
  })();

  profileHydration = { userId: user.id, promise };
  try {
    return await promise;
  } finally {
    if (profileHydration?.promise === promise) profileHydration = null;
  }
}

async function upsertProfileResilient(payload) {
  if (!State.user || !sb()) return { success: true, error: null };

  let currentPayload = { ...payload };
  let res = await sb().from('profiles').upsert(currentPayload, { onConflict: 'id' });

  // Self-healing schema fallback: if remote Supabase schema is missing a column
  // (e.g. 'onboarding_completed' or 'onboarding_step'), strip it and retry automatically.
  while (res.error && res.error.message && res.error.message.includes("Could not find the '")) {
    const match = res.error.message.match(/Could not find the '([^']+)' column/);
    if (match && match[1]) {
      const missingColumn = match[1];
      console.warn(`[Supabase Schema Fallback] Stripping missing column '${missingColumn}' from profiles payload`);
      delete currentPayload[missingColumn];
      res = await sb().from('profiles').upsert(currentPayload, { onConflict: 'id' });
    } else {
      break;
    }
  }

  return res;
}

async function persistOnboardingProgress(step, completed = false) {
  State.profile.onboarding_step = String(step);
  State.profile.onboarding_completed = completed;
  if (!State.user || !sb()) return;
  const { error } = await upsertProfileResilient(
    profilePayload({ onboarding_step: String(step), onboarding_completed: completed })
  );
  if (error) console.error('[Supabase Onboarding Progress Error]:', error);
}

async function signInWithGoogle() {
  await doGoogleSignIn();
}

async function doGoogleSignIn() {
  const modal = $('google-modal');
  if (modal) modal.classList.add('hidden');
  
  if (!sb()) {
    toast('Supabase client not initialized', true);
    return;
  }

  // The Electron main process captures this callback in a dedicated OAuth window.
  // Keeping it out of the assessment window prevents the app from navigating away.
  const redirectUrl = OAUTH_REDIRECT_URL;

  try {
    toast('Opening Google Sign-In...');
    const { data, error } = await sb().auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
        queryParams: { access_type: 'offline', prompt: 'consent' }
      }
    });
    if (error) throw error;
    if (!data?.url || !window.kazioApi?.openGoogleAuth) throw new Error('Google sign-in is unavailable in this app build.');

    const result = await window.kazioApi.openGoogleAuth(data.url);
    if (result?.cancelled) {
      toast('Google sign-in cancelled');
      return;
    }
    if (result?.error) throw new Error(result.error);

    const callbackUrl = new URL(result.url);
    const hashParams = new URLSearchParams(callbackUrl.hash.slice(1));
    let authResult;
    if (hashParams.get('access_token') && hashParams.get('refresh_token')) {
      authResult = await sb().auth.setSession({
        access_token: hashParams.get('access_token'),
        refresh_token: hashParams.get('refresh_token')
      });
    } else if (callbackUrl.searchParams.get('error_description')) {
      throw new Error(callbackUrl.searchParams.get('error_description'));
    } else {
      throw new Error(hashParams.get('error_description') || 'Google did not return a session. Please try again.');
    }
    if (authResult.error) throw authResult.error;
    await establishAuthenticatedSession(authResult.data.session || { user: authResult.data.user });
    toast(`Signed in as ${State.profile.email} ✓`);
  } catch (e) {
    console.error('[Google OAuth Error]:', e);
    toast('Google sign-in error: ' + (e.message || e), true);
  }
}

let lastSubmittedPassword = '';

async function signInWithEmail(email, password) {
  if (!sb()) {
    toast('Supabase not configured — skipping auth', true);
    gotoScreen(2);
    return;
  }

  toast('Signing in...');
  lastSubmittedPassword = password;
  const { data, error } = await sb().auth.signInWithPassword({ email, password });
  
  if (error) {
    console.error('[Email Sign-In Error]:', error);
    if (error.message?.toLowerCase().includes('confirm') || error.message?.toLowerCase().includes('unconfirmed')) {
      State.profile.email = email;
      const otpDisplay = $('otp-email-display');
      if (otpDisplay) otpDisplay.textContent = email;
      toast('Email not confirmed yet. Redirecting to verification screen...', true);
      gotoScreen(-1);
    } else {
      toast(error.message || 'Sign in failed', true);
    }
    return;
  }

  await establishAuthenticatedSession(data.session || { user: data.user });
  toast(`Welcome back, ${State.profile.name || State.profile.email}! ✓`);
}

async function signUpWithEmail(name, email, password) {
  if (!sb()) {
    toast('Supabase not configured — demo mode', true);
    gotoScreen(-1);
    return;
  }

  toast('Creating account...');
  lastSubmittedPassword = password;
  const { data, error } = await sb().auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name }
    }
  });

  if (error) {
    console.error('[Email Sign-Up Error]:', error);
    toast(error.message || 'Registration failed', true);
    return;
  }

  State.profile.name = name;
  State.profile.email = email;

  if (data.session) {
    // Session created immediately (email confirmation turned off in Supabase)
    await establishAuthenticatedSession(data.session);
    toast('Account created & signed in! ✓');
  } else {
    // Email confirmation / OTP required by Supabase
    const otpDisplay = $('otp-email-display');
    if (otpDisplay) otpDisplay.textContent = email;
    toast('Verification email & code sent! Check your inbox.');
    gotoScreen(-1);
  }
}

async function verifyOtp(email, token) {
  if (!sb()) {
    toast('Supabase not configured — skipping OTP', true);
    gotoScreen(2);
    return;
  }

  if (!email) {
    toast('Email address is missing. Please sign up or sign in again.', true);
    return;
  }

  const cleanToken = token.replace(/[\s-]/g, '');
  if (!cleanToken) {
    toast('Please enter a valid verification code', true);
    return;
  }

  toast('Verifying code...');
  
  // Try signup type first
  let res = await sb().auth.verifyOtp({ email, token: cleanToken, type: 'signup' });
  if (res.error) {
    // Try email type
    res = await sb().auth.verifyOtp({ email, token: cleanToken, type: 'email' });
  }
  if (res.error) {
    // Try magiclink type
    res = await sb().auth.verifyOtp({ email, token: cleanToken, type: 'magiclink' });
  }

  if (res.error) {
    console.error('[OTP Verification Error]:', res.error);
    toast('Verification failed: ' + res.error.message, true);
    return;
  }

  await establishAuthenticatedSession(res.data?.session || { user: res.data?.user });
  toast('Email verified & logged in! ✓');
}

async function checkVerificationStatus() {
  if (!sb()) return;

  toast('Checking verification status...');
  const { data: { session } } = await sb().auth.getSession();
  if (session?.user?.email_confirmed_at || session?.user) {
    await establishAuthenticatedSession(session);
    toast('Email confirmed & signed in! ✓');
    return;
  }

  // Try logging in with the stored password if available
  if (State.profile.email && lastSubmittedPassword) {
    const { data, error } = await sb().auth.signInWithPassword({
      email: State.profile.email,
      password: lastSubmittedPassword
    });
    if (!error && (data.session || data.user)) {
      await establishAuthenticatedSession(data.session || { user: data.user });
      toast('Email verified! Signed in successfully ✓');
      return;
    }
  }

  toast('Email not verified yet. Enter the 6-digit code or check your inbox.', true);
}

async function resendSignupOtp(email) {
  if (!sb() || !email) {
    toast('Enter your email address and sign up again to request a code.', true);
    return;
  }

  toast('Sending a new verification link...');
  const { error } = await sb().auth.resend({ type: 'signup', email });
  if (error) {
    console.error('[OTP Resend Error]:', error);
    toast('Could not resend the code: ' + error.message, true);
    return;
  }

  toast('A new verification link was sent to ' + email + '.');
}

function updateSupabaseBadge() {
  const badge = document.querySelector('.supabase-badge');
  if (badge && State.profile.email) {
    badge.innerHTML = `<span class="bolt-icon">⚡</span> Connected (${State.profile.email})`;
  }
}

async function saveProfileToSupabase() {
  if (!sb()) {
    toast('Profile ready for your assessment');
    gotoScreen(7);
    return;
  }

  // Ensure active user
  if (!State.user) {
    const { data } = await sb().auth.getSession();
    if (data?.session?.user) State.user = data.session.user;
  }

  if (!State.user) {
    console.warn('[Supabase] No logged-in user session found. Saving profile in local state.');
    toast('Profile saved locally (Sign in to sync with Supabase cloud)');
    gotoScreen(7);
    return;
  }

  toast('Syncing profile to Supabase...');
  const { error } = await upsertProfileResilient(
    profilePayload({ onboarding_step: '7', onboarding_completed: false })
  );

  if (error) {
    console.error('[Supabase Profiles Upsert Error]:', error);
    toast('Profile saved locally (Schema notice: ' + error.message + ')');
  } else {
    toast('Profile synced to Supabase PostgreSQL ✓');
  }
  gotoScreen(7);
}

async function ensureCurrentUser() {
  if (State.user) return State.user;
  const { data, error } = await sb().auth.getSession();
  if (error) throw error;
  State.user = data?.session?.user || null;
  return State.user;
}

async function submitToSupabase(content, wordCount) {
  if (!sb()) {
    toast('Project submitted locally');
    return true;
  }

  if (!State.user) {
    const { data } = await sb().auth.getSession();
    if (data?.session?.user) State.user = data.session.user;
  }

  if (!State.user) {
    toast('Submitted locally (Sign in to save to Supabase cloud)', false);
    return true;
  }

  toast('Submitting to Supabase...');
  const { error } = await sb().from('submissions').insert({
    user_id: State.user.id,
    challenge_id: State.challenge?.id || 'demo-challenge',
    content: content || '',
    word_count: wordCount || 0,
    violations: State.violations || [],
    submitted_at: new Date().toISOString()
  });

  if (error) {
    console.error('[Supabase Submission Error]:', error);
    toast('Submission error: ' + error.message, true);
    return false;
  }

  toast('Challenge submitted to Supabase PostgreSQL ✓');
  return true;
}

async function autoSaveDraft(content) {
  if (!sb() || !content) return;
  
  if (!State.user) {
    const { data } = await sb().auth.getSession();
    if (data?.session?.user) State.user = data.session.user;
  }

  if (!State.user) return;

  const { error } = await sb().from('drafts').upsert({
    user_id: State.user.id,
    content: content,
    saved_at: new Date().toISOString()
  }, { onConflict: 'user_id' });

  if (error) {
    console.error('[Supabase Draft Upsert Error]:', error);
    return;
  }

  const dot = document.querySelector('.sync-dot');
  if (dot) {
    dot.style.background = '#10b981';
    setTimeout(() => { dot.style.background = ''; }, 1200);
  }
}

// ── SESSION CHECK & AUTH LISTENER ─────────────────────────
async function checkSession() {
  if (!sb()) return;

  // Keep the renderer in sync with session refreshes and new sign-ins.
  sb().auth.onAuthStateChange((event, session) => {
    console.log('[Supabase Auth State Change]:', event, session?.user?.email);
    if (session?.user && event !== 'INITIAL_SESSION') {
      // Supabase recommends deferring calls back into the client here, so the
      // auth library can release its internal lock before profile queries run.
      setTimeout(() => establishAuthenticatedSession(session).catch(error => {
        console.error('[Supabase Session Restore Error]:', error);
      }), 0);
    }
  });

  // Initial session check
  const { data } = await sb().auth.getSession();
  if (data?.session?.user) {
    State.user = data.session.user;
    State.profile.email = State.user.email || '';
    State.profile.name = State.user.user_metadata?.full_name || State.user.user_metadata?.name || '';
    updateSupabaseBadge();
  }
  return data?.session || null;
}

// ── CARD GRID HELPERS ────────────────────────────────────
function bindCardGrid(gridId, stateKey) {
  const grid = $(gridId);
  if (!grid) return;
  grid.querySelectorAll('.sel-card').forEach(card => {
    card.addEventListener('click', () => {
      grid.querySelectorAll('.sel-card').forEach(c => {
        c.classList.remove('selected');
        c.querySelector('.card-state').textContent = 'SELECT';
      });
      card.classList.add('selected');
      card.querySelector('.card-state').textContent = 'SELECTED';
      State.profile[stateKey] = card.dataset.val;
    });
  });
}

function renderDynamicGrid(gridId, items, stateKey) {
  const grid = $(gridId);
  if (!grid) return;
  grid.innerHTML = items.map((item, i) => `
    <div class="sel-card ${i===0?'selected':''}" data-val="${item.val}">
      <div class="card-ico">${item.ico}</div>
      <h3>${item.val}</h3>
      <p>${item.desc}</p>
      <div class="card-state">${i===0?'SELECTED':'SELECT'}</div>
    </div>
  `).join('');
  if (items[0]) State.profile[stateKey] = items[0].val;
  bindCardGrid(gridId, stateKey);
}

const FAMILIES = {
  PRODUCT: [
    { val:'GROWTH',       ico:'🚀', desc:'Acquisition funnels, activation, retention loops.' },
    { val:'CORE PRODUCT', ico:'🧩', desc:'Feature design, user journeys, release strategy.' },
    { val:'PLATFORM',     ico:'🏗️', desc:'APIs, developer products, infrastructure strategy.' },
    { val:'DATA',         ico:'📊', desc:'Experimentation, A/B testing, analytics pipelines.' },
    { val:'GTM',          ico:'🌐', desc:'Go-to-market, launches, positioning, and pricing.' },
    { val:'MONETISATION', ico:'💰', desc:'Revenue models, pricing tiers, and paywall design.' }
  ],
  ENGINEERING: [
    { val:'BACKEND',      ico:'⚙️',  desc:'APIs, databases, microservices and infra.' },
    { val:'FRONTEND',     ico:'🎨', desc:'React, performance, accessibility, and design systems.' },
    { val:'FULLSTACK',    ico:'🔧', desc:'End-to-end feature implementation.' },
    { val:'DATA ENG',     ico:'🗄️', desc:'Pipelines, warehouses, and ETL systems.' },
    { val:'DEVOPS',       ico:'🔄', desc:'CI/CD, Kubernetes, observability and SRE.' },
    { val:'ML ENG',       ico:'🤖', desc:'Model training, serving and MLOps pipelines.' }
  ],
  DESIGN: [
    { val:'PRODUCT UX',   ico:'🎯', desc:'User flows, wireframes, and usability testing.' },
    { val:'VISUAL',       ico:'✨', desc:'Visual systems, branding and illustration.' },
    { val:'INTERACTION',  ico:'💫', desc:'Motion, prototyping and micro-interactions.' },
  ],
  DATA: [
    { val:'ANALYTICS',    ico:'📈', desc:'Dashboards, KPIs, and business intelligence.' },
    { val:'SCIENCE',      ico:'🔬', desc:'Modelling, forecasting and machine learning.' },
    { val:'STRATEGY',     ico:'♟️', desc:'Org-level metrics strategy and decision science.' }
  ]
};

const TRACKS = {
  GROWTH: [
    { val:'ACQUISITION',  ico:'📡', desc:'Paid & organic top-of-funnel strategy.' },
    { val:'ACTIVATION',   ico:'⚡', desc:'Onboarding design and time-to-value optimisation.' },
    { val:'RETENTION',    ico:'🔒', desc:'Habit loops, engagement and churn prevention.' }
  ],
  'CORE PRODUCT': [
    { val:'B2B SAAS',     ico:'🏢', desc:'Enterprise feature strategy and multi-tenancy.' },
    { val:'CONSUMER',     ico:'📱', desc:'Mobile-first consumer product journeys.' },
    { val:'MARKETPLACE',  ico:'🛒', desc:'Supply-demand balance and network effects.' }
  ],
  DEFAULT: [
    { val:'SPECIALIST',   ico:'🎯', desc:'Deep specialist expertise in your chosen area.' },
    { val:'GENERALIST',   ico:'🌐', desc:'Cross-functional breadth across domains.' },
    { val:'LEAD',         ico:'🦁', desc:'Team leadership and strategic decision-making.' }
  ]
};

function getFamilies() {
  return FAMILIES[State.profile.arena] || FAMILIES.PRODUCT;
}

function getTracks() {
  return TRACKS[State.profile.family] || TRACKS.DEFAULT;
}

function initMediaMonitoring() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    const statusText = $('media-status-text');
    if (statusText) statusText.textContent = '📷 Cam & 🎙️ Mic Error (API unavailable)';
    return;
  }

  navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
      const statusText = $('media-status-text');
      if (statusText) statusText.textContent = '📷 Cam & 🎙️ Mic Active';
      const videoEl = $('ws-cam-preview');
      if (videoEl) {
        videoEl.srcObject = stream;
        videoEl.play().catch(() => {});
      }
      toast('Webcam & Microphone streams active ✓');
    })
    .catch(err => {
      console.warn('[Media Monitoring Error]:', err);
      const statusText = $('media-status-text');
      if (statusText) statusText.textContent = '⚠️ Cam/Mic Access Pending or Denied';
      logViolation('Camera/Microphone media stream request failed: ' + err.message);
    });
}

// ── WORKSPACE ────────────────────────────────────────────
function syncWorkspaceMode() {
  const workspace = $('s-workspace');
  if (!workspace) return;

  const isTeamProject = Boolean(State.challenge?.isTeam);
  const shell = workspace.firstElementChild;
  const header = shell?.querySelector(':scope > header');
  const main = shell?.querySelector(':scope > main');
  const rightScroll = main?.querySelector(':scope > section:last-child > div:first-child');
  const members = State.teamData?.members?.length
    ? State.teamData.members
    : [{ name: State.profile.name || 'Lead Operator', role: 'LEADER' }];

  workspace.classList.toggle('team-workspace', isTeamProject);
  workspace.querySelector('#workspace-team-strip')?.remove();
  workspace.querySelector('#workspace-team-context')?.remove();
  workspace.querySelector('#team-contribution-panel')?.remove();

  const notesLabel = rightScroll?.querySelector('label');
  const notesEditor = $('scratch-editor');
  const readyLabel = $('btn-submit')?.parentElement?.querySelector('span');
  const memberCount = $('sum-members');

  if (!isTeamProject) {
    if (notesLabel) notesLabel.textContent = 'Submission Notes';
    if (notesEditor) notesEditor.placeholder = 'What did you build?';
    if (readyLabel) readyLabel.textContent = 'Ready when you are done';
    if (memberCount) memberCount.textContent = '4';
    return;
  }

  if (notesLabel) notesLabel.textContent = 'Project Comments';
  if (notesEditor) notesEditor.placeholder = 'What did your team build?';
  if (readyLabel) readyLabel.textContent = 'Ready when your team is done';
  if (memberCount) memberCount.textContent = String(members.length);

  const teamName = State.teamData?.name || 'Nightfall Unit';
  const teamContext = document.createElement('span');
  teamContext.id = 'workspace-team-context';
  teamContext.textContent = 'TEAM PROJECT';
  const titleContainer = $('ws-challenge-title')?.parentElement;
  titleContainer?.insertBefore(teamContext, $('ws-challenge-title'));

  const strip = document.createElement('div');
  strip.id = 'workspace-team-strip';
  const roster = members.slice(0, 4).map((member, index) => {
    const name = member.name || `Operator ${index + 1}`;
    const handle = (member.handle || name).replace(/^@/, '').toUpperCase();
    const initials = name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase();
    return `<div class="team-strip-member"><span class="team-strip-avatar">${initials}</span><span><b>${handle}</b><small>${index === 0 ? 'WORKING' : 'ONLINE'}</small></span></div>`;
  }).join('');
  strip.innerHTML = `<div class="team-strip-name">${teamName.toUpperCase()} <span>• TEAM 07 • ${members.length} MEMBERS</span></div><div class="team-strip-roster">${roster}</div><div class="team-strip-status"><i></i>${members.length} ACTIVE NOW</div>`;
  header?.insertAdjacentElement('afterend', strip);

  if (rightScroll) {
    const contribution = document.createElement('section');
    contribution.id = 'team-contribution-panel';
    const rows = members.slice(0, 4).map((member, index) => {
      const name = member.name || `Operator ${index + 1}`;
      const handle = (member.handle || name).replace(/^@/, '').toUpperCase();
      return `<li><span class="contribution-avatar">${name.charAt(0).toUpperCase()}</span><b>${handle}</b><em>${index === 0 ? '0 FILES' : 'NO CONTRIBUTION YET'}</em></li>`;
    }).join('');
    contribution.innerHTML = `<h3>Team Contribution</h3><ul>${rows}</ul>`;
    rightScroll.appendChild(contribution);
  }
}

function initWorkspace() {
  const defaultChallenge = {
    id: 'demo-pm-001',
    title: 'Ship a 5-Day Product Spec Under Market Pressure',
    company: 'Finova (FinTech SaaS)',
    time: 60,
    difficulty: 'Senior PM'
  };
  State.challenge = State.challenge || defaultChallenge;

  // Initialize camera and microphone monitoring if function exists
  if (typeof initMediaMonitoring === 'function') {
    initMediaMonitoring();
  }

  // Set Challenge Title & Candidate
  if ($('ws-challenge-title')) {
    $('ws-challenge-title').textContent = State.challenge.title || 'Ship a 5-Day Product Spec Under Market Pressure';
  }
  if ($('ws-role')) $('ws-role').textContent = State.challenge.title || 'Product Manager Challenge';
  if ($('ws-candidate')) $('ws-candidate').textContent = State.profile.name || State.user?.email || 'Candidate';
  syncWorkspaceMode();

  // Left Panel View Switcher (FILES vs CODE / TERMINAL)
  const btnFiles = $('tab-btn-files');
  const btnCode = $('tab-btn-code');
  const panelFiles = $('panel-files-view');
  const panelCode = $('panel-code-view');
  const indFiles = $('indicator-files');
  const indCode = $('indicator-code');

  if (btnFiles && btnCode) {
    btnFiles.onclick = () => {
      btnFiles.classList.add('text-white');
      btnFiles.classList.remove('text-kaz-muted');
      btnCode.classList.remove('text-white');
      btnCode.classList.add('text-kaz-muted');
      if (indFiles) indFiles.classList.remove('hidden');
      if (indCode) indCode.classList.add('hidden');
      if (panelFiles) panelFiles.classList.remove('hidden');
      if (panelCode) panelCode.classList.add('hidden');
    };
    btnCode.onclick = () => {
      btnCode.classList.add('text-white');
      btnCode.classList.remove('text-kaz-muted');
      btnFiles.classList.remove('text-white');
      btnFiles.classList.add('text-kaz-muted');
      if (indCode) indCode.classList.remove('hidden');
      if (indFiles) indFiles.classList.add('hidden');
      if (panelCode) panelCode.classList.remove('hidden');
      if (panelFiles) panelFiles.classList.add('hidden');
    };
  }

  // Drag & Drop / File Picker Wiring
  const dropZone = $('drop-zone-area');
  const filePicker = $('file-picker');
  const browseBtn = $('browse-files-btn');

  if (dropZone) {
    dropZone.onclick = (e) => {
      if (e.target !== filePicker && filePicker) filePicker.click();
    };
    dropZone.ondragover = (e) => {
      e.preventDefault();
      dropZone.classList.add('border-kaz-yellow', 'bg-[#11100E]');
    };
    dropZone.ondragleave = () => {
      dropZone.classList.remove('border-kaz-yellow', 'bg-[#11100E]');
    };
    dropZone.ondrop = (e) => {
      e.preventDefault();
      dropZone.classList.remove('border-kaz-yellow', 'bg-[#11100E]');
      if (e.dataTransfer.files && e.dataTransfer.files.length) {
        handleFilesUpload(Array.from(e.dataTransfer.files));
      }
    };
  }
  if (browseBtn && filePicker) {
    browseBtn.onclick = (e) => {
      e.stopPropagation();
      filePicker.click();
    };
  }
  if (filePicker) {
    filePicker.onchange = (e) => {
      if (e.target.files && e.target.files.length) {
        handleFilesUpload(Array.from(e.target.files));
      }
    };
  }

  // Submission Notes helper buttons (+ DECISIONS, + TRADE-OFFS, + KNOWN ISSUES)
  const notesEditor = $('scratch-editor');
  const btnDecisions = $('btn-add-decisions');
  const btnTradeoffs = $('btn-add-tradeoffs');
  const btnIssues = $('btn-add-issues');

  const appendNoteTag = (tag) => {
    if (!notesEditor) return;
    const current = notesEditor.value;
    const prefix = current && !current.endsWith('\n') ? '\n\n' : '';
    notesEditor.value = `${current}${prefix}[${tag}]\n- `;
    notesEditor.focus();
    updateSubmissionSummary();
  };

  if (btnDecisions) btnDecisions.onclick = () => appendNoteTag('DECISIONS');
  if (btnTradeoffs) btnTradeoffs.onclick = () => appendNoteTag('TRADE-OFFS');
  if (btnIssues) btnIssues.onclick = () => appendNoteTag('KNOWN ISSUES');

  if (notesEditor) {
    notesEditor.oninput = updateSubmissionSummary;
  }

  // Main code editor word/char count
  const mainEd = $('main-editor');
  if (mainEd) {
    mainEd.oninput = () => {
      updateWordCount();
      updateSubmissionSummary();
    };
  }

  // Submit Buttons
  const triggerSubmitModal = () => {
    const mainContent = $('main-editor')?.value || '';
    const notesContent = $('scratch-editor')?.value || '';
    const fullContent = `${mainContent}\n${notesContent}`.trim();
    const words = fullContent ? fullContent.split(/\s+/).length : 0;
    if ($('m-candidate')) $('m-candidate').textContent = State.profile.name || State.user?.email || 'Candidate';
    if ($('m-words')) $('m-words').textContent = words;
    if ($('m-security')) $('m-security').textContent = (State.violations || []).length === 0 ? 'Clean ✓' : `${State.violations.length} Flag(s)`;
    $('submit-modal')?.classList.remove('hidden');
  };

  if ($('btn-header-submit')) $('btn-header-submit').onclick = triggerSubmitModal;
  document.querySelectorAll('#btn-submit').forEach(btn => {
    btn.onclick = triggerSubmitModal;
  });

  // Timer: 4 hrs, 18 mins, 27 secs default countdown
  if (State.timer) clearInterval(State.timer);
  State.remainingSecs = 4 * 3600 + 18 * 60 + 27;
  updateTimerDisplay();
  State.timer = setInterval(() => {
    State.remainingSecs--;
    updateTimerDisplay();
    if (State.remainingSecs <= 0) {
      clearInterval(State.timer);
      toast('⏰ Time expired — auto-submitting!');
      handleAutoSubmit();
    }
  }, 1000);

  // Auto save every 30s
  if (State.autoSaveTimer) clearInterval(State.autoSaveTimer);
  State.autoSaveTimer = setInterval(() => {
    autoSaveDraft(($('main-editor')?.value || '') + '\n' + ($('scratch-editor')?.value || ''));
  }, 30000);

  updateSubmissionSummary();
  renderUploadedFilesList();
}

function handleFilesUpload(newFiles) {
  State.uploadedFiles = State.uploadedFiles || [];
  newFiles.forEach(f => {
    if (!State.uploadedFiles.some(existing => existing.name === f.name && existing.size === f.size)) {
      State.uploadedFiles.push(f);
    }
  });
  renderUploadedFilesList();
}

function renderUploadedFilesList() {
  const files = State.uploadedFiles || [];
  const container = $('uploaded-files-container');
  const countLabel = $('file-count-label');
  const sumFiles = $('sum-files');

  if (countLabel) countLabel.textContent = `${files.length} / 10 FILES`;
  if (sumFiles) sumFiles.textContent = files.length;

  if (!container) return;
  if (files.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = files.map((file, i) => `
    <div class="flex items-center justify-between bg-[#11100E] border border-kaz-border rounded px-4 py-2.5 font-mono text-xs">
      <div class="flex items-center gap-3 truncate">
        <span class="text-kaz-yellow font-bold">📄</span>
        <span class="text-white truncate font-medium">${file.name}</span>
        <span class="text-kaz-muted text-[10px]">(${(file.size / 1024).toFixed(1)} KB)</span>
      </div>
      <button type="button" class="text-kaz-muted hover:text-red-400 transition-colors remove-file-btn text-sm font-bold cursor-pointer" data-index="${i}">✕</button>
    </div>
  `).join('');

  container.querySelectorAll('.remove-file-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.index);
      State.uploadedFiles.splice(idx, 1);
      renderUploadedFilesList();
    };
  });
}

function updateSubmissionSummary() {
  const mainText = $('main-editor')?.value || '';
  const notesText = $('scratch-editor')?.value || '';

  const mainWords = mainText.trim() ? mainText.trim().split(/\s+/).length : 0;
  const notesWords = notesText.trim() ? notesText.trim().split(/\s+/).length : 0;

  const countLabel = $('notes-char-count');
  if (countLabel) countLabel.textContent = `${notesText.length} / 1200`;

  if ($('wc')) $('wc').textContent = mainWords;
  if ($('cc')) $('cc').textContent = mainText.length;

  if ($('sum-words')) $('sum-words').textContent = notesWords;

  const snippetMatches = mainText.match(/```[\s\S]*?```/g);
  const snippetCount = snippetMatches ? snippetMatches.length : (mainText.trim() ? 1 : 0);
  if ($('sum-snippets')) $('sum-snippets').textContent = snippetCount;
}

function updateTimerDisplay() {
  const h = Math.floor(State.remainingSecs / 3600);
  const m = Math.floor((State.remainingSecs % 3600) / 60);
  const s = State.remainingSecs % 60;
  const valEl = $('timer-val');
  if (valEl) {
    valEl.textContent = h > 0
      ? `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
      : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
}

function updateWordCount() {
  const text = $('main-editor')?.value || '';
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  if ($('wc')) $('wc').textContent = words;
  if ($('cc')) $('cc').textContent = text.length;
}

function navigateBrowser(url) {
  $('url-input').value = url;
  const view = $('research-view');
  if (view) view.src = url;
}

function logViolation(msg) {
  State.violations.push({ time: new Date().toISOString(), msg });
  $('viol-count').textContent = State.violations.length;

  const list = $('viol-list');
  const div = document.createElement('div');
  div.className = 'viol-item';
  div.innerHTML = `<div class="viol-time">${new Date().toLocaleTimeString()}</div><div class="viol-msg">${msg}</div>`;
  list.prepend(div);

  const empty = list.querySelector('.empty-log');
  if (empty) empty.remove();
}

async function handleAutoSubmit() {
  const mainContent = $('main-editor')?.value || '';
  const notesContent = $('scratch-editor')?.value || '';
  const content = `${mainContent}\n${notesContent}`.trim();
  const words = content ? content.split(/\s+/).length : 0;
  const submitted = await submitToSupabase(content, words);
  clearInterval(State.timer);
  clearInterval(State.autoSaveTimer);
  if (submitted) showSubmissionSuccess();
}

function showSubmissionSuccess() {
  gotoScreen('submission-success');
}

function initLiveDefenseEngine() {
  const editor = $('live-defense-editor');
  $('live-defense-copy').onclick = async () => {
    if (!editor?.value) return;
    try { await navigator.clipboard?.writeText(editor.value); toast('Solution copied'); }
    catch { toast('Copy is unavailable in this session', true); }
  };
  $('live-defense-clear').onclick = () => { if (editor) editor.value = ''; editor?.focus(); };
  $('live-defense-run').onclick = () => toast('Local validation passed');
  $('live-defense-previous').onclick = () => gotoScreen('mission-control');
  $('live-defense-save').onclick = () => {
    $('live-defense-captured-modal')?.classList.remove('hidden');
  };
  $('live-defense-go-mission').onclick = () => {
    $('live-defense-captured-modal')?.classList.add('hidden');
    gotoScreen('mission-control');
  };
  $('live-defense-end').onclick = () => {
    $('live-defense-exit-modal')?.classList.remove('hidden');
  };
  $('live-defense-exit-cancel').onclick = () => {
    $('live-defense-exit-modal')?.classList.add('hidden');
    editor?.focus();
  };
  $('live-defense-exit-confirm').onclick = () => {
    if (editor) editor.value = '';
    $('live-defense-exit-modal')?.classList.add('hidden');
    toast('Live Defense ended. One attempt remains.');
    gotoScreen('mission-control');
  };
}

// ── LOCKDOWN SEQUENCE ────────────────────────────────────
function engageLockdown() {
  if (State.enteringMarketplace) return;
  State.enteringMarketplace = true;

  const overlay = $('lockdown-overlay');
  const countEl = $('ld-count');
  overlay?.classList.remove('hidden');
  if (countEl) countEl.textContent = '3';

  // Do not make the visual transition wait for a network request. A temporary
  // Supabase delay must never strand the candidate on a blank screen.
  void persistOnboardingProgress('dashboard', true).catch(error => {
    console.error('[Onboarding Completion Sync Error]:', error);
  });

  let count = 3;
  const countdown = setInterval(() => {
    count -= 1;
    if (countEl) countEl.textContent = String(Math.max(count, 0));
    if (count > 0) return;

    clearInterval(countdown);
    overlay?.classList.add('hidden');
    try {
      initChallengeDashboard();
      gotoScreen('dashboard');
    } catch (error) {
      console.error('[Marketplace Transition Error]:', error);
      toast('Could not load the task listings. Please try again.', true);
      gotoScreen('dashboard');
    } finally {
      State.enteringMarketplace = false;
    }
  }, 1000);

  // Try Electron API if available
  if (window.kazioApi) {
    window.kazioApi.getInitialData().then(data => {
      if (data) State.challenge = data;
    }).catch(() => {});
  }
}

const COMPANY_CHALLENGES = [
  {
    id: 'kazio-team-spec', company: 'KAZIO Global Challenge', logoClass: 'logo-google', mark: 'KZ', level: 'L4 • Team Project',
    meta: '4-Person Squad • 2-4 Members Required',
    title: 'Ship a 5-Day Product Spec Under Market Pressure',
    deadline: '30 Jul 2026', reward: '500 VSI + Fast-Track Shortlist', duration: '5 Days',
    skills: ['Product Spec', 'Architecture', 'Team Dynamics'], location: 'Remote • Global',
    eligibility: 'Open to All • 2-4 Members Required', verifiedSkills: 'Product Strategy, Systems Design, Execution',
    remote: true, recommended: true, isTeam: true,
    detail: 'Assemble a 4-person product & engineering squad to research, architect, and ship a production-grade 5-day product specification under real market constraints.'
  },
  {
    id: 'google-live-chat', company: 'Google', logoClass: 'logo-google', mark: 'G', level: 'L3 • High',
    meta: 'Blind Shortlist • 2 roles • Pedigree filter disabled',
    title: 'YouTube Live Chat Fan-out — 1.2M concurrent connections',
    deadline: '18 Jul 2026', reward: '220 VSI + Interview', duration: '22 min',
    skills: ['Backend', 'WebSockets', 'Reliability'], location: 'Bengaluru • Hybrid',
    eligibility: 'L2+ Verified • 1 Live Defence passed', verifiedSkills: 'Backend, WebSockets, Reliability',
    remote: false, recommended: true,
    detail: 'Design a resilient pub/sub fan-out architecture capable of delivering 1.2M real-time WebSocket chat messages under burst traffic without dropping order.'
  },
  {
    id: 'linear-sync', company: 'Linear', logoClass: 'logo-linear', mark: 'Ln', level: 'L3 • High',
    meta: 'Founding Team Hire • Craft + Speed',
    title: 'Real-time Issue Sync — CRDTs for offline edits',
    deadline: '14 Jul 2026', reward: '200 VSI + Founding Badge', duration: '18 min',
    skills: ['Systems', 'Sync', 'TypeScript'], location: 'Remote • IST overlap',
    eligibility: 'L3 • Proof Archive ≥2', verifiedSkills: 'Systems, Sync, TypeScript',
    remote: true, recommended: true,
    detail: 'Implement conflict-free resolution algorithms for multiplayer issue state sync across offline and transient network connections.'
  },
  {
    id: 'stripe-webhook', company: 'Stripe', logoClass: 'logo-stripe', mark: 'S', level: 'L4 • High',
    meta: 'Financial Infra • Risk: expensive mistakes',
    title: 'Idempotent Webhook Delivery — Exactly-once at 10k rps',
    deadline: '20 Jul 2026', reward: '260 VSI + Interview', duration: '35 min',
    skills: ['Backend', 'Reliability', 'Infra'], location: 'Bengaluru • Hybrid',
    eligibility: 'L2+ • Webhooks proof required', verifiedSkills: 'Backend, Reliability, Infra',
    remote: false, recommended: true,
    detail: 'Architect a fault-tolerant webhook delivery subsystem providing guaranteed execution, replay protection, and rate limiting.'
  },
  {
    id: 'figma-collab', company: 'Figma', logoClass: 'logo-figma', mark: 'F', level: 'L3 • Medium',
    meta: 'Product Design • High Impact',
    title: 'Design a calmer multiplayer review experience',
    deadline: '22 Jul 2026', reward: '180 VSI + Interview', duration: '28 min',
    skills: ['Product Design', 'Collaboration', 'UX'], location: 'Bengaluru • Hybrid',
    eligibility: 'Portfolio verified • Product design track', verifiedSkills: 'UX, Collaboration, Prototyping',
    remote: false, recommended: false,
    detail: 'Improve how distributed teams review and resolve feedback in collaborative design files without noise or notification fatigue.'
  },
  {
    id: 'notion-search', company: 'Notion', logoClass: 'logo-notion', mark: 'N', level: 'L3 • Medium',
    meta: 'Core Product • Search & Performance',
    title: 'Make workspace search feel instantly useful',
    deadline: '24 Jul 2026', reward: '200 VSI + Interview', duration: '30 min',
    skills: ['Frontend', 'Search', 'Performance'], location: 'Remote',
    eligibility: 'L2+ verified • 1 challenge passed', verifiedSkills: 'Frontend, Search, Performance',
    remote: true, recommended: true,
    detail: 'Propose a search experience that gets teams to reliable answers faster in dense, unstructured workspaces.'
  },
  {
    id: 'atlassian-comments', company: 'Atlassian', logoClass: 'logo-atlassian', mark: 'A', level: 'L2 • Medium',
    meta: 'Enterprise Scale • Pedigree Tax Analysis partner',
    title: 'Confluence Offline Comments — Conflict Resolution',
    deadline: '22 Jul 2026', reward: '160 VSI', duration: '16 min',
    skills: ['Backend', 'Systems'], location: 'Remote',
    eligibility: 'L1+ Verified', verifiedSkills: 'Backend, Systems',
    remote: true, recommended: false,
    detail: 'Design optimistic UI update syncing and server reconciliation for comment threads posted offline.'
  },
  {
    id: 'razorpay-failover', company: 'Razorpay', logoClass: 'logo-razorpay', mark: 'R', level: 'L3 • High',
    meta: 'Core Payments • Zero Downtime',
    title: 'High-Throughput Payment Gateway Failover — 99.999% SLA',
    deadline: '25 Jul 2026', reward: '240 VSI + Interview', duration: '25 min',
    skills: ['Backend', 'Infra', 'Reliability'], location: 'Bengaluru',
    eligibility: 'L2+ verified', verifiedSkills: 'Backend, Infra, Reliability',
    remote: false, recommended: false,
    detail: 'Build an automated circuit breaker and dynamic routing engine that shifts transaction volume across acquiring banks in <50ms.'
  },
  {
    id: 'zerodha-routing', company: 'Zerodha', logoClass: 'logo-zerodha', mark: 'Z', level: 'L4 • High',
    meta: 'Ultra-Low Latency • High Frequency',
    title: 'Sub-Millisecond Order Routing Engine',
    deadline: '28 Jul 2026', reward: '300 VSI + Interview', duration: '40 min',
    skills: ['Systems', 'C++', 'Performance'], location: 'Remote',
    eligibility: 'L3+ verified', verifiedSkills: 'Systems, C++, High Performance',
    remote: true, recommended: false,
    detail: 'Optimize memory layout, lock-free queues, and cache coherence for high-speed stock exchange order dispatch.'
  },
  {
    id: 'vercel-edge', company: 'Vercel', logoClass: 'logo-vercel', mark: 'V', level: 'L3 • High',
    meta: 'Serverless Runtime • WebAssembly',
    title: 'Edge Function Isolation & Cold-Start Minimization',
    deadline: '30 Jul 2026', reward: '250 VSI + Interview', duration: '20 min',
    skills: ['Systems', 'WebAssembly', 'Infra'], location: 'Remote',
    eligibility: 'L2+ verified', verifiedSkills: 'Systems, WebAssembly, Infra',
    remote: true, recommended: false,
    detail: 'Reduce cold-start overhead for V8 isolate sandboxes executing global edge compute workloads.'
  }
];

function renderChallengeCards() {
  const grid = $('challenge-grid');
  if (!grid) return;

  const search = ($('companySearch')?.value || '').toLowerCase().trim();
  const companyFilter = $('companySelect')?.value || '';

  const filtered = COMPANY_CHALLENGES.filter(c => {
    if (search) {
      const targetStr = `${c.company} ${c.title} ${c.skills.join(' ')} ${c.eligibility} ${c.meta}`.toLowerCase();
      if (!targetStr.includes(search)) return false;
    }
    if (companyFilter && c.company !== companyFilter) return false;
    if (State.activeSkillFilter && State.activeSkillFilter !== 'all') {
      const skillsStr = c.skills.join(' ').toLowerCase();
      if (!skillsStr.includes(State.activeSkillFilter.toLowerCase())) return false;
    }
    if (State.remoteOnlyFilter && !c.remote) return false;
    if (State.activeTabFilter === 'rec' && !c.recommended) return false;
    if (State.activeTabFilter === 'saved' && !State.savedChallengeIds.has(c.id)) return false;

    return true;
  });

  const cntAll = COMPANY_CHALLENGES.length;
  const cntRec = COMPANY_CHALLENGES.filter(c => c.recommended).length;
  const cntSaved = State.savedChallengeIds.size;
  if ($('cnt-all')) $('cnt-all').textContent = cntAll;
  if ($('cnt-rec')) $('cnt-rec').textContent = cntRec;
  if ($('cnt-saved')) $('cnt-saved').textContent = cntSaved;

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 48px 20px; color: var(--muted); background: rgba(255,255,255,0.02); border: 1px dashed var(--border); border-radius: 20px;">
        <div style="font-size: 28px; margin-bottom: 8px;">🔍</div>
        <h3 style="font-size: 16px; color: #fff;">No company projects match your criteria</h3>
        <p style="font-size: 13px; margin-top: 4px;">Try clearing your search query or adjusting your skill/remote filters.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(c => {
    const isSaved = State.savedChallengeIds.has(c.id);
    const isL3Plus = c.level.includes('L3') || c.level.includes('L4');
    return `
      <article class="company-card" data-id="${c.id}">
        <div class="company-head">
          <div class="flex gap12 center">
            <div class="logo-box ${c.logoClass}">${c.mark}</div>
            <div>
              <div class="company-name">${c.company}</div>
              <div class="company-meta">${c.meta}</div>
            </div>
          </div>
          <span class="card-level-pill ${isL3Plus ? 'orange' : ''}">${c.level}</span>
        </div>
        <div class="company-body">
          <h3 class="challenge-h3">${c.title}</h3>
          <div class="rowline">
            <span class="pill-info">Deadline: ${c.deadline}</span>
            <span class="pill-info">Reward: ${c.reward}</span>
            <span class="pill-info">Verify: ${c.duration}</span>
          </div>
          <div class="rowline">
            ${c.skills.map(s => `<span class="chip is-active" style="height:24px; font-size:11.5px;">${s}</span>`).join('')}
            <span class="chip-sub">${c.location}</span>
          </div>
          <div class="kv-block">
            <span><strong>Eligibility:</strong> ${c.eligibility}</span>
            <span><strong>Verified Skills:</strong> ${c.verifiedSkills}</span>
          </div>
          <div class="apply-row">
            <button class="btn btn--primary challenge-open" data-challenge="${c.id}">Start Project</button>
            <button class="btn-sec challenge-save ${isSaved ? 'saved' : ''}" data-save="${c.id}">${isSaved ? 'Saved to shortlist ✓' : 'Save • Blind Shortlist Info'}</button>
            <span class="pill-sm" style="margin-left:auto">${c.remote ? 'Remote' : 'Hybrid'}</span>
          </div>
        </div>
      </article>
    `;
  }).join('');

  grid.querySelectorAll('.challenge-open').forEach(btn => {
    btn.addEventListener('click', () => {
      const challenge = COMPANY_CHALLENGES.find(c => c.id === btn.dataset.challenge);
      State.challenge = challenge;
      if (challenge && challenge.isTeam) {
        initTeamFlow(challenge);
        gotoScreen('team-choice');
      } else {
        initProjectBrief();
        gotoScreen('project');
      }
    });
  });

  grid.querySelectorAll('.challenge-save').forEach(btn => {
    btn.addEventListener('click', () => {
      const cid = btn.dataset.save;
      if (State.savedChallengeIds.has(cid)) {
        State.savedChallengeIds.delete(cid);
        toast('Removed from shortlist');
      } else {
        State.savedChallengeIds.add(cid);
        toast('Saved to shortlist ✓');
      }
      renderChallengeCards();
    });
  });
}

function initChallengeDashboard() {
  const candidateName = State.profile.name || State.user?.user_metadata?.full_name || State.profile.email || 'Asvin Pradeep';
  const nameEl = $('dash-name');
  const avatarEl = $('dash-avatar');
  if (nameEl) nameEl.textContent = candidateName;
  if (avatarEl) avatarEl.textContent = candidateName.trim().charAt(0).toUpperCase() || 'A';

  // Attach search and filter events
  const searchInput = $('companySearch');
  if (searchInput && !searchInput.dataset.bound) {
    searchInput.dataset.bound = 'true';
    searchInput.addEventListener('input', renderChallengeCards);
  }

  const companySelect = $('companySelect');
  if (companySelect && !companySelect.dataset.bound) {
    companySelect.dataset.bound = 'true';
    companySelect.addEventListener('change', renderChallengeCards);
  }

  // Skill chips
  const skillChips = $('skillChips');
  if (skillChips && !skillChips.dataset.bound) {
    skillChips.dataset.bound = 'true';
    skillChips.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        skillChips.querySelectorAll('.chip').forEach(c => c.classList.remove('is-active'));
        chip.classList.add('is-active');
        State.activeSkillFilter = chip.dataset.filter || 'all';
        renderChallengeCards();
      });
    });
  }

  // Tabs
  const dashTabs = $('dashTabs');
  if (dashTabs && !dashTabs.dataset.bound) {
    dashTabs.dataset.bound = 'true';
    dashTabs.querySelectorAll('.dash-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        dashTabs.querySelectorAll('.dash-tab-btn').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        State.activeTabFilter = btn.dataset.tab || 'all';
        renderChallengeCards();
      });
    });
  }

  // Remote toggle
  const remoteAll = $('remoteAll');
  const remoteOnly = $('remoteOnly');
  if (remoteAll && remoteOnly && !remoteAll.dataset.bound) {
    remoteAll.dataset.bound = 'true';
    remoteAll.addEventListener('click', () => {
      remoteAll.classList.add('is-on');
      remoteOnly.classList.remove('is-on');
      State.remoteOnlyFilter = false;
      renderChallengeCards();
    });
    remoteOnly.addEventListener('click', () => {
      remoteOnly.classList.add('is-on');
      remoteAll.classList.remove('is-on');
      State.remoteOnlyFilter = true;
      renderChallengeCards();
    });
  }

  // Sort
  const companySort = $('companySort');
  if (companySort && !companySort.dataset.bound) {
    companySort.dataset.bound = 'true';
    companySort.addEventListener('change', renderChallengeCards);
  }

  renderChallengeCards();
}

function initProjectBrief() {
  const challenge = State.challenge || COMPANY_CHALLENGES[0];
  if (!challenge) return;

  const candidateName = State.profile.name || State.user?.user_metadata?.full_name || State.profile.email || 'ACTIVE PARTICIPANT';
  const setText = (id, value) => { const el = $(id); if (el) el.textContent = value; };
  setText('project-user', candidateName.toUpperCase());
  setText('project-title', challenge.title);
  setText('project-company', challenge.company.toUpperCase());
  setText('project-situation', challenge.detail);
  setText('project-level', challenge.level.replace(' · ', ' / '));
  setText('project-time', challenge.duration.toUpperCase());
  setText('project-reward', challenge.reward.split(' + ')[0].toUpperCase());

  // Set domain tag from arena
  const domainTag = $('pb-domain-tag');
  if (domainTag) domainTag.textContent = `${State.profile.arena || 'Product'} · ${challenge.tags?.[0] || 'Core'}`;

  // Radar chart interactivity — sync node and label hover
  initRadarInteractivity();
}

function initRadarInteractivity() {
  const nodes = document.querySelectorAll('.pb-node');
  const labels = document.querySelectorAll('.pb-radar-label');

  nodes.forEach((node, index) => {
    const label = labels[index];
    if (!label) return;

    const activate = () => {
      label.classList.add('active');
      node.setAttribute('r', '3.5');
      node.style.filter = 'drop-shadow(0 0 8px rgba(255,90,10,0.7))';
    };

    const deactivate = () => {
      label.classList.remove('active');
      node.setAttribute('r', '2');
      node.style.filter = '';
    };

    node.addEventListener('mouseenter', activate);
    node.addEventListener('mouseleave', deactivate);
    label.addEventListener('mouseenter', activate);
    label.addEventListener('mouseleave', deactivate);
  });
}

// ── TEAM CHALLENGE FLOW ENGINE ────────────────────────────
State.teamData = {
  name: '',
  members: [],
  invitations: [],
  requestsSent: [],
  lookingForMembers: true
};

let selectedTeamStrategy = null;

function selectTeamOption(choice) {
  selectedTeamStrategy = choice;
  const createCard = $('option-create');
  const joinCard   = $('option-join');
  const confirmBtn = $('confirm-btn');
  const btnText    = $('btn-text');
  const btnGlow    = $('btn-glow');

  // Clear both selections
  if (createCard) createCard.classList.remove('is-selected');
  if (joinCard)   joinCard.classList.remove('is-selected');

  // Apply selection to chosen card
  const target = choice === 'create' ? createCard : joinCard;
  if (target) target.classList.add('is-selected');

  // Activate the confirm button
  if (confirmBtn) {
    confirmBtn.disabled = false;
    confirmBtn.classList.add('is-active');
  }
  if (btnText) {
    btnText.textContent = choice === 'create'
      ? 'Initialize Create Team Protocol →'
      : 'Confirm & Search Units →';
    btnText.classList.remove('text-on-surface-variant');
    btnText.classList.add('text-cloud-white');
  }
  if (btnGlow) {
    btnGlow.style.opacity = '1';
    btnGlow.className = 'absolute inset-0 bg-gradient-to-t from-molten-orange/40 to-transparent transition-all duration-500';
  }
}


function confirmTeamSelection() {
  if (!selectedTeamStrategy) {
    toast('Please select a deployment strategy (Create or Join a team)', true);
    return;
  }
  openTeamFlowTab(selectedTeamStrategy);
  gotoScreen('team-flow');
}

window.selectTeamOption = selectTeamOption;
window.confirmTeamSelection = confirmTeamSelection;

function initTeamFlow(challenge) {
  State.challenge = challenge || COMPANY_CHALLENGES[0];
  const title = State.challenge.title || 'Ship a 5-Day Product Spec Under Market Pressure';

  if ($('flow-challenge-name')) $('flow-challenge-name').textContent = title;
  if ($('ready-project-title')) $('ready-project-title').textContent = title;

  const userName = State.profile.name || State.user?.email || 'Asvin Pradeep';
  const userEmail = State.profile.email || State.user?.email || 'asvin@candidate.io';

  if ($('tc-display-user-name')) $('tc-display-user-name').textContent = userName;
  if ($('ready-user-name')) $('ready-user-name').textContent = userName;
  if ($('join-user-name')) $('join-user-name').textContent = userName;
  if ($('lead-name-text')) $('lead-name-text').textContent = userName;
  if ($('lead-email-text')) $('lead-email-text').textContent = userEmail;

  const leadInit = userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'AP';
  if ($('lead-avatar-initial')) $('lead-avatar-initial').textContent = leadInit;
  if ($('tc-user-avatar-initials')) $('tc-user-avatar-initials').textContent = leadInit;

  // Reset state for team creation
  State.teamData.members = [{ name: userName, role: 'LEADER', verified: true }];
  updateTeamSlotsDisplay();
  bindTeamFlowEventsOnce();
}

function openTeamFlowTab(tabName) {
  const panelCreate = $('panel-create-team');
  const panelJoin = $('panel-join-team');

  State.currentTeamTab = tabName || 'join';

  if (tabName === 'create') {
    if (panelCreate) panelCreate.style.display = 'flex';
    if (panelJoin) panelJoin.style.display = 'none';

    document.querySelectorAll('.jt-pill-create').forEach(el => el.classList.add('active'));
    document.querySelectorAll('.jt-pill-join, .jt-pill-requests').forEach(el => el.classList.remove('active'));
    initSpatialCreateTeamUi();
  } else if (tabName === 'join') {
    if (panelJoin) panelJoin.style.display = 'flex';
    if (panelCreate) panelCreate.style.display = 'none';

    document.querySelectorAll('.jt-pill-join').forEach(el => el.classList.add('active'));
    document.querySelectorAll('.jt-pill-create, .jt-pill-requests').forEach(el => el.classList.remove('active'));
  } else if (tabName === 'requests') {
    openSentRequestsModal();
  }
}

function openSentRequestsModal() {
  const reqs = State.teamData.requestsSent?.length ? State.teamData.requestsSent : [
    { team: 'The Night Watch', time: '10:42 AM', note: 'Product Manager candidate' },
    { team: 'Apex Syndicate', time: '09:15 AM', note: 'Full Stack Dev candidate' }
  ];
  openAppModal(`Sent Team Join Requests (${reqs.length})`, `
    <div style="display:flex; flex-direction:column; gap:12px;">
      <p style="color:var(--muted); font-size:13px;">Track the status of your submitted team applications below.</p>
      ${reqs.map(r => `
        <div style="background:rgba(255,90,10,0.08); border:1px solid rgba(255,90,10,0.3); border-radius:12px; padding:14px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <strong style="color:#fff; font-size:15px; font-family:'Hanken Grotesk',sans-serif;">${r.team}</strong>
            <div style="color:var(--muted); font-size:11px; margin-top:2px;">Requested at ${r.time || 'Today'}</div>
            ${r.note ? `<div style="color:#FF5A0A; font-size:12px; margin-top:4px; font-style:italic;">"${r.note}"</div>` : ''}
          </div>
          <span style="font-family:'JetBrains Mono',monospace; font-size:11px; color:#FFC46B; background:rgba(255,196,107,0.15); border:1px solid rgba(255,196,107,0.3); padding:4px 10px; border-radius:999px;">PENDING</span>
        </div>
      `).join('')}
    </div>
  `);
}
window.openSentRequestsModal = openSentRequestsModal;

function updateTeamSlotsDisplay() {
  const members = State.teamData.members || [];
  const count = members.length;

  if ($('create-team-count')) $('create-team-count').textContent = count;

  const hint = $('team-member-requirement-hint');
  if (hint) {
    if (count < 2) {
      hint.textContent = `Add 1 more participant to complete the minimum team size (2 required)`;
      hint.style.color = '#FF5A0A';
    } else {
      hint.textContent = `✓ Minimum team size met (${count} members). Ready to form squad.`;
      hint.style.color = '#22c55e';
    }
  }

  // Update Slots 2, 3, 4
  const slots = [2, 3, 4];
  slots.forEach((slotNum, i) => {
    const member = members[i + 1];
    const slotContainer = $(`slot-${slotNum}-container`);
    if (!slotContainer) return;

    if (member) {
      const init = member.handle ? member.handle.replace('@','').substring(0,2).toUpperCase() : member.name.substring(0,2).toUpperCase();
      slotContainer.style.minHeight = '180px';
      slotContainer.innerHTML = `
        <div style="position:relative;cursor:default;height:100%;">
          <div style="background:#43312a;border:1px solid rgba(255,90,10,0.4);border-radius:16px;padding:16px;display:flex;flex-direction:column;align-items:center;gap:12px;overflow:hidden;min-height:180px;justify-content:space-between;position:relative;">
            <div style="position:absolute;top:8px;left:8px;padding:2px 8px;border-radius:999px;background:rgba(34,197,94,0.2);color:#22c55e;border:1px solid rgba(34,197,94,0.3);font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;">LINKED</div>
            <button type="button" class="remove-slot-btn" data-slot="${i + 1}" style="position:absolute;top:8px;right:8px;color:rgba(228,190,178,0.4);font-weight:700;font-size:12px;cursor:pointer;background:transparent;border:none;padding:4px;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='rgba(228,190,178,0.4)'">✕</button>
            <div style="width:64px;height:64px;border-radius:12px;background:#2c1c16;border:1px solid rgba(255,90,10,0.3);display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-weight:700;font-size:20px;color:#FF5A0A;margin-top:12px;">
              ${init}
            </div>
            <div style="text-align:center;width:100%;">
              <div style="font-family:'Hanken Grotesk',sans-serif;font-size:14px;font-weight:600;color:#F7F5F2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${member.name}</div>
              <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:rgba(255,90,10,0.8);text-transform:uppercase;letter-spacing:0.05em;">${member.handle || 'Operator'}</div>
            </div>
          </div>
        </div>
      `;
    } else {
      const isLocked = slotNum === 4 && count < 3;
      slotContainer.style.minHeight = '180px';
      slotContainer.style.opacity = isLocked ? '0.5' : '1';
      slotContainer.innerHTML = `
        <button type="button" style="width:100%;height:100%;min-height:180px;border:2px dashed rgba(255,255,255,0.1);border-radius:16px;padding:16px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:transparent;cursor:${isLocked ? 'not-allowed' : 'pointer'};transition:all 0.3s;"
          ${!isLocked ? `onclick="toast('Select a candidate from Past Teammates or Requests to invite!')" onmouseover="this.style.borderColor='rgba(255,90,10,0.4)';this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.1)';this.style.background='transparent'"` : ''}>
          <div style="width:48px;height:48px;border-radius:50%;border:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;">
            <span class="material-symbols-outlined" style="color:${isLocked ? 'rgba(228,190,178,0.2)' : 'rgba(228,190,178,0.4)'};">${isLocked ? 'lock' : 'add'}</span>
          </div>
          <span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:${isLocked ? 'rgba(228,190,178,0.2)' : 'rgba(228,190,178,0.4)'};text-transform:uppercase;letter-spacing:0.1em;text-align:center;line-height:1.4;">
            ${isLocked ? 'Expansion Locked' : 'Initiate Sync'}
          </span>
        </button>
      `;
    }
  });

  document.querySelectorAll('.remove-slot-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.slot);
      State.teamData.members.splice(idx, 1);
      updateTeamSlotsDisplay();
      toast('Removed teammate');
    };
  });
}

function initSpatialCreateTeamUi() {
  // Protocol Delta Toggle
  const toggle = $('protocol-toggle');
  const knob = $('toggle-knob');
  const activeLabel = $('active-label');
  const dormantLabel = $('dormant-label');

  if (toggle && knob && activeLabel) {
    toggle.onclick = () => {
      State.teamData.lookingForMembers = !State.teamData.lookingForMembers;
      const isActive = State.teamData.lookingForMembers;
      if (isActive) {
        knob.style.transform = 'translateX(40px)';
        knob.style.background = '#FF5A0A';
        toggle.style.borderColor = 'rgba(255,90,10,0.5)';
        toggle.style.boxShadow = '0 0 15px rgba(255,90,10,0.2)';
        activeLabel.style.opacity = '1';
        if (dormantLabel) dormantLabel.style.opacity = '0.4';
      } else {
        knob.style.transform = 'translateX(0)';
        knob.style.background = 'rgba(255,255,255,0.2)';
        toggle.style.borderColor = 'rgba(255,255,255,0.1)';
        toggle.style.boxShadow = 'none';
        activeLabel.style.opacity = '0';
        if (dormantLabel) dormantLabel.style.opacity = '1';
      }
    };
  }

  // Console Tabs (Past Teammates / Requests)
  const tabTeammates = $('tab-teammates');
  const tabRequests = $('tab-requests');
  const viewTeammates = $('view-teammates');
  const viewRequests = $('view-requests');

  if (tabTeammates && tabRequests && viewTeammates && viewRequests) {
    tabTeammates.onclick = () => {
      tabTeammates.style.color = '#FF5A0A';
      tabTeammates.style.borderBottomColor = '#FF5A0A';
      tabRequests.style.color = 'rgba(228,190,178,0.4)';
      tabRequests.style.borderBottomColor = 'transparent';
      viewTeammates.style.display = 'flex';
      viewRequests.style.display = 'none';
    };

    tabRequests.onclick = () => {
      tabRequests.style.color = '#FF5A0A';
      tabRequests.style.borderBottomColor = '#FF5A0A';
      tabTeammates.style.color = 'rgba(228,190,178,0.4)';
      tabTeammates.style.borderBottomColor = 'transparent';
      viewRequests.style.display = 'flex';
      viewTeammates.style.display = 'none';
    };
  }

  // Squad Alias Input typing handler
  const squadInput = $('input-team-name');
  const inputDot = $('squad-input-dot');
  const inputStatus = $('squad-input-status');

  if (squadInput) {
    squadInput.oninput = (e) => {
      const val = e.target.value.trim();
      State.teamData.name = val;
      if (inputDot && inputStatus) {
        if (val.length > 0) {
          inputDot.style.background = '#22c55e';
          inputStatus.textContent = 'Active // Registered';
          inputStatus.style.color = '#22c55e';
        } else {
          inputDot.style.background = '#FF5A0A';
          inputStatus.textContent = 'Awaiting Input';
          inputStatus.style.color = '#FF5A0A';
        }
      }
    };
  }

  // Accept & Reject Requests handlers
  document.querySelectorAll('.accept-req-btn').forEach(btn => {
    btn.onclick = () => {
      const name = btn.dataset.name;
      const handle = btn.dataset.handle;
      const cardId = btn.dataset.card;
      if ((State.teamData.members || []).length >= 4) {
        toast('Team is full (4 max members)!', true);
        return;
      }
      if (State.teamData.members.some(m => m.name === name)) {
        toast(`${name} is already in your team!`);
      } else {
        State.teamData.members.push({ name, handle, verified: true });
        updateTeamSlotsDisplay();
        toast(`Accepted request from ${name}! Added to squad ✓`);
      }
      if (cardId && $(cardId)) $(cardId).remove();
    };
  });

  document.querySelectorAll('.reject-req-btn').forEach(btn => {
    btn.onclick = () => {
      const cardId = btn.dataset.card;
      if (cardId && $(cardId)) {
        $(cardId).style.opacity = '0.4';
        setTimeout(() => $(cardId)?.remove(), 300);
      }
      toast('Request rejected.');
    };
  });
}

let teamEventsBound = false;
function bindTeamFlowEventsOnce() {
  if (teamEventsBound) return;
  teamEventsBound = true;

  // Choice Hub buttons
  $('btn-choice-back')?.addEventListener('click', () => gotoScreen('dashboard'));
  $('option-create')?.addEventListener('click', () => selectTeamOption('create'));
  $('option-join')?.addEventListener('click', () => selectTeamOption('join'));
  $('confirm-btn')?.addEventListener('click', confirmTeamSelection);
  $('btn-choice-create')?.addEventListener('click', () => {
    openTeamFlowTab('create');
    gotoScreen('team-flow');
  });
  $('btn-choice-join')?.addEventListener('click', () => {
    openTeamFlowTab('join');
    gotoScreen('team-flow');
  });

  // Flow Switcher tabs
  $('tab-flow-create')?.addEventListener('click', () => openTeamFlowTab('create'));
  $('tab-flow-join')?.addEventListener('click', () => openTeamFlowTab('join'));
  $('flow-back-btn')?.addEventListener('click', () => gotoScreen('team-choice'));

  // Invite candidate buttons
  document.querySelectorAll('.invite-candidate-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.name;
      const handle = btn.dataset.handle;
      if ((State.teamData.members || []).length >= 4) {
        toast('Team is full (4 max members)!', true);
        return;
      }
      if (State.teamData.members.some(m => m.name === name)) {
        toast(`${name} is already in your squad!`);
        return;
      }
      State.teamData.members.push({ name, handle, verified: true });
      updateTeamSlotsDisplay();
      toast(`Invited ${name} (${handle}) to your squad ✓`);
    });
  });

  // Create Team Submit
  $('btn-finish-team')?.addEventListener('click', () => {
    const teamNameInput = $('input-team-name');
    const teamName = teamNameInput?.value.trim();
    const errorEl = $('team-name-error');

    if (!teamName) {
      if (errorEl) errorEl.classList.remove('hidden');
      if (teamNameInput) teamNameInput.focus();
      toast('Please enter a squad alias before initializing your squad', true);
      return;
    }
    if (errorEl) errorEl.classList.add('hidden');

    if ((State.teamData.members || []).length < 2) {
      toast('Your squad must have at least 2 linked operators to proceed.', true);
      return;
    }

    // A finalized squad reviews the same project brief as an individual
    // participant before anyone enters the shared submission workbench.
    State.teamData.name = teamName;
    initProjectBrief();
    gotoScreen('project');
  });

  // Inspect Modal
  let activeInspectTeam = null;
  document.querySelectorAll('.inspect-team-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const team = btn.dataset.team;
      const lead = btn.dataset.lead;
      activeInspectTeam = team;
      if ($('inspect-team-title')) $('inspect-team-title').textContent = team;
      if ($('inspect-team-lead')) $('inspect-team-lead').textContent = `Lead: ${lead}`;

      const candList = $('inspect-candidates-list');
      if (candList) {
        candList.innerHTML = `
          <div class="bg-[#11100E] border border-kaz-border p-3 rounded flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-[#1F190F] text-kaz-yellow border border-kaz-yellow flex items-center justify-center font-bold text-xs">${lead ? lead.charAt(0) : 'R'}</div>
              <div>
                <div class="font-hanken font-bold text-sm text-white">${lead || 'Rashi Jain'}</div>
                <div class="font-mono text-[10px] text-kaz-muted">Product Leader</div>
              </div>
            </div>
            <span class="text-xs text-emerald-400 font-mono">Leader</span>
          </div>
          <div class="bg-[#11100E] border border-kaz-border p-3 rounded flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-[#151D18] text-emerald-400 border border-emerald-500 flex items-center justify-center font-bold text-xs">A</div>
              <div>
                <div class="font-hanken font-bold text-sm text-white">Alex Morgan</div>
                <div class="font-mono text-[10px] text-kaz-muted">Systems Architect</div>
              </div>
            </div>
            <span class="text-xs text-kaz-yellow font-mono">Member</span>
          </div>
        `;
      }
      $('modal-team-inspect')?.classList.remove('hidden');
    });
  });

  $('close-inspect-modal')?.addEventListener('click', () => $('modal-team-inspect')?.classList.add('hidden'));
  $('btn-cancel-inspect')?.addEventListener('click', () => $('modal-team-inspect')?.classList.add('hidden'));

  $('btn-confirm-send-req')?.addEventListener('click', () => {
    const note = $('inspect-chat-note')?.value.trim();
    $('modal-team-inspect')?.classList.add('hidden');
    const teamName = activeInspectTeam || 'Nightfall Unit';
    sendJoinRequestToTeam(teamName, note);
  });

  document.querySelectorAll('.send-join-req-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const team = btn.dataset.team;
      sendJoinRequestToTeam(team);
    });
  });

  // Search filter for teams
  $('search-teams-input')?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase().trim();
    document.querySelectorAll('#open-teams-list > div').forEach(card => {
      const text = card.textContent.toLowerCase();
      card.style.display = text.includes(q) ? '' : 'none';
    });
  });

  // Enter Team Workbench button on s-team-ready
  $('btn-enter-team-workbench')?.addEventListener('click', () => {
    initWorkspace();
    gotoScreen('workspace');
  });
}

let currentDrawerTeam = 'The Night Watch';

function openContextDrawer(teamName, challengeName, roleReq, description) {
  currentDrawerTeam = teamName || 'The Night Watch';
  if ($('drawer-team-title')) $('drawer-team-title').textContent = currentDrawerTeam;
  if ($('drawer-team-desc')) $('drawer-team-desc').textContent = description || 'We are engineering a next-gen product strategy interface. Fast-paced, daily syncs required.';
  
  const drawer = $('jt-drawer');
  const overlay = $('jt-drawer-overlay');
  if (drawer) drawer.classList.add('is-open');
  if (overlay) overlay.classList.add('is-open');
}

function closeContextDrawer() {
  const drawer = $('jt-drawer');
  const overlay = $('jt-drawer-overlay');
  if (drawer) drawer.classList.remove('is-open');
  if (overlay) overlay.classList.remove('is-open');
}

function submitDrawerJoinRequest() {
  const intent = $('drawer-intent-input')?.value.trim();
  const link = $('drawer-link-input')?.value.trim();
  closeContextDrawer();
  sendJoinRequestToTeam(currentDrawerTeam, intent || link);
}

window.openContextDrawer = openContextDrawer;
window.closeContextDrawer = closeContextDrawer;
window.submitDrawerJoinRequest = submitDrawerJoinRequest;

function sendJoinRequestToTeam(teamName, note = '') {
  State.teamData.requestsSent = State.teamData.requestsSent || [];
  State.teamData.requestsSent.push({ team: teamName, time: new Date().toLocaleTimeString(), note });

  const list = $('sent-requests-list');
  const noReq = $('no-requests-msg');
  if (noReq) noReq.remove();

  if (list) {
    const div = document.createElement('div');
    div.className = 'bg-[#0E0D0B] border border-kaz-yellow/40 rounded p-4 flex items-center justify-between font-mono text-xs';
    div.innerHTML = `
      <div>
        <div class="text-white font-bold">${teamName}</div>
        <div class="text-kaz-muted text-[10px]">Request sent • ${new Date().toLocaleTimeString()}</div>
        ${note ? `<div class="text-kaz-yellow text-[11px] mt-1 italic">"${note}"</div>` : ''}
      </div>
      <span class="text-kaz-yellow text-[11px] bg-[#1F190F] border border-[#3A2F1A] px-2 py-0.5 rounded">PENDING</span>
    `;
    list.prepend(div);
  }

  toast(`Join request sent to ${teamName}!`);

  // Simulate team lead accepting join request after 2.5s
  setTimeout(() => {
    toast(`🎉 ${teamName} accepted your join request! Joining team lobby...`);
    startTeamSyncLobby(teamName);
  }, 2500);
}

function startTeamSyncLobby(teamName) {
  State.teamData.name = teamName || $('input-team-name')?.value || 'Nightfall Unit';
  if ($('ready-team-name')) $('ready-team-name').textContent = State.teamData.name.toUpperCase();

  gotoScreen('team-ready');

  // Reset syncing state for member 3
  const statusEl = $('member-3-status');
  const avatarEl = $('member-3-avatar');
  if (statusEl) {
    statusEl.textContent = 'SYNCING...';
    statusEl.className = 'font-mono text-[10px] text-kaz-yellow font-bold uppercase tracking-wider animate-pulse';
  }

  setTimeout(() => {
    if (statusEl) {
      statusEl.textContent = 'READY';
      statusEl.className = 'font-mono text-[10px] text-emerald-400 font-bold uppercase tracking-wider';
    }
    if (avatarEl) {
      avatarEl.className = 'w-16 h-16 rounded-full bg-emerald-950 border-2 border-emerald-500 text-emerald-400 font-bold text-xl flex items-center justify-center mb-3';
    }
    toast('⚡ All team members synchronized and ready!');
  }, 2200);
}

// ── INIT ─────────────────────────────────────────────────
// Local front-end session controls. These preserve the original screens and
// transitions without sending credentials or profile data to a service.
function startLocalSession({ name = '', email = '' } = {}) {
  State.profile.name = name || State.profile.name || 'Alex Morgan';
  State.profile.email = email || State.profile.email || 'alex.morgan@candidate.io';
  State.user = {
    email: State.profile.email,
    user_metadata: { full_name: State.profile.name }
  };
  toast(`Welcome, ${State.profile.name}!`);
  gotoScreen(2);
}

async function signInWithGoogle() {
  $('google-modal')?.classList.remove('hidden');
}

async function doGoogleSignIn() {
  $('google-modal')?.classList.add('hidden');
  startLocalSession({ name: 'Alex Morgan', email: 'alex.morgan@gmail.com' });
}

async function signInWithEmail(email) {
  startLocalSession({ email, name: email.split('@')[0].replace(/[._-]/g, ' ') });
}

async function signUpWithEmail(name, email) {
  State.profile.name = name;
  State.profile.email = email;
  const otpDisplay = $('otp-email-display');
  if (otpDisplay) otpDisplay.textContent = email;
  toast('Account details saved for this session.');
  gotoScreen(-1);
}

async function verifyOtp(email) {
  startLocalSession({ email, name: State.profile.name });
}

async function checkVerificationStatus() {
  startLocalSession({ email: State.profile.email, name: State.profile.name });
}

async function resendSignupOtp(email) {
  toast(`A new demo verification code is ready for ${email}.`);
}

async function init() {
  renderLocalIcons();
  const existingSession = await checkSession();

  // Screen 0 — Sign In
  $('s0-google').addEventListener('click', signInWithGoogle);
  $('s0-login').addEventListener('click', () => {
    const e = $('s0-email').value.trim();
    const p = $('s0-pass').value.trim();
    if (!e || !p) { toast('Please fill in all fields', true); return; }
    signInWithEmail(e, p);
  });
  $('s0-tosignup')?.addEventListener('click', ev => { ev.preventDefault(); gotoScreen(1); });

  // Screen 1 — Sign Up
  $('s1-google').addEventListener('click', signInWithGoogle);
  $('s1-signup').addEventListener('click', () => {
    const n = $('s1-name').value.trim();
    const e = $('s1-email').value.trim();
    const p = $('s1-pass').value.trim();
    if (!n || !e || !p) { toast('Please fill in all fields', true); return; }
    signUpWithEmail(n, e, p);
  });
  $('s1-tologin').addEventListener('click', ev => { ev.preventDefault(); gotoScreen(0); });

  // Email confirmation & OTP verification
  $('btn-submit-otp')?.addEventListener('click', () => {
    const code = $('s-otp-code')?.value.trim();
    if (!code) { toast('Please enter your verification code', true); return; }
    verifyOtp(State.profile.email, code);
  });
  $('s-otp-code')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const code = $('s-otp-code')?.value.trim();
      if (!code) { toast('Please enter your verification code', true); return; }
      verifyOtp(State.profile.email, code);
    }
  });
  $('btn-check-verification')?.addEventListener('click', () => {
    checkVerificationStatus();
  });
  $('btn-resend-otp')?.addEventListener('click', ev => {
    ev.preventDefault();
    resendSignupOtp(State.profile.email);
  });
  $('btn-otp-back')?.addEventListener('click', ev => {
    ev.preventDefault();
    gotoScreen(1);
  });

  // Screen 2 — Arena
  bindCardGrid('arena-grid', 'arena');
  $('s2-next').addEventListener('click', () => {
    void persistOnboardingProgress(3);
    gotoScreen(3);
  });

  // Screen 3 — Goal
  bindCardGrid('goal-grid', 'goal');
  $('s3-next').addEventListener('click', () => {
    renderDynamicGrid('family-grid', getFamilies(), 'family');
    void persistOnboardingProgress(4);
    gotoScreen(4);
  });

  // Screen 4 — Family
  $('s4-next').addEventListener('click', () => {
    renderDynamicGrid('track-grid', getTracks(), 'track');
    void persistOnboardingProgress(5);
    gotoScreen(5);
  });

  // Screen 5 — Track
  $('s5-next').addEventListener('click', () => {
    void persistOnboardingProgress(6);
    gotoScreen(6);
  });

  // Screen 6 — Context
  $('s6-save').addEventListener('click', () => {
    State.profile.experience = $('s6-exp').value;
    State.profile.industry = $('s6-industry').value.trim();
    State.profile.tools = $('s6-tools').value.trim();
    State.profile.portfolio = $('s6-portfolio').value.trim();
    saveProfileToSupabase();
  });

  // Screen 7 — Contract
  $('btn-engage').addEventListener('click', () => {
    if (!$('agree-cb').checked) { toast('Please accept the conditions first', true); return; }
    engageLockdown();
  });

  // Back buttons
  document.querySelectorAll('[data-to]').forEach(btn => {
    btn.addEventListener('click', () => gotoScreen(parseInt(btn.dataset.to)));
  });

  // Skip button
  $('btn-skip').addEventListener('click', () => gotoScreen(7));

  // Google modal
  $('google-cancel').addEventListener('click', () => $('google-modal').classList.add('hidden'));
  $('google-confirm').addEventListener('click', doGoogleSignIn);

  // Project brief: review the selected company task before entering the
  // locked response workspace.
  $('project-back')?.addEventListener('click', () => {
    initChallengeDashboard();
    gotoScreen('dashboard');
  });
  document.querySelectorAll('#project-start, .pb-start-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!State.challenge) State.challenge = COMPANY_CHALLENGES[0];
      initWorkspace();
      gotoScreen('workspace');
    });
  });

  // A persisted session should resume the correct part of onboarding (or the
  // dashboard), instead of leaving a signed-in user on the login screen.
  if (existingSession) await establishAuthenticatedSession(existingSession);

  // Workspace: URL bar navigation
  if ($('url-input')) {
    $('url-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') navigateBrowser($('url-input').value.trim());
    });
  }

  // Workspace browser nav buttons
  if ($('b-back')) {
    $('b-back').addEventListener('click', () => $('research-view')?.goBack?.());
    $('b-fwd').addEventListener('click', () => $('research-view')?.goForward?.());
    $('b-reload').addEventListener('click', () => $('research-view')?.reload?.());
    $('b-home').addEventListener('click', () => navigateBrowser('https://www.google.com?udm=14'));
  }

  // Workspace: Attach files
  if ($('btn-attach')) {
    $('btn-attach').addEventListener('click', () => $('file-picker').click());
    $('file-picker').addEventListener('change', async e => {
      const files = Array.from(e.target.files);
      $('file-label').textContent = files.length > 0 ? files.map(f => f.name).join(', ') : 'No files attached';
      if (sb() && files.length > 0) {
        let user;
        try {
          user = await ensureCurrentUser();
        } catch (error) {
          toast('Unable to confirm your sign-in: ' + error.message, true);
          return;
        }
        if (!user) {
          toast('Sign in before uploading files.', true);
          return;
        }
        for (const file of files) {
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const path = `${user.id}/${Date.now()}-${safeName}`;
          const { error } = await sb().storage.from('submissions').upload(path, file, { upsert: true });
          if (error) toast(`Upload failed for ${file.name}: ${error.message}`, true);
          else toast(`Uploaded: ${file.name}`);
        }
      }
    });
  }

  // Workspace: Sync Draft
  if ($('btn-save')) {
    $('btn-save').addEventListener('click', () => {
      autoSaveDraft($('main-editor').value);
      toast('Draft saved locally');
    });
  }

  // Workspace: Submit
  if ($('btn-submit')) {
    $('btn-submit').addEventListener('click', () => {
      const content = $('main-editor').value;
      const words = content.trim().split(/\s+/).length;
      $('m-candidate').textContent = State.profile.name || State.user?.email || 'Candidate';
      $('m-words').textContent = words;
      $('m-security').textContent = State.violations.length === 0 ? 'Clean ✓' : `${State.violations.length} Flag(s)`;
      $('submit-modal').classList.remove('hidden');
    });
    $('submit-cancel').addEventListener('click', () => $('submit-modal').classList.add('hidden'));
    $('submit-confirm').addEventListener('click', async () => {
      $('submit-modal').classList.add('hidden');
      await handleAutoSubmit();
    });
  }

  $('success-go-mission')?.addEventListener('click', () => gotoScreen('mission-control'));

  // Start on screen 0
  bindLeftRailNavigation();
  gotoScreen(0);
}

function openAppModal(title, htmlContent) {
  const modal = $('app-modal');
  const titleEl = $('app-modal-title');
  const bodyEl = $('app-modal-body');
  if (modal && titleEl && bodyEl) {
    titleEl.textContent = title;
    bodyEl.innerHTML = htmlContent;
    modal.classList.remove('hidden');
  }
}

function initSettingsPage() {
  document.querySelectorAll('[data-settings-tab]').forEach(tab => {
    tab.onclick = () => {
      const activeTab = tab.dataset.settingsTab;
      document.querySelectorAll('[data-settings-tab]').forEach(item => item.classList.toggle('is-active', item === tab));
      document.querySelectorAll('[data-settings-panel]').forEach(panel => {
        panel.classList.toggle('is-active', panel.dataset.settingsPanel === activeTab);
      });
    };
  });

  $('settings-save-all').onclick = () => {
    const name = $('settings-name')?.value.trim();
    const email = $('settings-email')?.value.trim();
    if (name) State.profile.name = name;
    if (email) State.profile.email = email;
    if ($('settings-profile-name')) $('settings-profile-name').textContent = State.profile.name || 'Asvin Pradeep';
    toast('Settings saved locally');
  };
  $('settings-avatar-change').onclick = () => toast('Profile photo selection is ready');
  $('settings-upload-resume').onclick = () => toast('Resume upload is ready');
  $('settings-upload-certificate').onclick = () => toast('Certificate upload is ready');
  $('settings-add-link').onclick = () => toast('Add a link in the fields above, then save your changes');
  $('settings-add-skill').onclick = () => {
    const tag = document.createElement('span');
    tag.innerHTML = `New skill <button type="button" aria-label="Remove skill">×</button>`;
    $('settings-skills')?.insertBefore(tag, $('settings-add-skill'));
    tag.querySelector('button').onclick = () => tag.remove();
  };
  document.querySelectorAll('#settings-skills span button').forEach(button => {
    button.onclick = () => button.closest('span')?.remove();
  });
  document.querySelectorAll('.settings-options input').forEach(toggle => {
    toggle.onchange = () => toast(`${toggle.checked ? 'Enabled' : 'Disabled'} preference saved locally`);
  });
  $('settings-export').onclick = () => toast('Profile export is ready for download');
  $('settings-restart').onclick = () => {
    if (window.confirm('Restart onboarding? Your local selections will be cleared.')) gotoScreen(2);
  };
  $('settings-delete').onclick = () => {
    if (!window.confirm('Delete this local profile from the app?')) return;
    State.profile.name = '';
    State.profile.email = '';
    State.user = null;
    toast('Local profile removed');
    gotoScreen(0);
  };
}

function bindLeftRailNavigation() {
  const modalClose = $('app-modal-close');
  if (modalClose) {
    modalClose.addEventListener('click', () => {
      $('app-modal')?.classList.add('hidden');
    });
  }

  document.querySelectorAll('.rail-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const navKey = btn.dataset.leftNav;
      if (!navKey) return;
      if (navKey !== 'welcome' && navKey !== 'analytics' && navKey !== 'mission-control' && navKey !== 'settings') return;

      document.querySelectorAll('.rail-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      if (navKey === 'welcome' || navKey === 'companies') {
        initChallengeDashboard();
        gotoScreen('dashboard');
      } else if (navKey === 'analytics') {
        gotoScreen('analytics');
      } else if (navKey === 'mission-control') {
        gotoScreen('mission-control');
      } else if (navKey === 'settings') {
        gotoScreen('settings');
      } else if (navKey === 'challenges') {
        openTeamFlowTab('join');
        gotoScreen('team-flow');
      } else if (navKey === 'workspace') {
        if (State.challenge) {
          initProjectBrief();
          gotoScreen('project');
        } else {
          initChallengeDashboard();
          gotoScreen('dashboard');
        }
      } else if (navKey === 'profile') {
        const name = State.profile.name || State.user?.email || 'Asvin Pradeep';
        openAppModal('Candidate Capability Record', `
          <div style="display:flex; flex-direction:column; gap:12px; font-size:13px; color:var(--text-2)">
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px">
              <div style="width:44px; height:44px; border-radius:50%; background:linear-gradient(135deg, #FF7A1A, #E45A12); color:#fff; display:grid; place-items:center; font-weight:800; font-size:18px">${name.charAt(0).toUpperCase()}</div>
              <div>
                <strong style="color:#fff; font-size:15px">${name}</strong>
                <div style="font-size:12px; color:var(--emerald)">✓ L3 Verified Candidate</div>
              </div>
            </div>
            <div style="background:rgba(255,255,255,0.04); border:1px solid var(--border); border-radius:12px; padding:12px; display:flex; flex-direction:column; gap:6px;">
              <div><strong>Primary Arena:</strong> ${State.profile.arena || 'Product Management'}</div>
              <div><strong>Goal:</strong> ${State.profile.goal || 'Get Discovered'}</div>
              <div><strong>Experience:</strong> ${State.profile.experience || '3-5 years'}</div>
              <div><strong>Industry:</strong> ${State.profile.industry || 'B2B SaaS'}</div>
              <div><strong>Tools:</strong> ${State.profile.tools || 'Figma, Notion, SQL'}</div>
            </div>
          </div>
        `);
      } else if (navKey === 'notifications') {
        openAppModal('Live Notifications', `
          <div style="display:flex; flex-direction:column; gap:10px; font-size:13px">
            <div style="background:rgba(255,90,10,0.1); border:1px solid var(--border-em); border-radius:12px; padding:12px;">
              <strong style="color:#ffb08a">Google Blind Shortlist Match</strong>
              <p style="color:var(--muted); font-size:12px; margin-top:2px">Your defence profile meets Google YouTube Live Chat eligibility requirements.</p>
            </div>
            <div style="background:rgba(255,255,255,0.04); border:1px solid var(--border); border-radius:12px; padding:12px;">
              <strong style="color:#fff">Stripe Task Updated</strong>
              <p style="color:var(--muted); font-size:12px; margin-top:2px">Webhook Delivery brief updated with 10k rps stress scenario guidelines.</p>
            </div>
          </div>
        `);
      } else if (navKey === 'files') {
        openAppModal('Deliverables & Files', `
          <div style="font-size:13px; color:var(--muted)">
            <p>Attached assessment files and local submission artifacts will appear here upon submission.</p>
            <div style="margin-top:12px; padding:12px; background:rgba(255,255,255,0.04); border-radius:12px; border:1px solid var(--border); color:#fff">
              📁 Submissions Directory: <code>submissions/</code>
            </div>
          </div>
        `);
      } else if (navKey === 'analytics') {
        openAppModal('Capability Radar & Metrics', `
          <div style="display:flex; flex-direction:column; gap:12px; font-size:13px">
            <div style="background:rgba(255,255,255,0.04); border:1px solid var(--border); border-radius:12px; padding:14px;">
              <strong style="color:#fff">Score: 92/100 (D3 Professional)</strong>
              <p style="color:var(--muted); font-size:12px; margin-top:4px">Highest scores recorded in Systems Scope, Trade-off Depth, and Constraint Pressure handling.</p>
            </div>
          </div>
        `);
      } else if (navKey === 'settings') {
        openAppModal('Kazio Engine Settings', `
          <div style="display:flex; flex-direction:column; gap:12px; font-size:13px">
            <div style="background:rgba(255,255,255,0.04); border:1px solid var(--border); border-radius:12px; padding:12px;">
              <strong>Anti-cheat Lockdown:</strong> Active (Full-screen kiosk + shortcut suppression)
            </div>
            <button class="btn btn--primary" id="modal-signout" style="width:100%">Restart assessment</button>
          </div>
        `);
        setTimeout(() => {
          $('modal-signout')?.addEventListener('click', async () => {
            State.user = null;
            $('app-modal')?.classList.add('hidden');
            gotoScreen(0);
          });
        }, 100);
      }
    });
  });

  const missionSearch = $('mission-search');
  const missionStageFilter = $('mission-stage-filter');
  const missionRows = [...document.querySelectorAll('.mission-row')];
  const missionTabs = [...document.querySelectorAll('[data-mission-status]')];
  let missionStatus = 'all';
  const filterMissions = () => {
    const query = (missionSearch?.value || '').trim().toLowerCase();
    const stage = missionStageFilter?.value || 'all';
    missionRows.forEach(row => {
      const matchesStatus = missionStatus === 'all' || row.dataset.missionStatus === missionStatus;
      const matchesSearch = !query || (row.dataset.search || '').includes(query);
      const matchesStage = stage === 'all' || (stage === 'ai-q-and-a' && (row.dataset.search || '').includes('ai q&a')) || (stage === 'live-defense' && (row.dataset.search || '').includes('live defense'));
      row.style.display = matchesStatus && matchesSearch && matchesStage ? '' : 'none';
    });
  };
  missionSearch?.addEventListener('input', filterMissions);
  missionStageFilter?.addEventListener('change', filterMissions);
  missionTabs.forEach(tab => tab.addEventListener('click', () => {
    missionStatus = tab.dataset.missionStatus || 'all';
    missionTabs.forEach(item => item.classList.toggle('is-active', item === tab));
    filterMissions();
  }));

  document.querySelectorAll('.leaderboard-action').forEach(button => {
    button.addEventListener('click', () => gotoScreen('leaderboard'));
  });

  document.querySelectorAll('.mission-row').forEach(row => {
    const action = row.querySelector('.mission-action button');
    if (action?.textContent.trim().startsWith('ANSWER')) {
      action.addEventListener('click', () => gotoScreen('ai-qa'));
    }
    if (action?.textContent.trim().startsWith('JOIN')) {
      action.addEventListener('click', () => gotoScreen('live-defense'));
    }
  });


  const leaderboardRows = [...document.querySelectorAll('.leaderboard-row')];
  const leaderboardSearch = $('leaderboard-search');
  const updateLeaderboardComparison = (row) => {
    leaderboardRows.forEach(item => item.classList.toggle('is-selected', item === row));
    const name = row.dataset.name || 'Sarah Blake';
    const rank = row.dataset.rank || '1';
    if ($('compare-name')) $('compare-name').textContent = name;
    if ($('compare-rank')) $('compare-rank').textContent = `${name.split(' ')[0].toUpperCase()} (#${rank})`;
    if ($('compare-avatar')) $('compare-avatar').textContent = name.charAt(0).toUpperCase();
  };
  leaderboardRows.forEach(row => row.addEventListener('click', () => updateLeaderboardComparison(row)));
  leaderboardSearch?.addEventListener('input', () => {
    const query = leaderboardSearch.value.trim().toLowerCase();
    leaderboardRows.forEach(row => {
      row.style.display = !query || (row.dataset.name || '').toLowerCase().includes(query) ? '' : 'none';
    });
  });
}

// ── OTP INPUT AUTO-ADVANCE ───────────────────────────────
function setupOtpInputs() {
  const boxes = document.querySelectorAll('.otp-box');
  boxes.forEach((box, i) => {
    box.addEventListener('input', () => {
      box.value = box.value.slice(-1).replace(/\D/,'');
      if (box.value && i < boxes.length - 1) boxes[i + 1].focus();
    });
    box.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !box.value && i > 0) boxes[i - 1].focus();
    });
    box.addEventListener('paste', e => {
      const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, boxes.length);
      if (!digits) return;
      e.preventDefault();
      digits.split('').forEach((digit, index) => { boxes[index].value = digit; });
      boxes[Math.min(digits.length, boxes.length) - 1].focus();
    });
  });
}

function getOtpValue() {
  return Array.from(document.querySelectorAll('.otp-box')).map(b => b.value).join('');
}

// ── AI Q&A ASSESSMENT ENGINE ───────────────────────────────
const AiQaState = {
  questions: [
    {
      id: 1,
      type: 'mcq',
      category: 'BUSINESS UNDERSTANDING',
      title: 'QUESTION 01',
      titleShort: 'Q1',
      question: 'What is the primary evaluation factor for this GTM strategy?',
      description: 'Select the most defensible option based on the mission brief.',
      options: ['Market Saturation Index', 'Short-term Revenue', 'Competitor PR', 'Employee Retention']
    },
    {
      id: 2,
      type: 'written',
      category: 'REASONING OWNERSHIP',
      title: 'QUESTION 02',
      titleShort: 'Q2',
      question: 'Explain why your team rejected the second solution you considered.',
      description: 'Detail the technical or business constraints that made the alternative approach unviable for the vertical SaaS integration.'
    },
    {
      id: 3,
      type: 'coding',
      category: 'TECHNICAL AUTHENTICITY',
      title: 'QUESTION 03',
      titleShort: 'Q3',
      question: 'Implement the CAC/LTV Ratio Calculator.',
      description: 'Write a function that calculates the LTV to CAC ratio based on standard inputs.'
    },
    {
      id: 4,
      type: 'mcq',
      category: 'DECISION CONSISTENCY',
      title: 'QUESTION 04',
      titleShort: 'Q4',
      question: 'Which integration approach yields the highest Deployment Velocity?',
      description: 'Select the architecture that maximizes speed while maintaining data consistency.',
      options: ['Direct API Integration', 'Middleware Sync', 'Manual Data Transfer', 'Nightly Batch Processing']
    },
    {
      id: 5,
      type: 'written',
      category: 'REFLECTION',
      title: 'QUESTION 05',
      titleShort: 'Q5',
      question: 'Reflect on potential scaling bottlenecks.',
      description: 'If user growth 10xs in 3 months, what breaks first?'
    }
  ],
  currentIdx: 0,
  answers: {},
  timerSeconds: 20 * 60,
  timerInterval: null,
  codeAnswers: {
    3: `function calculateLTVtoCAC(ltv, cac) {\n  if (!cac || cac <= 0) return 0;\n  return (ltv / cac).toFixed(2);\n}\n\n// Example test execution:\nconsole.log("LTV/CAC Ratio:", calculateLTVtoCAC(3500, 1000));`
  }
};

function initAiQaEngine() {
  startAiQaTimer();
  renderAiQaSidebar();
  renderAiQaQuestion(AiQaState.currentIdx);
  setupAiQaEvents();
}

function startAiQaTimer() {
  if (AiQaState.timerInterval) clearInterval(AiQaState.timerInterval);
  AiQaState.timerInterval = setInterval(() => {
    if (AiQaState.timerSeconds <= 0) {
      clearInterval(AiQaState.timerInterval);
      return;
    }
    AiQaState.timerSeconds--;
    const m = Math.floor(AiQaState.timerSeconds / 60).toString().padStart(2, '0');
    const s = (AiQaState.timerSeconds % 60).toString().padStart(2, '0');
    const timerEl = $('ai-qa-time-left');
    if (timerEl) timerEl.textContent = `${m}:${s}`;
  }, 1000);
}

function renderAiQaSidebar() {
  const nav = $('ai-qa-nav-list');
  if (!nav) return;

  nav.innerHTML = AiQaState.questions.map((q, idx) => {
    const isActive = idx === AiQaState.currentIdx;
    const isAnswered = Boolean(AiQaState.answers[q.id] && String(AiQaState.answers[q.id]).trim().length > 0);
    const iconContent = isAnswered 
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="#ff5a0a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;display:inline-block;vertical-align:middle;"><polyline points="20 6 9 17 4 12"/></svg>'
      : (idx + 1);

    return `
      <button data-qindex="${idx}" class="${isActive ? 'is-active' : ''} ${isAnswered ? 'is-answered' : ''}">
        <i>${iconContent}</i>
        <span>${q.titleShort}<small>${q.category}</small></span>
      </button>
    `;
  }).join('');

  nav.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.qindex, 10);
      AiQaState.currentIdx = idx;
      renderAiQaSidebar();
      renderAiQaQuestion(idx);
    });
  });
}

function renderAiQaQuestion(idx) {
  const q = AiQaState.questions[idx];
  if (!q) return;

  const toplineTitle = $('ai-qa-topline-title');
  if (toplineTitle) toplineTitle.textContent = q.title;

  const prevBtn = $('ai-qa-btn-prev');
  if (prevBtn) {
    prevBtn.style.display = idx > 0 ? 'inline-flex' : 'none';
  }

  const nextBtn = $('ai-qa-btn-next');
  const isFinalQuestion = idx === AiQaState.questions.length - 1;
  if (nextBtn) {
    if (isFinalQuestion) {
      nextBtn.innerHTML = `SUBMIT <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;margin-left:6px;display:inline-block;vertical-align:middle;"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;
      nextBtn.className = 'ai-qa-btn-submit';
    } else {
      nextBtn.innerHTML = `NEXT QUESTION <svg viewBox="0 0 24 24" fill="none" style="width:14px;height:14px;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;margin-left:4px;display:inline-block;vertical-align:middle;"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>`;
      nextBtn.className = 'ai-qa-btn-primary';
    }
  }

  const qTitle = $('ai-qa-question-text');
  if (qTitle) qTitle.textContent = q.question;

  const qDesc = $('ai-qa-question-desc');
  if (qDesc) {
    qDesc.textContent = q.description || '';
    qDesc.style.display = q.description ? 'block' : 'none';
  }

  const container = $('ai-qa-answer-container');
  if (!container) return;

  const currentAnswer = AiQaState.answers[q.id] || '';

  if (q.type === 'mcq') {
    container.innerHTML = `
      <div class="ai-qa-options">
        ${q.options.map(opt => {
          const isSelected = currentAnswer === opt;
          return `
            <button class="${isSelected ? 'is-selected' : ''}" data-option="${opt}">
              <i></i>
              <span>${opt}</span>
            </button>
          `;
        }).join('')}
      </div>
    `;

    container.querySelectorAll('.ai-qa-options button').forEach(btn => {
      btn.addEventListener('click', () => {
        const selectedOpt = btn.dataset.option;
        AiQaState.answers[q.id] = selectedOpt;
        renderAiQaSidebar();
        renderAiQaQuestion(idx);
      });
    });
  } else if (q.type === 'written') {
    const wordCount = (currentAnswer.match(/\S+/g) || []).length;
    container.innerHTML = `
      <div class="ai-qa-written-wrapper">
        <textarea id="ai-qa-written-input" placeholder="Articulate your strategy rationale...">${currentAnswer}</textarea>
        <div class="ai-qa-word-count" style="display:flex;align-items:center;gap:4px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px;display:inline-block;vertical-align:middle;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          <span>${wordCount} / 500 words</span>
        </div>
      </div>
    `;

    const textarea = $('ai-qa-written-input');
    if (textarea) {
      textarea.addEventListener('input', () => {
        AiQaState.answers[q.id] = textarea.value;
        const words = (textarea.value.match(/\S+/g) || []).length;
        const countEl = container.querySelector('.ai-qa-word-count span:last-child');
        if (countEl) countEl.textContent = `${words} / 500 words`;
        renderAiQaSidebar();
      });
    }
  } else if (q.type === 'coding') {
    const codeVal = AiQaState.answers[q.id] || AiQaState.codeAnswers[q.id] || '';
    container.innerHTML = `
      <div class="ai-qa-code-wrapper">
        <div class="ai-qa-code-header">
          <div class="ai-qa-dots">
            <span class="dot dot-red"></span>
            <span class="dot dot-yellow"></span>
            <span class="dot dot-green"></span>
          </div>
          <select id="ai-qa-lang-select" class="ai-qa-lang-select">
            <option value="js">JavaScript (Node.js)</option>
            <option value="py">Python 3.10</option>
          </select>
          <div class="ai-qa-code-actions">
            <button id="ai-qa-code-reset" class="ai-qa-code-btn-reset">Reset</button>
            <button id="ai-qa-code-run" class="ai-qa-code-btn-run">
              <svg viewBox="0 0 24 24" fill="currentColor" style="width:14px;height:14px;margin-right:4px;display:inline-block;vertical-align:middle;"><polygon points="5 3 19 12 5 21 5 3"/></svg> Run
            </button>
          </div>
        </div>
        <div class="ai-qa-code-body">
          <textarea id="ai-qa-code-input" spellcheck="false" placeholder="// Construct your technical implementation...">${codeVal}</textarea>
        </div>
        <div id="ai-qa-code-terminal" class="ai-qa-code-terminal">
          &gt; Verification engine ready for input...
        </div>
      </div>
    `;

    const codeTextarea = $('ai-qa-code-input');
    if (codeTextarea) {
      codeTextarea.addEventListener('input', () => {
        AiQaState.answers[q.id] = codeTextarea.value;
        renderAiQaSidebar();
      });
    }

    const resetBtn = $('ai-qa-code-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        AiQaState.answers[q.id] = AiQaState.codeAnswers[q.id];
        renderAiQaQuestion(idx);
      });
    }

    const runBtn = $('ai-qa-code-run');
    if (runBtn) {
      runBtn.addEventListener('click', () => {
        const terminal = $('ai-qa-code-terminal');
        if (terminal) {
          terminal.innerHTML = `&gt; Executing verification suite...<br>&gt; <span style="color:#4ade80;">[SUCCESS]</span> LTV/CAC ratio calculation verified. Tests Passed (3/3).`;
        }
      });
    }
  }
}

function setupAiQaEvents() {
  const prevBtn = $('ai-qa-btn-prev');
  if (prevBtn) {
    prevBtn.replaceWith(prevBtn.cloneNode(true));
    const newPrevBtn = $('ai-qa-btn-prev');
    newPrevBtn.addEventListener('click', () => {
      if (AiQaState.currentIdx > 0) {
        AiQaState.currentIdx--;
        renderAiQaSidebar();
        renderAiQaQuestion(AiQaState.currentIdx);
      }
    });
  }

  const nextBtn = $('ai-qa-btn-next');
  if (nextBtn) {
    nextBtn.replaceWith(nextBtn.cloneNode(true));
    const newNextBtn = $('ai-qa-btn-next');
    newNextBtn.addEventListener('click', () => {
      const isFinalQuestion = AiQaState.currentIdx === AiQaState.questions.length - 1;
      if (isFinalQuestion) {
        showAiQaSubmitModal();
      } else {
        AiQaState.currentIdx++;
        renderAiQaSidebar();
        renderAiQaQuestion(AiQaState.currentIdx);
      }
    });
  }

  const modalRedirectBtn = $('ai-qa-modal-redirect-btn');
  if (modalRedirectBtn) {
    modalRedirectBtn.replaceWith(modalRedirectBtn.cloneNode(true));
    const newRedirectBtn = $('ai-qa-modal-redirect-btn');
    newRedirectBtn.addEventListener('click', () => {
      hideAiQaSubmitModal();
      gotoScreen('mission-control');
    });
  }
}

function showAiQaSubmitModal() {
  const modal = $('ai-qa-submit-modal');
  if (modal) {
    modal.classList.remove('hidden');
  }
}

function hideAiQaSubmitModal() {
  const modal = $('ai-qa-submit-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// ── BOOT ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  init();

  const contractScreen = document.querySelector('.contract-screen');
  contractScreen?.addEventListener('mousemove', ({ clientX, clientY }) => {
    const bounds = contractScreen.getBoundingClientRect();
    contractScreen.style.setProperty('--contract-x', `${((clientX - bounds.left) / bounds.width) * 100}%`);
    contractScreen.style.setProperty('--contract-y', `${((clientY - bounds.top) / bounds.height) * 100}%`);
  });
});
