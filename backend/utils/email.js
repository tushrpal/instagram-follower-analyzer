async function sendOtpEmail(toEmail, otp) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        name: process.env.BREVO_SENDER_NAME || "Instagram Follower Analyzer",
        email: process.env.BREVO_SENDER_EMAIL,
      },
      to: [{ email: toEmail }],
      subject: "Your verification code",
      textContent: `Your verification code is: ${otp}\n\nThis code expires in 10 minutes.`,
      htmlContent: `
        <div style="font-family:sans-serif;max-width:400px;margin:0 auto">
          <h2 style="color:#7c3aed">Verify your email</h2>
          <p>Use the code below to complete your registration:</p>
          <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1f2937;padding:16px;background:#f3f4f6;border-radius:8px;text-align:center">
            ${otp}
          </div>
          <p style="color:#6b7280;font-size:14px;margin-top:16px">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo API error ${res.status}: ${body}`);
  }
}

async function sendPasswordResetEmail(toEmail, resetLink) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        name: process.env.BREVO_SENDER_NAME || "Instagram Follower Analyzer",
        email: process.env.BREVO_SENDER_EMAIL,
      },
      to: [{ email: toEmail }],
      subject: "Reset your password",
      textContent: `You requested a password reset.\n\nClick the link below to reset your password (expires in 1 hour):\n${resetLink}\n\nIf you didn't request this, you can safely ignore this email.`,
      htmlContent: `
        <div style="font-family:sans-serif;max-width:400px;margin:0 auto">
          <h2 style="color:#7c3aed">Reset your password</h2>
          <p>Click the button below to reset your password. This link expires in <strong>1 hour</strong>.</p>
          <a href="${resetLink}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Reset Password</a>
          <p style="color:#6b7280;font-size:14px">If the button doesn't work, copy and paste this link:<br><a href="${resetLink}" style="color:#7c3aed">${resetLink}</a></p>
          <p style="color:#6b7280;font-size:14px;margin-top:16px">If you didn't request a password reset, you can safely ignore this email.</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo API error ${res.status}: ${body}`);
  }
}

module.exports = { sendOtpEmail, sendPasswordResetEmail };
