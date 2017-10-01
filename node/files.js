var fs = require('fs-extra');

module.exports = {
    delete_item_folder: delete_item_folder,
    get_file: get_file
    
}

function delete_item_folder(slug) {
    var basePath = __dirname + '/files/';
    var path = basePath + slug + '/';
    
    if( fs.existsSync(path) ) {
        fs.removeSync(path);
    }
};

function get_file(req, res) {
    var id = req.params.id;
    var options = {
        root: __dirname + '/files/' + id + '/',
        dotfiles: 'deny',
        headers: {
            'x-timestamp': Date.now(),
            'x-sent': true
        }
    };

    var fileName = req.params.fn;
    res.sendFile(fileName, options, function (err) {
        if (err) {
            console.log(err);
            res.status(err.status).end();
        }
        else {
            console.log('Sent:', fileName);
        }
    });
};