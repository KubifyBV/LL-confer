angular.module('discuss.api', [])

.factory('socket', ['$rootScope', 'AccessToken', function ($rootScope, AccessToken) {
    var _this = this;
    var socket = false;
    
    this.connect = function(token){
        if(!token) token = AccessToken.get();
        console.log('io.connect', token);
        if(token){
            socket = io.connect('',{query: 'token='+token.access_token});
        }else{
            socket = io.connect();
        }
    }
    
    $rootScope.$on('oauth:login', _this.connect);
    this.connect();
    
    return {
        connect: this.connect,
        on: function (eventName, callback) {
            socket.on(eventName, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    callback.apply(socket, args);
                });
            });
        },
        emit: function (eventName, data, callback) {
            socket.emit(eventName, data, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    if (callback) {
                        callback.apply(socket, args);
                    }
                });
            });
        },
        reset: function(){
            socket.disconnect();
            //socket.connect();
        },
        init: function() {
            socket.removeAllListeners();
        }
    };
}])



;