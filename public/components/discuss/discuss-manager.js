angular.module('discuss.manager', [])
    .service('members', ['$q', 'socket', function($q, socket) {
        var members = [];
        var deferred = false;
        
        socket.on('users find', function(data){
            var members = [];
            if(data && data.members){
                members = data.members;
            }
            deferred.resolve(members);
        })
        
        this.load = function($query) {
          deferred = $q.defer();
          console.log("members.load", $query);
          socket.emit('users find', {query: $query});
          return deferred.promise;
        };
    }])
    
    .controller('ManagerController', ['members', 'socket', 'main', 'UserService', '$location', '$routeParams', '$scope', '$rootScope', 
                                    function(members, socket, main, UserService, $location, $routeParams, $scope, $rootScope){
        var _this = this;
        
        this.episode_slug = $routeParams.episode_slug;

        this.admin_level = main.get('admin_level');
        this.alerts = [];
        this.episodes = [];
        this.episode = false;
        this.episode_members = [];
        this.new_episode = false;
        this.new_episode_title = '';
        this.new_episode_mail_slug = '';
        this.new_episode_mail_slug_valid = false;
        this.new_episode_model = 'SPI';
//        this.epi_models = {
//            PI: 'Progressive Inquiry',
//            SPI: 'Simplified Progressive Inquiry',
//        };
        this.epi_models = {
            SPI: 'Progressive Inquiry',
        };
        this.new_episode_members = [];
        this.episode_alert = '';
        
        this.new_user_name = '';
        this.new_user_mail = '';
        this.new_user_password1 = '';
        this.new_user_password2 = '';
        this.new_user_password1_valid = false;
        this.new_user_password2_valid = false;
        this.user_alert = '';
        
        this.reset_confirm = '';

        
        this.init = function(){
             console.log('rootScope userlogin');
            _this.admin_level = main.get('admin_level');
            if(_this.admin_level >= 10){
                socket.emit('episodes init', {all:true});
            }else{
                //get all episodes where user is admin
                socket.emit('episodes init', {admin:true});
            }
        };
        if(UserService.loggedin()){
            this.init();
        }
        
        $rootScope.$on('userlogin', function(){
            _this.init();
        });

        socket.on('episodes init', function(data){
            _this.episodes = data.episodes;
            console.log('man epi init',data);
            if(_this.episode_slug){
                for(var i = 0; i < _this.episodes.length; i++){
                    if(_this.episode_slug === _this.episodes[i].slug){
                        _this.episode = _this.episodes[i];
                    }
                }
            }
        });
        
        this.close_edit_episode = function(){
            this.episode_slug = false;
            this.episode = false;
            this.episode_members = [];
            this.new_episode = false;
        }
        
        this.edit_episode = function(episode){
            this.episode_members = [];
            if(!episode){
                this.new_episode = true;
                this.episode_slug = false;
                this.episode = false;
            }else{
                this.new_episode = false;
                this.episode = episode;
                this.episode_slug = this.episode.slug;
                angular.forEach(this.episode.members, function(value, key){
                    _this.episode_members.push(value);
                });
            }
        };

        this.delete_episode = function(){
            if(this.admin_level >= 10 && this.episode){
                console.log(this.episode);
                socket.emit('episode delete', {episode_id: this.episode._id});
            }
        };
        socket.on('episode delete', function(data){
    //                _this.episode = false;
    //                
    //                for (var i = 0; i < _this.episodes.length; i++) {
    //                    if (!_this.episodes[i]._id 
    //                            ||  _this.episodes[i]._id === data.episode_id) {
    //                        delete _this.episodes[i];
    //                        break;
    //                    }
    //                }

            var newepisodes = [];
            for (var i = 0; i < _this.episodes.length; i++) {
                if (_this.episodes[i]._id !== data.episode_id) {
                    newepisodes.push(_this.episodes[i]);
                }
            }
            _this.episode = false;
            _this.episodes = newepisodes;

        });


        this.alert = function (type, msg){
            this.alerts.push({
                type: type,
                msg: msg
            });
        };

        this.close_alert = function(index){
            this.alerts.splice(index, 1);
        };
        
        this.save_episode = function(){
            var data = {
                episode: this.episode,
                members: this.episode_members
            };
            console.log('save_episode', data);
            socket.emit('episode update', data);
            this.episode_slug = false;
        };
        socket.on('episode update', function(data){
            console.log('episode update', data);
            if(data.success){
                _this.alert('success', 'Episode updated: '+data.episode.title);
                for (var i = _this.episodes.length-1; i >= 0; i--) {
                    if (_this.episodes[i]._id === data.episode._id) {
                        _this.episodes[i] = data.episode;
                        break;
                    }
                }
            }
        });
        
        this.add_episode = function(){
            this.new_episode_mail_slug = this.new_episode_mail_slug.toLowerCase();
            socket.emit('episode create', {
                title: this.new_episode_title,
                mail_slug: this.new_episode_mail_slug,
                model: this.new_episode_model,
                members: this.new_episode_members
            });
            this.admin_password = '';
            this.new_episode = false;
            this.new_episode_title = '';
            this.new_episode_mail_slug = '';
            this.new_episode_members = [];
        };
        
        socket.on('episode create', function(data){
            if(data.success){
                _this.alert('success', 'New episode created: '+data.title); 
                if(data.episode) _this.episodes.push(data.episode);
            }else{
                _this.new_episode = true;
                _this.new_episode_title = data.title;
                _this.new_episode_mail_slug = data.mail_slug;

                _this.alert('warning', data.msg); 
            }
        });
        
        this.add_user = function(){
            socket.emit('user add', {
                username: this.new_user_name,
                password: this.new_user_password1,
                email: this.new_user_mail
            });
            this.new_user_name = '';
            this.new_user_mail = '';
            this.new_user_password1 = '';
            this.new_user_password2 = '';
            this.new_user_password1_valid = false;
            this.new_user_password2_valid = false;
            this.user_alert = '';
        
        };
        socket.on('user add', function(data){
            if(data.success){
                _this.alert('success', 'New user added: '+data.user.username);
            }else{
                _this.alert('warning', 'New user creation failed'); 
            }
        });
        
        this.loadMembers = function($query){
            return members.load($query);
        };

        this.reset_all = function(){
            if(this.reset_confirm === "I am certain"){
                socket.emit('reset');
            }else{
                _this.alert('warning', 'Type: "I am certain", database not reset.'); 
            }
            this.reset_confirm = '';
        };
        socket.on('reset', function(data){
            if(data.success){
                _this.alert('success', 'The database has been reset.'); 
            }else{
                _this.alert('warning', 'Wrong credentials, database not reset.'); 
            }
        });

        this.validate_mail_slug = function(){
            this.new_episode_mail_slug = this.new_episode_mail_slug.toLowerCase();
            if(this.new_episode_mail_slug.length === 0){
                this.episode_alert = '';
                this.new_episode_mail_slug_valid = false;
            }else if(!/^([a-zA-Z0-9_.-]{5,})$/.test(this.new_episode_mail_slug)){
                this.episode_alert = "use minimal 5 letters, numbers, '.', '-' or '_'";
                this.new_episode_mail_slug_valid = false;
            }else if(this.new_episode_mail_slug.length < 5){
                this.episode_alert = _this.new_episode_mail_slug+'@confer.zone is too short';
                this.new_episode_mail_slug_valid = false;
            }else{
                socket.emit('validate mail slug', {mail_slug: this.new_episode_mail_slug});
            }
        };
        socket.on('validate mail slug', function(data){
            console.log('validate', data);
            if(data.success && data.mail_slug === _this.new_episode_mail_slug){
                _this.episode_alert = '';
                _this.new_episode_mail_slug_valid = true;
            }else if(!data.success){

                _this.episode_alert = _this.new_episode_mail_slug+'@confer.zone already in use';
                _this.new_episode_mail_slug_valid = false;
            }
        });
        
        this.checkMember = function(tag, newepisode){
            socket.emit('user find', {
                email: tag.email
            });            
            console.log('checkmember', tag);
        };
        
        socket.on('user find', function(data){
            console.log('user find', data);
            if(_this.episode_slug){
                for(var i = 0; i < _this.episode_members.length; i++){
                    if(_this.episode_members[i].email === data.email){
                        if(data.success === true){  
                            _this.episode_members[i].checked = true;
                            _this.episode_members[i].slug = data.user.slug;
                            _this.episode_members[i].username = data.user.username;
                            _this.episode_members[i].email = data.user.email;
                        }else{
                            _this.episode_members[i].checked = true;
                        }
                        break;
                    }
                }
            }else{
                for(var i = 0; i < _this.new_episode_members.length; i++){
                    if(_this.new_episode_members[i].email === data.email){
                        if(data.success === true){
                            _this.new_episode_members[i].checked = true;
                            _this.new_episode_members[i].slug = data.user.slug;
                            _this.new_episode_members[i].username = data.user.username;
                            _this.new_episode_members[i].email = data.user.email;
                        }else{
                            _this.new_episode_members[i].checked = true;
                        }
                        break;
                    }
                }
            }
        });
        
        this.toggleMemberAdmin = function(data, newepisode){
            console.log(data);
            if(!data.admin){
                data.admin = false;
            }else{
                data.admin = true;
            }
            if(newepisode){
                
            }else{
                
            }  
        };
        
        this.validate_mail = function(){
            
            if(this.new_user_mail.length === 0){
                this.user_alert = '';
                this.new_user_mail_valid = false;
            }else if(!/^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/.test(this.new_user_mail)){
                this.user_alert = "use a valid email address";
                this.new_user_mail_valid = false;
            }else{
                this.user_alert = '';
                this.new_user_mail_valid = true;
            }
        };
        
        this.validate_password = function(pwd1, pwd2){
            this.new_user_password1_valid = true;
            this.new_user_password2_valid = true;
            
            this.user_alert = "";
            if(!/(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}/.test(pwd1)){
                this.user_alert = "use at least 8 chars, 1 number, 1 uppercase, 1 lowercase.";
                this.new_user_password1_valid = false;
            }
            if(!this.new_user_password1_valid || pwd1 !== pwd2){
                this.new_user_password2_valid = false;
            }
            
        };
    }])

    .directive("discussManager", function (discuss_settings) {
        return {
            restrict: "E",
            templateUrl: discuss_settings.root + "manager.html",
            controller: 'ManagerController',
            controllerAs: 'ManCtrl'
        };
    })

;