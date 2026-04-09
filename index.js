const express = require('express');
const cron = require('node-cron');
const db = require('./db');
const auth = require('./auth');
const { syncUser } = require('./sync');

const app = express();
app.use(express.json());
app.use(express.static('public'));

let sessions = {};

// 🔐 request code
app.post('/auth/request', (req, res) => {
  auth.requestCode(req.body.email);
  res.sendStatus(200);
});

// 🔐 verify code
app.post('/auth/verify', (req, res) => {
  const user = auth.verifyCode(req.body.email, req.body.code);
  if (!user) return res.sendStatus(401);

  const token = Math.random().toString(36);
  sessions[token] = user;

  res.json({ token });
});

// 🔒 middleware
function requireAuth(req, res, next) {
  const token = req.headers.authorization;
  if (!sessions[token]) return res.sendStatus(401);
  req.user = sessions[token];
  next();
}

// ⚙️ config
app.get('/config', requireAuth, (req, res) => {
  const cfg = db.prepare("SELECT * FROM configs WHERE userId=?")
    .get(req.user.id);
  res.json(cfg || {});
});

app.post('/config', requireAuth, (req, res) => {
  db.prepare("DELETE FROM configs WHERE userId=?")
    .run(req.user.id);

  db.prepare("INSERT INTO configs VALUES (?, ?, ?)")
    .run(req.user.id, req.body.icsUrl, req.body.targetCalendarId);

  res.sendStatus(200);
});

// 🔄 manual sync
app.post('/sync', requireAuth, async (req, res) => {
  const cfg = db.prepare("SELECT * FROM configs WHERE userId=?")
    .get(req.user.id);

  await syncUser(cfg);
  res.sendStatus(200);
});

// ⏱️ cron global
cron.schedule("*/15 * * * *", async () => {
  const configs = db.prepare("SELECT * FROM configs").all();
  for (let cfg of configs) {
    await syncUser(cfg);
  }
});

app.listen(3000, () => console.log("🚀 running on 3000"));