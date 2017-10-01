'use strict';

angular.module('DiscussApp.discussManager', ['ngRoute','ui.bootstrap'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/discuss-manager/:episode_slug?', {
    templateUrl: 'modules/discuss-manager/discuss-manager.html',
    controller: 'DiscussManagerController',
    controllerAs: 'DManCtrl',
    resolve: {
        title: function(Main){
            Main.setTitle('Discuss Manager');                
        }
    }
  });
}])
  
.controller('DiscussManagerController', ['main', '$routeParams', function(main, $routeParams){
    this.episode_slug = $routeParams.episode_slug;
    
}]);  