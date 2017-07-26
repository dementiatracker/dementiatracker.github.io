// Global Configuration
var g_DEVICE_IDS = {
  "T01": "20fc7f",
  "T02": "20fdd2",
  "T03": "21002c"
};
var g_PATIENT_ID = null;
var g_DEVICE_ID  = null;

// Helper Functions
function getUrlParameter(name) {
    name        = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex   = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
};

function sendAlarm(msg) {
  $('#myinfo').text(msg).addClass('alert-danger').removeClass('alert-success').removeClass('alert-warning');
}
function showMsg(msg) {
  $('#myinfo').text(msg).addClass('alert-success').removeClass('alert-danger').removeClass('alert-warning');
}

function getMapUpdater(myMap) {
  var myMarker  = null;
  var myPolygon = null;

  return function(timestamp, lat, lng) {
    if(!timestamp || ! lat || ! lng) {
      return;
    }

    if(myMarker === null) {
      myMarker = myMap.addMarker({
        label: 'Patient ' + g_PATIENT_ID,
        lat:   lat,
        lng:   lng
      });
    }

    myMarker.setPosition(new google.maps.LatLng(lat, lng));
  };
}

function showPatientOnMap(updateMap, results, timestamps) {
  var i   = 0;
  var len = timestamps.length;

  var prefix = 'Patient ' + g_PATIENT_ID + ' (with ' + timestamps.length + ' data points): ';

  var myTimer = setInterval(function() {
    if(i >= len) {
      clearInterval(myTimer);
      showMsg(prefix + 'All data are shown');
      return;
    }

    var timestamp = timestamps[i++];

    // update info bar
    showMsg(prefix + moment(parseInt(timestamp)).format());

    var item = results[timestamp];
    if(! ('lat' in item) || ! ('lng' in item)) return;

    updateMap(timestamp, item['lat'], item['lng']);
  }, 1000);
}

function fitMapBounds(results, timestamps) {
  var myMap = null;

  var bounds = new google.maps.LatLngBounds();
  timestamps.forEach(function(timestamp) {
    var item = results[timestamp];

    if(! ('lat' in item) || ! ('lng' in item)) return;

    if(myMap === null) {
      myMap = new GMaps({
        div:     '#mymap',
        mapType: 'map',
        lat:     item['lat'],
        lng:     item['lng'],
      });
    }

    bounds.extend(new google.maps.LatLng(item['lat'], item['lng']));
  });

  if(myMap !== null) {
    myMap.fitBounds(bounds);
  }

  return myMap;
}

function getData() {
  var result = {};

  $.getJSON('http://ec2-34-210-200-155.us-west-2.compute.amazonaws.com/geodata/' + g_DEVICE_ID)
   .done(function(data) {
     if('code' in data && data['code'] == 200) {
       delete data['code'];

       var timestamps = Object.keys(data);
       if(timestamps.length <= 0) {
         sendAlarm('Empty data for patient ' + g_PATIENT_ID);
         return;
       }
       timestamps.sort();

       var myMap = fitMapBounds(data, timestamps);
       if(myMap === null) {
         sendAlarm('Not enough data for patient ' + g_PATIENT_ID);
         return;
       }

       var updateMap = getMapUpdater(myMap);
       showPatientOnMap(updateMap, data, timestamps);
     }
     else {
       sendAlarm('Backend error when getting info for patient ' + g_PATIENT_ID);
       return;
     }
  })
  .fail(function() {
    sendAlarm('Failed to get info for patient ' + g_PATIENT_ID);
    return;
  });
}

// Init Function
function init() {
  var patientID = getUrlParameter('patient');

  if(! (patientID in g_DEVICE_IDS)) {
    sendAlarm('Invalid patient id (?patient=T01/T02/T03)');
    return;
  }

  g_PATIENT_ID = patientID;
  g_DEVICE_ID  = g_DEVICE_IDS[g_PATIENT_ID];

  getData();
}

$(document).ready(init);
