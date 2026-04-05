import nodemailer from "nodemailer";

const getTransportConfig = () => {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        if (String(process.env.SMTP_HOST).trim() === "smtp.gmail.com") {
            return {
                service: "gmail",
                pool: true,
                maxConnections: 1,
                maxMessages: 20,
                connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT || 8000),
                greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT || 8000),
                socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT || 10000),
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            };
        }

        return {
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: String(process.env.SMTP_SECURE || "false") === "true",
            connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT || 8000),
            greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT || 8000),
            socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT || 10000),
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        };
    }

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        return {
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        };
    }

    return null;
};

const getFromAddress = () =>
    process.env.SMTP_FROM ||
    process.env.EMAIL_FROM ||
    process.env.SMTP_USER ||
    process.env.EMAIL_USER ||
    null;

export const isEmailServiceConfigured = () => Boolean(getTransportConfig() && getFromAddress());

export const sendPasswordResetOtpEmail = async ({ to, otp, username }) => {
    const transportConfig = getTransportConfig();
    const from = getFromAddress();

    if (!transportConfig || !from) {
        throw new Error(
            "Email OTP is not configured yet. Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and SMTP_FROM in backend/.env."
        );
    }

    const transporter = nodemailer.createTransport(transportConfig);
    const recipientName = username || "Learner";

    await transporter.verify();

    const sendMailPromise = transporter.sendMail({
        from,
        to,
        subject: "Your AI Learning Assistant OTP",
        text: `Hello ${recipientName}, your password reset OTP is ${otp}. It is valid for 10 minutes.`,
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
              <h2 style="margin-bottom: 12px;">Password Reset OTP</h2>
              <p>Hello ${recipientName},</p>
              <p>Use the OTP below to reset your password for AI Learning Assistant:</p>
              <div style="display:inline-block; padding:12px 18px; border-radius:12px; background:#0f172a; color:#ffffff; font-size:24px; letter-spacing:6px; font-weight:700;">
                ${otp}
              </div>
              <p style="margin-top:16px;">This OTP is valid for 10 minutes.</p>
              <p>If you did not request this reset, you can safely ignore this email.</p>
            </div>
        `,
    });

    const timeoutIdHolder = { current: null };
    const timeoutPromise = new Promise((_, reject) => {
        timeoutIdHolder.current = setTimeout(() => {
            reject(
                new Error(
                    "Email service timed out. Please verify Gmail app password and internet connectivity."
                )
            );
        }, Number(process.env.SMTP_SEND_TIMEOUT || 12000));
    });

    try {
        await Promise.race([sendMailPromise, timeoutPromise]);
    } finally {
        if (timeoutIdHolder.current) {
            clearTimeout(timeoutIdHolder.current);
        }
        transporter.close();
    }
};
