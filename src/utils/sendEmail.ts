import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

export async function sendEmail(to: string, subject: string, html: string) {
    dotenv.config();
    console.log(process.env.EMAIL_USER);
    console.log(process.env.EMAIL_PASS);

    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    let info = await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: to,
        subject: subject,
        html: html,
    });

    console.log('Message sent: %s', info.messageId);
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
}
