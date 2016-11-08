var express = require('express');
var request = require('request');
var mongo = require('mongodb').MongoClient;
require('dotenv').config();

var app = express();
var API_URL = 'https://api.datamarket.azure.com/Bing/Search/v1/Image';
var DB_URL = process.env.DB_URL;
var API_KEY = process.env.API_KEY;


app.use(express.static('./public'));

app.get('/api/search', function (req, res) {
  var reqUrl = req.url;
  var searchTerm = req.query.q;
  var skip = 0;

  if (req.query.offset) {
    skip = Number(req.query.offset);
  }

  var query = '?Query=%27' + searchTerm + '%27' + '&$format=json' + '&$skip=' + skip;

  var options = {
    uri: API_URL + query,
    auth: {
      user: API_KEY,
      pass: API_KEY
    }
  };

  var temp = '';
  request(options)
    .on('response', function (response) {

      response.on('data', function (data) {
        temp += data;
      });

    })
    .on('end', function () {

      var results = JSON.parse(temp).d.results.map(function (item) {
        return {
          title: item.Title,
          imageUrl: item.MediaUrl,
          pageUrl: item.SourceUrl
        };
      });

      saveToDb({
        searchTerm: searchTerm,
        offset: skip,
        queryUrl: reqUrl,
        time: new Date()
      });

      res.send(results);
      res.end();

    });
});

app.get('/latest', function(req, res){
  mongo.connect(DB_URL, function(err, db){
    if(err) console.error(err);
    db.collection('history').find({}, {_id: 0}, function(err, cursor){
      if(err) console.error(err);
      cursor.toArray(function(err, arr){
        if(err) console.error(err);
        db.close();
        res.send(arr);
        res.end();
      });
    });
  });
});

app.listen(process.env.PORT || 8080);


function saveToDb(obj) {
  mongo.connect(DB_URL, function (err, db) {
    if (err) throw err;
    var urls = db.collection('history');

    urls.insertOne(obj, function (err, result) {
      if (err) throw err;
      db.close();
    });

  });
}
