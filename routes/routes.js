module.exports = function(express, app, formidable, fs, os, gm, knoxClient, mongoose, io) {
  var Socket;
  io.on('connection', function(socket){
    Socket = socket;
  });

  var singleImage = mongoose.Schema({
    filename:String,
    votes:Number
  });
  var singleImageModel = mongoose.model('singleImage', singleImage);

  var router = express.Router();
  router.get('/', function(req, res, next){
    res.render('index', {host: app.get('host')});
  });

  router.post('/upload', function(req, res, next){
    // File upload
    function generateFilename(filename){
      var ext_regex = /(?:\.([^.]+))?$/;
      var ext = ext_regex.exec(filename)[1];
      var date = new Date().getTime();
      var charBank = 'abcdefghijklmnopqrstuvwxyz';
      var fstring = '';
      for(var i =0; i < 15; i++){
        fstring += charBank[parseInt(Math.random()*26)];
      }
      return (fstring += date + '.' + ext);
    }
    var tmpFile, nFile, fname;
    var newForm = new formidable.IncomingForm();
    newForm.keepExtensions = true;
    newForm.parse(req, function(err, fields, files){
      tmpFile = files.upload.path;
      fname = generateFilename(files.upload.name);
      nfile = os.tmpDir() + '/' + fname;
      res.writeHead(200, {'Content-type': 'text/plain'});
      res.end();
    });

    newForm.on('end', function(){
      fs.rename(tmpFile, nfile, function(){
        // Resize the image.
        gm(nfile).resize(300).write(nfile, function(err){
          if(err) console.log(err);
          fs.readFile(nfile, function(err, buf){
            var req = knoxClient.put(fname, {
              'Content-Length': buf.length,
              'Content-Type': 'image/jpeg'
            });
            req.on('response', function(res){
              if(200 == res.statusCode){
                // Upload to S3 bucket successful.
                var newImage = singleImageModel({
                  filename: fname,
                  votes: 0
                });
                //console.log(newImage._id);
                newImage.save();
                Socket.emit('status', {'msg': 'Saved!!', 'delay': 3000});
                Socket.emit('doUpdate', {'id': newImage._id});
                fs.unlink('nfile', function(){
                  console.log('Local file deleted.');
                });
              }
            });
            req.end(buf);
          });
        });
      });
    });
  });
  router.get('/getimages', function(req, res, next){
    var qs = req.query;
    if(qs.id){
      //only get the most recent image
      var selector = {'_id': qs.id};
    } else if(qs.full) {
      var selector = {};
    }
    singleImageModel.find(selector, null, {sort: {votes: -1}}, function(err, result){
      res.send(JSON.stringify(result));
    });
  });
  router.get('/voteup/:id', function(req, res, next){
    singleImageModel.findByIdAndUpdate(req.params.id, {$inc: {'votes': 1}}, {new: true}, function(err, result){
      if(err) console.log(err);
      console.log("id %s, votes %d", req.params.id, result.votes);
      res.send(200, {votes: result.votes})
    })
  });
  app.use('/', router);
}
