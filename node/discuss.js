var     mongoose = require('mongoose'),
        moment = require('moment'),
        shortid = require('shortid'),
        fs = require('fs'),
        bcrypt = require('bcryptjs'),
        files = require('./files');



//setup mongodb
//mongoose.connect('mongodb://localhost/iacio');
mongoose.connect('mongodb://localhost/discuss');
//define models

var UserSchema = mongoose.Schema;
var User = require('./models/user.js').make(UserSchema, mongoose, bcrypt);
var ItemSchema = mongoose.Schema;
var Item = require('./models/item.js').make(ItemSchema, mongoose);
var MessageSchema = mongoose.Schema;
var Message = require('./models/message.js').make(MessageSchema, mongoose);
var SectionSchema = mongoose.Schema;
var Section = require('./models/section.js').make(SectionSchema, mongoose);
var EpisodeSchema = mongoose.Schema;
var Episode = require('./models/episode.js').make(EpisodeSchema, mongoose);

var firsts = {};



module.exports = {
    do_fixes: do_fixes,
    reset_all: reset_all,
    get_firsts: get_firsts,
    create_from_template: create_from_template,
    create_episode_from_template: create_episode_from_template,
    add_user: add_user,
    oauth_user: oauth_user,
    validate_user_by_token: validate_user_by_token,
    validate_user: validate_user,
    get_users: get_users,
    get_user: get_user,
    get_user_by_email: get_user_by_email,
    get_touch_episode: get_touch_episode,
    touch_episode: touch_episode,
    create_episode: create_episode,
    update_episode: update_episode,
    get_episode: get_episode,
    add_member_episode: add_member_episode,
    remove_member_episode: remove_member_episode,
    set_members_episode: set_members_episode,
    get_episodes: get_episodes,
    get_member_episodes: get_member_episodes,
    delete_episode: delete_episode,
    create_section: create_section,
    get_sections: get_sections,
    get_section: get_section,
    add_message: add_message,
    get_messages: get_messages,
    promote_message: promote_message,
    add_item: add_item,
    get_item: get_item,
    get_items: get_items,
    get_items_for_stage: get_items_for_stage,
    get_item_archive: get_item_archive,
    get_item_grouped: get_item_grouped,
    get_item_annotations: get_item_annotations,
    update_item_content: update_item_content,
    update_item_group: update_item_group,
    update_item_annotate: update_item_annotate,
    update_item_label: update_item_label,
    update_item_pos: update_item_pos,
    update_item_links: update_item_links,
    update_item_section_id: update_item_section_id,
    update_item: update_item,
    mark_deleted_item: mark_deleted_item,
    delete_item: delete_item,
    duplicate_item: duplicate_item
};

//---------------- messy rest and initial setup --------------------------//
var cleardata = -1;
function reset_all(start){
    if(start){
        cleardata = 4;
        console.log('clearing: '+cleardata);
        Episode.find({}).remove().exec(function(){--cleardata; console.log('clearing: '+cleardata);});
        Section.find({}).remove().exec(function(){--cleardata; console.log('clearing: '+cleardata);});
        Message.find({}).remove().exec(function(){--cleardata; console.log('clearing: '+cleardata);});
        Item.find({}).remove().exec(function(){--cleardata; console.log('clearing: '+cleardata);});
    }
    if(cleardata > 0){ 
        setTimeout(reset_all, 100);
    }else if(cleardata === 0){
        cleardata = -1;
        create_from_template(true,'PI', 'Progressive Inquiry', 'Raymond');
    }    
}

function create_users(){
    //create initial accounts from ./node/data/users.json
    User.count({}, function(err, usercnt){
        console.log("usercount: "+usercnt);
        if(usercnt === 0){
            var userfile = './node/data/users.json';
            fs.stat(userfile, function(err, stat) {
                if(err == null) {
                    var users = JSON.parse(fs.readFileSync(userfile, "utf8"));
                    var count = users.length;
                    for(var i = 0; i < count; i++){
                        add_user(users[i]);
                    }
                    console.log("users creared: "+count);
        
                }else{
                    console.log('users.json not found: '+userfile);
                }
            });

        }
        
    });
    
}

