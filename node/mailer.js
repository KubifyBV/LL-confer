var nodemailer = require('nodemailer'),
    sendmailTransport = require('nodemailer-sendmail-transport'),
    fs = require('fs'),    
    settings_install = JSON.parse(fs.readFileSync('./node/data/settings.install.json', "utf8"));

module.exports = {
    send: send,
    notify: notify
}

var transporter = nodemailer.createTransport(sendmailTransport());

function send(mail){
    
    var mailOptions = {
        from: mail.from, // sender address
        to: mail.to, // list of receivers
        subject: mail.subject, // Subject line
        text: mail.text // plaintext body
    };
    
    if(mail.html) mailOptions.html = mail.html; // html body

    // send mail with defined transport object
    transporter.sendMail(mailOptions, function(error, info){
        if(error){
            return console.log(error);
        }
        console.log('Message sent: ' + info.response);

    });    
}

function notify(subject, body){
    send({
       to: settings_install.admin_address,
       from: settings_install.noreply_address,
       subject: subject,
       text: body
    });
}
