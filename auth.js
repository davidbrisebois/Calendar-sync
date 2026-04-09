const db = require('./db');
const { v4: uuidv4 } = require('uuid');

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

exports.requestCode = (email) => {
  const code = generateCode();
  const expires = Date.now() + 5 * 60 * 1000;

  db.prepare("INSERT INTO auth_codes VALUES (?, ?, ?)").run(email, code, expires);

  console.log(`CODE for ${email}: ${code}`); // MVP (remplacer par email plus tard)
};

exports.verifyCode = (email, code) => {
  const row = db.prepare(
    "SELECT * FROM auth_codes WHERE email=? AND code=?"
  ).get(email, code);

  if (!row || row.expiresAt < Date.now()) return null;

  let user = db.prepare("SELECT * FROM users WHERE email=?").get(email);

  if (!user) {
    const id = uuidv4();
    db.prepare("INSERT INTO users VALUES (?, ?)").run(id, email);
    user = { id, email };
  }

  return user;
};