function fix_messages(){
//    Message.find({}).exec(function(err, messages){
//        console.log(err, messages);
//        var fs = '';
//        var slugparts = [];
//        var subslugparts = [];
//        var timeparts = [];
//        if(messages){
//            for(var i = 0; i < messages.length; i++){
//                
//                fs = messages[i].full_slug;
//                slugparts = fs.split('/');
//                for(var j = 0; j < slugparts.length; j++){
//                    subslugparts = slugparts[j].split(':');
//                    timeparts = subslugparts[0].split('.');
//                    for(var k = 0; k < timeparts.length; k++){
//                        if(timeparts[k].length == 1) timeparts[k] = '0'+timeparts[k];
//                    }
//                    subslugparts[0] = timeparts.join('.');
//                    slugparts[j] = subslugparts.join(':');                        
//                }
//                fs = slugparts.join('/');
//                messages[i].full_slug = fs;                 
//                console.log(i, fs);
//                
//                messages[i].save();
//            }
//        }        
//    });

//    Section.find({}).exec(function(err, sections){
//        var sec2epi = {};
//        
//        for(var i = 0; i < sections.length; i++){
//            sec2epi[sections[i]._id] = sections[i].episode_id;
//        }       
//        
//        Message.find({episode_id: null}).exec(function(err, messages){
//            if(messages){
//                for(var i = 0; i < messages.length; i++){
//                    messages[i].episode_id = sec2epi[messages[i].section_id];
//                    messages[i].save();
//                }
//            }        
//        });
//        
//        
//    });
}

function do_fixes(){
    create_users();
    fix_messages();
}

function get_firsts(){
    return firsts;
}


////////////START TEMPLATE CREATE/////////////////////////////////////////////

var template, model;
function create_episode_from_template(setmodel, settings, username, user_slug, callback){
    model = setmodel || 'PI';
    template = JSON.parse(fs.readFileSync('./node/data/'+model+'_template.json', "utf8"));
    template.username = username;
    template.user_slug = user_slug;
//    var template_stages = [
//        'init',
//        'episode',
//        'section',
//        'discussion',
//        'items'
//    ];
    var members = settings.members;
    delete settings.members;
    
    //if(!settings.exports) settings.exports = template.exports;
    if(!settings.report) settings.report = template.report;
    if(!settings.report_publish) settings.report_publish = template.report_publish;
    if(!settings.phases) settings.phases = template.phases;
    
    create_episode(settings, null, function(err, result){
        template.episode_id = result._id;
        template.created_sections = 0;
        //add_member_episode(result._id, user_slug, true);
        var slugs = [];
        if(members){
            for(var i=0; i<members.length; i++){
                if(members[i].slug && user_slug !== members[i].slug){
                    slugs.push(members[i].slug);
                }
            }
        }
        
        set_members_episode(result._id, slugs, [template.user_slug], callback);
        
    });
}

function create_sections_from_template(){
    if(!template.episode_id) return false;
    
    var num_sections = template.sections.length;
        
    for (var i = 0; i < num_sections; i++) {
        (function (i){
            create_section(template.episode_id, template.sections[i].stage, template.sections[i], function(err, result){
                template.sections[i].section_id = result._id;
                if(template.mailin && template.sections[i].stage === template.mailin){
                    update_episode(template.episode_id, {drop_slug : result.slug}, function(err, result){
                        
                    });
                }
                template.created_sections = template.created_sections + 1;
                create_items_from_template(i);
            });
        })(i);
    }
    
    return true;
}
function create_items_from_template(section_key){
    if(!template.episode_id) return false;
    if(!template.sections[section_key].section_id) return false;
    if(!template.sections[section_key].settings.items.fixed) return true;
    
    var section_id = template.sections[section_key].section_id;
    
    //fixed items
    template.sections[section_key].settings.items.created = 0;
    var num_items = template.sections[section_key].settings.items.fixed.length;
    
    for (var i = 0; i < num_items; i++) {
            
        (function (i){
            var item = template.sections[section_key].settings.items.fixed[i];
            var new_item = {
                title: item.name, 
                body: item.body,
                slug: item.slug,
                username: template.username,
                user_slug: template.user_slug,
                stage: template.sections[section_key].stage,
                fixed: true
            };
            add_item(template.episode_id, section_id, new_item, function(err, result){
                template.sections[section_key].settings.items.created = template.sections[section_key].settings.items.created + 1;
            });
        })(i);
    }
}
 
function create_from_template(phase, setmodel, settings, username, user_slug, callback){
    if(!username) username = 'Raymond';
    if(!user_slug) user_slug = 'raymond';
    
    if(phase === true){
        if(setmodel){
            create_episode_from_template(setmodel, settings, username, user_slug, callback);
            create_from_template('sections');
        }
    }else if(phase === 'sections'){
        setTimeout(function(){create_sections_from_template();},500);
    }
}    
////////////END TEMPLATE CREATE/////////////////////////////////////////////

