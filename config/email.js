const nodemailer = require('nodemailer');

function getTransporter() {
    const emailUser =
        String(
            process.env.EMAIL_USER || ''
        ).trim();

    const appPassword =
        String(
            process.env.EMAIL_APP_PASSWORD || ''
        ).trim();

    if (
        !emailUser ||
        !appPassword
    ) {
        throw new Error(
            'Email service is not configured. Set EMAIL_USER and EMAIL_APP_PASSWORD.'
        );
    }

    return nodemailer.createTransport({
        service: 'gmail',

        auth: {
            user: emailUser,
            pass: appPassword
        }
    });
}

async function sendEmail({
    to,
    subject,
    html
}) {
    const transporter =
        getTransporter();

    const from =
        String(
            process.env.EMAIL_FROM ||
            process.env.EMAIL_USER ||
            ''
        ).trim();

    return transporter.sendMail({
        from:
            `"VISIONARICE" <${from}>`,

        to,
        subject,
        html
    });
}

module.exports = {
    sendEmail
};
