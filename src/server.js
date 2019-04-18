const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require("mongodb").ObjectId;
const assert = require('assert');
const app = express();
const jsonParser = express.json();
const fs = require('fs');
const archiver = require('archiver');
const request = require('request');

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
  app.locals.samples = client.db("dcmdb").collection("samples");

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
  if(req.body.length == 0){
    collection.find({}).toArray(function(err, docs) {
      assert.equal(err, null);
      res.send(docs)
    });
  } else {
    collection.find({tags: { $all: req.body } }).toArray(function(err, docs) {
      assert.equal(err, null);
      res.send(docs)
    });
  }
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
app.get("/api/samples/:id", function(req, res) {
  let tmp = [];

  var output = fs.createWriteStream(__dirname + '/example.zip');
  var archive = archiver('zip', {
    zlib: { level: 9 }
  });

  output.on('close', function() {
    console.log(archive.pointer() + ' total bytes');
    console.log('archiver has been finalized and the output file descriptor has closed.');
    // res.end();
    res.sendFile(__dirname + '/example.zip', function() {

    tmp.forEach(function(item) {
      fs.unlink(__dirname + '/' + item + '.dcm', function(err) {
        if (err) throw err;
      });
    })

      fs.unlink(__dirname + '/example.zip', function(err) {
        if (err) throw err;
        console.log("Archive deleted");
      });
    });
  });

  output.on('end', function() {
    console.log('Data has been drained');
  });

  archive.on('warning', function(err) {
    if (err.code === 'ENOENT') {
      // log warning
    } else {
      throw err;
    }
  });

  archive.on('error', function(err) {
    throw err;
  });

  archive.pipe(output);

  const id = new ObjectId(req.params.id);
  const collection = req.app.locals.samples;
  collection.findOne({_id: id}, async function(err, result) {
    let counter = 0;
    if (err) return console.log(err);

    result.instances.forEach(function(item) {
      request('http://localhost:8042/instances/' + item + '/file').pipe(fs.createWriteStream(__dirname + '/' + item + '.dcm').on('finish', function() {
        counter++;
        if(counter == result.instances.length){
          tmp.forEach((item) => {
              archive.file(__dirname + '/' + item + '.dcm', { name: item + '.dcm' });
          })
          archive.finalize();
        }
      }));
      tmp.push(item);
    });
  });
})

app.post("/api/samples", jsonParser, function(req, res) {
  if (!req.body) return res.sendStatus(400);

  const sample = {
    username: req.body.username,
    time: new Date().toLocaleString(),
    instances: req.body.instances
  };

  const collection = req.app.locals.samples;
  collection.insertOne(sample, function(err, result) {
    if (err) return console.log(err);
    res.send(result.ops);
  });
});

app.delete("/api/samples/:id", function(req, res) {
  console.log(req.params.id);
  const id = new ObjectId(req.params.id);
  const collection = req.app.locals.samples;
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