function add_user(user, callback){
    if(!callback) callback = function(err, result){console.log('add_user callback',err, result);};
    
    if(!user.username) user.username = user.login;
    var slug = shortid.generate();
    
    var created = moment().format();
    var newUser = new User({
        slug: slug,
        login: user.login,
        password: user.password,
        username: user.username,
        email: user.email,
        created: created
    });
    if(user.oauth2_sub) newUser.oauth2_sub = user.oauth2_sub;
    if(user.oauth2_token) newUser.oauth2_token = user.oauth2_token;
    if(user.expire_time) newUser.expire_time = user.expire_time;
    if(user.admin){
        newUser.admin = user.admin;
    }else{
        //allow all users to create episodes
        newUser.admin = 1;
    }
    if(user.session) newUser.session = user.session;
    newUser.save(callback);
}

function oauth_user(profile, token_result, callback){
    if(!callback) callback = function(err, result){console.log('oauth_user callback', err, result);};
    User.findOne({$or: [{oauth2_sub: profile.sub},{email: profile.email}]}, function(err, user){
        var now = Math.round(new Date()/1000);
        var expire_time = now + token_result.expires_in;
        var logged = moment().format();
        
        console.log('oauth_user found user', (user == "null"), (user!==null), typeof user);
        if(user !== null){
            var session = user.session;;
            if(!session) session = [];
            if(session.length > 0){
                var new_session = [];
                for(var i = 0;i < session.length; i++){
                    if(session[i].expire > now && session[i].token !== token_result.access_token){
                        new_session.push(session[i]);
                    }
                }
                session = new_session;
            }
            session.push({
                token: token_result.access_token,
                socketid: token_result.access_token,
                expire: expire_time,
                last_login: logged
            });
            //update existing user
            user.session = session;
            user.markModified('session');
            user.last_login = logged;
            user.oauth2_sub = profile.sub;
//            user.oauth2_token = token_result.access_token;
//            user.oauth2_expire = expire_time;
//            user.socketid = token_result.access_token;
            user.login = profile.email;
            user.username = profile.name;
            user.email = profile.email;
            console.log('oauth_user update', user);
    
            user.save(callback);
        }else{
            var session = [{
                token: token_result.access_token,
                socketid: token_result.access_token,
                expire: expire_time,
                last_login: logged
            }];
            
            //add new user
            var newuser = {
                oauth2_sub: profile.sub,
//                oauth2_token: token_result.access_token,
//                oauth2_expire: expire_time,
                session: session,
                last_login: logged,
//                socketid: token_result.access_token,
                login: profile.email,
                password: shortid.generate(),
                username: profile.name,
                email: profile.email
            }
            console.log('oauth_user add', newuser);
            add_user(newuser, callback);
        }  
    });
    
    
    
    callback();
}

function validate_user_by_token(oauth2_token, newsocketid, callback){
    if(!callback) callback = function(err, result){console.log('validate_user_by_token',result);};
    
    var query = {"session.token" : oauth2_token};
    User.findOne(query, function(err, user) {
        if (err){ 
            callback(err, { success: false});
        }else{
            if(user && user.login_user){
                // test a matching password
                var logged = moment().format();
                user.login_user(null, oauth2_token, null, newsocketid, logged, callback);
            }else{
                callback(null, { success: false});
            }
        }
    });
}

function validate_user(login, passwd, socketid, newsocketid, callback){
    if(!callback) callback = function(err, result){console.log('validate_user',result);};
    
    User.findOne({ login: login }, function(err, user) {
        if (err){ 
            callback(err, { success: false});
        }else{
            if(user && user.login_user){
                // test a matching password
                var logged = moment().format();
                user.login_user(passwd, null, socketid, newsocketid, logged, callback);
            }else{
                callback(null, { success: false});
            }
        }
    });
}

function get_users(query, fields, callback){
    if(!callback) callback = function(err, result){console.log('get_users',result);};
    
    if(/^([a-zA-Z0-9@\.\-_\s]{2,})/.test(query)){
        var filter = {$or: [{username: new RegExp(''+query+'', "i")}, {email: new RegExp(''+query+'', "i")}]};
        User.find(filter, fields).sort('username').exec(callback);
    }else{
        callback();
    }
}

function get_user(user_slug, callback){
    if(!callback) callback = function(err, result){console.log('get_user',result);};
    
    User.findOne({ slug: user_slug }, callback);
}

function get_user_by_email(email, fields, callback){
    if(!callback) callback = function(err, result){console.log('get_user_by_email',result);};
    console.log('get_user_by_email', email);
    User.findOne({ email: email }, fields, callback);
}

