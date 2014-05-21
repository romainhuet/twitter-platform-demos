/**
 * Twitter APIs & AR.Drone Demo.
 * Romain Huet
 * @romainhuet
 */

'use strict';

// Drone initialization.
var arDrone = require('ar-drone');
var drone = arDrone.createClient();

var isFlying = false;

// Fly the drone for a little demo.
function flyDrone() {
    isFlying = true;
    drone.takeoff();
    drone
      .after(3000, function() {
        this.up(0.25);
      })
      .after(2000, function() {
        this.clockwise(0.5);
        this.animateLeds('snakeGreenRed', 5, 5);
      })
      .after(4000, function() {
        this.animate('flipRight', 15);
      })
      .after(1000, function() {
        this.stop();
        this.land();
        isFlying = false;
      });
}

// Twitter client initialization.
var Twitter = require('twit');
var config = require('./config');
var twitter = new Twitter(config);

// Reply to a Tweet with a given status.
function replyToTweet(tweet, status) {
  twitter.post('/statuses/update', {
    status: '@' + tweet.user.screen_name + ' ' + status,
    in_reply_to_status_id: tweet.id_str
  }, function(err, data) {
    if (!err && data) {
      var url = 'https://twitter.com/' + data.user.screen_name + '/status/' + data.id_str;
      console.log('The drone replied to the Tweet!', url);
    }
  });
}

// Subscribe to the stream of Tweets mentioning @twicopter or the event hashtag.
var stream = twitter.stream('statuses/filter', { track: '@twicopter,#apistrat' });

// Handle every new Tweet coming in.
stream.on('tweet', function(tweet) {
  var text = tweet.text.toLowerCase();
  // Look for commands in the Tweet text.
  if (text.indexOf('takeoff') !== -1 || text.indexOf('take off') !== -1 || text.indexOf('fly') !== -1) {
    if (!isFlying) {
      // Tweet received for `takeoff`, and not currently flying!
      var status = 'Thank you, Tweet received. Taking off now!';
      console.log(status);
      // Takeoff!
      flyDrone();
      // Reply to the Tweet.
      replyToTweet(tweet, status);
    } else {
      // Tweet received for `takeoff`, drone already flying!
      var status = 'Thank you, Tweet received. Already flying but hold on for a little flip!';
      console.log(status);
      // Reply to the Tweet.
      replyToTweet(tweet, status);
    }
  }
});

// Create a server for the camera stream.
var fs = require('fs');
var http = require('http');
var path = require('path');
var droneStream = require('dronestream');
var server = http.createServer(function(req, res) {
  var file = __dirname + '/drone.html';
  if (req.url.indexOf('assets') !== -1) {
    file = path.join(path.dirname(__dirname), req.url);
  }
  fs.createReadStream(file).pipe(res);
});

// Visit http://localhost:5555/ to see the page.
droneStream.listen(server);
server.listen(5555);
