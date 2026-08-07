import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST || "localhost";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = String(process.env.SMTP_SECURE || "false") === "true";
const SMTP_FROM = process.env.SMTP_FROM;

export const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: process.env.SMTP_USER
    ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      }
    : undefined,
});

export async function sendCode(email, code) {
  await transporter.sendMail({
    from: SMTP_FROM,
    to: email,
    subject: "Code de connexion",
    text: `Votre code est: ${code}`,
  });
}

export async function sendGraphConnectionLostEmail(email) {
  await transporter.sendMail({
    from: SMTP_FROM,
    to: email,
    subject: "Action requise: reconnecter Microsoft Graph",
    text: [
      "La synchronisation automatique a échoué car la connexion Microsoft Graph est expirée ou invalide.",
      "Reconnectez Office 365 dans l'application pour relancer les synchronisations.",
    ].join("\n\n"),
  });
}
