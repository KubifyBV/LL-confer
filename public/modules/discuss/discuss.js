'use strict';

angular.module('DiscussApp.discuss', ['ngRoute','ui.bootstrap'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/my', {
    templateUrl: 'modules/discuss/my.html',
    controller: 'MyDiscussController',
    controllerAs: 'MyDiscussCtrl',
    resolve: {
        title: function(Main){
            Main.setTitle('Discuss');                
        }
    }
  });
  $routeProvider.when('/discuss/:episode_id?/:stage?', {
    templateUrl: 'modules/discuss/discuss.html',
    controller: 'DiscussController',
    controllerAs: 'DiscussCtrl',
    resolve: {
        title: function(Main){
            Main.setTitle('Discuss');                
        }
    }
  });
}])
  
.controller('MyDiscussController', ['main', '$routeParams', function(main, $routeParams){
//    if($routeParams.episode_id){
//        main.set('episode_id', $routeParams.episode_id);
//        if($routeParams.stage){
//            main.set('stage', $routeParams.stage);
//        }
//    }
//    console.log($routeParams.episode_id, $routeParams.stage, main.get('test'));
}])
  
.controller('DiscussController', ['main', '$routeParams', function(main, $routeParams){
//    if($routeParams.episode_id){
//        main.set('episode_id', $routeParams.episode_id);
//        if($routeParams.stage){
//            main.set('stage', $routeParams.stage);
//        }
//    }
//    console.log($routeParams.episode_id, $routeParams.stage, main.get('test'));
}]);  