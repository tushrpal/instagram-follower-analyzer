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

module.exports = { sendOtpEmail };
