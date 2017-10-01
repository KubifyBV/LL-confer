function make(Schema, mongoose) {
    EpisodeSchema = new Schema({
        title: String,
        slug: String,
        mail_slug: String,
        drop_slug: String,
        phases: Schema.Types.Mixed,
        members: Schema.Types.Mixed,
        touches: Schema.Types.Mixed,
        report: Schema.Types.Mixed,
        report_publish: Schema.Types.Mixed,
        created: Date
    });
    
    EpisodeSchema.methods.get_members = function(User, callback){
        var user_slugs = Object.keys(this.members);
        var active_user_slugs = [];
        for(var i = 0; i < user_slugs.length; i++){
            if(this.members[user_slugs[i]].active){
                active_user_slugs.push(user_slugs[i]);
            }
        }
             
        var filter = {"slug": {$in: active_user_slugs}}
        User.find(filter)
        .exec(callback);
        
    };
    
    EpisodeSchema.methods.add_member = function(User, user_slug, epi_admin, callback){
        console.log('epi add mem', user_slug, epi_admin);
        var doc = this;
        User.find({"slug": user_slug})
            .exec(function(err, results){
                for(var i = 0; i < results.length; i++){
                    if(!doc.members) doc.members = {};
                    doc.members[results[i].slug] = {
                        active: true,
                        slug: results[i].slug,
                        email: results[i].email,
                        username: results[i].username,
                        admin: epi_admin
                    };
                }
                doc.save(callback);
            });        
    };
    
    EpisodeSchema.methods.remove_member = function(user_slug, remove, callback){
        if(remove){
            delete this.members[user_slug];
        }else if(this.members[user_slug]){
            this.members[user_slug].active = false;
        }
        this.save(callback);
    };
    
    EpisodeSchema.methods.set_members = function(User, slugs, admin_slugs, callback){
        var doc = this;
        var filter = {};
        if(!slugs) slugs = [];
        if(!admin_slugs) admin_slugs = [];
        var all_slugs = slugs.concat(admin_slugs);
        if(all_slugs){
            filter = {
                'slug': {$in:all_slugs}
            }
        }
        var members = {};//(this.members)?this.members:{};

        User.find(filter)
            .exec(function(err, results){
                //if(!doc.members) doc.members = {};
                console.log('EpisodeSchema.methods.set_members', filter, slugs, admin_slugs, all_slugs, err, results);
                var admin = false;
                for(var i = 0; i < results.length; i++){
                    admin = (admin_slugs.indexOf(results[i].slug) >= 0)?true:false;
                    members[results[i].slug] = {
                        active: true,
                        slug: results[i].slug,
                        email: results[i].email,
                        username: results[i].username,
                        admin: admin
                    };
                }
                
                doc.members = members;
                doc.markModified('members');
                doc.save(callback);

            });
    };
    
    EpisodeSchema.methods.get_touches = function(user_slug, callback){
        if(!callback) callback = function(err, result){console.log('get_touches', err, result);};
        
        var touches = this.touches || {};
        var found_touches = {};
        
        if(!touches[user_slug]) touches[user_slug] = {};
        
        var found_touches = touches[user_slug];
        var result = {
            success: true,
            user_slug: user_slug,
            episode_slug: this.slug,
            touches: found_touches
        };
        callback(null, result);
    }
    
    EpisodeSchema.methods.set_touch = function(user_slug, section_id, item_slug, message_id, callback){
        if(!callback) callback = function(err, result){console.log('set_touch', err, result);};
        
        if(!message_id) callback({err: 'no message_id'}, null);
        if(!this.touches) this.touches = {};
        if(!this.touches[user_slug]) this.touches[user_slug] = {};
        
        var touch_key = false;
        if(!item_slug){
            touch_key = section_id;
        }else{
            touch_key = item_slug;
        }
        if(!this.touches[user_slug][touch_key]){
            this.touches[user_slug][touch_key] = {};
        }
        this.touches[user_slug][touch_key].message_id = message_id;
        
//        this.touches = touches;
        this.markModified('touches');
        this.save();
        
        var touch = {
            user_slug: user_slug,
            episode_slug: this.slug,
            section_id: section_id,
            item_slug: item_slug,
            message_id: message_id
        };
        
        var result = {
            success: true,
            touch: touch,
        };
        callback(null, result);
    };
    
    return mongoose.model('Episode', EpisodeSchema);
}
module.exports.make = make;