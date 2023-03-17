const nodemailer = require('nodemailer');
const sendMail = async (options) => {
    const transporter = nodemailer.createTransport({
        service: "hotmail",
        auth: {
            user: process.env.SMPT_MAIL,
            pass: process.env.SMPT_PASS

        }
    })
    const mailOptions = {
        from: process.env.SMPT_MAIL,
        to: options.email,
        subject: options.subject,
        text: options.message
    }
    await transporter.sendMail(mailOptions)
}
module.exports = sendMail