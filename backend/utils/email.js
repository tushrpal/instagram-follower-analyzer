const nodemailer = require("nodemailer");

// Create email transporter
const createTransporter = () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Brevo API fallback
  if (process.env.BREVO_API_KEY) {
    return "brevo"; // Signal to use Brevo
  }

  console.warn("⚠️  No email configured. Messages will be logged to console.");
  return null;
};

// Send OTP email
async function sendOtpEmail(toEmail, otp) {
  const transporter = createTransporter();

  if (transporter === "brevo") {
    try {
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
          htmlContent: `
            <div style="font-family:sans-serif;max-width:400px;margin:0 auto">
              <h2 style="color:#7c3aed">Verify your email</h2>
              <p>Use the code below to complete your registration:</p>
              <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1f2937;padding:16px;background:#f3f4f6;border-radius:8px;text-align:center">
                ${otp}
              </div>
              <p style="color:#6b7280;font-size:14px;margin-top:16px">This code expires in 10 minutes.</p>
            </div>
          `,
        }),
      });

      if (!res.ok) {
        const errorBody = await res.text();
        console.error(`Brevo API error ${res.status}:`, errorBody);
        throw new Error(`Brevo API error ${res.status}: ${errorBody}`);
      }
      return;
    } catch (error) {
      console.error("Failed to send OTP via Brevo:", error.message);
      // Fallback to console logging in development
      console.log(`📧 OTP Email: ${toEmail} → Code: ${otp}`);
      return;
    }
  }

  if (!transporter) {
    console.log(`📧 OTP Email: ${toEmail} → Code: ${otp}`);
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || `"Instagram Follower Tracker" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: "Your verification code",
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:0 auto">
        <h2 style="color:#7c3aed">Verify your email</h2>
        <p>Use the code below to complete your registration:</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1f2937;padding:16px;background:#f3f4f6;border-radius:8px;text-align:center">
          ${otp}
        </div>
        <p style="color:#6b7280;font-size:14px;margin-top:16px">This code expires in 10 minutes.</p>
      </div>
    `,
  });
}

// Send contact form email
async function sendContactEmail({ name, email, subject, message }) {
  const transporter = createTransporter();

  if (transporter === "brevo") {
    try {
      const recipient = process.env.CONTACT_EMAIL || process.env.BREVO_SENDER_EMAIL;
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: {
            name: process.env.BREVO_SENDER_NAME || "Instagram Follower Tracker",
            email: process.env.BREVO_SENDER_EMAIL,
          },
          to: [{ email: recipient }],
          replyTo: { email, name },
          subject: `[Contact] ${subject}`,
          htmlContent: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
              <h2 style="color:#7c3aed">New contact request</h2>
              <p><strong>From:</strong> ${name} &lt;${email}&gt;</p>
              <p><strong>Topic:</strong> ${subject}</p>
              <div style="padding:16px;background:#f3f4f6;border-radius:8px">${message}</div>
            </div>
          `,
        }),
      });

      if (!res.ok) {
        const errorBody = await res.text();
        console.error(`Brevo API error ${res.status}:`, errorBody);
        throw new Error(`Brevo API error ${res.status}: ${errorBody}`);
      }
      return;
    } catch (error) {
      console.error("Failed to send contact email via Brevo:", error.message);
      // Fallback to console logging in development
      console.log(`\n📧 Contact Form:\nFrom: ${name} <${email}>\nSubject: ${subject}\nMessage: ${message}\n`);
      return;
    }
  }

  if (!transporter) {
    console.log(`\n📧 Contact Form:\nFrom: ${name} <${email}>\nSubject: ${subject}\nMessage: ${message}\n`);
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || `"Instagram Follower Tracker" <${process.env.SMTP_USER}>`,
    to: process.env.CONTACT_EMAIL || process.env.SMTP_USER,
    replyTo: email,
    subject: `[Contact] ${subject}`,
    text: `From: ${name} <${email}>\nTopic: ${subject}\n\n${message}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#7c3aed">New contact request</h2>
        <p><strong>From:</strong> ${name} &lt;${email}&gt;</p>
        <p><strong>Topic:</strong> ${subject}</p>
        <div style="padding:16px;background:#f3f4f6;border-radius:8px">${message.replace(/\n/g, '<br>')}</div>
      </div>
    `,
  });
}

// Send password reset email
async function sendPasswordResetEmail(toEmail, resetLink) {
  const transporter = createTransporter();

  if (transporter === "brevo") {
    try {
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
          htmlContent: `
            <div style="font-family:sans-serif;max-width:400px;margin:0 auto">
              <h2 style="color:#7c3aed">Reset your password</h2>
              <p>Click the button below to reset your password. This link expires in <strong>1 hour</strong>.</p>
              <a href="${resetLink}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Reset Password</a>
              <p style="color:#6b7280;font-size:14px">If the button doesn't work, copy this link:<br><a href="${resetLink}" style="color:#7c3aed">${resetLink}</a></p>
            </div>
          `,
        }),
      });

      if (!res.ok) {
        const errorBody = await res.text();
        console.error(`Brevo API error ${res.status}:`, errorBody);
        throw new Error(`Brevo API error ${res.status}: ${errorBody}`);
      }
      return;
    } catch (error) {
      console.error("Failed to send email via Brevo:", error.message);
      // Fallback to console logging in development
      console.log(`\n🔑 Password Reset: ${toEmail}\nLink: ${resetLink}\n`);
      return;
    }
  }

  if (!transporter) {
    console.log(`\n🔑 Password Reset: ${toEmail}\nLink: ${resetLink}\n`);
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || `"Instagram Follower Tracker" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: "Reset your password",
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:0 auto">
        <h2 style="color:#7c3aed">Reset your password</h2>
        <p>Click the button below to reset your password. This link expires in <strong>1 hour</strong>.</p>
        <a href="${resetLink}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Reset Password</a>
        <p style="color:#6b7280;font-size:14px">If the button doesn't work, copy this link:<br><a href="${resetLink}" style="color:#7c3aed">${resetLink}</a></p>
      </div>
    `,
  });
}

module.exports = { sendOtpEmail, sendPasswordResetEmail, sendContactEmail };