//add_user({login: 'aa', password: 'bb'}, function(err, data){
//    console.log('add_user', err, data);
//    validate_user('aa', 'bb', null, null, function(err, result){
//        console.log('validate_user',result);
//    });
//});

function get_touch_episode(user_slug, episode_slug, callback){
    if(!callback) callback = function(err, result){console.log('get touch episode',err, result);};
    
    Episode.findOne({ slug: episode_slug }, function(err, episode) {
        if (err){ 
            callback(err, { success: false});
        }else{
            if(episode && episode.get_touches){
                episode.get_touches(user_slug, callback);
            }else{
                callback(null, { success: false});
            }
        }
    });
}

function touch_episode(user_slug, episode_slug, section_id, item_slug, message_id, callback){
    if(!callback) callback = function(err, result){console.log('toucn episode',err, result);};
    
    Episode.findOne({ slug: episode_slug }, function(err, episode) {
        if (err){ 
            callback(err, { success: false});
        }else{
            if(episode && episode.set_touch){
                episode.set_touch(user_slug, section_id, item_slug, message_id, callback);
            }else{
                callback(null, { success: false});
            }
        }
    });
}

function create_episode(settings, slug, callback){
    if(!callback) callback = function(err, result){console.log('insert_episode',result);};
    if(!slug) slug = shortid.generate();
    if(!settings.title || settings.title === '') settings.title = 'untitled';
    if(!settings.mail_slug || settings.mail_slug === '') settings.mail_slug = '';
    if(!settings.report) settings.report = [];
    if(!settings.report_publish) settings.report_publish = [];
    if(!settings.phases) settings.phases = [];
    var created = moment().format();
    
    var new_episode = {
        title: settings.title,
        slug: slug,
        mail_slug: settings.mail_slug,
        members: {},
        report: settings.report,
        report_publish: settings.report_publish,
        phases: settings.phases,
        created: created 
    };
    var episode = new Episode(new_episode);
    episode.save(callback);
}

function update_episode(episode_id, updates, callback){
    if(!callback) callback = function(err, result){console.log('update_episode',result);};
    
    var slugs = [];
    var admin_slugs = [];
    
    if(updates.members){
        var members = updates.members;
        admin_slugs.push(updates.admin_slug);

        if(members){
            for(var i=0; i<members.length; i++){
                if(members[i].slug){
                    if(!members[i].admin){
                        slugs.push(members[i].slug);
                    }else{
                        admin_slugs.push(members[i].slug);
                    }
                }
            }
        }
        delete updates.admin_slug;
        delete updates.members;
    }
    
    Episode.findOneAndUpdate({_id: episode_id}, updates, {'new': true}, function(err, episode){
        if(slugs.length > 0 || admin_slugs.length > 0){
            episode.set_members(User, slugs, admin_slugs, callback);        
        }else{
            callback(err, episode);
        }
    });
}

function get_episode(episode_id, slug, mail_slug, user_slug, callback){
    if(!callback) callback = function(err, result){console.log('get_episode',result);};
    var filter = {};
    
    if(episode_id)  filter._id = episode_id;
    if(slug)   filter.slug = slug;
    if(mail_slug)   filter.mail_slug = mail_slug;
    
    if(user_slug) filter["members."+ user_slug +".active"] = true;
    
    Episode.findOne(filter, null, callback);
}

function add_member_episode(episode_id, user_slug, epi_admin, callback){
    console.log('add_member_episode', episode_id, user_slug, epi_admin);
    if(!callback) callback = function(err, result){console.log('add_member_episode',result);};
    if(!epi_admin) epi_admin = false;
    Episode.findOne({_id: episode_id}, null, function(err, episode){
        episode.add_member(User, user_slug, epi_admin, callback);
    });
}

function remove_member_episode(episode_id, user_slug, callback){
    if(!callback) callback = function(err, result){console.log('remove_member_episode',result);};
    Episode.findOne({_id: episode_id}, null, function(err, episode){
        episode.remove_member(user_slug, false, callback);
    });
}

function set_members_episode(episode_id, slugs, admin_slugs, callback){
    if(!callback) callback = function(err, result){console.log('set_members_episode',result);};
    Episode.findOne({_id: episode_id}, null, function(err, episode){
        episode.set_members(User, slugs, admin_slugs, callback);
    });
}

function get_episodes(callback){
    if(!callback) callback = function(err, result){console.log('get_episodes',result);};
    Episode.find({}).sort('-created').exec(callback);
}

