'use strict';

angular.module('DiscussApp.tests', ['ngRoute', 'circle.menu'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/tests', {
    templateUrl: 'modules/tests/tests.html',
    controller: 'TestsController',
    controllerAs: 'TestsCtrl',
    resolve: {
        title: function(Main){
            Main.setTitle('Tests');                
        }
    }
  });
}])
  
.controller('TestsController', ['$routeParams', function($routeParams){
  this.list1 = {};
  this.list2 = {};
  this.list3 = {};
  this.list4 = {};
  
  this.list = [
    { 'title': 'Dropzone', 'stage': 'dropzone', 'mailin': true, "promote_to_stage": ["brainstorm", "deepening"] },
    { 'title': 'Context', 'stage': 'context', 'mailin': false, "promote_to_stage": []},
    { 'title': 'Question', 'stage': 'question', 'mailin': false, "promote_to_stage": []},
    { 'title': 'Brainstorm', 'stage': 'brainstorm', 'mailin': false, "promote_to_stage": []},
    { 'title': 'Evaluation', 'stage': 'evaluation', 'mailin': false, "promote_to_stage": []},
    { 'title': 'Deepening', 'stage': 'deepening', 'mailin': false, "promote_to_stage": []},
    { 'title': 'Structuring', 'stage': 'structuring', 'mailin': false, "promote_to_stage": []}
];
  

  // Limit items to be dropped in list1
  var _this = this;
  
  this.callback = function(item){
      console.log('click',item);
  }
}]);  