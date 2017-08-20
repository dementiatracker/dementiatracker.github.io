'use strict';

const querystring = require('querystring');
const request     = require("request");

const SMS_NUMBER         = "6590050578";
const GOOGLE_MAP_URL     = "https://maps.google.com/?q=";

const HOIIO_URL          = "https://secure.hoiio.com/open/sms/send?";
const HOIIO_APP_ID       = "2CZ2EdRbmL0uDDmB";
const HOIIO_ACCESS_TOKEN = "3gDMuaBD1pUkp6qo";

function sendSMS(phone, message) {
    var url = HOIIO_URL + querystring.stringify({
        "app_id":       HOIIO_APP_ID,
        "access_token": HOIIO_ACCESS_TOKEN,
        "dest":         phone,
        "msg":          message
    });
    console.log("Sending request to HOIIO: " + url);
    
    request(url, function (error, response, body) {
        if (error) {
            console.error(error);
        } else {
            if(response.statusCode !== 200 || body.indexOf("success_ok") == -1) {
                console.error("Failed to do HOIIO request: "+ body);
            } else {
                console.log("SMS was sent to " + phone);
            }
        }
    });
}

function processData(device, data, lat, lng) {
  if(data.length < 2) return;

  var byte1 = parseInt(data.substring(0,2), 16);
  var type = (byte1 & 96) >> 5;

  if(type == 1) {
      console.log("button is pressed: device=", device);

      var message = "";
      if(lat === null || lng === null) {
          message = "!!!ALERT!!! " + device + " is calling for help!";
      } else {
          message = "!!!ALERT!!! " + device + " is calling for help! " + GOOGLE_MAP_URL + lat + "," + lng;
      }

      sendSMS(SMS_NUMBER, message);
  } else {
      console.log("button is not pressed, type=" + type + ", device=" + device);
  }
}

exports.handler = (event, context, callback) => {
    console.log("Entering SensitButtonPressed...");

    try {
        // if(event.domain) delete event.domain;
        // console.log('Event:', JSON.stringify(event, null, 2));
        // console.log('Context:', context);
        
        if(event.current  && event.current.state   && event.current.state.reported  &&
           event.previous && event.previous.state  && event.previous.state.reported &&
           event.current.state.reported.data       &&
           event.current.state.reported.device     &&
           event.current.state.reported.seqNumber  &&
           event.previous.state.reported.seqNumber &&
           event.current.state.reported.seqNumber > event.previous.state.reported.seqNumber) {
            var device = event.current.state.reported.device;
            var data   = event.current.state.reported.data;
            // console.log("Found 'data' field:", JSON.stringify(data, null, 2));
            
            if(event.current.state.reported.deviceLat &&
               event.current.state.reported.deviceLng) {
                processData(device, data, 
                            event.current.state.reported.deviceLat, 
                            event.current.state.reported.deviceLng);
            } else {
                processData(device, data, null, null);
            }
        } else {
            console.log("No expected 'data' or 'device' field was found OR 'seqNumber' was not increased");
        }
        callback(null);
    } catch(err) {
        console.error(err.message);
        callback(err);
    }

    console.log("Leaving SensitButtonPressed...");
};