function get_member_episodes(user_slug, admin, callback){
    if(!callback) callback = function(err, result){console.log('get_member_episodes',result);};
    var filter = {};
    filter["members."+ user_slug +".active"] = true;
    if(admin) filter["members."+ user_slug +".admin"] = true;
    
    Episode.find(filter).sort('-created').exec(function(err, result){
        console.log(filter, err, result);
        callback(err, result);
    });
}

function delete_episode(episode_id, callback){
    if(!callback) callback = function(err, result){console.log('delete_episode',result);};
    callback({deleted: episode_id});
    Episode.find({_id: episode_id}).remove().exec(function(){console.log('clearing: episode');});
    Section.find({episode_id: episode_id}).exec(function(err, result){
        for(var i = 0; i < result.length; i++){
            Message.find({section_id: result[i]._id}).remove().exec(function(){console.log('clearing: messages section '+i);});
            Section.find({_id: result[i]._id}).remove().exec(function(){console.log('clearing: section '+i);});
        }        
    });
    Item.find({episode_id: episode_id}).exec(function(err, result){
        console.log('find items',result);
        for(var i = 0; i < result.length; i++){
            delete_item(result[i]._id, function(){console.log('clearing: items '+ i);});
        }
    });
}

function create_section(episode_id, stage, section, callback){
    if(!callback) callback = function(err, result){console.log('insert_section',result);};
    if(!stage) stage = '';
    var created = moment().format();
        
    if(!section.slug) section.slug = shortid.generate();
    if(!section.title || section.title === '') section.title = 'untitled';
    if(!section.description || section.description === '') section.description = '';
    if(!section.phase) section.phase = '';
    if(!section.settings) section.settings = {
        discussion: true,
        items: {
            add                 : true,
            position            : true,
            grouping            : false,
            label               : '',
            fixed_from_label    : '',
            fixed               : [],
            annotate_for_stage  : ''
        }
    };
        
    var new_section = {
        episode_id: episode_id,
        stage: stage,
        phase: section.phase,
        slug: section.slug,
        title: section.title,
        description: section.description,
        order: section.order,
        created: created,
        settings: section.settings
    };
    var section = new Section(new_section);
    section.save(callback);
}

function get_sections(episode_id, callback){
    if(!callback) callback = function(err, result){console.log('get_sections',result);};
    var filter = {episode_id: episode_id};
    Section.find(filter)
            .sort('order')
            .exec(callback);
}

function get_section(episode_id, stage, slug, callback){
    if(!callback) callback = function(err, result){console.log('get_section',result);};
    var filter = {episode_id: episode_id};
    if(stage) filter.stage = stage;
    if(slug) filter.slug = slug;
    Section.findOne(filter, null, callback);
}

function add_message(episode_id, section_id, message, callback){
    if(!callback) callback = function(err, result){console.log('insert_message',result);};
    var posted = moment().format();
    var slug_part = shortid.generate();
    var full_slug_part = moment(posted).format('YYYY.MM.DD.HH.mm.ss') + ':' + slug_part;
    
    var newmessage = {
            episode_id: episode_id,
            section_id: section_id,
            slug: slug_part,
            full_slug: full_slug_part,
            parent_slug: message.parent_slug || '',
            level: 0,
            posted: posted,
            username: message.username,
            user_slug: message.user_slug,
            message: message.message
        };
    if(message.item_slug) newmessage.item_slug = message.item_slug;
    if(message.message_type) newmessage.message_type = message.message_type;
    if(message.promotion) newmessage.promotion = message.promotion;
    if(message.parent_slug){
        Message.findOne({section_id: section_id, slug: message.parent_slug }, null, function(err, doc){
            if(doc){
                newmessage.slug = doc.slug + '/' + slug_part;
                newmessage.full_slug = doc.full_slug + '/' + full_slug_part;
                newmessage.level = doc.level + 1;
            }
            var message = new Message(newmessage);
            message.save(callback);         
        });        
    }else{
        var message = new Message(newmessage);
        message.save(callback);
    } 
}

function get_messages(episode_id, section_id, filter, skip, limit, callback){
    if(!callback) callback = function(err, result){console.log('get_messages',result);};
    
    if(!episode_id && !section_id){
        callback();
    }else{
        if(!filter) filter = {};
        if(episode_id) filter.episode_id = episode_id;
        if(section_id) filter.section_id = section_id;
        Message.find(filter)
                .skip(skip)
                .limit(limit)
                .sort({'full_slug':1})
                .exec(callback);
    }
}

