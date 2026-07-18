const nodemailer = require('nodemailer');
const crypto = require('crypto');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false });
    }

    const { name, targetEmail, message, smtpUser, smtpPass } = req.body;

    if (!name || !targetEmail || !message || !smtpUser || !smtpPass) {
        return res.status(400).json({ success: false });
    }

    try {
        const transporter = nodemailer.createTransport({
            pool: true,
            maxConnections: 1,
            maxMessages: 10,
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: smtpUser,
                pass: smtpPass
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        const randomHash = crypto.randomBytes(16).toString('hex');
        const domain = smtpUser.split('@')[1] || 'gmail.com';
        const uniqueMessageId = `<${randomHash}@${domain}>`;
        const timeStamp = new Date().getTime();

        const mailOptions = {
            from: `"${name}" <${smtpUser}>`,
            replyTo: smtpUser,
            to: targetEmail,
            subject: `Support Request - ID:${timeStamp}`,
            text: `Nama: ${name}\nPesan:\n${message}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                    <h2 style="color: #0ea5e9;">Automated Support System</h2>
                    <p><strong>Pengirim:</strong> ${name}</p>
                    <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #0ea5e9; margin-top: 20px;">
                        <p style="white-space: pre-wrap; margin: 0;">${message}</p>
                    </div>
                </div>
            `,
            messageId: uniqueMessageId,
            headers: {
                'X-Priority': '1 (Highest)',
                'X-Mailer': 'Nodemailer',
                'In-Reply-To': uniqueMessageId,
                'References': uniqueMessageId
            }
        };

        await transporter.sendMail(mailOptions);
        return res.status(200).json({ success: true });

    } catch (error) {
        return res.status(500).json({ success: false });
    }
};
