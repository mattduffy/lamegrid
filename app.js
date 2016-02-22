'use strict';

var express = require('express'),
  path = require('path'),
  config = require('./config/config.js'),
  knox = require('knox'),
  fs = require('fs'),
  os = require('os'),
  formidable = require('formidable'),
  gm = require('gm'),
  mongoose = require('mongoose').connect(config.dburl)

var app = express();
app.set('views', path.join(__dirname, 'views'));
app.engine('html', require('hogan-express'));
app.set('view engine', 'html');

app.use(express.static(path.join(__dirname, 'public')));
app.set('port', process.env.PORT || 3000);
app.set('host', config.host);

var knoxClient = knox.createClient({
  key: config.accessKey,
  secret: config.secretKey,
  bucket: config.s3Bucket
});

var server = require('http').createServer(app);
var io = require('socket.io')(server);

require('./routes/routes.js')(express, app, formidable, fs, os, gm, knoxClient, mongoose, io);

server.listen(app.get('port'), function(){
  console.log('Photogird running on port %d', app.get('port'));
});
