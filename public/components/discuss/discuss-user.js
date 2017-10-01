angular.module('discuss.user', [])

    .factory('UserService', ['$rootScope', 'socket', 'AccessToken', function($rootScope, socket, AccessToken){
        var current_user = {};
        
        
        return {
            userlogin: function(user){
                console.log('userlogin', current_user);
                if(user) current_user = user; 
                $rootScope.$emit('userlogin');
            },
            getuser: function(){
                return current_user;
            },
            loggedin: function(){
                if(AccessToken.get()){
                    return true;
                }else{
                    return false;
                }
            },
            refresh: function(){
                AccessToken.refresh();
            }
        }
    }])
    
    .controller('UserController', ['socket', 'main', 'UserService', '$route', '$location', '$rootScope', function(socket, main, UserService, $route, $location, $rootScope){
        this.username = main.get('username');
        this.user_slug = main.get('user_slug');
        this.socketid = main.get('socketid');
        this.loginname = main.get('loginname');
        this.admin_level = main.get('admin_level');
        this.password = '';
        
        var _this = this;
        this.to_main = function(){
            main.set('username', this.username);
            main.set('user_slug', this.user_slug);
            main.set('loginname', this.loginname);
            main.set('socketid', this.socketid);
            main.set('admin_level', this.admin_level);
        };

        this.clear = function(){
            this.username = '';
            this.user_slug = '';
            this.socketid = '';
            this.loginname = '';
            this.password = '';
            this.admin_level = 0;
            this.to_main();
        };
        
        this.login_user = function () {
                
            var user = {
                login: this.loginname,
                password: this.password,
                socketid: this.socketid,
            };
            
            socket.emit('login user', user);
        };
        if(this.socketid && this.loginname) this.login_user();
        
        this.logout_user = function(callback){
            socket.emit('logout user');
            socket.reset();
            this.clear();
            main.clear();
            if(callback) callback();
            
            //$route.reload();
        };
        $rootScope.$on('oauth:logout', function(){
            _this.logout_user();
        });
        
        
        socket.on('login user', function (data) {
            if(data.success){
                var reload = (_this.socketid)?false:true;
                _this.username = data.username;
                _this.user_slug = data.user_slug;
                _this.socketid = data.socketid;
                _this.admin_level = data.admin_level;
                _this.to_main();
                UserService.userlogin(data);
                
                if(reload) $route.reload();
            }else if(data.expired){
                UserService.refresh();
            }else{
                _this.clear();
            }

        });
        
        
    }])
    
    .directive("discussUser", function (discuss_settings) {
        return {
            restrict: "E",
            controller: 'UserController',
            controllerAs: 'UsrCtrl',
            templateUrl: discuss_settings.root + "user.html"
        };
    })


;