const express = require('express');
const router = express.Router();
const jsonParser = express.json();
const assert = require('assert');
const ObjectId = require("mongodb").ObjectId;


router.get('/api/employees', function (req, res) {
    const collection = req.app.locals.employees;
    collection.find({}).toArray(function (err, docs) {
        assert.equal(err, null);
        res.send(docs)
    });
})

router.post("/api/employees", jsonParser, function (req, res) {
    if (!req.body) return res.sendStatus(400);

    const user = {
        surname: req.body.surname,
        name: req.body.name,
        patronymic: req.body.patronymic,
        position: req.body.position,
        email: req.body.email
    };

    const collection = req.app.locals.employees;
    collection.insertOne(user, function (err, result) {
        if (err) return console.log(err);
        res.send(result.ops);
    });
});

router.put("/api/employees", jsonParser, function (req, res) {
    if (!req.body) return res.sendStatus(400);

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
        }, {
            returnOriginal: false
        },
        function (err, result) {
            if (err) return console.log(err);
            res.send(result.value);
        });
});

router.delete("/api/employees/:id", function (req, res) {
    const id = new ObjectId(req.params.id);
    const collection = req.app.locals.employees;
    collection.findOneAndDelete({ _id: id }, function (err, result) {
        if (err) return console.log(err);
        res.send(result.value);
    });
});

module.exports = router;