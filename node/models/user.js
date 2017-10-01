function make(Schema, mongoose, bcrypt) {
    SALT_WORK_FACTOR = 10;
    
    UserSchema = new Schema({
        slug: String,
        login: { type: String, required: true, index: { unique: true } },
        email: String,
        password: { type: String, required: true },
        username: { type: String, required: true },
        session: [
            {
                token: String,
                expire: { type: Number, default: 0 },
                socketid: String,
                last_login: Date
            }
        ],
        oauth2_sub: String,
        oauth2_token: String,
        oauth2_expire: { type: Number, default: 0 },
        admin: { type: Number, default: 0 },
        touch_episode: [
            {
                episode_slug: String,
                section_slug: String,
                item_slug: String,
                message_id: {type: Schema.Types.ObjectId, required: false}
            }
        ],
        created: Date,
        last_login: Date,
        socketid: String        
    });
    
    UserSchema.pre('save', function(next) {
        var user = this;

        // only hash the password if it has been modified (or is new)
        if (!user.isModified('password')) return next();

        // generate a salt
        bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
            if (err) return next(err);

            // hash the password along with our new salt
            bcrypt.hash(user.password, salt, function(err, hash) {
                if (err) return next(err);

                // override the cleartext password with the hashed one
                user.password = hash;
                next();
            });
        });
    });
    UserSchema.methods.login_user = function(testpassword, oauth2_token, socketid, newsocketid, logged, callback){
        if(!callback) callback = function(err, result){console.log('validate', err, result);};
        var doc = this;
        
        if(testpassword){
            bcrypt.compare(testpassword, this.password, function(err, isMatch) {
                console.log('validate args', testpassword, this.password, socketid, newsocketid, logged);
                if (err){
                    callback(err);
                }else{
                    doc.last_login = logged;
                    doc.socketid = newsocketid;
                    doc.save();
                    var result = {
                        success: isMatch,
                        user: doc
                    }
                    callback(null, result);
                }
            });
        }else if(oauth2_token){
            var success = false;
            var expired = false;
            var now = Math.round(new Date()/1000);
            var session = doc.session;
            for(var i =0; i < session.length; i++){
                if(session[i].token === oauth2_token){
                    if(now < session[i].expire ){
                        success = true;
                        session[i].socketid = newsocketid;
                        session[i].last_login = logged;
                    }else{
                        expired = true;
                    }
                }
            }
            
            if(success){
                doc.last_login = logged;
                //doc.socketid = newsocketid;
                doc.session = session;
                doc.markModified('session');
                doc.save();
            }
            
            var result = {
                success: success,
                expired: expired,
                user: doc
            };
            callback(null, result);
            
        }else{
            var success = false;
            
            if(doc.socketid === socketid ){
                doc.last_login = logged;
                doc.socketid = newsocketid;
                doc.save();
                success = true;
            }
            var result = {
                success: success,
                user: doc
            };
            callback(null, result);
        }
    };
    
    return mongoose.model('User', UserSchema);
}
module.exports.make = make;