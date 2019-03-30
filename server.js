const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const objectId = require("mongodb").ObjectID;
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

  const userSurname = req.body.surname;
  const userName = req.body.name;
  const userPatronymic = req.body.patronymic;
  const userPosition = req.body.position;
  const userEmail = req.body.email;
  const user = {
    surname: userSurname,
    name: userName,
    patronymic: userPatronymic,
    position: userPosition,
    email: userEmail
  };

  const collection = req.app.locals.employees;
  collection.insertOne(user, function(err, result) {
    if (err) return console.log(err);
    res.send(user);
  });
});

app.put("/api/employees", jsonParser, function(req, res){
  if(!req.body) return res.sendStatus(400);

  const id = new objectId(req.body._id);
  const userSurname = req.body.surname;
  const userName = req.body.name;
  const userPatronymic = req.body.patronymic;
  const userPosition = req.body.position;
  const userEmail = req.body.email;

  const collection = req.app.locals.employees;
  collection.findOneAndUpdate({
      _id: id
    }, {
      $set: {
        surname: userSurname,
        name: userName,
        patronymic: userPatronymic,
        position: userPosition,
        email: userEmail
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
  const id = new objectId(req.params.id);
  const collection = req.app.locals.employees;
  collection.findOneAndDelete({_id: id}, function(err, result) {
    if (err) return console.log(err);
    let user = result.value;
    res.send(user);
  });
});

process.on("SIGINT", () => {
    dbClient.close();
    console.log('Server down!')
    process.exit();
});
