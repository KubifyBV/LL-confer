'use strict';

var DiscussApp = angular.module('DiscussApp', [
    'ngRoute',
    'DiscussApp.discuss',
    'DiscussApp.discussManager',
    'DiscussApp.discussExport',
    'DiscussApp.tests',
    'discuss',
    
    'btford.socket-io',
    'ngStorage',
    'oauth',
    'ui.bootstrap',
    'gettext',
    'ui.sortable',
    'textAngular',
    'diff',
    'ngDragDrop'
    ])

.run(function (gettextCatalog) {
    //todo: dynamic language setting
    //see: https://angular-gettext.rocketeer.be/dev-guide/
    var lang = 'en';
    
    gettextCatalog.setCurrentLanguage(lang);
    gettextCatalog.loadRemote("languages/" + lang + ".json");
    gettextCatalog.debug = true;
})

.factory('Main', function() {
   var title = 'default';
   return {
     title: function() { return title; },
     setTitle: function(newTitle) { title = newTitle }
   };
})

.config(['$routeProvider', function($routeProvider) {  
    $routeProvider.when('/access_token=:token', {
      template: '',
      controller: function ($location, AccessToken, $routeParams) {
        
        var hash = $location.path().substr(1);
        console.log('route', hash, $location.path(), $location.$$path);
        AccessToken.setTokenFromString(hash);
        $location.path('/');
        $location.replace();
      }
    });
    
    $routeProvider.when('/', {
        templateUrl:'modules/home/home.html',
        resolve: {
            title: function(Main){
                Main.setTitle('Home');                
            }
        }
    });

    $routeProvider.otherwise({
        redirectTo: '/'
    });
}])

.service('alerts', ['$rootScope', function($rootScope){
    //types: default, primary, warning, success, danger, info
    var _this = this;
    this.alerts = [];
    this.alerts_context = [];

    this.addGlobal = function(msg){
       
        if(msg.key){
            for(var i = 0; i < this.alerts.length; i++){
                if(this.alerts[i].key && this.alerts[i].key == msg.key) return false;
            }
        }
        this.alerts.push(msg);
    };
    
    this.addContext = function(msg){
       
        if(msg.key){
            for(var i = 0; i < this.alerts_context.length; i++){
                if(this.alerts_context[i].key && this.alerts_context[i].key == msg.key) return false;
            }
        }
        this.alerts_context.push(msg);
    };

    this.add = function(msg, type, global, key){
        console.log('alerts.add', msg, type, global, key);
        if (!type) {
            type = 'default';
        }
        var msg = {
            msg: msg,
            type: type
        };
        if (key){
            msg.key = key;
        }
        if (global){
            this.addGlobal(msg);
        } else {
            this.addContext(msg);
        }
    };
   
    this.removeGlobal = function(index){
        this.alerts.splice(index, 1);
    };
   
    this.removeContext = function(index){
        this.alerts_context.splice(index, 1);
    };
   
    this.remove = function(index, global){
        if(global){
            this.removeGlobal(index);
        } else {
            this.removeContext(index);
        }
    };
    
    this.clear = function(all){
        if (all){
            this.alerts = [];
            this.alerts_context = [];
        } else {
            this.alerts_context = [];
        }
    };
    
    $rootScope.$on('$routeChangeSuccess', function(){
        console.log('$routeChangeSuccess');
        _this.clear(false);
    });
    
}])

.directive('alerts', ['alerts', function(alerts) {
    return {
      restrict: "E",
      link: function(scope, element, attrs){
          scope.alerts = alerts;
      },
      template: '<alert ng-repeat="msg in alerts.alerts" type="{{msg.type}}" close="alerts.remove($index, true)">{{msg.msg}}</alert>\n\
                <alert ng-repeat="msg in alerts.alerts_context" type="{{msg.type}}" close="alerts.remove($index)">{{msg.msg}}</alert>'
    };
}])

.controller('MainController', ['Main', 'alerts', 'AccessToken', '$sessionStorage', '$http', '$rootScope', '$location', '$sce',
    function(Main, alerts, AccessToken, $sessionStorage, $http, $rootScope, $location, $sce){
    var _this = this;
    
    this.full_url_root = $location.protocol()+'://'+$location.host()+($location.port()!==80 ? ':'+$location.port(): '');    
    console.log(this.full_url_root, $location.absUrl());
    this.authsettings = {};
    this.settings = {
        page_green_list: [
            '', 
            '/', 
            '/access_token', 
            '/help', 
            '/about', 
            '/contact',
            '/report'
        ]
    };
    this.init = function(){
        this.get('/api/settings/auth', null, function(result){
            _this.authsettings = angular.fromJson(result);
            
        });
    }
    
    this.headers = function () {
        var headers = {};
        //The AccessToken set() will initialise from the session in case
        //there was a refresh of the page
        AccessToken.set();
        if (AccessToken.get()) {
            headers = {Authorization: 'Bearer ' + AccessToken.get().access_token};
        }
        return headers;
    };
    
    this.get = function (request, params, success, error) {
        if(!success) success = function(result){console.log('GET was succesfull', result)};
        if(!error) error = function(result){console.log('Get failed', result)};
        
        var options = {};
        if(params){
            options.params = params;
        };
        options.headers = this.headers();
        
        $http.get(request, options).success(success).error(error);
    };
    
    this.closeworkgroup = function(){
        if($location.$$path == '/discuss'){
            $rootScope.$emit('episode:close');
        }else{   
            $location.path("/discuss");
        }
    }

    this.logoutURL = '';
    $rootScope.$on('oauth:logout', function(){
//        "https://api.learning-layers.eu/o/oauth2/logout";
//        _this.get(_this.authsettings.provider + _this.authsettings.endpoint_logout, null, function(result){
//            
//        });
        if(_this.authsettings && _this.authsettings.provider && _this.authsettings.endpoint_logout){
            _this.logoutURL = $sce.trustAsResourceUrl(_this.authsettings.provider + _this.authsettings.endpoint_logout);
        }
        var path = $location.$$path;
        path = '/'+path.split('/')[1];
        if(path.indexOf('?') >=0) path = path.substr(0, path.indexOf('?'));
        if(path.indexOf('&') >=0) path = path.substr(0, path.indexOf('&'));
        if(path.indexOf('=') >=0) path = path.substr(0, path.indexOf('='));
        console.log('green', path, _this.settings.page_green_list.indexOf(path));
        if(_this.settings.page_green_list.indexOf(path) < 0){
            if(path != '/undefined'){
                alerts.add('Please login to go to this page', 'warning', true, 'forbidden');
            }
            $location.path("/");
        }
    });
   this.Main = Main;
   this.init();
    
}])

.controller('defaultController', [function(){
        
}]);
   