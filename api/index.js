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

    const { name, email, message } = req.body;

    if (!name || !email || !message) {
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
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        const randomHash = crypto.randomBytes(16).toString('hex');
        const domain = process.env.EMAIL_USER.split('@')[1] || 'gmail.com';
        const uniqueMessageId = `<${randomHash}@${domain}>`;
        const timeStamp = new Date().getTime();

        const mailOptions = {
            from: `"${name}" <${process.env.EMAIL_USER}>`,
            replyTo: email,
            to: process.env.EMAIL_USER,
            subject: `New Lead: ${name} [ID:${timeStamp}]`,
            text: `Nama: ${name}\nEmail: ${email}\nPesan:\n${message}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                    <h2 style="color: #0ea5e9;">Sistem Notifikasi Terverifikasi</h2>
                    <p><strong>Pengirim:</strong> ${name}</p>
                    <p><strong>Kontak:</strong> ${email}</p>
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
        if (error.message.includes('Invalid login') || error.message.includes('Username and Password not accepted')) {
            return res.status(401).json({ success: false });
        }
        return res.status(500).json({ success: false });
    }
};
