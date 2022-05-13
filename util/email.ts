import { expectEnv } from "./security";
import nodemailer from 'nodemailer';                // allows for sending emails
import Mail from "nodemailer/lib/mailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";

const tlsReject = expectEnv("ENVIRONMENT") === "development" ? false : true;

export const smtpTransport: Mail<SMTPTransport.SentMessageInfo> = nodemailer.createTransport({
    service: "SendPulse",
    // You can use this tls rejectUnauthorized statement in development, but for security reasons, make sure it is always commented out in production.
    tls: {
        rejectUnauthorized: tlsReject
    },
    auth: {
        user: expectEnv('SENDGRID_USER'),
        pass: expectEnv('SENDGRID_PASS')
    }
});