const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require("mongodb").ObjectId;
const assert = require('assert');

const app = express();
const jsonParser = express.json();

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  next();
});

const mongoClient = new MongoClient("mongodb://localhost:27017/", { useNewUrlParser: true });
let dbClient = null;

mongoClient.connect(function(err, client) {
  assert.equal(null, err);
  console.log("Connected successfully to database");

  dbClient = client;
  app.locals.employees = client.db("dcmdb").collection("employees");
  app.locals.instances = client.db("dcmdb").collection("instances");

  app.listen(2019, function() {
    console.log('Server up!')
  });
});

app.get('/api/employees', function(req, res) {
  const collection = req.app.locals.employees;
  collection.find({}).toArray(function(err, docs) {
    assert.equal(err, null);
    res.send(docs)
  });
})

app.post("/api/employees", jsonParser, function(req, res) {
  if (!req.body) return res.sendStatus(400);

  const user = {
    surname: req.body.surname,
    name: req.body.name,
    patronymic: req.body.patronymic,
    position: req.body.position,
    email: req.body.email
  };

  const collection = req.app.locals.employees;
  collection.insertOne(user, function(err, result) {
    if (err) return console.log(err);
    res.send(result.ops);
  });
});

app.put("/api/employees", jsonParser, function(req, res){
  if(!req.body) return res.sendStatus(400);

  const collection = req.app.locals.employees;
  collection.findOneAndUpdate({
      _id: ObjectId(req.body._id)
    }, {
      $set: {
        surname: req.body.surname,
        name: req.body.name,
        patronymic: req.body.patronymic,
        position: req.body.position,
        email: req.body.email
      }
    },{
      returnOriginal: false
    },
    function(err, result) {
      if (err) return console.log(err);
      res.send(result.value);
    });
});

app.delete("/api/employees/:id", function(req, res) {
  const id = new ObjectId(req.params.id);
  const collection = req.app.locals.employees;
  collection.findOneAndDelete({_id: id}, function(err, result) {
    if (err) return console.log(err);
    res.send(result.value);
  });
});

/*______________________________________________________________________________*/

app.get('/api/instances', function(req, res) {
  const collection = req.app.locals.instances;
  collection.find({}).toArray(function(err, docs) {
    assert.equal(err, null);
    res.send(docs)
  });
})

app.post('/api/instances/tags', jsonParser, function(req, res) {
  if (!req.body) return res.sendStatus(400);

  const collection = req.app.locals.instances;
  collection.find({tags: { $all: req.body } }).toArray(function(err, docs) {
    assert.equal(err, null);
    res.send(docs)
  });
})

app.post("/api/instances", jsonParser, function(req, res) {
  if (!req.body) return res.sendStatus(400);

  const instance = {
    instanceID: req.body.instanceID,
    tags: JSON.parse(req.body.tags)
  };

  const collection = req.app.locals.instances;
  collection.insertOne(instance, function(err, result) {
    if (err) return console.log(err);
    res.send(result.ops);
  });
});

app.put("/api/instances", jsonParser, function(req, res){
  if(!req.body) return res.sendStatus(400);

  const collection = req.app.locals.instances;
  collection.findOneAndUpdate({
      _id: ObjectId(req.body._id)
    }, {
      $set: {
        instanceID: req.body.ID,
        tags: JSON.parse(req.body.tags)
      }
    },{
      returnOriginal: false
    },
    function(err, result) {
      if (err) return console.log(err);
      res.send(result.value);
    });
});

app.delete("/api/instances/:id", function(req, res) {
  const id = new ObjectId(req.params.id);
  const collection = req.app.locals.instances;
  collection.findOneAndDelete({_id: id}, function(err, result) {
    if (err) return console.log(err);
    res.send(result.value);
  });
});

/*______________________________________________________________________________*/

process.on("SIGINT", () => {
    dbClient.close();
    console.log('Server down!')
    process.exit();
});
