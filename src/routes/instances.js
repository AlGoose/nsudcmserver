const express = require('express');
const router = express.Router();
const jsonParser = express.json();
const assert = require('assert');


router.use(function timeLog(req, res, next) {
    console.log('Instances router! Time: ', Date.now());
    next();
});

router.get('/api/instances', function (req, res) {
    const collection = req.app.locals.instances;
    collection.find({}).toArray(function (err, docs) {
        assert.equal(err, null);
        res.send(docs)
    });
})

router.post('/api/instances/tags', jsonParser, function (req, res) {
    if (!req.body) return res.sendStatus(400);

    const collection = req.app.locals.instances;
    if (req.body.length == 0) {
        collection.find({}).toArray(function (err, docs) {
            assert.equal(err, null);
            res.send(docs)
        });
    } else {
        collection.find({ tags: { $all: req.body } }).toArray(function (err, docs) {
            assert.equal(err, null);
            res.send(docs)
        });
    }
})

router.post("/api/instances", jsonParser, function (req, res) {
    if (!req.body) return res.sendStatus(400);

    const instance = {
        instanceID: req.body.instanceID,
        tags: JSON.parse(req.body.tags)
    };

    const collection = req.app.locals.instances;
    collection.insertOne(instance, function (err, result) {
        if (err) return console.log(err);
        res.send(result.ops);
    });
});

router.put("/api/instances", jsonParser, function (req, res) {
    if (!req.body) return res.sendStatus(400);

    const collection = req.app.locals.instances;
    collection.findOneAndUpdate({
        _id: ObjectId(req.body._id)
    }, {
            $set: {
                instanceID: req.body.ID,
                tags: JSON.parse(req.body.tags)
            }
        }, {
            returnOriginal: false
        },
        function (err, result) {
            if (err) return console.log(err);
            res.send(result.value);
        });
});

router.delete("/api/instances/:id", function (req, res) {
    const id = new ObjectId(req.params.id);
    const collection = req.app.locals.instances;
    collection.findOneAndDelete({ _id: id }, function (err, result) {
        if (err) return console.log(err);
        res.send(result.value);
    });
});

module.exports = router;