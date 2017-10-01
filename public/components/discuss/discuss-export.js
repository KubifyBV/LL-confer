angular.module('discuss.export', [])

    .controller('ExportController', ['socket', 'main', 'UserService', '$location', '$routeParams', '$rootScope', '$scope', 
                            function(socket, main, UserService, $location, $routeParams, $rootScope, $scope){
        var _this = this;
        this.public = $scope.public || false;
        
//        if(this.public){
            
//        }else{
            this.episode = main.get('episode');
            this.episode_items = main.get('episode_items');
//        }
        this.items = {};
        
        this.count = function(obj){
            if(!obj || !Object.keys(obj)) return 0;
            return Object.keys(obj).length;
        };
        
        this.init = function(){
        
        };      
        
        if(UserService.loggedin()){
            this.init();
        }
        
        this.getSection = function(stage){
            return main.getSectionbyStage(stage);
        };
                                
        socket.on('episode get export', function(data){
            if(data.episode){
                _this.episode = data.episode;
                
                socket.emit('sections get', {
                    action: 'sections get export',
                    episode_id : data.episode._id
                });
                socket.emit('items init', {
                    episode_id : _this.episode._id,
                    action: 'items init export'
                });
            }          
        });
        
        socket.on('sections get export', function(data){
            console.log('sections get export', data);
            _this.report.sections = data.sections;
            
        });
        
        
        
    }])

    .directive("discussExport", function (discuss_settings) {
        return {
            restrict: "E",
            templateUrl: discuss_settings.root + "episode-export.html",
            controller: 'ExportController',
            controllerAs: 'ExpCtrl'
        };
    })
    
    

;
