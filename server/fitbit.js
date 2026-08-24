import crypto from 'node:crypto';

const AUTH = 'https://www.fitbit.com/oauth2/authorize';
const TOKEN = 'https://api.fitbit.com/oauth2/token';
const API = 'https://api.fitbit.com';
const SCOPES = 'activity heartrate profile sleep settings';

const pkce = new Map();
const sessions = new Map();

function requiredEnv() {
  return {
    clientId: process.env.FITBIT_CLIENT_ID || '',
    clientSecret: process.env.FITBIT_CLIENT_SECRET || '',
    redirectUri: process.env.FITBIT_REDIRECT_URI || 'http://localhost:3000/api/fitbit/callback',
  };
}

function b64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function sessionIdFromCookie(header = '') {
  const m = String(header).match(/(?:^|;\s*)fitbit_sid=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function mountFitbitRoutes(app) {
  app.get('/api/fitbit/status', (req, res) => {
    const { clientId } = requiredEnv();
    const sid = sessionIdFromCookie(req.headers.cookie);
    const session = sid ? sessions.get(sid) : null;
    res.json({
      configured: Boolean(clientId),
      connected: Boolean(session?.accessToken),
      user: session?.profile || null,
    });
  });

  app.get('/api/fitbit/login', (req, res) => {
    const { clientId, redirectUri } = requiredEnv();
    if (!clientId) {
      res.status(501).json({
        error: 'Configura FITBIT_CLIENT_ID y FITBIT_CLIENT_SECRET (Fitbit Web API).',
      });
      return;
    }
    const verifier = b64url(crypto.randomBytes(32));
    const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
    const state = b64url(crypto.randomBytes(16));
    pkce.set(state, { verifier, at: Date.now() });
    const url = new URL(AUTH);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('scope', SCOPES);
    url.searchParams.set('code_challenge', challenge);
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('state', state);
    res.redirect(url.toString());
  });

  app.get('/api/fitbit/callback', async (req, res) => {
    const { clientId, clientSecret, redirectUri } = requiredEnv();
    const { code, state } = req.query;
    const saved = pkce.get(String(state || ''));
    pkce.delete(String(state || ''));
    if (!code || !saved) {
      res.status(400).send('OAuth Fitbit inválido');
      return;
    }
    const body = new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code: String(code),
      code_verifier: saved.verifier,
    });
    const tokenRes = await fetch(TOKEN, {
      method: 'POST',
      headers: {
        authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    const tokens = await tokenRes.json();
    if (!tokenRes.ok) {
      res.status(502).json(tokens);
      return;
    }
    const sid = b64url(crypto.randomBytes(16));
    sessions.set(sid, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      profile: null,
    });
    res.setHeader('Set-Cookie', `fitbit_sid=${sid}; Path=/; HttpOnly; SameSite=Lax`);
    res.redirect('/');
  });

  app.get('/api/fitbit/today', async (req, res) => {
    const sid = sessionIdFromCookie(req.headers.cookie);
    const session = sid ? sessions.get(sid) : null;
    if (!session?.accessToken) {
      res.status(401).json({ error: 'No hay sesión Fitbit' });
      return;
    }
    const headers = { authorization: `Bearer ${session.accessToken}` };
    const [profile, activity, heart] = await Promise.all([
      fetch(`${API}/1/user/-/profile.json`, { headers }).then((r) => r.json()),
      fetch(`${API}/1/user/-/activities/date/today.json`, { headers }).then((r) => r.json()),
      fetch(`${API}/1/user/-/activities/heart/date/today/1d.json`, { headers }).then((r) => r.json()),
    ]);
    session.profile = {
      name: profile.user?.displayName,
      avatar: profile.user?.avatar,
    };
    const restHr = heart['activities-heart']?.[0]?.value?.restingHeartRate;
    res.json({
      profile: session.profile,
      summary: activity.summary || {},
      restingHeartRate: restHr || null,
    });
  });
}
