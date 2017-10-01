angular.module('discuss.tools', [])

.directive('focusOn', function() {
   return function(scope, elem, attr) {
      scope.$on('focusOn', function(e, name) {
        //  console.log('focusOn', name, attr.focusOn, name === attr.focusOn, elem);
        if(name === attr.focusOn) {
          elem[0].focus();
        }
      });
   };
})

.factory('focus', function ($rootScope, $timeout) {
  return function(name) {
    $timeout(function (){
      $rootScope.$broadcast('focusOn', name);
    });
  }
})

.filter('capitalize', function() {
    return function(input, scope) {
        if (input){
          input = input.toLowerCase();
          return input.substring(0,1).toUpperCase()+input.substring(1);
        }
        return '';
    };
})

.filter('extension', function(){
    return function(input){
        var re = /(?:\.([^.]+))?$/;
        var res = re.exec(input);
        if(res.length > 1){
            return re.exec(input)[1];
        }
        return '';                
    }

})

.filter('replace', function () {
    return function(str, pattern, replacement, global){
        global = (typeof global === 'undefined' ? true : global);
        try {
          return (str || '').replace(new RegExp(pattern,global ? "g": ""),function(match, group) {
            return replacement;
          });  
        } catch(e) {
          console.error("error in string.replace", e);
          return (str || '');
        }     
    };
})

.filter('moment', function() {
    return function(dateString, format) {
        if(format === 'fromNow'){
            return moment(dateString).fromNow();
        }else{
            return moment(dateString).format(format);
        }
    };
})
    
.filter('rightarchive', function () {
    return function (items, left_item) {

        var filterarr = [];
        if(left_item){
            angular.forEach(items, function (item) {
                if (item.archive_key < left_item.archive_key) {
                    filterarr.push(item);
                }
            });
        }
        return filterarr;
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


.directive('discuss-fill', function ($window) {
    return {
        restrict: 'A',
        link: function (scope, element) {

            function getComputedStyle(element, styleProp) {
                var r = '';
                if (element.currentStyle) {
                    r = element.currentStyle[styleProp];
                } else if ($window.getComputedStyle) {
                    r = $window.getComputedStyle(element, null).getPropertyValue(styleProp);
                }
                return r;
            }
            function getComputedSize(element, styleProp) {
                var r = getComputedStyle(element, styleProp);
                if (r.indexOf('px') > 0)
                    r = r.substring(0, r.length - 2);
                return r | 0;
            }

            function getRestHeights(element) {
                var before = true;
                var total = 0;
                var pChildren = element.parentNode.childNodes;
                for (var i = 0; i <= pChildren.length; i++) {
                    if (before)
                        before = pChildren[i] != element;
                    else {
                        if (pChildren[i]) {
                            if (pChildren[i].nodeType == 1)
                                console.log(getComputedStyle(pChildren[i], 'display'));
                            if (
                                    pChildren[i].nodeType == 1
                                    && getComputedStyle(pChildren[i], 'display') != 'none'
                                    && getComputedStyle(pChildren[i], 'position') != 'absolute'
                                    )
                                total += pChildren[i].scrollHeight | 0;
                        }
                    }
                }
                // console.log("Height of", element,total)
                return total;
            }

            function calcBottomPaddings(element) {
                var total = 0;
                total += getComputedSize(element, 'padding-bottom');
                total += getComputedSize(element, 'margin-bottom');
                if (element.parentNode && element.parentNode.nodeType == 1) {
                    total += calcBottomPaddings(element.parentNode);
                    total += getRestHeights(element);
                }
                return total;
            }

            function applySize() {
                var height = 0;
                var body = window.document.body;
                if (window.innerHeight) {
                    height = window.innerHeight;
                } else if (body.parentElement.clientHeight) {
                    height = body.parentElement.clientHeight;
                } else if (body && body.clientHeight) {
                    height = body.clientHeight;
                }
                var paddings = calcBottomPaddings(element[0]);
                var resultHeight = (height - element[0].offsetTop - paddings);
                element[0].style.height = resultHeight + "px";
            }
            function onResize() {
                scope.$apply(function () {
                    applySize();
                });
            }
            angular.element($window).bind('resize', onResize);
            applySize();
            scope.$on('destroy', function () {
                angular.element($window).unbind('resize', onResize);
            })
        }
    }
});