import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: "smtp.hve.mx.microsoft",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendCode(email, code) {
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: email,
    subject: "Code de connexion",
    text: `Votre code est: ${code}`,
  });
}