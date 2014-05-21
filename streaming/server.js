/**
 * Twitter Streaming APIs Demos.
 * Romain Huet
 * @romainhuet
 */

'use strict';

var fs = require('fs');
var path = require('path');
var server = require('http').createServer(handler);
var io = require('socket.io').listen(server);
var Twitter = require('twit');
var config = require('./config');

// Twitter client initialization.
var twitter = new Twitter(config);

// Listen on port 3000.
server.listen(3000);
console.log('Listening on port 3000');

// Handler for the server to return the proper HTML files.
function handler(req, res) {
  var file = path.join(__dirname, 'count.html');
  if (req.url.indexOf('custom') !== -1) {
    file = path.join(__dirname, 'custom.html');
  } else if (req.url.indexOf('geolocation') !== -1) {
    file = path.join(__dirname, 'geolocation.html');
  } else if (req.url.indexOf('assets') !== -1) {
    file = path.join(path.dirname(__dirname), req.url);
  }
  fs.readFile(file, function(err, data) {
    if (err) {
      res.writeHead(404);
    } else {
      res.writeHead(200);
      res.end(data);
    }
  });
}

io.set('log level', 0);

// Socket connection.
io.sockets.on('connection', function(socket) {

  // Listen to the `stream` event.
  socket.on('stream', function(params) {
    var endpoint = params.endpoint || 'statuses/filter';
    var options = {};
    if (params.keywords) {
      options.track = params.keywords;
    }
    if (params.locations) {
      options.locations = params.locations;
    }
    if (params.users) {
      options.follow = params.users;
    }
    if (params.language) {
      options.language = params.language;
    }

    // Subscribe to the stream of Tweets matching the specified options.
    var stream = twitter.stream(endpoint, options);

    // Listen to the `connect` event.
    stream.on('connect', function(params) {
      console.log('Streaming from the Twitter API...');
    });

    // Emit an event with the Tweet information.
    stream.on('tweet', function(tweet) {
      io.sockets.emit('tweet', tweet);
    });

    // Listen to the `disconnect`/`stop` events to destroy the connection.
    socket.on('disconnect', function(params) {
      console.log('Streaming ended (disconnected).');
      stream.stop();
    });
    socket.on('stop', function(params) {
      console.log('Streaming ended (stopped).');
      stream.stop();
    });
  });

  // Listen to the `timeline` event.
  socket.on('timeline', function(params) {
    if (params.action === 'add' && params.timelineId && params.tweetId) {
      // Note: Access to the Custom Timelines API Beta is needed for this call.
      twitter.post('beta/timelines/custom/add', {
        id: params.timelineId,
        tweet_id: params.tweetId
      },
      function(err, data) {
        if (!err && data) {
          console.log('Tweet added to the Custom Timeline.');
        }
      });
    }
  });
});
