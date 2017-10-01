var express = require('express'),
        app = express(),
        server = require('http').createServer(app),
        io = require('socket.io').listen(server),
        uuid = require('node-uuid'),
        moment = require('moment'),
        fs = require('fs'),
        util = require('util'),
        scribe = require('scribe-js')(),
        discuss = require('./node/discuss'),
        files = require('./node/files'),
        send = require('./node/send'),
        api = require('./node/api'),
        mailer = require('./node/mailer');

app.use(scribe.express.logger()); 
app.use('/logs', scribe.webPanel());
app.use(express.static(__dirname + '/public'));

app.get('/file/:id/:fn', files.get_file);
app.get('/api/:end/:sub?', api.call);


var epi_models = ['PI', 'SPI'];
var rooms = {};

discuss.do_fixes();
mailer.notify("confer.zone ready", "confer.zone has finished loading.");

io.sockets.on('connection', function (socket) {
//    var episode_id = false;
//    var section_id = false;
    
    var login_user = function(username, user_slug, newroom, oldroom, user_action){
        var count_old_room = 0;
        var count_new_room = 0;
        if(!user_action || user_action === '') user_action = 'login';
        if(!newroom || newroom === ''){
            newroom = 'public';
        }else{
         //   discuss.set_members_episode(newroom);
        }
        
        if(oldroom){
            socket.leave(oldroom);
            
            delete rooms[oldroom][socket.id];
            count_old_room = Object.keys(rooms[oldroom]).length;

            if(count_old_room === 0) delete rooms[oldroom];
        }
        
        socket.join(newroom);
        socket.room = newroom;
        socket.username = username;
        socket.user_slug = user_slug;
        
        if(!rooms[newroom]) rooms[newroom] = {};
        rooms[newroom][socket.id] = {
            user_slug: user_slug,
            username: username
        };
        
        count_new_room = Object.keys(rooms[newroom]).length;
        
        // send message to self
        send.to_self(socket, user_action, {
            success: true,
            socketid: socket.id,
            admin_level: socket.admin_level,
            username: username,
            user_slug: user_slug,
            numUsers: count_new_room,
            newroom: newroom            
        });
        
        //send message to old room
        if(count_old_room > 0){
            send.to_a_room(socket, oldroom, 'user left', {
                users: rooms[oldroom],
                username: username,
                socketid: socket.id,
                numUsers: count_old_room
            });
        }
        
        //send message to new room
        send.to_room(socket, 'user joined', {
            users: rooms[newroom],
            username: socket.username,
            socketid: socket.id,
            user_slug: user_slug
        });
        
        send.to_self(socket,'users init', {
            users: rooms[newroom],
            numUsers: count_new_room
        });
    };
    
    var params = require('url').parse(socket.handshake.url,true).query;
    var oauth2_token = params.token;
    console.log('token: ', oauth2_token);    
    if(oauth2_token){
        discuss.validate_user_by_token(oauth2_token, socket.id, function(err, result){
            console.log('after validate_user_by_token', err, result);
            if(result.success){
                socket.admin_level = result.user.admin;
                login_user(result.user.username, result.user.slug, null, null, 'login user');
            }else{
                send.to_self(socket,'login user', {
                    success: false,
                    expired: result.expired
                }); 
            }
        });
    }
    
    socket.on('users init', function(data){
        send.to_self(socket,'users init', {
            users: rooms[socket.room]
        });
    });
    
    socket.on('user admin level', function(data){
        console.log("validate", data);
        if(socket.admin_level && data.socketid === socket.id){
            send.to_self(socket, 'user admin level', {
                admin_level: socket.admin_level
            });
        }else if(false){//temporarily switched off
//            discuss.validate_user(data.login, null, data.socketid, socket.id, function(err, result){
//                console.log('after validate_user', err, result);
//                var data = {
//                   admin_level: 0,
//                   socketid: 0
//                };
//                if(result.success){
//                    login_user(result.user.username, result.user.slug, null, null, 'login user');
//
//                    if(result.user && result.user.admin){
//                        socket.admin_level = result.user.admin;
//                        data.admin_level = result.user.admin;
//                        data.socketid = socket.id;                       
//                    }
//                }
//                
//                send.to_self(socket, 'user admin level', data);
//            });
        }
    });
    
    socket.on('episode delete', function(data){
        if(socket.admin_level && socket.admin_level >= 10 && data.episode_id){
            discuss.delete_episode(data.episode_id, function(result){
                send.to_self(socket, 'episode delete', {
                    episode_id: data.episode_id
                });
            });
        }
    });
    
    socket.on('reset', function(data){
        var success = false;
        if(socket.admin_level && socket.admin_level >= 10){
            discuss.reset_all(true);
            success = true;
        }
        send.to_self(socket, 'reset', {
            success: success
        });
    });
    
    socket.on('validate mail slug', function(data){
        if(data.mail_slug){
            discuss.get_episode(null, null, data.mail_slug, null, function(err, episode){
                var success = true;
                if(episode) success = false;
                send.to_self(socket, 'validate mail slug', {
                    success: success,
                    mail_slug: data.mail_slug
                });
            });
        }
    });
    
    socket.on('episode create', function(data){
        if(socket.admin_level && socket.admin_level >= 1){
            if(/^([a-zA-Z0-9_.-]{5,})$/.test(data.mail_slug)){
                data.mail_slug = data.mail_slug.toLowerCase();
                discuss.get_episode(null, null, data.mail_slug, null, function(err, episode){
                    var success = true;
                    if(episode){
                        success = false;
                        msg = 'E-mail already in use';

                        send.to_self(socket, 'episode create', {
                            success: success, 
                            msg: msg,
                            title: data.title,
                            mail_slug: data.mail_slug
                        });
                    }else{
                        data.model = (data.model && epi_models.indexOf(data.model) >= 0)? data.model: 'PI';
                        // data.model = 'PI';
                        settings = {
                            title: data.title,
                            mail_slug: data.mail_slug,
                            members: data.members
                        };
                        discuss.create_from_template(true, data.model, settings, socket.username, socket.user_slug, function(err, result){

                            if(err){
                                success = false;
                                msg = 'Invalid details, workgroup not created';
                            }else{
                                success = true;
                                msg = 'New workgroup succesfully created';
                            }
                            console.log('episode create', result);
                            send.to_self(socket, 'episode create', {
                                success: success, 
                                msg: msg,
                                title: data.title,
                                mail_slug: data.mail_slug,
                                episode: result
                            }); 
                        });
                    }
                });
            }else{
                send.to_self(socket, 'episode create', {
                    success: false, 
                    title: data.title,
                    msg: 'E-mail not valid',
                    mail_slug: data.mail_slug
                }); 
            }
        }else{
            send.to_self(socket, 'episode create', {
                success: false, 
                title: data.title,
                msg: 'Wrong credentials, workgroup not created',
                mail_slug: data.mail_slug
            });
        }

    });
    
    socket.on('episode update', function(data){
        if((data.episode.members 
                && data.episode.members[socket.user_slug] 
                && data.episode.members[socket.user_slug].admin) 
                || socket.admin_level >=10){
            //TODO sort out updates and update members...
            var updates = {
                title: data.episode.title,
                members: data.members,
                admin_slug: socket.user_slug,
            };
            discuss.update_episode(data.episode._id, updates, function(err, episode){
                send.to_self(socket, 'episode update', {
                    success: true,
                    episode: episode
                });
                send.to_self(socket, 'episode updated', {
                    episode: episode
                });
                send.to_others(socket, 'episode updated', {
                    episode: episode
                });
            });
        }
    });
    
    socket.on('episodes init', function (data) {
        console.log('episodes init member', socket.user_slug);
        if(data && data.all && socket.admin_level >= 10){
            discuss.get_episodes(function(err, results){
                console.log('episodes init member', err, results);
                send.to_self(socket,'episodes init', {
                    episodes: results
                });
            });
        }else if(socket.user_slug){
            var admin = (data && data.admin)?true:false;
            discuss.get_member_episodes(socket.user_slug, admin, function(err, results){
                console.log('episodes init member', err, results);
                send.to_self(socket,'episodes init', {
                    episodes: results
                });
            });
        }
    });
    
    socket.on('episode get', function(data){
        var user_slug = (socket.admin_level >= 10)?null:socket.user_slug;
        var action = (data.action)?data.action:'episode get';
        discuss.get_episode(data.episode_id, data.episode_slug, data.mail_slug, user_slug, function(err, result){
            send.to_self(socket, action, {
                episode: result
            })
        });
    });
    
    socket.on('episode report publish', function(data){
        if(data.episode_id === socket.room
                || socket.admin_level >=10){
            //TODO sort out updates and update members...
            var updates = {
                report_publish: data.report_publish,
            };
            discuss.update_episode(data.episode_id, updates, function(err, episode){
                console.log('episode report publish', data, err, episode);
                send.to_room(socket, 'episode report publish', {
                    episode_id : episode.episode_id,
                    report_publish: episode.report_publish
                });
            });
        }
    });
    
    socket.on('login user', function(data){
        console.log('login user');
        var login = data.login;
        var password = data.password;
        var socketid = data.socketid;
        console.log('login user', data);
        discuss.validate_user(login, password, socketid, socket.id, function(err, result){
            console.log('after validate_user', err, result);
            if(result.success){
                socket.admin_level = result.user.admin;
                login_user(result.user.username, result.user.slug, null, null, 'login user');
            }else{
                send.to_self(socket,'login user', {
                    success: false
                }); 
            }
        });
    });
    
    socket.on('login episode', function(data){
        var login = data.login;
        var password = data.password;
        var socketid = data.socketid;
        
        var newroom = data.episode_id;
        var oldroom = socket.room;
        console.log('DEBUG login episode:', data);
        if(data.user_slug && data.user_slug === socket.user_slug){
            console.log('DEBUG login episode:a');
            login_user(data.username, data.user_slug, newroom, oldroom, 'login');
        }else{
            console.log('DEBUG login episode:b');
            discuss.validate_user(login, password, socketid, socket.id, function(err, result){
                if(result.success){
                    socket.admin_level = result.user.admin;
                    console.log('DEBUG login episode:c');
                    login_user(result.user.username, result.user.slug, newroom, oldroom, 'login');
                }else{
                    console.log('DEBUG login episode:d');
                    send.to_self(socket,'login user', {
                        success: false
                    }); 
                }
            });
        }
    });
    
    var logout_user = function(action){
        console.log(action, socket.room);
        
        if(socket.room) {
            var oldroom = socket.room;
            socket.leave(oldroom);
            
            if(rooms[oldroom] && rooms[oldroom][socket.id]) delete rooms[oldroom][socket.id];
            var count_old_room = (rooms[oldroom])?Object.keys(rooms[oldroom]).length:0;

            if(count_old_room === 0){
                delete rooms[oldroom];
            }else{
                console.log('user left');
                send.to_a_room(socket, oldroom, 'user left', {
                    users: rooms[socket.room],
                    username: socket.username,
                    socketid: socket.id,
                    numUsers: count_old_room
                });
            }
        }
    };
    
    socket.on('logout user', function () {
        console.log('logout user');
        logout_user('logout user');
    });
    
    socket.on('disconnect', function () {
        console.log('disconnect');
        logout_user('disconnect');
    });
    
    socket.on('users find', function(data){
        if(data.query && socket.admin_level >= 1){
            discuss.get_users(data.query, "username email", function(err, result){
                var success = (result && result.count > 0)?true:false;
                var response = {
                    success: success,
                    members: result
                };
                send.to_self(socket, 'users find', response);
            });
        }
    });
    
    socket.on('user add', function(data){
        console.log('user add', data, socket.admin_level);
        if(data && socket.admin_level >= 10){
            var user = {
                login: data.email,
                password: data.password,
                username: data.username,
                email: data.email
            };

            discuss.add_user(user, function(err, result){
                console.log('user add', err, result);
                var response = {};
                if(result && result._id){
                    response.success = true;
                    response.user = result;
                }else{
                    response.success = false;
                }
                send.to_self(socket, 'user add', response);
            });
        }
    });
    
    socket.on('user find', function(data){
        
        discuss.get_user_by_email(data.email, "username email slug", function(err, result){
            console.log('user find', err, result);
            var response = {
                email: data.email
            };
            if(result && result.slug){
                response.success = true;
                response.user = result;
            }else{
                response.success = false;
            }
            send.to_self(socket, 'user find', response);
        });
    });
    
    socket.on('user get touches', function(data){
        console.log('on: user get touches', data);
        if(socket.user_slug && data.episode_slug){
            
            discuss.get_touch_episode(socket.user_slug, data.episode_slug, function(err, result){
                if(err) console.log('user get touches', err);
                console.log('user get touches', err, result);
                if(result){
                    send.to_self(socket, 'user get touches', result);
                }else{                    
                    send.to_self(socket, 'user get touches', {success: false});
                }
            });
        }else{
            send.to_self(socket, 'user get touches', {
                success: false
            });
        }
        
    });
    
    socket.on('user touch episode', function(data){
        console.log('on: user touch episode', data);
        if(socket.user_slug 
                && data.episode_slug
                && data.section_id
                && data.message_id
        ){
            discuss.touch_episode(socket.user_slug, data.episode_slug, data.section_id, data.item_slug, data.message_id);

        }else{
            send.to_self(socket, 'user touch episode', {
                success: false
            });
        }
    });
    
    socket.on('sections get', function(data){
        if(!data.action){
            data.action = 'sections get';
        }
        discuss.get_sections(data.episode_id, function(err, results){
            section_id = results._id;
            send.to_self(socket, data.action, {
                sections: results
            });
        });
    });
    
    socket.on('section get', function(data){
        if(data.episode_id && data.stage && data.stage !== 'info'){
            if(!data.action) data.action = 'section set';

            discuss.get_section(data.episode_id, data.stage, null, function(err, results){
                section_id = results._id;
                send.to_self(socket,data.action, {
                    section: results
                });
            });
        }
    });
    
    socket.on('messages init', function (data) {
        console.log('messages init', data);
        if(data.episode_id){
            if(!data.action) data.action = 'messages init';
            var filter = null;
            if(data.section_id){
                if(data.item_slug){
                    filter = {
                        item_slug: data.item_slug
                    }
                }else{
                    filter = {
                        item_slug: null
                    }
                }
            }
            discuss.get_messages(data.episode_id, data.section_id, filter, null, null, function(err, results){
                        
                send.to_self(socket, data.action, {
                    episode_id: data.episode_id,
                    section_id: data.section_id,
                    item_slug: data.item_slug,
                    messages: results
                });
            });
        }
    });

    socket.on('message add', function (data) {
        var message = data;
        message.username = socket.username;
        message.user_slug = socket.user_slug;
        
        discuss.add_message(data.episode_id, data.section_id, message, function(err, results){
            var response = {
                message: results
            };
            send.to_self(socket,'message add', response);
            send.to_room(socket,'message add', response);
        });
    });
    
    socket.on('message promote', function (data) {
        discuss.promote_message(data.episode_id, data.message_slug, data.section_id, data.stage, data.orig_stage, socket.username, socket.user_slug, function(err, result){
            console.log('message promote', err, result);
            send.to_self(socket,'item add', result);
            send.to_room(socket,'item add', result);
            send.to_self(socket,'message promote', result);
            send.to_room(socket,'message promote', result);
        });
    });
    
    socket.on('items init', function (data) {
        if(data.stage){
            data.section_id = '';            
        }else{
            data.stage = '';
        }
        if(!data.action) data.action = 'items init';
        if(data.episode_id){
            discuss.get_items(data.episode_id, data.section_id, data.stage, function(err, results){

                send.to_self(socket, data.action, {
                    items: results
                });
            });
        }
    });
    
    socket.on('items get for group_stage', function (data) {
        discuss.get_items_for_stage(data.episode_id, data.stage, function(err, results){
        
            send.to_self(socket,'items get for group_stage', {
                items: results
            });
        });
    });
    
    socket.on('items get for annotate_stage', function (data) {
        discuss.get_items_for_stage(data.episode_id, data.stage, function(err, results){
        
            send.to_self(socket,'items get for annotate_stage', {
                items: results
            });
        });
    });
    
    socket.on('item get', function (data) {
        var item_slug = data.item_slug;
        discuss.get_episode(null, data.episode_slug, null, socket.user_slug, function(err, episode){
            console.log('item get [episode]', err, episode);
            if(episode){
                 discuss.get_item(episode._id, item_slug, function(err, item){
                    console.log('item get [item]', err, item);
                    if(item){
                        send.to_self(socket,'item get', {
                            item: item
                        });
                    }
                });
            }
        });
       
    });
    
    socket.on('item get archive', function (data) {
        var slug = data.slug;
        discuss.get_item_archive(data.episode_id, data.slug, function(err, results){
            send.to_self(socket,'item get archive', {
                slug: slug,
                items: results
            });
        });
    });
    
    socket.on('item get annotations', function (data) {
        var item_id = data.item_id;
        if(!data.action) data.action = 'item get annotations';
        discuss.get_item_annotations(data.episode_id, data.item_id, function(err, results){
            send.to_self(socket, data.action, {
                item_id: item_id,
                items: results
            });
        });
    });
    
    socket.on('item get grouped', function (data) {
        var item_id = data.item_id;
        if(!data.action) data.action = 'item get grouped';
        discuss.get_item_grouped(data.episode_id, data.item_id, function(err, results){
            send.to_self(socket, data.action, {
                item_id: item_id,
                items: results
            });
        });
    });
    
    

    socket.on('item add', function (data) {
        var item = {
            title: data.title, 
            body: data.body,
            stage: data.stage,
            username: socket.username,
            user_slug: socket.user_slug,
            fixed: false
        };
        if(data.group) item.group = data.group;
        if(data.annotate) item.annotate = data.annotate;
        if(data.comment) item.comment = data.comment;
        discuss.add_item(data.episode_id, data.section_id, item, function(err, results){
            var response = {
                section_id: data.section_id,
                item: results
            };
            send.to_self(socket,'item add', response);
            send.to_room(socket,'item add', response);
        });
    });
    
    socket.on('item duplicate', function(data){
        discuss.duplicate_item(data.item_id, socket.username, socket.user_slug, function(err, result){
            console.log(err, result);
            if(result){
                var response = {
                    section_id: result.section_id,
                    item: result
                };
                send.to_self(socket,'item add', response);
                send.to_room(socket,'item add', response);
            }
        });
    });
    
    socket.on('mail item add', function(data){
        var slug = data.slug;
        var mail_slug = data.mail_slug.toLowerCase();
        var from = data.from;
        var links = data.links;
        var body = data.body;
        var title = data.title;

        discuss.get_episode(null, null, mail_slug, null, function(err, result){
            if(!result) return false;
            
            var episode_id = result._id;
            var drop_slug = result.drop_slug;
            discuss.get_section(episode_id, null, drop_slug, function(err, result){
                if(!result) return false;
                
                var section_id = result._id;
                var stage = result.stage;

                discuss.get_user_by_email(from.address, null, function(err, result){
                    var username = from.name;
                    var user_slug = ''; 
                    if(result){
                        username = result.username;
                        user_slug = result.slug;
                    }

                    var item = {
                        slug: slug,
                        title: title,
                        body: body,
                        stage: stage,
                        username: username,
                        user_slug: user_slug,
                        fixed: false,
                        readonly: true
                    };
                    if(links.length > 0){
                        
                        var base_path = __dirname + '/node/files/';
                        var url_path = 'file/';
                        var addlinks = [];
                        var fpath = base_path+slug+'/';
                        fs.mkdirSync(fpath);

                        //loop over links
                        for(var i = 0; i < links.length; i++){
                            addlinks.push({
                                title: links[i].title,
                                url: '/'+url_path+slug+'/'+links[i].filename,
                                filename: links[i].filename
                            });
                            fs.writeFile(fpath + links[i].filename, links[i].content, function(err) {
                                console.log(err);
                            });
                        }                        
                        item.links = addlinks;
                    }
                    
                    discuss.add_item(episode_id, section_id, item, function(err, results){
                         var response = {
                            section_id: section_id,
                            item: results
                        };
                        send.to_self(socket,'mail item add', response);
                        send.to_a_room(socket, episode_id, 'item add', response);
                    });
                });
            });
        });
    });
    
    socket.on('item update', function (data) {
        discuss.update_item_content(data._id, data.title, data.body, socket.username, socket.user_slug, function(err, results){
            console.log('item update', err, results);
            var response = {
                item: results
            };
            send.to_room(socket,'item update', response);
        });
    });
    
    socket.on('item tag', function(data){
        var label = data.label;
        var tags = data.tags;
        console.log('item tag', data);
        discuss.update_item_label(data.item_id, label, tags, socket.username, socket.user_slug, function(err, results){
            console.log('item tag cb', err, results);
            send.to_room(socket, 'item tag', {
                item_id: results._id,
                label: label,
                tags: results.labels[label]
            });
        });
    });

    socket.on('item group', function (data) {
        discuss.update_item_group(data._id, data.group, socket.username, socket.user_slug, function(err, results){
            console.log('item group', err, results);
            
            var response = {
                item: results
            };
            send.to_room(socket,'item update', response);
        });
    });

    socket.on('item annotate', function (data) {
        console.log('on item annotate', data);
        discuss.update_item_annotate(data._id, data.annotate, socket.username, socket.user_slug, function(err, results){
            console.log('item annotate', err, results);
            
            var response = {
                item: results
            };
            send.to_room(socket,'item update', response);
        });
    });
    
    socket.on('item promote', function (data) {
        discuss.update_item_section_id(data._id, data.section_id, data.stage, socket.username, socket.user_slug, function(err, results){
            console.log('item promote', err, results);
            
            var response = {
                item: results
            };
            send.to_self(socket,'item update', response);
            send.to_room(socket,'item update', response);
        });
    });
    

    socket.on('item move', function (data) {
        discuss.update_item_pos(data.item_id, data.x, data.y, data.z, socket.username, socket.user_slug, function(err, results){
            send.to_room(socket,'item move', results);
            
        });
    });

    socket.on('item delete', function (data) {
        discuss.mark_deleted_item(data.item_id, true, function(err, results){
            send.to_room(socket,'item delete', { item: results});
        });
    });
    
    socket.on('item undelete', function (data) {
        discuss.mark_deleted_item(data.item_id, false, function(err, results){
            send.to_room(socket,'item undelete', { item: results});
        });
    });
    
    socket.on('new message', function (data) {
        send.to_room(socket,'new message', {
            username: socket.username,
            id: data.id,
            message: data.message
        });
    });

    socket.on('typing', function (data) {
        send.to_room(socket,'typing', {
            username: socket.username,
            id: data.id
        });
    });

    socket.on('stop typing', function (data) {
        send.to_room(socket,'stop typing', {
            username: socket.username,
            id: data.id
        });
    });

    
});

//important: do not provide IP
server.listen(1337);
