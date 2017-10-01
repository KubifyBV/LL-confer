'use strict';

angular.module('discuss', [
        'discuss.api', 
        'discuss.user', 
        'discuss.manager',
        'discuss.export',
        'discuss.tools',
        'monospaced.elastic', 
        'truncate', 
        'ngStorage', 
        'angular-tour',
        'luegg.directives',
        'ngTagsInput'
    ])

    .value('discuss_settings', {
        root: 'components/discuss/'
    })

    .service('main', function ($localStorage, $rootScope, $filter) {
        var short = {};
        var def = {
            username: '',
            loginname: '',
            admin_level: 0,
            user_slug: '',
            socketid: false,
            episode_id: false,
            episode: false,
            section_id: false,
            section: false,
            stage: false,
            group_stage: '',
            annotate_stage: '',
            sections: [],
            episode_items: false,
            episode_deleted_items: false,
            episode_messages: false,
            new_message_counts: {},
            latest_message_ids: {}
        };

        $localStorage.$default(def);

        return {
            clear: function(){
                $localStorage.$reset(def);
            },
            get: function (id, sub) {
                if(sub){
                    if($localStorage[id] && $localStorage[id][sub]){
                        return $localStorage[id][sub];
                    }else{
                        return null;
                    }
                }else{
                    return $localStorage[id];
                }
            },
            set: function (id, value, broadcast) {
                $localStorage[id] = value;
                if(broadcast){
                    $rootScope.$emit('main:'+id, value);
                }
            },
            get_short: function(id){
                return short[id];
            },
            set_short: function(id, value){
                short[id] = value;
            },
            log: function (label){
                console.log('main log :'+label, angular.copy($localStorage));
            },
            getSectionbyId: function(id){
                var sections = $localStorage['sections'];
                return $filter('filter')(sections, {_id:id})[0];
            },
            getSectionbyStage: function(stage){
                var sections = $localStorage['sections'];
                return $filter('filter')(sections, {stage:stage})[0];
            },
            getSectionbySlug: function(slug){
                var sections = $localStorage['sections'];
                return $filter('filter')(sections, {slug:slug})[0];
            }
        };
    })
    
    .filter('orderObjectBy', function() {
        return function(items, field, reverse) {
            var filtered = [];
            angular.forEach(items, function(item) {
                filtered.push(item);
            });
            filtered.sort(function (a, b) {
                return (a[field] > b[field] ? 1 : -1);
            });
            if(reverse) filtered.reverse();
            return filtered;
        };
    })
        
    .controller('EpisodeController', ['socket', 'main', 'UserService', '$scope', '$rootScope', '$filter', function (socket, main, UserService, $scope, $rootScope, $filter){
        this.episode_id = main.get('episode_id');
        this.section_id = main.get('section_id');
        this.episodes = [];
        this.sections = main.get('sections');
        this.episode = main.get('episode');
        this.section = main.get('section');
        this.stage = main.get('stage');
        this.group_stage = main.get('group_stage');
        this.annotate_stage = main.get('annotate_stage');

        this.username = main.get('username');
        this.user_slug = main.get('user_slug');
        this.socketid = main.get('socketid');
        this.loginname = main.get('loginname');
        this.admin_level = main.get('admin_level');
        this.password = '';
        
        this.online = {};
        this.episode_items = main.get('episode_items');
        this.episode_deleted_items = main.get('episode_deleted_items');
        this.episode_messages = main.get('episode_messages');
        var _this = this;
        
        this.export = false;
        this.report = [];
        
        this.copyReport = function(id){
            
            var report_element = $('#'+id).clone();
            
            //remove all hidden elements
            report_element.find('.ng-hide').remove();
            //get rid of ng-binding and ng-scope classes
            report_element.find('.ng-binding').removeClass('ng-binding');
            report_element.find('.ng-scope').removeClass('ng-scope');
            
            
            
            //extract html
            var report = report_element.html();
            
            //get rid of comments
            report = report.replace(/<!--[\s\S]*?-->/g, "");
            //get rid of empty class attributes
            report = report.replace(/class=\"\"/g, "");
            //get rid of angluar attributes ng-xxx="yyy" or ng-xxx='yyy'
            report = report.replace(/ng-\w+=\"[^\"]+\"+/g, "");
            
            
            console.log('copyReport', report);
        };
        
        this.publish_report = false;
        this.toggleExport = function(){
            if(!this.export){
                if(this.episode.report_publish && this.episode.report_publish.length > 0){
                    this.report = angular.copy(this.episode.report_publish);
                    this.publish_report = true;
                }else{
                    this.report = angular.copy(this.episode.report);
                    this.publish_report = false;
                }
                this.export = true;
            }else{
                this.export = false;
                this.report = [];
            }
        };
        
        this.report_publish = function(){
            if(this.export){
                if(this.publish_report){
                    socket.emit('episode report publish', {
                        episode_id : this.episode_id,
                        report_publish: angular.copy(this.report)
                    });
                }else{
                    socket.emit('episode report publish', {
                        episode_id : this.episode_id,
                        report_publish: []
                    });
                }
            }
        };
        
        socket.on('episode report publish', function(data){
            if(data.episode_id === _this.episode_id){
                _this.episode.report_publish = data.report_publish;
            }
        });
        
        $scope.$on('$destroy', function (event) {
            socket.init();
        });

        this.to_main = function(){
            main.set('episode_id', this.episode_id);
            main.set('section_id', this.section_id);
            main.set('sections', this.sections);
            main.set('episode_items', this.episode_items);
            main.set('episode_deleted_items', this.episode_deleted_items);
            main.set('episode_messages', this.episode_messages);
            main.set('episode', this.episode);
            main.set('section', this.section);
            main.set('stage', this.stage);
            main.set('group_stage', this.group_stage);
            main.set('annotate_stage', this.annotate_stage);
            main.set('username', this.username);
            main.set('user_slug', this.user_slug);
            main.set('loginname', this.loginname);
            main.set('socketid', this.socketid);
            main.set('admin_level', this.admin_level);
        };
        
        this.getPhase = function(field, def, stage){
            var phase = {};
            if(!def) def = null;
            if(stage){
                phase = this.episode.phases[this.getSectionbyStage(stage).phase];
            }else if(this.section_id && this.episode.phases[this.section.phase]){
                phase = this.episode.phases[this.section.phase];
            }
            if(stage == 'brainstorm'){
                console.log('getPhase', field, def, stage, phase);
            }
            if(field){
                if(phase[field]){
                    return phase[field];
                }
                return def;
            }else{
                return phase;
            }
        };
        
        this.getPhaseClass = function(def, stage, test){
            if(test) console.log('getPhaseClass', def, stage);
            return this.getPhase('class', def, stage);
        };
        
        this.firstSectionPhase = function(phase){
            for(var i=0; i<this.sections.length; i++){
                if(this.sections[i].phase === phase){
                    return this.sections[i].stage;
                }
            }
        };
        
        this.filterPhase = function(value, index, array){
            if(_this.section && _this.section.phase && value.phase == _this.section.phase) return true;
            if(_this.section && _this.section.stage == value.stage) return true;
            //if(value.phase && value.phase.length > 0) return true;
            return false;
        };
        
        this.getSection = function(stage){
            return main.getSectionbyStage(stage);
        };

        this.clear = function(episode_only){            
            _this.episode_id = false;
            _this.section_id = false;
            _this.sections = [];
            _this.episode_items = false;
            _this.episode_deleted_items = false;
            _this.episode_messages = false;
            _this.episode = false;
            _this.section = false;
            _this.stage = false;
            _this.group_stage = '';;
            _this.annotate_stage = '';
            if(!episode_only){
                _this.username = '';
                _this.user_slug = '';
                _this.socketid = '';
                _this.loginname = '';
                _this.password = '';
                _this.admin_level = 0;
            }
            _this.to_main();
        };
        
        $rootScope.$on('episode:close', function(){
            _this.clear(true);
        });
        
        this.count = function(obj){
            if(!obj || !Object.keys(obj)) return 0;
            return Object.keys(obj).length;
        };
        
        this.loadUser = function(){
            var user = UserService.getuser();
            console.log('loadUser', user);
            
            if(user && user.success){

                this.socketid = user.socketid;
                this.user_slug = user.user_slug;
                this.username = user.username;
                this.admin_level = user.admin_level;
                
                this.to_main();
                
                socket.emit('episodes init', {all:true});
                this.set_section();
            }else{
                this.clear();

            }  
            
        };
        
        this.login_user = function () {

            var user = {
                login: this.loginname,
                password: this.password,
                episode_id: this.episode_id
            };
            socket.emit('login episode', user);
        };

        this.login_user_episode = function(episode){
            console.log('login_user_episode', episode);
            if(!UserService.loggedin()) return false;
            
//            if(!this.loginname) return false;
            console.log('login_user_episode', 'logged in');
            if(episode) this.episode = episode;
            if(!this.episode){
                this.episode_id = false;
            }else{           
                this.episode_id = this.episode._id;
            }
            
            if(!this.episode_id || this.episode_id !== main.get('episode_id')){
                this.section_id = false;
                this.section = false;
                this.sections = [];
                this.stage = '';
            }

            this.to_main();
            
            var user = {
                login: this.loginname,
                password: this.password,
                username: this.username,
                user_slug: this.user_slug,
                socketid: this.socketid,
                episode_id: this.episode_id
            };
            socket.emit('login episode', user);
            
            if(!this.sections.length && this.episode_id){
                socket.emit('sections get', {
                    episode_id: this.episode_id
                });
            }
            
            if(!this.episode_items && this.episode_id){
                socket.emit('items init', {
                    action: 'episode items init',
                    episode_id: this.episode_id
                });
            }
            console.log('check messages init', this.episode_messages, this.episode_id);
            if(!this.episode_messages && this.episode_id){
                socket.emit('messages init', {
                    action: 'episode messages init',
                    episode_id: this.episode_id
                });
            }
            
        };

        this.set_section = function(stage){
            this.export = false;
            if(stage === 'info'){
                this.section = false;
                this.section_id = false;
                this.stage = stage;
                this.group_stage = '';
                this.annotate_stage = '';

                this.to_main();
                $rootScope.$emit('main:section', false);
            
            }else{

                if(stage){
                    this.stage = stage;
                    this.section = main.getSectionbyStage(stage);
                    this.section_id = this.section._id;
                    this.group_stage = this.section.settings.items.group_for_stage;
                    this.annotate_stage = this.section.settings.items.annotate_for_stage;

                    this.to_main();
                    $rootScope.$emit('main:section', this.section);
                }
                
                
//                console.log('set_section', stage, this.stage);
//                if(stage) this.stage = stage;
//
//                if(this.stage && this.episode_id){
//                    socket.emit('section get', {
//                        action: 'section set',
//                        episode_id: this.episode_id,
//                        stage: this.stage
//                    });
//                }   
            }
        };
        
        this.getSectionbyStage = function(stage){
            return $filter('filter')(this.sections, {stage:stage})[0];
        };
        
        this.getSectionbySlug = function(slug){
            return $filter('filter')(this.sections, {slug:slug})[0];
        };

        //INIT
        if(!this.episodes || !this.episodes.length){
            socket.emit('episodes init');
        }
        $rootScope.$on('userlogin', function(){
            if(!_this.episodes || !_this.episodes.length){
                socket.emit('episodes init');
            }
            _this.loadUser();
            _this.login_user_episode();
        });
        
        socket.on('episodes init', function(data){
            _this.episodes = data.episodes;
            if(_this.episode_id){
                for (var i = _this.episodes.length-1; i >= 0; i--) {
                    if (_this.episodes[i]._id === _this.episode_id) {
                        _this.episode = _this.episodes[i];
                        break;
                    }
                }
            }
        });
        
        socket.on('episode updated', function(data){
            var found = false;
            if(data.episode && _this.episodes){
                for (var i = _this.episodes.length-1; i >= 0; i--) {
                    if (_this.episodes[i]._id === data.episode._id) {
                        _this.episodes[i] = data.episode;
                        found = true;
                        break;
                    }
                }
                if(!found){
                    _this.episodes.push(data.episode);
                }else if(_this.episode._id === data.episode._id){
                    _this.episode = data.episode;
                    _this.update_users();
                }
            }
        });
               
        this.update_users = function(){
            socket.emit('users init');
        };
        //set responses


        socket.on('login', function (data) {
            
            if(data.success){
                _this.username = data.username;
                _this.user_slug = data.user_slug;
                _this.socketid = data.socketid;
                _this.to_main();
                
                socket.emit('episodes init', {all:true});
                _this.set_section();
            }else{
                _this.clear();

            }   

        });
        
        socket.on('sections get', function(data){
            _this.sections = data.sections;
            _this.to_main();
        });
        
        socket.on('episode items init', function(data){
            console.log('on episode items init', data);
            var new_items = {};
            var deleted_items = {};
            if(data.items && data.items.length){
                var item = false;
                for(var i = 0; i < data.items.length; i++){
                    item = data.items[i];
                    if(item.deleted){
                        if(!deleted_items[item.stage]) deleted_items[item.stage] = {};
                        deleted_items[item.stage][item._id] = item;
                    }else{
                        if(!new_items[item.stage]) new_items[item.stage] = {};
                        new_items[item.stage][item._id] = item;
                    }
                }
            }
            _this.episode_deleted_items = deleted_items;
            main.set('episode_deleted_items', _this.episode_deleted_items, true);
            _this.episode_items = new_items;
            main.set('episode_items', _this.episode_items, true);
        });
        
        socket.on('episode messages init', function(data){
            var messages = {};
            
            var message = false;
            var subject_key = false;
            
            console.log('episode messages init', data);
            
            for(var i = 0; i < data.messages.length; i++){
                message = data.messages[i];
                
                if(!message.item_slug || message.item_slug === '_root'){
                    subject_key = message.section_id;
                }else{
                    subject_key = message.item_slug;
                }
                
                if(!messages[subject_key]){
                    messages[subject_key] = [];
                }
                
                messages[subject_key].push(message);
            }
            
            
            if(data.item_slug){
                _this.episode_messages[data.item_slug] = messages[data.item_slug];
            }else if(data.section_id){
                _this.episode_messages[data.section_id] = messages[data.section_id];
            }else{
                _this.episode_messages = messages;
            }
            
            main.set('episode_messages', _this.episode_messages, true);
        });


        socket.on('episode delete', function(data){
            if(_this.episode_id === data.episode_id){
                _this.clear();
            }
            for (var i = _this.episodes.length-1; i >= 0; i--) {
                if (_this.episodes[i]._id === data.episode_id) {
                    delete _this.episodes[i];
                    break;
                }
            }
        });

        this.update_online = function(roomusers){
            var online = {};
                
            if(roomusers){
                var ids = Object.keys(roomusers);
                for(var i = 0; i < ids.length; i++){
                    online[roomusers[ids[i]].user_slug] = true;
                }
                
            }
            this.online = online;
            console.log('update_online', online);
        };

        socket.on('users init', function (data) {
            _this.update_online(data.users);
        });

        socket.on('user joined', function (data) {
            console.log('api user joined', data);
            _this.update_online(data.users);
        });
        socket.on('user left', function (data) {
            console.log('api user left', data);
            _this.update_online(data.users);
        });

//        socket.on('section set', function(data){
//            _this.section = data.section;
//            _this.episode_id = data.section.episode_id;
//            _this.section_id = data.section._id;
//            _this.group_stage = _this.section.settings.items.group_for_stage;
//            _this.annotate_stage = _this.section.settings.items.annotate_for_stage;
//
//            _this.to_main();
//            $rootScope.$emit('main:section', data.section);
//           
//        });
        socket.on('join episode', function(data){console.log(data)});
        socket.on('section get annotate', function(data){
            if(data.section.settings.items.group_for_stage
                && data.section.settings.items.group_for_stage !== ''){

                _this.group_stage = data.section.settings.items.group_for_stage;
                _this.to_main();

                socket.emit('items get for group_stage', {
                    episode_id: _this.episode_id,
                    stage: _this.group_stage
                });
            }
        });
    }])

    .controller('SectionController', ['socket', 'main', function (socket, main) {



    }])

    .controller('MessageController', ['socket', 'main', 'UserService', '$rootScope', '$filter', function (socket, main, UserService, $rootScope, $filter) {
        this.episode_messages = main.get('episode_messages');
        this.messageboard = [];
        
        this.glued = true;
        this.newMessage = {
            msg: '',
            open: false,
            message: false
        };
        this.newMessagetype = 'chat';
        this.touches = {};
        this.new_message_counts = {};
        this.latest_message_ids = {};
        this.open_item_slug = '';
        this.current_last_message_id = false;
        this.selectedMessage = false;
        
        var _this = this;
        this.messagetypes = {
            suggestion: { order: 1, label: 'suggestion', title: 'I would like to make a suggestion', icon: 'lightbulb-o'},
            question:   { order: 2, label: 'question',   title: 'I would like to pose a question',   icon: 'question'},
            remark:     { order: 3, label: 'remark',     title: 'I would like to make a remark',     icon: 'exclamation'},
            addition:   { order: 4, label: 'addition',   title: 'I would like ot make an addition',  icon: 'plus'},
            summary:    { order: 5, label: 'summary',    title: 'I have made a summary',             icon: 'list'},
            chat:       { order: 6, label: 'chat',       title: '',                                  icon: 'comment'}
        };
        

        this.fixMessage = function(message){
            if(message.level > 0){
                var slug = message.slug;
                var slugparts = slug.split('/');
                slugparts.pop();
                message.parent_slug = slugparts.join(':');
            }else{
                message.parent_slug = '';
            }
            return message;
        };
        
        this.init = function(){
            _this.newMessage = {};
        };

        this.countMessages = function(){
            var counts = {};
            var lastmessages = {};
            var episode = main.get('episode');
            var user_slug = main.get('user_slug');
            this.touches = (episode.touches)?episode.touches[user_slug]:{};
            
            console.log('count start', this.touches, this.episode_messages);
            angular.forEach(this.episode_messages, function(value, key) {
                console.log('count', key, value.length);
                if(!counts[key]) counts[key] = 0;
                for(var j = 0; j < value.length; j++){
                    if(!lastmessages[key] 
                        || lastmessages[key] < value[j]._id){
                        lastmessages[key] = value[j]._id;
                    }
                    console.log('count lastmessages', lastmessages[key], value[j]._id);
                    if(_this.touches && _this.touches[key]  && _this.touches[key].message_id ){
                        if(_this.touches[key].message_id < value[j]._id){
                            
                            counts[key]++;
                        }
                        console.log('count count', _this.touches[key].message_id < value[j]._id, counts[key]);
                            
                    }else{
                        console.log('count count', _this.touches[key], counts[key]);
                        
                        counts[key]++;
                    }
                }
            });
            
            this.latest_message_ids = lastmessages;
            this.new_message_counts = counts;
            console.log('message_count', counts, lastmessages, this.touches);
            main.set('latest_message_ids', this.latest_message_ids, true);
            main.set('new_message_counts', this.new_message_counts, true);
        };
        
        this.touchMessage = function(message_id, section_id, item_slug){
            var episode = main.get('episode');
            var user_slug = main.get('user_slug');
            console.log('touchMessage', message_id, section_id, item_slug, episode);
            if(episode.slug && section_id && message_id){

                var touch = {
                    episode_slug: episode.slug, 
                    section_id: section_id, 
                    item_slug: item_slug, 
                    message_id: message_id
                };

                //send to db
                socket.emit('user touch episode', touch);

                var touch_key = (touch.item_slug)?touch.item_slug:touch.section_id;
                if(!this.touches[touch_key]) this.touches[touch_key] = {};
                this.touches[touch_key].message_id = touch.message_id;
                
                console.log('touchMessage 2', main.get('episode').touches, episode.touches);
                if(!episode.touches) episode.touches = {};
                episode.touches[user_slug] = this.touches;
                
                console.log('touchMessage 2', main.get('episode').touches, episode.touches);
                this.new_message_counts[touch_key] = 0;
                this.latest_message_ids[touch_key] = touch.message_id;

                main.set('latest_message_ids', _this.latest_message_ids, true);
                main.set('new_message_counts', _this.new_message_counts, true);
            }

        };

        this.setMessageHistory = function (message, parent) {
            if (typeof parent.$parent.message === 'undefined') {
                message.ids = [];
            } else {
                message.ids = angular.copy(parent.$parent.message.ids) || [];
            }
            message.ids.push(message.messageid);
        };

        socket.on('message add', function (data) {
            var episode = main.get('episode');
            var section = main.get('section');
            var user_slug = main.get('user_slug');
            
            if(user_slug === data.message.user_slug){
                data.message.touch = true;
            }
            console.log('message add', data.message, episode._id, section._id, _this.open_item_slug, data.message.item_slug);
            var message_key = (data.message.item_slug)?data.message.item_slug:data.message.section_id;
            if(!_this.episode_messages){
                _this.episode_messages = {};
            } 
            if(!_this.episode_messages[message_key]){
                _this.episode_messages[message_key] = [];
            }
            
            
            _this.episode_messages[message_key].push(data.message);  
            main.set('episode_messages', _this.episode_messages);
            
            if(data.message.item_slug && _this.open_item_slug === data.message.item_slug){
                _this.touchMessage(data.message._id, data.message.section_id, data.message.item_slug);
            }else if(_this.open_item_slug === '_root' && data.message.section_id === section._id){
                _this.touchMessage(data.message._id, data.message.section_id, null);
            }else{
                _this.new_message_counts[message_key] = (_this.new_message_counts[message_key])?_this.new_message_counts[message_key]+1: 1;
                _this.latest_message_ids[message_key] = data.message._id;
                main.set('latest_message_ids', _this.latest_message_ids, true);
                main.set('new_message_counts', _this.new_message_counts, true);
            }
        });

        this.promoteSectionList = function(){
            var sections = main.get('sections');
            var section = main.get('section');
            var result = [];
            if(!section.settings || !section.settings.discussion) return result;
            var stages = section.settings.discussion.promote_to_stage;
            
            if(stages){
                for(var i = 0; i < sections.length; i++){
                    if(stages.indexOf(sections[i].stage) >= 0 ){
                        result.push(sections[i]);
                    }
                }
            }
            return result;
        };
        
        
        this.promoteMessage = function (section){
            if(!this.selectedMessage) return false;
            console.log('promote to section', this.selectedMessage, section);
            var orig_stage = main.get('stage');
            var data = {
                episode_id: section.episode_id,
                message_slug: this.selectedMessage.slug,
                section_id: section._id, 
                stage: section.stage,
                orig_stage: orig_stage
            };
            socket.emit('message promote', data);
            this.selectedMessage = false;
        };
        
        socket.on('message promote', function(result){
            console.log('message promote', result);
            if(result.success){
                var episode_id = main.get('episode_id');
                
                //reload only related messages
                socket.emit('messages init', {
                    action: 'episode messages init',
                    episode_id: episode_id,
                    section_id: result.orig_section_id,
                    item_slug: result.orig_item_slug
                });
            }else{
                //failed
            }
        });

        this.clickMessage = function(message){
            message.touch = true;
            if(message.readonly) return false;
            if(this.selectedMessage.slug === message.slug){
                this.selectedMessage = false;
            }else{
                this.selectedMessage = message;
            }
        };
        
        this.openNewMessage = function(item_slug, message){
            this.newMessage.msg = '';
            this.newMessage.open = true;
            this.newMessage.message = message;
            this.newMessage.item_slug = item_slug;
        };
        
        this.sendMessage = function (message_type) {
            var data = {};
            var item_slug = this.newMessage.item_slug;
            var message = this.newMessage.message;
            
            if(!this.newMessage.msg) return false;
            data.message = this.newMessage.msg;
            
            if(message){
                data.parent_slug = message.slug;
            }else{
                data.parent_slug = '';
                this.glued = true;
            }
            if(item_slug) data.item_slug = item_slug;
            data.episode_id = main.get('episode_id');
            data.section_id = main.get('section_id');
            data.message_type = message_type;

            socket.emit('message add', data);
            
            this.newMessage = {};
            
        };

        this.messageFilter = function(level, slug){
            if(!level) level = 0;
            if(slug){
                return {level: level, item_slug: slug};
            }else{
                return {level: level, item_slug: '!'};
            }
        };
        
        //
        // event handler: main:episode_messages
        // occurs when episode_messages is updated in main
        //
        $rootScope.$on('main:episode_messages', function(event, data){
            console.log('main:episode_messages', _this.episode_messages, main.get('episode_messages'));
                        
            _this.episode_messages = main.get('episode_messages');
            _this.init();
            var episode = main.get('episode');
            var user_slug = main.get('user_slug');
            _this.touches = (episode.touches)?episode.touches[user_slug]:{};
            _this.countMessages();
        });
        
        //
        // event handler: open messages
        // occurs when message area is opened
        //
        $rootScope.$on('open messages', function(event, data){
            _this.selectedMessage = false;
            
            var message_key = false;
            if(data.item_slug){
                _this.open_item_slug = data.item_slug;
                message_key = data.item_slug;
                
            }else{
                _this.open_item_slug = '_root';
                message_key = data.section_id;
            }
            console.log('open messages', message_key, _this.touches);
            _this.current_last_message_id = (_this.touches[message_key] && _this.touches[message_key].message_id)? angular.copy(_this.touches[message_key].message_id):false;
            
            if(_this.latest_message_ids[message_key]){
                _this.touchMessage(_this.latest_message_ids[message_key], data.section_id, data.item_slug);
            }
            
            _this.new_message_counts[message_key] = 0;
            main.set('new_message_counts', _this.new_message_counts, true);
        });
        
        
        //
        // event handler: close messages
        // occurs when message area is closed
        //
        $rootScope.$on('close messages', function(event, data){
            _this.open_item_slug = '';
            _this.selectedMessage = false;
        });
        
        
    }])

    .controller('CollabController', ['socket', 'main', 'focus', 'UserService', '$filter', '$sce', '$modal', '$timeout', '$window', '$rootScope', function (socket, main, focus, UserService, $filter, $sce, $modal, $timeout, $window, $rootScope){
        this.episode_items = main.get('episode_items');
        this.episode_deleted_items = main.get('episode_deleted_items');
        
        this.section = main.get('section');
        this.stage = this.section.stage;

        this.items = {};
        this.group_items = {};      //items from group_for_stage
        this.annotate_items = {};   //items from annotate_for_stage
        this.comment_items = {};    //items from comment_for_stage
        
        
//        this.items = {};            //items for this stage
        this.tags = {};
        this.filter_tag = [];
        this.not_tagged = 0;
        this.tag_all_empty = true;
        
        this.item_order = [];       //order of items for sorting
        this.archive = {};
        this.show_archive = {};
        this.diff_left = {};
        this.diff_right = {};
        this.diff = {};
        this.maxz = 0;
        this.showEpisode = false;
        this.showMessages = false;
        this.showUsers = false;
        this.showItem = false;
        this.showItem_slug = false;
        this.showTrash = false;
        
        this.new_message_counts = main.get('new_message_counts');
        this.latest_message_ids = main.get('latest_message_ids');
        
        var _this = this;

        this.clear = function(){
            this.episode_items = false;
            this.items = {};
            this.tags = {};
            this.filter_tag = [];
            this.group_items = {};
            this.annotate_items = {};
            this.showItem = false;
            this.showItem_slug = false;
            this.showMessages = false;
        };
        
        $rootScope.$on('episode:close', function(){
            _this.clear();
        });
        
        this.init = function(){
            this.section = main.get('section');
            this.stage = this.section.stage;
            this.showTrash = false;
            console.log('init', this.episode_items, this.section, this.section.settings)
            if(this.episode_items && this.section && this.section.settings){
                if(!this.episode_items[this.stage]) this.episode_items[this.stage] = {};
                this.items = this.episode_items[this.stage];
                this.tag_tabs();
                if(this.section.settings.items.group_for_stage){
                    this.group_items = this.episode_items[this.section.settings.items.group_for_stage];
                }
                if(this.section.settings.items.annotate_for_stage){
                    this.annotate_items = this.episode_items[this.section.settings.items.annotate_for_stage];
                }
                if(this.section.settings.items.comment_for_stage){
                    this.comment_items = this.episode_items[this.section.settings.items.comment_for_stage];
                }
            }else{
                this.items = {};
                this.tags = {};
                this.filter_tag = [];
                this.group_items = {};
                this.annotate_items = {};
            }
        }
        
        
        
        
        
        this.first = function(obj) {
            for (var a in obj) return a;
        };
        
        $rootScope.$on('main:new_message_counts', function(event, data){
            _this.new_message_counts = data;
        });
        
        $rootScope.$on('main:latest_message_ids', function(event, data){
            _this.latest_message_ids = data;
        });
        
        $rootScope.$on('main:episode_items', function(event, data){
            _this.episode_items = main.get('episode_items');
            console.log('main:episode_items', data, _this.episode_items);
            _this.init();
        });
        
        $rootScope.$on('main:episode_deleted_items', function(event, data){
            _this.episode_deleted_items = main.get('episode_deleted_items');
        });
        
        $rootScope.$on('main:section', function(event, data){
            _this.init();
        });
        
        this.tag_tabs = function(item_out, item_in){
            var section = main.get('section');
            var stage = main.get('stage');
            if(!section || !section.settings) return false;
            if(section.settings.items.tagging){

                var tmp_tag = '';
                var tmp_cnt = 0;
                
                if(!item_in && !item_out){
                    _this.tags = {};
                    var ids = Object.keys(_this.items);
                    for (var i = 0; i < ids.length; i++) {
                        if(_this.items[ids[i]].labels && _this.items[ids[i]].labels[stage]){
                            tmp_cnt = _this.items[ids[i]].labels[stage].length;
                            for(var j = 0; j < tmp_cnt; j++){
                                tmp_tag = _this.items[ids[i]].labels[stage][j].text;
                                if(!_this.tags[tmp_tag]) _this.tags[tmp_tag] = [];
                                
                                pos = _this.tags[tmp_tag].indexOf(_this.items[ids[i]]._id);
                                if(pos === -1) _this.tags[tmp_tag].push(_this.items[ids[i]]._id);
                            }
                        }
                    }
                }else{
                    var pos = -1;
                    if(item_out){
                        if(item_out.labels && item_out.labels[stage]){
                            tmp_cnt = item_out.labels[stage].length;
                            for(var i = 0; i < tmp_cnt; i++){
                                tmp_tag = item_out.labels[stage][i].text;
                                if(!_this.tags[tmp_tag]) _this.tags[tmp_tag] = [];
                                pos = _this.tags[tmp_tag].indexOf(item_out._id);
                                if(pos !== -1) _this.tags[tmp_tag].splice(pos, 1);
                            }
                        }
                    }
                    if(item_in){
                        if(item_in.labels && item_in.labels[stage]){
                            tmp_cnt = item_in.labels[stage].length;
                            for(var i = 0; i < tmp_cnt; i++){
                                tmp_tag = item_in.labels[stage][i].text;
                                if(!_this.tags[tmp_tag]) _this.tags[tmp_tag] = [];
                                pos = _this.tags[tmp_tag].indexOf(item_in._id);
                                if(pos === -1) _this.tags[tmp_tag].push(item_in._id);
                            }
                        }
                    }
                }
            }
            
        };
        
        this.toggleFilterTag = function(tag){
            if(tag === false){
                this.tag_all_empty = false;
                this.filter_tag = {};
            }else if(!tag){
                this.tag_all_empty = true;
                this.filter_tag = {};
            }else if(this.filter_tag[tag]){
                delete this.filter_tag[tag];
            }else{
                this.filter_tag[tag] = true
            }
        };
        
        this.sectionbar_closeall = function(){
            this.toggleItemMessages();
            this.showEpisode = false;
            this.showMessages = false;
            this.showUsers = false;
        };
        
        this.toggleDiscussion = function(){
            this.showMessages = !this.showMessages;
            
            if(!this.showMessages){
                this.toggleItemMessages();
            }else{
                var section = main.get('section');
                $rootScope.$emit('open messages', {section_id: section._id, item_slug: null});
            }
            $timeout(function(){ angular.element($window).triggerHandler('resize') });
        };
        
        this.get_message_slug = function(section_id){
            if(this.showItem_slug){
                return this.showItem_slug;
            }else{
                return section_id;
            }
        };
        
        this.toggleTrash = function(close){
            if(close || this.showTrash){
                this.showTrash = false;
            }else{
                this.showTrash = true;
            }
        };
        
        this.toggleUsers = function(){
            this.showUsers = !this.showUsers;
        };

        this.toggleEpisode = function(){
            this.showEpisode = !this.showEpisode;
        };

        this.toggleArchive = function(slug){
            this.switchArchive(slug, !this.show_archive[slug]);                
        };

        this.switchArchive = function(slug, on){
            if(on){
                this.show_archive[slug] = true;
                socket.emit('item get archive', {
                    episode_id: main.get('episode_id'),
                    slug: slug
                });
            }else{
                delete this.show_archive[slug];
            }
        }
        
        this.getPhaseClass = function(def, stage){
            var sections = main.get('sections');
            var section = $filter('filter')(sections, {stage:stage})[0];
            var episode = main.get('episode');
            if(episode.phases[section.phase] && episode.phases[section.phase].class){
                return episode.phases[section.phase].class;
            }else{
                return def;
            }
        };
        
        
        this.modals = {};
        this.modalItem = function(item, edit, checknew){
            if(this.modals[item._id]) return false;
            if(!edit) edit = false;
            if(checknew){
                if(!edit) return false;
                if(item.updated !== item.created
                    || main.get('username') !== item.username
                    || item.title !== ''
                    ){
                    return false;
                }
            }
            this.modals[item._id] = true;
            
            var sections = main.get('sections');
            var item_section = $filter('filter')(sections, {stage:item.stage})[0];
                    
            var phaseclass = this.getPhaseClass('primary', item.stage);
            
            var windowClass = 'col-lg-6 col-md-8 col-sm-12 col-xs-12';
            
            
            var modalInstance = $modal.open({
                templateUrl: 'components/discuss/item-modal.html',
                windowClass: windowClass,
                controller: function($scope, $modalInstance ){
                    $scope.item = item;
                    $scope.phaseclass = phaseclass;
                    $scope.edit = edit;
                    $scope.modal = true;
                    $scope.show_archive = false;
                    $scope.ColCtrl = _this;
                    if(item_section.settings.items.group_for_stage){
                        $scope.grouped = _this.filterGroupList(_this.episode_items[item_section.settings.items.group_for_stage], item._id);
                    }else{
                        $scope.grouped = [];
                    }
                    if(item_section.settings.items.group_for_stage){
                        $scope.annotations = _this.filterAnnotateList(_this.episode_items[item_section.settings.items.group_for_stage], item._id);
                    }else{
                        $scope.annotations = [];
                    }
                    if(item_section.settings.items.comment_for_stage){
                        $scope.comments = _this.episode_items[item_section.settings.items.comment_for_stage];
                    }else{
                        $scope.comments = [];
                    }
            
                    
                    $modalInstance.result.then(function () {
                        // not called... at least for me
                    }, function () {
                        //modal closing
                        delete _this.modals[$scope.item._id];
                    });


                    $scope.cancel = function(){
                        $modalInstance.dismiss('cancel');
                    };

                },
                controllerAs: 'ModalCtrl'
            });
        };
        

        this.toggleOpen = function(item){
            if(item.open){
                if(this.show_archive[item.slug]) delete this.show_archive[item.slug];
                delete item.open;
            }else{
                item.open = true;
            }
        };

        this.itemToFront = function(item){
            
            if(item.pos.z < this.maxz){
                this.maxz++;
                item.pos.z = this.maxz;
            }
        };

        socket.on('item get archive', function(data){
//                var archive = {};
            var archarr = [];
//                var i;
//                for(i = 0; i < data.items.length; i++){
//                    data.items[i].archive_key = "i." + $filter('date')(data.items[i].updated, "yyyy.M.d.H.m.s");
//                    
//                    data.items[i].label = $filter('date')(data.items[i].updated, "dd-MM-yyyy HH:mm:ss") + " - " + data.items[i].username;
//                    archive[data.items[i].archive_key] = data.items[i];
//                }
            var counter = 0;
            angular.forEach(data.items, function (item) {
                item.archive_key = "i." + $filter('date')(item.updated, "yyyy.MM.dd.HH.mm.ss");
                
                item.label = $filter('date')(item.updated, "dd-MM-yyyy HH:mm:ss") + " - " + item.username;
                archarr.push(item);
                counter++;
            });
            
            _this.archive[data.slug] = archarr;
        });

        this.createItem = function (base, section, group) {
            var section_id = main.get('section_id')
            var stage = main.get('stage');
            if(section){
                section_id = section._id;
                stage = section.stage;
            }
            var title = (base && base.title)?base.title:'';
            var item = {
                episode_id: main.get('episode_id'),
                section_id: section_id,
                title: title,
                body: '',
                stage: stage
            };
            if(group){
                item['group'] = {};
                item['group'][group] = true;
            }
            if(base) item = angular.extend(item, base);
            console.log('createItem', item);
            socket.emit('item add', item);
        };
        socket.on('item add', function (data) {
            console.log('item add', data);
            if(data.item.stage){
                
                if(data.item.stage === main.get('stage')){
                    _this.tag_tabs(_this.items[data.item._id], data.item);
                }
                if(!_this.episode_items){
                    _this.episode_items = {};
                }
                if(!_this.episode_items[data.item.stage]){
                    _this.episode_items[data.item.stage] = {};
                }
                
                _this.episode_items[data.item.stage][data.item._id] = data.item;
                main.set('episode_items', _this.episode_items);
                
                if(data.item.stage === main.get('stage')){
                    if(data.item.user_slug === main.get('user_slug') && 
                            data.item.updated === data.item.created){
                        focus(data.item.slug);
                    }

                    if(data.item.promotion){
                        var episode_id = main.get('episode_id');
                        
                        // load only related messages
                        socket.emit('messages init', {
                            action: 'episode messages init',
                            episode_id: episode_id,
                            section_id: data.item.section_id,
                            item_slug: data.item.slug
                        });
                    }    
                }else{
                    ///open modal...
                }
            }
            
        });

        this.deleteItem = function (item) {
            var id = item._id;
            
            angular.forEach(this.group_items, function (gr_item) {
                if(gr_item.group && gr_item.group[id]){
                    _this.groupItem(gr_item, id, true);
                }
            });
            
            this.tag_tabs(this.items[id]);
            delete this.episode_items[item.stage][id];
        
            item.deleted = true;
            if(!this.episode_deleted_items[item.stage]) this.episode_deleted_items[item.stage] = {};
            this.episode_deleted_items[item.stage][id] = item;

            socket.emit('item delete', {item_id: id});
            
            main.set('episode_items', _this.episode_items);
            main.set('episode_deleted_items', _this.episode_deleted_items);
        };
        
        this.undeleteItem = function (item) {
            var id = item._id;
            
            delete this.episode_deleted_items[item.stage][id]
            
            if(Object.keys(this.episode_deleted_items[item.stage]).length == 0){
                this.showTrash = false;
            }
        
            item.deleted = false;
            if(!this.episode_items[item.stage]) this.episode_items[item.stage] = {};
            this.episode_items[item.stage][id] = item;
            
            this.tag_tabs(null, this.items[id]);
            
            socket.emit('item undelete', {item_id: id});
            
            main.set('episode_items', _this.episode_items);
            main.set('episode_deleted_items', _this.episode_deleted_items);
        };
        
        socket.on('item delete', function (data) {
            console.log('item delete', data);
            _this.tag_tabs(_this.items[data.item._id]);
            
            var item = _this.episode_items[data.item.stage][data.item._id];
            item.deleted = true;
            if(!_this.episode_deleted_items[data.item.stage]) _this.episode_deleted_items[data.item.stage] = {};
            _this.episode_deleted_items[data.item.stage][data.item._id] = item;
            
            delete _this.episode_items[data.item.stage][data.item._id];
            
            main.set('episode_items', _this.episode_items);
            main.set('episode_deleted_items', _this.episode_deleted_items);
        });
        
        socket.on('item undelete', function (data) {
            var item = _this.episode_deleted_items[data.item.stage][data.item._id];
            item.deleted = false;
            if(!_this.episode_items[data.item.stage]) _this.episode_items[data.item.stage] = {};
            _this.episode_items[data.item.stage][data.item._id] = item;
            
            delete _this.episode_deleted_items[data.item.stage][data.item._id];
            _this.tag_tabs(null, _this.items[data.item._id]);
            main.set('episode_items', _this.episode_items);
            main.set('episode_deleted_items', _this.episode_deleted_items);
        });

        socket.on('item move', function (data) {
            console.log('item move receive', data.pos.x, data.pos.y, data.pos.z);
            //_this.items[data._id].pos.z = data.z;
            if(data.z > _this.maxz) _this.maxz = data.z;
            angular.element(document.getElementById('item_'+data._id))
                .animate({
                    left: data.pos.x,
                    top: data.pos.y
                },
                {
                    done: function(){
                        _this.items[data._id].pos = data.pos;
                    }
                });

        });

        this.findLinksInText = function(text, count){
            var res = [];
            if(text) res = text.match(/(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/g);
            if(count){
                if(!res) return 0;
                return res.length;
            }else{
                return res;
            }
        };
        
        this.duplicateItem = function(item){
            socket.emit('item duplicate', {
                item_id: item._id
            });
        };
        
        this.updateItem = function (item){
            socket.emit('item update', item);
        };
        
        socket.on('item update', function (data) {
            console.log('item update', data);
            var item = data.item;
            if(item.stage === main.get('stage')){
                _this.tag_tabs(_this.items[item._id], item);
            }
            if(!_this.episode_items[item.stage]){
                _this.episode_items[item.stage] = {};
            }
            _this.episode_items[item.stage][item._id] = item;
            
            main.set('episode_items', _this.episode_items);
            
        });

        this.updateCommentItem = function(item, comment_item_id){
            var data = {
                item_id: item._id,
                stage: item.stage,
                comment_item_id: comment_item_id,
                comment: item.comments[comment_item_id]
            };
            socket.emit('item update comment', data);
        };
        socket.on('item update comment', function (data) {
            console.log('item update comment', data);
            if(!_this.episode_items[data.stage][data.item_id]) return false;
            
            if(!_this.episode_items[data.stage][data.item_id].comments){
                _this.episode_items[data.stage][data.item_id].comments = {};
            }
            _this.episode_items[data.stage][data.item_id].comments[data.comment_item_id] = data.comment;
            
            main.set('episode_items', _this.episode_items);
            
        });

        
        this.groupItem = function (item, group, remove){
            
            if(!remove){
                //if(!item.group) item.group = {};
                //item.group[group] = true;
                if(!_this.episode_items[item.stage][item._id].group) _this.episode_items[item.stage][item._id].group = {};
                _this.episode_items[item.stage][item._id].group[group] = true;;
            }else{
                //delete item.group[group];
                delete _this.episode_items[item.stage][item._id].group[group];
            }

            var data = {
                _id: item._id,
                group: item.group
            };
            
            socket.emit('item group', data);
            main.set('episode_items', _this.episode_items);
        };

        this.annotateItem = function (item, annotate){
            _this.episode_items[item.stage][item._id].annotate = annotate;
            var data = {
                _id: item._id,
                annotate: annotate
            };
            
            socket.emit('item annotate', data);
            main.set('episode_items', _this.episode_items);
        };
        
        this.promoteItem = function (item, section){
            
            _this.tag_tabs(_this.items[item._id]);
            
            delete _this.episode_items[item.stage][item._id];
            var data = {
                _id: item._id,
                episode_id: main.get('episode_id'),
                section_id: section._id,
                stage: section.stage
            };
            
            socket.emit('item promote', data);
            main.set('episode_items', _this.episode_items);
        };

        this.draglist = {};
        this.groupDropCallback = function(event, ui){
            var id = ui.draggable.attr("itemid");
            var group = $(event.target).attr("group")
            // _this.draglist.group = group;
            // _this.group_items[id] = angular.copy(_this.draglist);
            _this.draglist = {};
            _this.groupItem(_this.group_items[id], group);
        };
        
        this.annotate_draglist = {};
        this.annotateDropCallback = function(event, ui){
            var id = ui.draggable.attr("itemid");
            var annotate = $(event.target).attr("annotate");
            // _this.draglist.group = group;
            // _this.group_items[id] = angular.copy(_this.draglist);
            _this.annotate_draglist = {};
            _this.annotateItem(_this.items[id], annotate);
        };
        
        this.findAnnotations = function(annotate_id, stage){
            var result = [];
            var itemlist = {};
            if(stage){
                itemlist = this.episode_items[stage];
            }else{
                itemlist = this.items;                
            }
            angular.forEach(itemlist, function(item) {
                if(item.annotate === annotate_id){
                    result.push(item);     
                }                
            });
            
            return result;
        };
        
        this.addAnnotateItem = function(annotate_id, title){
            if(this.section.settings.items.annotate_title){
                title = this.section.settings.items.annotate_title;
            }
            this.createItem({
                title: title,
                annotate: annotate_id
            });
        };
        
        this.findComments = function(annotate_id, comment_id, stage){
            var result = [];
            var itemlist = {};
            if(stage){
                itemlist = this.episode_items[stage];
            }else{
                itemlist = this.items;                
            }
            angular.forEach(itemlist, function(item) {
                if(item.annotate === annotate_id && item.comment === comment_id){
                    result.push(item);     
                }                
            });
            
            return result;
        };
        
        this.addCommentItem = function(annotate_id, comment_id, title){
            if(this.section.settings.items.comment_title){
                title = this.section.settings.items.comment_title;
            }
            this.createItem({
                title: title,
                annotate: annotate_id,
                comment: comment_id
            });
        };
        
        this.filterItemList = function(stage, trash){
            var filtered = [];
            var sortfield = 'created';
            var reverse = false;
            if(!stage) stage = main.get('stage');
            if(!trash) trash = false;
            var section = main.getSectionbyStage(stage);
            
            var comment_for_stage = section?section.settings.items.comment_for_stage:'';
            var annotate_for_stage = section?section.settings.items.annotate_for_stage:'';
            var test_tags = Object.keys(_this.filter_tag);
            if(!trash) this.not_tagged = 0;
            
            if(this.stage == stage){
                var itemlist = (trash)?this.episode_deleted_items[this.stage]:this.items;
            }else{
                var itemlist = this.episode_items[stage];
            }
 
            angular.forEach(itemlist, function(item) {
                var push = true;
                var labels = (!item.labels || !item.labels[stage])?[]:item.labels[stage];
                
                if(!item.deleted && labels.length == 0){
                    _this.not_tagged++;
                }
                
                if(test_tags.length > 0){
                    var found_tags = {};
                    for(var i=0; i < labels.length; i++){
                        if(test_tags.indexOf(labels[i].text) >= 0){
                            found_tags[labels[i].text] = true;
                        }
                    }
                    if(Object.keys(found_tags).length !== test_tags.length) push = false;
                }else if(!_this.tag_all_empty){
                    if(labels.length > 0) push = false; 
                }
                
                if(comment_for_stage && item.annotate) push = false; 
                if(annotate_for_stage && item.annotate) push = false; 
                
                if(push) filtered.push(item);
            });
            if(sortfield){
                filtered.sort(function (a, b) {
                  return (a[sortfield] > b[sortfield] ? 1 : -1);
                });
            }
            if(reverse) filtered.reverse();
            return filtered;
        };
        
        this.filterGroupList = function(list, group, items, multiple) {
            var results = [];
            if(group){    
                angular.forEach(list, function(item, key) {
                    if(item.group && item.group[group]){
                        results.push(item);
                    }
                });
            }else{
                if(multiple) return list;
                var groups = [];
                var match = {};
                angular.forEach(items, function(item, key) {
                    groups.push(item._id);
                });

                angular.forEach(list, function(item, key) {
                    angular.forEach(groups, function(group, group_key) {
                        if(item.group && item.group[group]){
                            match[key] = true;
                        }
                    });
                });

                angular.forEach(list, function(item, key) {
                    if(!match[key]){
                        results.push(item);
                    }
                });      
            }
            return results;
        };
        
        this.promoteSectionList = function(){
            var sections = main.get('sections');
            var section = main.get('section');
            var result = [];
            if(!section.settings) return result;
            var stages = section.settings.items.promote_to_stage;
            
            if(stages){
                for(var i = 0; i < sections.length; i++){
                    if(stages.indexOf(sections[i].stage) >= 0 ){
                        result.push(sections[i]);
                    }
                }
            }
            return result;
        };
        
        this.filterAnnotateList = function(list, annotate) {
            var results = [];
            var section = main.get('section');
            if(section && !main.get('section').settings.items.annotate_for_stage) return results;
            angular.forEach(list, function(item, key) {
                if(annotate === false && (!item.annotate || item.annotate === '')){
                    results.push(item);
                }else if (item.annotate === annotate) {
                    results.push(item);
                }
            });
            return results;
        };            

        this.diff_change = function(slug){
            var content = '';
            if(this.diff_left[slug] 
                && this.diff_right[slug]
                && this.diff_left[slug].archive_key <= this.diff_right[slug].archive_key){

                delete this.diff_right[slug];
            }                    

            if(this.diff_left[slug] && this.diff_right[slug]){
                content = $filter('diff')(this.diff_right[slug].body, this.diff_left[slug].body);
            }else if(this.diff_left[slug]){
                content = this.diff_left[slug].body;
            }
            this.diff[slug] = content;

        };
        
        this.allowDuplicate = function(item){
            var sections = main.get('sections');
            
            var section = $filter('filter')(sections, {_id:item.section_id})[0];
            if(section){
                if(section.settings.items.duplicate){
                    return true;
                }else{
                    return false;
                }
            }
        };
        
        this.typeClass = function(item){
            if(!item || !item.stage) return [];
            var clss = ['fa'];
            var sections = main.get('sections');
            
            var section = $filter('filter')(sections, {stage:item.stage})[0];
            if(section){
                var type = section.settings.items.type;
                switch(type){
                    case 'raw':
                        clss.push('fa-envelope-o');
                        break;
                    case 'single':
                        clss.push('fa-cube');
                        break
                    case 'group':
                        clss.push('fa-cubes');
                        break
                    case 'fixed':
                        clss.push('fa-bullhorn');
                        break
                    case 'idea':
                        clss.push('fa-lightbulb-o');
                        break
                }
            }
            
            return clss;
        };
        
        this.itemClass = function(item){
            var clss = ['discuss-item'];
            var section = main.get('section');

            if(!section) return clss;

            if(item.tiny) clss.push('discuss-item-tiny');

            if(section.settings.items.group_for_stage) clss.push('discuss-item-group');
            if(this.showItem && this.showItem._id === item._id
                || section.settings.items.annotate_for_stage){
                
                clss.push('discuss-item-large col-lg-12 col-md-12 col-sm-12 col-xs-12');
            }else if(this.show_archive[item.slug] 
                    || item.fixed 
                    || section.settings.items.group_for_stage 
                    || section.settings.items.annotate_for_stage
                    || section.settings.items.comment_for_stage){

                clss.push('discuss-item-large col-lg-6 col-md-8 col-sm-12 col-xs-12');
            }else{
                clss.push('col-lg-3 col-md-4 col-sm-6 col-xs-12');
            }
            
            return clss;
        };

        this.toggleItemMessages = function(item){
            //this.modalItem(item, true, true);
            if(this.showItem){
                $rootScope.$emit('close messages');
                if(item){
                    this.switchArchive(item.slug);
                }
                
                this.showItem = false;
                this.showItem_slug = false;
                this.showMessages = false;
            }else if(item){                
                
                $rootScope.$emit('open messages', {section_id: item.section_id, item_slug: item.slug});
                
                this.showItem = item;
                this.showItem_slug = item.slug;
                this.showMessages = true;
                this.showUsers = false;
                $timeout(function(){ angular.element($window).triggerHandler('resize') });
            }else{
                $rootScope.$emit('close messages');
            }
            //angular.element(document.getElementById('some'))
        };
        
        this.item_prepare_tags = function(item, label){
            if(!item.labels) item.labels = {};
            if(!item.labels[label]) item.labels[label] = [];
        };
        
        this.item_tags = function($tag, add, item, label){
            var tag = $tag.text;
            if(!this.tags[tag]) this.tags[tag] = [];
            var i = this.tags[tag].indexOf(item._id);
            if(i != -1) this.tags[tag].splice(i, 1);
                
            if(add){
                this.tags[tag].push(item._id);
            }            
            
            if(!item.labels) item.labels = {};
            if(!item.labels[label] || !item.labels[label].length){
                //tag is not added to empty array for some reason
                if(add){
                    item.labels[label] = [$tag];
                }else{
                    item.labels[label] = [];
                }
            }
            console.log('item_tags', item.labels[label]);            
            var data = {
                item_id: item._id,
                label: label,
                tags: item.labels[label]
            };
            socket.emit('item tag', data);
        };
        
        socket.on('item tag', function(data){
            var item_out = angular.copy(_this.items[data.item_id]);
            if(!_this.items[data.item_id].labels) _this.items[data.item_id].labels = {};
            
            _this.items[data.item_id].labels[data.label] = data.tags;
            _this.tag_tabs(item_out, _this.items[data.item_id]);
        });
        
        this.init();
    }])

    .directive("discussEpisode", function (discuss_settings) {
        return {
            restrict: "E",
            templateUrl: discuss_settings.root + "episode.html",
            controller: 'EpisodeController',
            controllerAs: 'EpiCtrl'
        };
    })
    
    .directive("discussDashboard", function (discuss_settings) {
        return {
            restrict: "E",
            templateUrl: discuss_settings.root + "episode-dashboard.html"
        };
    })

    .directive("discussSection", function (discuss_settings) {
        return {
            restrict: "E",
            templateUrl: discuss_settings.root + "section.html",
            controller: 'SectionController',
            controllerAs: 'SectCtrl'
        };
    })

    .directive("discussMessageboard", function (discuss_settings) {
        return {
            restrict: "E",
            templateUrl: discuss_settings.root + "messageboard.html",
            controller: 'MessageController',
            controllerAs: 'MsgCtrl'
        };
    })
    
    .directive('discussFill', function($window, main) {
        return {
            restrict: 'A',
            link: function (scope, elem, attrs) {
                var winHeight = $window.innerHeight;
                var pos = 0;
                var windowEl = angular.element($window);
                var handler = function() {
                    if(main.get('fixed') && pos !== 0){
                       
                    }else if(document.getElementById(attrs.id)){
                        pos = document.getElementById(attrs.id).getBoundingClientRect().top - windowEl.scrollTop();
                        elem.css('height', winHeight - pos - 100 + 'px');
                    }
                };
                windowEl.on('scroll', scope.$apply.bind(scope, handler));
                windowEl.on('resize', scope.$apply.bind(scope, handler));
                handler();
            }
             
        };
    })

    .directive("discussCollabBoard", function (discuss_settings) {
        return {
            restrict: "E",
            templateUrl: discuss_settings.root + "collabboard.html",
            controller: 'CollabController',
            controllerAs: 'ColCtrl'
        };
    })

    .directive('collabItem', function (socket) {
        var linker = function (scope, element, attrs) {
            if(attrs.position === "true"){
                element.draggable({
                    containment: '#discuss_collab',
                    stop: function (event, ui) {
                        console.log('stopdrag', ui.position.top, ui.position, ui);

                        angular.element(document.getElementById(event.target.id)).scope().item.pos.x = ui.position.left;
                        angular.element(document.getElementById(event.target.id)).scope().item.pos.y = ui.position.top;
                        var data = {
                            item_id: scope.item._id,
                            x: ui.position.left,
                            y: ui.position.top,
                            z: angular.element(document.getElementById(event.target.id)).scope().item.pos.z
                        };
                        socket.emit('item move', data);
                    }
                });

                element.css('left', scope.item.pos.x);
                element.css('top', scope.item.pos.y);
                element.css('z-index', scope.item.pos.z);
                element.hide().fadeIn();
            }else{
                element.addClass('fixed');
            }
        };

        var controller = function ($scope) {


//            $scope.deleteItem = function (id) {
//                $scope.ondelete({
//                    id: id
//                });
//            };
        };

        return {
            restrict: 'A',
            link: linker,
            controller: controller,
            scope: {
                item: '=',
                ondelete: '&'
            }
        };
    })

    .directive("discussMessagelist", function (discuss_settings) {
        return {
            restrict: "E",
            scope: {messages: '='},
            templateUrl: discuss_settings.root + "messagelist.html",
            controller: 'MessageController',
            controllerAs: 'MsgCtrl'
        };
    })

    .directive("discussMessage", function (discuss_settings) {

        return {
            restrict: "E",
            replace: true,
            templateUrl: discuss_settings.root + "message.html",
        };
    })

    .directive("discussItem", function (discuss_settings, $rootScope, $timeout, $window) {
        var linker = function (scope, element, attrs) {
            if(scope.$last){
//                $rootScope.$broadcast('elastic:adjust');
                $timeout(function(){ angular.element($window).triggerHandler('resize') });
            }          
        };
        return {
            restrict: "EA",
            link: linker,
            replace: true,
            templateUrl: discuss_settings.root + "item.html"
        };
    })

    .directive("discussItemAnnotate", function (discuss_settings) {
        return {
            restrict: "E",
            templateUrl: discuss_settings.root + "item-annotate.html"
        };
    })

    .directive("discussItemIcon", function (discuss_settings) {
        return {
            restrict: "E",
            templateUrl: discuss_settings.root + "item-icon.html"
        };
    })

    .directive("discussItemAnnotation", function (discuss_settings) {
        return {
            restrict: "E",
            templateUrl: discuss_settings.root + "item-annotation.html"
        };
    })
    
    .directive("discussItemComment", function (discuss_settings) {
        return {
            restrict: "E",
            templateUrl: discuss_settings.root + "item-comment.html"
        };
    })

    .directive("discussItemStatic", function (discuss_settings) {
        var linker = function (scope, element, attrs) {
            element.dialog({
                modal: true,
                dialogClass: "alert",
                replace: true,
                buttons: {
                  Ok: function() {
                      $( this ).dialog( "close" );
                      item.open = [];

                  }
                }
            });
        }

        return {
            restrict: "E",
            link: linker,
            templateUrl: discuss_settings.root + "item-static.html"
        };
    })

    .directive("discussItemArchive", function (discuss_settings) {
        return {
            restrict: "E",
            templateUrl: discuss_settings.root + "item-archive.html"
        };
    })

    .directive("discussField", function (discuss_settings) {
        return {
            restrict: "E",
            templateUrl: discuss_settings.root + "field.html"
        };
    })

    .directive('discussFixedBar', function($window, main) {
        return {
            link: function(scope, element, attrs) {
                var windowEl = angular.element($window);
                var handler = function() {

                    if(document.getElementById('discussFixedBar')){
                        var pos = document.getElementById('discussFixedBar').getBoundingClientRect().top - windowEl.scrollTop();
                        var scroll = windowEl.scrollTop();
                        var offset = document.getElementById('discussFixedBar').offsetHeight;
                        var filler = angular.element(document.getElementById('discuss-fixed-filler'));
                        if(scroll > 30 && pos < 50){
                            main.set('fixed', true);
                            filler.attr( 'style', 'margin-top: ' + offset + 'px' );
                            element.addClass('discuss-fixed-bar');
                        }else{
                            main.set('fixed', false);
                            filler.attr( 'style', 'margin-top: 0px' );
                            element.removeClass('discuss-fixed-bar');
                        }
                    }
                };
                windowEl.on('scroll', scope.$apply.bind(scope, handler));
                handler();
            }
        };
    })
;