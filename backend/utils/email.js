const nodemailer = require("nodemailer");

function createTransport() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

async function sendOtpEmail(toEmail, otp) {
  const transporter = createTransport();
  await transporter.sendMail({
    from: `"Instagram Follower Analyzer" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: "Your verification code",
    text: `Your verification code is: ${otp}\n\nThis code expires in 10 minutes.`,
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:0 auto">
        <h2 style="color:#7c3aed">Verify your email</h2>
        <p>Use the code below to complete your registration:</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1f2937;padding:16px;background:#f3f4f6;border-radius:8px;text-align:center">
          ${otp}
        </div>
        <p style="color:#6b7280;font-size:14px;margin-top:16px">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
}

module.exports = { sendOtpEmail };
