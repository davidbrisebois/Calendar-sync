import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET;

export function sign(user) {
  return jwt.sign(user, SECRET, { expiresIn: "7d" });
}

export function verify(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}