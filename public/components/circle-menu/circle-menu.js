'use strict';

angular.module('circle.menu',[])

.service('circle_settings', function ($localStorage) {
    var def = {
        size: 0,
        width: 400,
        height: 400,
        radius: 150,
        offset: 0.75,
        label: 'menu',
        btnclass: "btn btn-primary btn-circle btn-xl",
        menubtnclass: "btn btn-primary btn-circle btn-xl",
        ani: {
            time: 500,
            steps: 15,
            turn: 0.5
        },
        isopen: true
    };

    return {
        get: function (id, index) {
            if(index){
                return def[id][index];
            }else{
                return def[id];
            }
        },
        set: function (id, val1, val2) {
            if(val2){
                def[id][val1] = val2;
            }else{
                def[id] = val1;
            }
        }
    };
})

.controller('circleController', ['circle_settings', '$scope', '$rootScope', function(circle_settings, $scope, $rootScope){
    var _this = this;
    
    //start INIT
    if($scope.options.width)        circle_settings.set('width', $scope.options.width);
    if($scope.options.height)       circle_settings.set('height', $scope.options.height);
    if($scope.options.radius)       circle_settings.set('radius', $scope.options.radius);
    if($scope.options.size)         circle_settings.set('size', $scope.options.size);
    if($scope.options.offset)       circle_settings.set('offset', $scope.options.offset);
    if($scope.options.label)        circle_settings.set('label', $scope.options.label);
    if($scope.options.btnclass)     circle_settings.set('btnclass', $scope.options.btnclass);
    if($scope.options.menubtnclass) circle_settings.set('menubtnclass', $scope.options.menubtnclass);

    circle_settings.set('setradius', circle_settings.get('radius'));
    circle_settings.set('setoffset', circle_settings.get('offset'));
    circle_settings.set('buttontop', Math.round(circle_settings.get('height')/2));
    circle_settings.set('buttonleft', Math.round(circle_settings.get('width')/2));
    circle_settings.set('setbuttontop', circle_settings.get('buttontop'));
    circle_settings.set('setbuttonleft', circle_settings.get('buttonleft'));
    
    
    this.ani = circle_settings.get('ani');
    if($scope.options.time) this.ani.time = $scope.options.time
    this.ani.steptime = Math.round(this.ani.time/this.ani.steps);
    this.ani.stepradius = Math.round(circle_settings.get('setradius')/this.ani.steps);
    this.ani.heightstep = Math.round(circle_settings.get('setbuttontop')/this.ani.steps);
    this.ani.turnangle = this.ani.turn/this.ani.steps;
    circle_settings.set('ani', this.ani);
    //end INIT
    
    
    this.toggleMenu = function(){
        var isopen = !circle_settings.get('isopen');
        circle_settings.set('isopen', isopen);
        
        this.aniMenu();
//        if(!isopen){
//            this.closeMenu();
//        }else{
//            this.openMenu();
//        }
    };
    
    this.aniMenu = function(){
        var ani = circle_settings.get('ani');

        var isopen = circle_settings.get('isopen');
                
        var radius = circle_settings.get('radius');
        var offset = circle_settings.get('offset');
        var setoffset = circle_settings.get('setoffset');
        var setradius = circle_settings.get('setradius');
        
        if(isopen){
            radius = (radius + ani.stepradius < setradius)?radius + ani.stepradius:setradius;
            offset = (radius < setradius)? offset - ani.turnangle: setoffset;
        }else{
            radius = (radius - ani.stepradius > 0)?radius - ani.stepradius:0;
            offset = offset + ani.turnangle;
        }
        
        
        $scope.btn.css({top: '45px'});
        
        circle_settings.set('radius', radius);
        circle_settings.set('offset', offset);

        $rootScope.$emit('update circular menu');
        if((isopen && radius < setradius) || (!isopen && radius > 0)){
            setTimeout(function () {
                _this.aniMenu();
            }, ani.steptime);
        }
    };
    
    this.class = function(){
        return circle_settings.get('menubtnclass');
    };
}])

.directive('circleMenu', function (circle_settings, $compile) {
    
    var linker = function (scope, element, attrs) {
        
        var width = circle_settings.get('width');
        var height = circle_settings.get('height');
        var radius = circle_settings.get('radius');
        scope.label = circle_settings.get('label');
        
        element.css({
            position: 'relative',
            display: 'block',
            width: width + 'px',
            height: height + 'px',
            'background-color': 'aqua'
        });
        
        var btn = angular.element("<span ng-class='cirCtrl.class()' ng-click='cirCtrl.toggleMenu()'>{{label}}</span>");
        $compile(btn)(scope);
        btn.css({
            position: 'absolute',
            left: circle_settings.get('buttonleft')+'px',
            top: circle_settings.get('buttontop')+'px'
        });
        element.append(btn);
        scope.btn = btn;
        
//        var circle = angular.element("<div></div>");
//        circle.css({
//            position: 'absolute',
//            left: (Math.round(width/2) - radius)+'px',
//            top: (Math.round(height/2) - radius)+'px',
//            width: (2*radius)+'px',
//            height: (2*radius)+'px',
//            '-webkit-border-radius': radius+'px',
//            '-moz-border-radius': radius+'px',
//            'border-radius': radius +'px',
//            border: '1px solid #000000',
//        });
//        element.prepend(circle);
        
        
    };

    return {
        restrict: 'AE',
        link: linker,
        controller: 'circleController',
        controllerAs: 'cirCtrl',
        scope: {
            options: '='
        }
        
    };
})

.directive('circleMenuItem', function (circle_settings, $rootScope) {
    var setPos = function(scope){
        var element = scope.element;
        var index = scope.index;
        var size = circle_settings.get('size');
        var width = circle_settings.get('width');
        var height = circle_settings.get('height');
        var radius = circle_settings.get('radius');
        var offset = circle_settings.get('offset');
        
        var step = (2*Math.PI) / size;
        var angle = index * step + offset*(2*Math.PI);
                
        var pos = {
            x: Math.round(width/2 + radius * Math.sin(angle)),
            y: Math.round(height/2 - radius * Math.cos(angle))
        };
        
        scope.pos = pos;
        
        element.css({
            position: 'absolute',
            left: scope.pos.x + 'px',
            top: scope.pos.y + 'px'
        });
        
        scope.$emit('update');
        
    };
            
    var linker = function (scope, element, attrs) {
        //http://jsfiddle.net/ThiefMaster/LPh33/4/
        
        var index = scope.$parent.$index;
        scope.element = element;
        scope.index = index;
        
        setPos(scope);

        scope.show = true;
        
    };

    var controller = function ($scope, $rootScope) {
        var _this = this;
        this.pos = $scope.pos;
        this.index = $scope.index;
        
        
        $scope.$on('update',function(){
            _this.pos = $scope.pos;
            _this.index = $scope.index;
        });
        
        $rootScope.$on('update circular menu', function(){
            setPos($scope);
        });
        
        this.class = function(){
            return circle_settings.get('btnclass');
        };
        
        this.onClick = function(){
            $scope.click();
        };
    };

    return {
        restrict: 'AE',
        link: linker,
        controller: ['$scope', '$rootScope', controller],
        controllerAs: 'cirItCtrl',
        scope: {
            click: '&',
            content: '='
        },
        replace: true,
        template: '<span ng-show="show" ng-class="cirItCtrl.class()" ng-click="cirItCtrl.onClick()">{{content}}</span>'
    };
})


;