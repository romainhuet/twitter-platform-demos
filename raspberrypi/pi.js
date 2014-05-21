/**
 * Twitter APIs & Raspberry Pi Demo.
 * Romain Huet
 * @romainhuet
 */

'use strict';

var fs = require('fs');
var path = require('path');
var request = require('request');
var RaspiCam = require('raspicam');
var config = require('./config');
var hasTweeted = false;

// Post a picture to Twitter using the corresponding API endpoint.
function tweetPicture(tweet, filename, callback) {
  // Create the POST request to the endpoint with the OAuth credentials.
  var r = request.post({
    url: 'https://api.twitter.com/1.1/statuses/update_with_media.json',
    oauth: {
      consumer_key: config.consumer_key,
      consumer_secret: config.consumer_secret,
      token: config.access_token,
      token_secret: config.access_token_secret
    }
  }, callback);
  // Add the form data, including a readable stream for the picture to upload.
  // Note: The request `r` is a writable stream.
  var form = r.form();
  form.append('status', tweet);
  form.append('media[]', fs.createReadStream(path.join(__dirname, filename)));
  return form;
};

// Handle pictures taken by the Raspberry Pi camera.
function handlePicture(filename) {
  // Let's tweet only the first picture for this demo.
  if (!hasTweeted) {
    console.log('Preparing to tweet the picture...');
    hasTweeted = true;
    var tweet = 'Selfie from stage with the great people at #apistrat, tweeted by a Raspberry Pi!';
    tweetPicture(tweet, filename, function(error, response, body) {
      if (!error && response.statusCode == 200) {
        var data = JSON.parse(body);
        var url = 'https://twitter.com/' + data.user.screen_name + '/status/' + data.id_str;
        console.log('Tweet posted!', url);
      }
    });
  }
}

// Initialize the Raspberry Pi Camera object.
var camera = new RaspiCam({
  mode: 'photo',
  output: './photo-%04d.jpg',
  encoding: 'jpg',
  timeout: 20000,
  timelapse: 10000,
  quality: 100,
  width: 1600,
  height: 1200
});

// Listen to the camera `start` event.
camera.on('start', function(err, timestamp) {
  console.log('Camera started at', new Date(timestamp));
});

// Listen to the camera `read` event.
camera.on('read', function(err, timestamp, filename) {
  console.log('Camera image captured with filename', filename);
  // Hack to make sure our file does not get moved while uploading.
  setTimeout(function() {
    filename = filename.replace('.jpg~', '.jpg');
    // Tweet the picture!
    handlePicture(filename);
  }, 7000);
});

// Listen to the camera `exit` event.
camera.on('exit', function(timestamp) {
  console.log('Camera child process has exited at', new Date(timestamp));
});

// Start monitoring the camera!
camera.start();
