const express = require('express')
const app = express()

// MySQL Connection
var mysql = require('mysql');
var pool  = mysql.createPool({
  connectionLimit : 2,
  host            : 'iotdb.culga9y9tfvw.us-west-2.rds.amazonaws.com',
  user            : 'root',
  password        : 'iotattp4me',
  database        : 'iotdb'
});
var guard = new RegExp('[a-z0-9]{6}');

app.get('/:deviceid', function (req, res) {
  if(! req.params.deviceid || ! guard.test(req.params.deviceid)) {
    res.send({ "code" : 500, "msg": "invalid device id" });
    return;
  }
  
  pool.query('SELECT timestamp, number from ' + req.params.deviceid + '_sensor_data where sensor="deviceLat"', function (latErr, lats, latFields) {
    if(latErr) throw latErr;

    pool.query('SELECT timestamp, number from ' + req.params.deviceid + '_sensor_data where sensor="deviceLng"', function (lngErr, lngs, lngFields) {
      if(lngErr) throw lngErr;

      var results = { "code" : 200 };
      for(var i=0, len=lats.length; i < len; i++) {
        var lat       = lats[i];
        var timestamp = lat.timestamp.valueOf();
        
        if(! (timestamp in results)) { results[timestamp] = {}; }
        results[timestamp]["lat"] = lat.number;
      }

      for(var i=0, len=lngs.length; i < len; i++) {
        var lng       = lngs[i];
        var timestamp = lng.timestamp.valueOf();

        if(! (timestamp in results)) { results[timestamp] = {}; }
        results[timestamp]["lng"] = lng.number;
      }

      res.send(results);
    });
  });


})

app.listen(80, function () {
  console.log('Example app listening on port 80!')
})
