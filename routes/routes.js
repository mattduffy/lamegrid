module.exports = function(express, app) {
  var router = express.Router();

  router.get('/', function(req, res, next){
    res.render('index', {host: app.get('host')});
  });
  app.use('/', router);
}
