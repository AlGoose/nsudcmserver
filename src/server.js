const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const app = express();

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  next();
});

const mongoClient = new MongoClient("mongodb://localhost:27017/", { useNewUrlParser: true });

mongoClient.connect(function(err, client) {
  assert.equal(null, err);
  console.log("Connected successfully to database");

  app.locals.employees = client.db("dcmdb").collection("employees");
  app.locals.instances = client.db("dcmdb").collection("instances");
  app.locals.samples = client.db("dcmdb").collection("samples");

  app.listen(2019, function() {
    console.log('Server up!')
  });
});

var employees = require("./routes/employees");
var instances = require("./routes/instances");
var samples = require("./routes/samples");
app.use(employees);
app.use(instances);
app.use(samples);
