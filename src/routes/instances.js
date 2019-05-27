const express = require('express');
const router = express.Router();
const jsonParser = express.json();
const assert = require('assert');
const ObjectId = require("mongodb").ObjectId;
const axios = require('axios');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const fs = require('fs');

//ПОЛУЧЕНИЕ СПИСКА ФАЙЛОВ
router.get('/api/instances', function (req, res) {
    const collection = req.app.locals.instances;
    collection.find({}).toArray(function (err, docs) {
        assert.equal(err, null);
        res.send(docs)
    });
})

//ПОЛУЧЕНИЕ ПОДРОБНОЙ ИНФОРМАЦИИ О ФАЙЛЕ
router.get('/api/instances/:id', function (req, res) {
    const id = req.params.id;
    axios
        .get('http://localhost:8042/instances/' + id + '/simplified-tags')
        .then(function (result) {
            res.send(result.data)
        })
        .catch(function (err) {
            console.log(err.message);
            res.sendStatus(500);
        });
})

//ПОИСК ФАЙЛОВ ПО ТЕГАМ
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

//ДОБАВЛЕНИЕ ФАЙЛА
router.post("/api/instances", upload.single('file'), jsonParser, function (req, res) {
    if (!req.file) return res.sendStatus(400);

    axios({
        method: 'post',
        url: 'http://localhost:8042/instances',
        headers: {
            'content-type': 'application/octet-stream',
            'content-length': fs.statSync(req.file.path).size
        },
        data: fs.createReadStream(req.file.path)
    })
        .then(function (result) {
            console.log(result.data);
            switch(result.data.Status) {
                case 'Success':
                    break;
                
                case 'AlreadyStored':
                    res.status(500).send('This file already stored!');
                    return;

                default:
                    res.status(500).send('Something go wrong!');
                    return;
            }

            const instance = {
                instanceID: result.data.ID,
                tags: req.body.tags === "" ? null : req.body.tags.split(',')
            };

            const collection = req.app.locals.instances;
            collection.insertOne(instance, function (err, result) {
                if (err) return console.log(err);
            });

            fs.unlink(req.file.path, function (err) {
                if (err) {
                    console.log('Cant delete file!');
                    res.status(500).end();
                } else {
                    console.log(req.file.path + ' was deleted!');
                    res.status(200).end();
                }
            });
        })
        .catch(function (error) {
            console.log(error);
            res.sendStatus(500);
        });
});

//ЗАМЕНА ТЕГОВ
router.put("/api/instances", jsonParser, function (req, res) {
    if (!req.body) return res.sendStatus(400);
    console.log(req.body);

    const collection = req.app.locals.instances;
    collection.findOneAndUpdate({
        _id: ObjectId(req.body._id)
    }, {
            $set: {
                instanceID: req.body.instanceID,
                tags: req.body.tags
            }
        }, {
            returnOriginal: false
        },
        function (err, result) {
            if (err) return res.sendStatus(500);
            res.sendStatus(200);
        });
});

//УДАЛЕНИЕ ФАЙЛА
router.delete("/api/instances/:id", function (req, res) {
    const id = new ObjectId(req.params.id);
    const collection = req.app.locals.instances;
    collection.findOneAndDelete({ _id: id }, function (err, result) {
        if (err) return res.sendStatus(500);

        axios
        .delete("http://localhost:8042/instances/" + result.value.instanceID)
        .then(function() {
            console.log("Deleted");
            res.sendStatus(200);
        })
        .catch(function(err) {
            console.log("Not Deleted")
            res.sendStatus(500);
        });
    });
});

module.exports = router;