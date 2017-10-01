'use strict';

angular.module('DiscussApp.discussExport', ['ngRoute','ui.bootstrap'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/report/:episode_slug?/:report_id?', {
    templateUrl: 'modules/discuss-report/discuss-report.html',
    controller: 'DiscussReportController',
    controllerAs: 'DExpCtrl',
    resolve: {
        title: function(Main){
            Main.setTitle('Discuss Report');                
        }
    }
  });
}])
  
.controller('DiscussReportController', ['main', '$routeParams', function(main, $routeParams){
    this.report_id = $routeParams.report_id;
    this.episode_slug = $routeParams.episode_slug;
    
}]);  