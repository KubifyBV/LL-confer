var fs = require('fs'),
    https = require('https'),
    discuss = require('./discuss');

var settings_auth = JSON.parse(fs.readFileSync('./node/data/settings.auth.json', "utf8"));

module.exports = {
    call: call
}

function call(req, res){
    console.log('call', req.params.end, req.params.sub, req.header('Authorization'));
    var endpoint = req.params.end;
    var sub = req.params.sub
    var auth_scheme = "OIDC";
    var accessToken = req.header('Authorization');
    
    switch(endpoint){
        case 'settings':
            if(sub && sub == 'auth'){
                get_settings_auth(auth_scheme, sub, res);
            }else{
                //todo serve general settings
            }
            break;
        case 'login':
            get_auth_authorise(auth_scheme, req, res);
            break;
        case 'auth':
            get_auth(auth_scheme, req, res);
            break;
        case 'profile':
            get_auth_profile(auth_scheme, req, res, accessToken);
            break;
        case 'refresh':
            token_refresh(auth_scheme, req, res);
            
//            array(
//            'grant_type'=>'refresh_token',
//            'refresh_token' => $refresh_token
//        );
            
            break;
        default:
    }
}

function get_settings_auth(scheme, sub, res){

    if(sub && settings_auth[scheme] && settings_auth[scheme][sub] && settings_auth[scheme][sub].public){        
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(settings_auth[scheme][sub]));
    }else{
        res.status(404)        // HTTP status 404: NotFound
            .send('Not found');
    }
    
}

function fetch_profile(scheme, accessToken, callback){
    var options = {
        host: settings_auth[scheme].auth.endpoint,
        path: settings_auth[scheme].auth.endpoint_userinfo,
        headers: { Authorization: accessToken }
    };
    https.get(options, callback);
}

function update_user(scheme, token_result){
    fetch_profile(scheme, 'Bearer '+token_result.access_token, function(response){
        var str = ''
        response.on('data', function (chunk) {
          str += chunk;
        });

        response.on('end', function () {
            var profile = JSON.parse(str);
            console.log('update_user', token_result, profile);
            discuss.oauth_user(profile, token_result);
            
        });
        
    });
    
    
}

function get_auth_profile(scheme, req, res, accessToken){
    fetch_profile(scheme, accessToken, function(response){
        console.log('Response is '+response.statusCode);
        var str = ''
        response.on('data', function (chunk) {
          str += chunk;
        });

        response.on('end', function () {
            res.setHeader('Content-Type', 'application/json');
            var profile = JSON.parse(str);
            
            console.log('get_auth_profile', accessToken, profile);
            profile.user_code = profile.sub;//TEMP
            res.send(JSON.stringify(profile));
        });
    });
}

function get_oauth2(scheme){
    var credentials = {
        clientID: settings_auth[scheme].auth.client_id,
        clientSecret: settings_auth[scheme].auth_private.client_secret,
        site: settings_auth[scheme].auth.provider,
        authorizationPath: settings_auth[scheme].auth.provider_path,
        tokenPath: settings_auth[scheme].auth.endpoint_token,
        revocationPath: '/oauth2/revoke'
    };
    return require('simple-oauth2')(credentials);
}

function get_auth_authorise(scheme, req, res){
    var oauth2 = get_oauth2(scheme);
    var redirect_uri = req.protocol + '://' + req.get('host') + '/api/auth';
    var authorization_uri = oauth2.authCode.authorizeURL({
        redirect_uri: redirect_uri,//'http://localhost:1337/api/auth',
        scope: settings_auth[scheme].auth.scope,
        state: req.query.state
    });

    // Redirect example using Express (see http://expressjs.com/api.html#res.redirect)
    res.redirect(authorization_uri);
}

function get_auth(scheme, req, res){    
    var oauth2 = get_oauth2(scheme);
    var redirect_uri = req.protocol + '://' + req.get('host') + '/api/auth';
    var token;
    oauth2.authCode.getToken({
      code: req.query.code,
      redirect_uri: redirect_uri//'http://localhost:1337/api/auth'
    }, function(error, result) {
        if (error) { console.log('Access Token Error', error.message); }
        
        token = oauth2.accessToken.create(result);
        console.log('api:get_auth',result,token);
        update_user(scheme, result);
        
        result.state = req.query.state || '';
//        
//        
//        
//        get_auth_profile(req, res, result.access_token);
//        
        //access_token must come first:
        var querystring = require('querystring');
        res.redirect('/#/'+querystring.stringify(result));
    });

    // Save the access token
};
    
function token_refresh(scheme, req, res){
    var refresh_token = req.query.refresh_token;
    var oauth2 = get_oauth2(scheme);
    var tmp_token = {
        access_token: '',
        refresh_token: refresh_token,
        expires_in: 0
    };
    
      // Create the access token wrapper
    var token = oauth2.accessToken.create(tmp_token);

    // Check if the token is expired. If expired it is refreshed.
    token.refresh(function(error, result) {
        token = result;
        res.send(token);        
    });
}
    
   