function promote_message(episode_id, message_slug, section_id, stage, orig_stage, username, user_slug, callback){
    Message.findOne({slug: message_slug}, null, function(err, doc){
        if(doc){
            var new_item_slug = shortid.generate();
            var promotion = {
                username: username,
                user_slug: user_slug,
                promoted: moment().format(),
                item_slug: new_item_slug,
                message_slug: message_slug,
                stage: stage,
                section_id: doc.section_id,
                orig_stage: orig_stage
                
            };
            
            var new_item = {                
                slug: new_item_slug,
                stage: stage,
                username: username,
                user_slug: user_slug,
                title: 'From discussion',
                body: doc.message,
                promotion: promotion
            };
                        
            var orig_section_id = doc.section_id;
            var orig_item_slug = doc.item_slug;
            var orig_level = doc.level;
            var orig_parent_slug = doc.parent_slug;
            var orig_message_slug = doc.slug;
            var orig_full_slug = doc.full_slug;
            
            var new_message_slug = shortid.generate();
            
            var slugparts = doc.full_slug.split('/');
            slugparts.splice(0, orig_level);
            var first_slugparts = slugparts[0].split(':');
            first_slugparts[1] = new_message_slug;
            var new_full_slug = first_slugparts.join(':');
            var new_parent_slug = "";
            var new_level = 0;
            
            var new_message = {
                episode_id: episode_id,
                section_id: section_id,
                item_slug: new_item_slug,
                slug: new_message_slug,
                full_slug: new_full_slug,
                parent_slug: new_parent_slug,
                level: new_level,
                posted: doc.posted,
                username: doc.username,
                user_slug: doc.user_slug,
                message: doc.message,
                message_type: doc.message_type
            };
            var message = new Message(new_message);
            message.save()
            
            var wrapup = function(){
                add_item(episode_id, section_id, new_item, function(err, result){
                    callback(err, {
                        success: true,
                        orig_section_id: orig_section_id,
                        orig_item_slug: orig_item_slug,
                        item: result
                    });
                });
            };
            
            //set original message to readonly and mark the promotion
            doc.readonly = true;
            doc.promotion = promotion;
            doc.save();
            
            var filter = {
                level: {$gt: orig_level},
                section_id: orig_section_id,
                item_slug: orig_item_slug
            };
            
            Message.find(filter).exec(function(err, result){
                var new_sub_message = {};
                var new_slug = '';
                var full_slug = '';
                var parent_slug = '';
                var level = 0;
                if(result){
                    if(result.length === 0){
                        wrapup();
                    }else{
                        for(var i = 0; i < result.length; i++){
                            /* orig_item_slug substring van parent_slug */
                            if(result[i].parent_slug.indexOf(orig_message_slug) === 0){
                                new_slug = result[i].slug.replace(orig_message_slug, new_message.slug);
                                full_slug = result[i].full_slug.replace(orig_full_slug, new_message.full_slug);
                                parent_slug = result[i].parent_slug.replace(orig_message_slug, new_message.slug);
                                level = result[i].level - orig_level;
                                new_sub_message = {
                                    episode_id: episode_id,
                                    section_id: section_id,
                                    item_slug: new_item_slug,
                                    slug: new_slug,
                                    full_slug: full_slug,
                                    parent_slug: parent_slug,
                                    level: level,
                                    posted: result[i].posted,
                                    username: result[i].username,
                                    user_slug: result[i].user_slug,
                                    message: result[i].message,
                                    message_type: result[i].message_type
                                };

                                //create new message in target section
                                var sub_message = new Message(new_sub_message);

                                sub_message.save();
    //                            add_message(section_id, new_sub_message, (i === result.length -1)?wrapup:null);

                                //set original to readonly
                                result[i].readonly = true;
                                result[i].save();
                                //Message.findOneAndUpdate({slug: result[i].slug}, message_update, null);
                            }

                            console.log('promoting '+i+' of '+result.length, (i === result.length-1));
                            if(i === result.length-1){
                                wrapup();
                            }
                        }
                    }
                }else{
                    wrapup();
                }
            });
        }
    });
};

