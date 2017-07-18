// Global Configuration
var g_DEVICE_ID = "2C30EB";
var g_FIREBASE_CONFIG = {
  apiKey:            "AIzaSyD3n4NrSvLypn1Dlho0xQRjXx5dHWaaCdk",
  authDomain:        "unatumblertest.firebaseapp.com",
  databaseURL:       "https://unatumblertest.firebaseio.com",
  storageBucket:     "unatumblertest.appspot.com",
  messagingSenderId: "612176680517",
};
var g_MESSAGES = {
  insideOfSafeZone: "Patient Richard is safe now.",
  outOfSafeZone:    "Heads up! Patient Richard is out of Safe Zone now."
};
var g_safeZoneSize = 0.001;

// Global Objects
var g_locator = null;

// Helper Functions
function getUrlParameter(name) {
    name        = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex   = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
};

function sendAlarm(msg) {
  $('#myinfo').text(g_MESSAGES[msg]).addClass('alert-danger').removeClass('alert-success').removeClass('alert-warning');
}
function showMsg(msg) {
  $('#myinfo').text(g_MESSAGES[msg]).addClass('alert-success').removeClass('alert-danger').removeClass('alert-warning');
}

function getDataFromFirebase(db, ref, cb) {
  db.ref(ref).on('value', function(data) {
    cb(data.val());
  });
}
function getDeviceLat(db, cb) {
  if(getUrlParameter('demo') === '1') {
    cb(1.3188503);
  } else {
    getDataFromFirebase(db, 'result/' + g_DEVICE_ID + '/deviceLat', cb);
  }
}
function getDeviceLng(db, cb) {
  if(getUrlParameter('demo') === '1') {
    cb(103.9053666);
  } else {
    getDataFromFirebase(db, 'result/' + g_DEVICE_ID + '/deviceLng', cb);
  }
}

function checkPosition(myMap, myPos, myPolygon) {
  setTimeout(function() {
    if(myMap.checkGeofence(myPos.latitude, myPos.longitude, myPolygon)) {
      showMsg("insideOfSafeZone");
    } else {
      sendAlarm("outOfSafeZone");
    }
  }, 100)
}

function getMapUpdater() {
  var myMap     = null;
  var myMarker  = null;
  var myPolygon = null;

  return function(lat, lng) {
    if(! lat || ! lng) {
      return;
    }

    if(myMap === null) {
      myMap = new GMaps({
        div:     '#mymap',
        mapType: 'satellite',
        lat:     lat,
        lng:     lng,
        zoom:    17
      });
    }

    if(myMarker === null) {
      myMarker = myMap.addMarker({
        label:     'Patient Richard',
        lat:       lat,
        lng:       lng
      });
    }

    myMap.setCenter(lat, lng);
    myMarker.setPosition(new google.maps.LatLng(lat, lng));

    // Draw polygon
    if(myPolygon != null) {
      myPolygon.setMap(null);
    }

    var points = [
      [lat - g_safeZoneSize, lng - g_safeZoneSize],
      [lat - g_safeZoneSize, lng + g_safeZoneSize],
      [lat + g_safeZoneSize, lng + g_safeZoneSize],
      [lat + g_safeZoneSize, lng - g_safeZoneSize]
    ];

    var path=[];
    for(var i in points){
      path.push(new google.maps.LatLng(points[i][0], points[i][1]));
    }

    myPolygon = myMap.drawPolygon({
      paths: path,
      strokeColor: '#BBD8E9',
      strokeOpacity: 1,
      strokeWeight: 3,
      fillColor: '#BBD8E9',
      fillOpacity: 0.6
    });

    // update info bar
    showMsg("insideOfSafeZone");

    // hook button
    $('#btn_out').click(function() {
      var newPos = new google.maps.LatLng(lat - g_safeZoneSize - 0.0001, lng);
      myMarker.setPosition(newPos);
      sendAlarm("outOfSafeZone");
      //checkPosition(myMap, newPos, myPolygon);
    });
    $('#btn_in').click(function() {
      var newPos = new google.maps.LatLng(lat, lng);
      myMarker.setPosition(newPos);
      showMsg("insideOfSafeZone");
      //checkPosition(myMap, newPos, myPolygon);
    });
  };
}

function getLocationMonitor(db) {
  var lat = null;
  var lng = null;

  var updateMap = getMapUpdater();

  return function() {
    if(lat === null) {
      getDeviceLat(db, function(newLat) {
        if(newLat) {
          lat = newLat;
          updateMap(lat, lng);
        }
      });
    }

    if(lng === null) {
      getDeviceLng(db, function(newLng) {
        if(newLng) {
          lng = newLng;
          updateMap(lat, lng);
        }
      });
    }
  };
}

// Init Function
function init() {
  // Initialization
  firebase.initializeApp(g_FIREBASE_CONFIG);
  var db = firebase.database();

  // Keep getting device location
  var startMonitor = getLocationMonitor(db);
  startMonitor();
}

$(document).ready(init);
