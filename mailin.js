var mailin = require('mailin'),
    fs = require('fs'),
    socket = require('socket.io-client')('http://localhost:1337'),
    shortid = require('shortid');

mailin.start({
  port: 25,
  host: '93.158.205.18',
  disableWebhook: true // Disable the webhook posting.
});

/* Access simplesmtp server instance. */
mailin.on('authorizeUser', function(connection, username, password, done) {
   console.log('mailin authorizeUser', connection, username, password);
  if (username == "johnsmith" && password == "mysecret") {
    done(null, true);
  } else {
    done(new Error("Unauthorized!"), false);
  }
});

/* Event emitted when a connection with the Mailin smtp server is initiated. */
//mailin.on('startMessage', function (connection) {
//
//});

/* Event emitted after a message was received and parsed. */
mailin.on('message', function (connection, data, content) {
    console.log('mailin message', data.from, data.subject);
    /* Do something useful with the parsed message here.
     * Use parsed message `data` directly or use raw message `content`. */
    var whitelist = ['confer.zone'];
    var links = [];
    var slug = shortid.generate();
    
    //loop over attachments
    for(var i = 0; i < data.attachments.length; i++){
        links.push({
            title: data.attachments[i].generatedFileName,
            filename: data.attachments[i].generatedFileName,
            content: data.attachments[i].content
        });
        //fs.writeFile(fpath + data.attachments[i].generatedFileName, data.attachments[i].content, function(err) {});
    }
    
    var re = /(.*)@(.*)/;
    var from = data.from[0];
    var title = data.subject;
    var body = data.text;
    
    var res_slug = '';
    var mail_slug = '';
    var mail_domain = '';
    
    var mail_item = {
        slug: slug,
        mail_slug: mail_slug,
        from: from,
        title: title,
        body: body,
        links: links
    };
    
    for(var i = 0; i < data.to.length; i++){
        res_slug = re.exec(data.to[i].address);
        if(res_slug.length > 1){
            mail_domain = res_slug[2];
            mail_item.mail_slug = res_slug[1];
            
            if(whitelist.indexOf(mail_domain) >= 0){
                console.log('mailin accepted: '+ res_slug[1] + '@' + res_slug[2]);
                socket.emit('mail item add', mail_item);
            }else{
                console.log('mailin rejected: ' + res_slug[1] + '@' + res_slug[2]);
                console.log(mail_item);
            }
        }
    }
});

socket.on('mail item add', function(result){
    console.log('mail item add: id=' + result._id);
});