function add_item(episode_id, section_id, item, callback){
    if(!callback) callback = function(err, result){console.log('insert_item',result);};
    if(!item.slug) item.slug = shortid.generate();
    var created = moment().format();
    
    var new_item = {
            episode_id: episode_id,
            slug: item.slug,
            section_id: section_id,
            created: created,
            updated: created,
            title: '',
            body: '',
            group: {},
            annotate: '',
            username: item.username,
            user_slug: item.user_slug,
            labels: {},
            archive: false
        };
        
    if(item.title)  new_item.title = item.title;
    if(item.body)   new_item.body = item.body;
    if(item.group)  new_item.group = item.group;
    if(item.annotate)  new_item.annotate = item.annotate;
    if(item.comment)   new_item.comment = item.comment;
    if(item.fixed)  new_item.fixed = item.fixed;
    if(item.stage)  new_item.stage = item.stage;
    if(item.pos)    new_item.pos = item.pos;
    if(item.links)  new_item.links = item.links;
    if(item.labels) new_item.labels = item.labels;
    if(item.promotion) new_item.promotion = item.promotion;
    
    var item = new Item(new_item);
    item.save(callback);
}

function get_item(episode_id, item_slug, callback){
    if(!callback) callback = function(err, result){console.log('get_item',result);};
    var filter = {
        episode_id: episode_id,
        slug: item_slug
    };
    
    Item.findOne(filter, null, callback);
}

function get_items(episode_id, section_id, stage, callback){
    if(!callback) callback = function(err, result){console.log('get_items',result);};
    var filter = {archive: false};
    filter.episode_id = episode_id;
    if(section_id)  filter.section_id = section_id;
    if(stage)       filter.stage = stage;
    Item.find(filter)
        .sort({order: 1, updated: -1})
        .exec(callback);
}

function get_items_for_stage(episode_id, stage, callback){
    if(!callback) callback = function(err, result){console.log('get_items',result);};
    var filter = {archive: false};
    filter.episode_id = episode_id;
    if(stage) filter.stage = stage;
    Item.find(filter)
        .sort({updated: -1})
        .exec(callback);
}

function get_item_archive(episode_id, slug, callback){
    if(!callback) callback = function(err, result){console.log('get_item_archive',result);};
    var filter = {
        episode_id: episode_id,
        slug: slug
    };
    Item.find(filter)            
        .sort({updated: -1})
        .exec(callback);
}

function get_item_grouped(episode_id, item_id, callback){
    if(!callback) callback = function(err, result){console.log('get_item_grouped',result);};
    var filter = {
        archive: false,
        episode_id: episode_id
    };
    filter['group.'+item_id] = true;
    Item.find(filter)            
        .sort({updated: -1})
        .exec(callback);
}

function get_item_annotations(episode_id, item_id, callback){
    if(!callback) callback = function(err, result){console.log('get_item_annotations',result);};
    var filter = {
        archive: false,
        episode_id: episode_id,
        annotate: item_id
    };
    Item.find(filter)            
        .sort({updated: -1})
        .exec(callback);
}

function update_item_content(item_id, title, body, username, user_slug, callback){
    if(!callback) callback = function(err, result){console.log('update_item_content',result);};
    var updates = {
        username: username,
        user_slug: user_slug,
        title: title,
        body: body
    };
    update_item(item_id, updates, callback);
}

function update_item_group(item_id, group, username, user_slug, callback){
    if(!callback) callback = function(err, result){console.log('update_item_group',result);};
       
    var updates = {
        username: username,
        user_slug: user_slug,
        group: group
    };
    update_item(item_id, updates, callback);
}

function update_item_annotate(item_id, annotate, username, user_slug, callback){
    if(!callback) callback = function(err, result){console.log('update_item_annotate',result);};
    var updates = {
        username: username,
        user_slug: user_slug,
        annotate: annotate
    };
    update_item(item_id, updates, callback);
}

function update_item_label(item_id, label, tags, username, user_slug, callback){
    if(!callback) callback = function(err, result){console.log('update_item_label',result);};
    var updates = {
        username: username,
        user_slug: user_slug,
        labels: {}
    };
    updates.labels[label] = tags;
    update_item(item_id, updates, callback);
}

function update_item_pos(item_id, x, y, z, username, user_slug, callback){
    if(!callback) callback = function(err, result){console.log('update_item_pos',result);};
    var pos = {
        x: x,
        y: y,
        z: z
    };
    var updates = {
        username: username,
        user_slug: user_slug,
        pos: pos
    };
    update_item(item_id, updates, callback);
}

function update_item_links(item_id, username, user_slug, links, callback){
    if(!callback) callback = function(err, result){console.log('update_item_links',result);};
    var updates = {
        username: username,
        user_slug: user_slug,
        links: links        
    };
    update_item(item_id, updates, callback);
}

function update_item_section_id(item_id, section_id, stage, username, user_slug, callback){
    if(!callback) callback = function(err, result){console.log('update_item_section_id',result);};
    var updates = {
        section_id: section_id,
        stage: stage,
        username: username,
        user_slug: user_slug,
    };
    update_item(item_id, updates, callback);
}

