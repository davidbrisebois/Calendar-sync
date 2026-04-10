import axios from "axios";
import { eq } from "drizzle-orm";
import { db, schema } from "./db.js";

const AUTH_BASE = "https://login.microsoftonline.com/common/oauth2/v2.0";
const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
const SCOPES = "offline_access User.Read Calendars.ReadWrite";

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function tokenEndpoint() {
  return `${AUTH_BASE}/token`;
}

export function buildAuthUrl(state) {
  const clientId = requiredEnv("MS_CLIENT_ID");
  const redirectUri = requiredEnv("MS_REDIRECT_URI");

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    response_mode: "query",
    scope: SCOPES,
    state,
  });

  return `${AUTH_BASE}/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(code) {
  const clientId = requiredEnv("MS_CLIENT_ID");
  const clientSecret = requiredEnv("MS_CLIENT_SECRET");
  const redirectUri = requiredEnv("MS_REDIRECT_URI");

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
    scope: SCOPES,
  });

  const { data } = await axios.post(tokenEndpoint(), body.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  return data;
}

async function saveToken(userId, tokenData) {
  const expiresAt = Date.now() + Number(tokenData.expires_in || 0) * 1000;

  await db
    .insert(schema.graphTokens)
    .values({
      userId,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || "",
      expiresAt,
      scope: tokenData.scope || SCOPES,
      tokenType: tokenData.token_type || "Bearer",
    })
    .onConflictDoUpdate({
      target: schema.graphTokens.userId,
      set: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || "",
        expiresAt,
        scope: tokenData.scope || SCOPES,
        tokenType: tokenData.token_type || "Bearer",
      },
    });
}

export async function persistTokenFromCode(userId, code) {
  const tokenData = await exchangeCodeForToken(code);
  await saveToken(userId, tokenData);
}

async function getStoredToken(userId) {
  const [row] = await db
    .select()
    .from(schema.graphTokens)
    .where(eq(schema.graphTokens.userId, userId))
    .limit(1);

  return row || null;
}

async function refreshToken(userId, refreshTokenValue) {
  const clientId = requiredEnv("MS_CLIENT_ID");
  const clientSecret = requiredEnv("MS_CLIENT_SECRET");

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshTokenValue,
    grant_type: "refresh_token",
    scope: SCOPES,
  });

  const { data } = await axios.post(tokenEndpoint(), body.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  await saveToken(userId, {
    ...data,
    refresh_token: data.refresh_token || refreshTokenValue,
  });

  return data.access_token;
}

export async function getValidAccessToken(userId) {
  const token = await getStoredToken(userId);
  if (!token) return null;

  const skewMs = 60 * 1000;
  const stillValid = token.expiresAt && Number(token.expiresAt) > Date.now() + skewMs;
  if (stillValid) {
    return token.accessToken;
  }

  if (!token.refreshToken) return null;
  return refreshToken(userId, token.refreshToken);
}

export async function listUserCalendars(accessToken) {
  const { data } = await axios.get(`${GRAPH_BASE}/me/calendars?$select=id,name`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return data.value || [];
}
