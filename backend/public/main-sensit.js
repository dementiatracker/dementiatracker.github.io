// Global Configuration
var g_DEVICE_IDS = {
  "T01": "20fc7f",
  "T02": "20fdd2",
  "T03": "21002c"
};
var g_PATIENT_ID = null;
var g_DEVICE_ID  = null;

var g_DATA       = null;
var g_DATA_KEYS  = null;

var g_MAP        = null;
var g_MARKER     = null;

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
  $('#myinfo').html(msg).addClass('alert-success').removeClass('alert-danger').removeClass('alert-warning');
}

function showPatientOnMap(timestamp) {
  if(g_MAP === null || ! (timestamp in g_DATA)) return;

  var item = g_DATA[timestamp];
  if(! ('lat' in item) || ! ('lng' in item)) return;

  if(g_MARKER === null) {
    g_MARKER = g_MAP.addMarker({
      lat:  item['lat'],
      lng:  item['lng'],
      icon: {
        url:         "http://labs.google.com/ridefinder/images/mm_20_red.png",
        size:        new google.maps.Size(12, 20),
        scaledSize:  new google.maps.Size(12, 20),
        labelOrigin: new google.maps.Point(0, 30)
      }
    });
  }

  g_MARKER.setPosition(new google.maps.LatLng(item['lat'], item['lng']));
  g_MARKER.setLabel({
    text:  moment.utc(parseInt(timestamp)).format("YYYY-MM-DD HH:mm:ss"),
    color: "blue"
  });
}

function fitMapBounds() {
  var bounds = new google.maps.LatLngBounds();

  g_DATA_KEYS.forEach(function(timestamp) {
    var item = g_DATA[timestamp];

    if(! ('lat' in item) || ! ('lng' in item)) return;

    if(g_MAP === null) {
      g_MAP = new GMaps({
        div:     '#mymap',
        mapType: 'map',
        lat:     item['lat'],
        lng:     item['lng'],
      });
    }

    bounds.extend(new google.maps.LatLng(item['lat'], item['lng']));
  });

  if(g_MAP !== null) {
    g_MAP.fitBounds(bounds);
  }
}

function getData() {
  showMsg('Loading data for patient' + g_PATIENT_ID);

  $.getJSON('http://ec2-34-210-200-155.us-west-2.compute.amazonaws.com/geodata/' + g_DEVICE_ID)
   .done(function(data) {
     if('code' in data && data['code'] == 200) {
       g_DATA = data;
       delete g_DATA['code'];

       g_DATA_KEYS = Object.keys(g_DATA);
       if(g_DATA_KEYS.length <= 0) {
         sendAlarm('Empty data for patient ' + g_PATIENT_ID);
         return;
       }
       g_DATA_KEYS.sort();

       showMsg('Patient ' + g_PATIENT_ID + ' (with ' + g_DATA_KEYS.length + ' data points loaded)<br/>' +
               'From ' + moment.utc(parseInt(g_DATA_KEYS[0                     ])).format("YYYY-MM-DD HH:mm:ss") +
               ' to '  + moment.utc(parseInt(g_DATA_KEYS[g_DATA_KEYS.length - 1])).format("YYYY-MM-DD HH:mm:ss"));

       fitMapBounds();
       if(g_MAP === null) {
         sendAlarm('Not enough data for patient ' + g_PATIENT_ID);
         return;
       }

       showPatientOnMap(getCurrentTimeStamp());
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

function getCurrentTimeStamp() {
  var sliderVal = $('#myslider').slider("value");

  if(g_DATA_KEYS === null) return null;

  var pos = Math.floor(g_DATA_KEYS.length * sliderVal / 100);
  if(pos < 0) pos = 0;
  if(pos >= g_DATA_KEYS.length) pos = g_DATA_KEYS.length - 1;

  return g_DATA_KEYS[pos];
}

function refreshMap() {
  showPatientOnMap(getCurrentTimeStamp());
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

  document.title = 'Dementia Tracker - Patient ' + g_PATIENT_ID;
  $('.navbar-header a').text(document.title);

  $("#myslider").slider({
    orientation: "horizontal",
    range:       "min",
    max:         100,
    value:       0,
    slide:       refreshMap,
    change:      refreshMap
  });
  $("#myslider").slider("value", 0);

  getData();
}

$(document).ready(init);