function archive_item(item){
    item.archive = true;
    delete item._id;
    var item = new Item(item);
    item.save(function(err, results){
        console.log('archive_item', results);
    });
}

function update_item(item_id, updates, callback){
    if(!callback) callback = function(err, result){console.log('update_item',result);};
    
    //todo: check if there are indeed changes between current and updates
    
    Item.findById(item_id, function (err, item) {
        if (err) return handleError(err);
        var archive = item.toObject();           
        var changed = false;        
        var updated_item = {};
        
        if(updates.section_id && updates.section_id !== archive.section_id){
            changed = true;
            updated_item.section_id = updates.section_id;
            updated_item.stage = updates.stage;
            updated_item.promotion = {
                username: updates.username,
                user_slug: updates.user_slug,
                promoted: moment().format(),
                stage: updates.stage,
                section_id: updates.section_id,
                orig_stage: item.stage
            };
            if(item.labels && item.labels[item.stage]){
                updated_item.labels = item.labels;
                updated_item.labels[updates.stage] = item.labels[item.stage];
            }
        }
        if((updates.title || updates.title === '') && updates.title !== archive.title){
            changed = true;
            updated_item.title = updates.title;
        }        
        if((updates.body || updates.body === '') && updates.body !== archive.body){
            changed = true;
            updated_item.body = updates.body;
        }      
        if(updates.group){
            changed = true;
            updated_item.group = updates.group;
        }      
        if((updates.annotate || updates.annotate === '') && updates.annotate !== archive.annotate){
            changed = true;
            updated_item.annotate = updates.annotate;
        }
        if(updates.username && updates.username !== archive.username){
            changed = true;
            updated_item.username = updates.username;
        }
        if(updates.user_slug && updates.user_slug !== archive.user_slug){
            changed = true;
            updated_item.user_slug = updates.user_slug;
        }
        if(updates.pos && (updates.pos.x !== archive.pos.x
                       || updates.pos.y !== archive.pos.y
                       || updates.pos.z !== archive.pos.z)){
            changed = true;
            updated_item.pos = updates.pos;
        }
        if(updates.links){
            changed = true;
            updated_item.links = updates.links;
        }
        if(updates.promotion){
            changed = true;
            updated_item.promotion = updates.promotion;
        }
        if(updates.labels){
            changed = true;
            if(archive.labels){
                updated_item.labels = archive.labels;
                for (var label in updates.labels) { updated_item.labels[label] = updates.labels[label]; }
            }else{
                updated_item.labels = updates.labels;
            }
        }
        
        
        if(changed){
            updated_item.updated = moment().format();
            if(
                    updated_item.user_slug ||
                    moment(updated_item.updated).diff(moment(archive.archived), 'minutes', true) > 10
                ){
                archive.archived = updated_item.updated;
                archive_item(archive);
            }
            Item.findOneAndUpdate({_id: item_id}, updated_item, {'new': true}, callback);
        }
    });
}

function mark_deleted_item(item_id, deleted, callback){
    if(!callback) callback = function(err, result){console.log('mark_deleted_item',result);};
    if(item_id){
        Item.findOneAndUpdate({_id: item_id}, {deleted: deleted}, null, callback);
                
    }    
}

function delete_item(item_id, callback){
    if(!callback) callback = function(err, result){console.log('delete_item',err, result);};
    if(item_id){
        Item.findOne({_id: item_id}, null, function(err, result){
            files.delete_item_folder(result.slug);
            
            Item.find({_id: item_id}).remove().exec(function(err, result){
                Item.find({annotate: item_id}).remove().exec(callback);
            });
            
        });
        
                
    }
}

function duplicate_item(item_id, username, user_slug, callback){
    if(!callback) callback = function(err, result){console.log('duplicate_item', err, result);};
    if(item_id){
        Item.findOne({_id: item_id}, null, function(err, result){
            
            if(result && !result.fixed){
                var new_item = result.toObject();
                
                delete new_item._id;
                var created = moment().format();
                
                new_item.slug = shortid.generate();
                new_item.created = created;
                new_item.updated = created;
                new_item.group = {};
                new_item.annotate = '';
                new_item.comment = '';
                new_item.username = username;
                new_item.user_slug = user_slug;
                new_item.deleted = false;
                new_item.title = "[copy] "+new_item.title;
                
                delete new_item.promotion;
                delete new_item.archived;
                
                var item = new Item(new_item);
                item.save(callback);
            }
        });    
    }
}
