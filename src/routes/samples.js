const express = require('express');
const router = express.Router();
const jsonParser = express.json();
const fs = require('fs');
const archiver = require('archiver');
const request = require('request');
const ObjectId = require("mongodb").ObjectId;


router.use(function timeLog(req, res, next) {
    console.log('Samples router! Time: ', Date.now());
    next();
});

router.get("/api/samples/:id", function (req, res) {
    let tmp = [];

    var output = fs.createWriteStream(__dirname + '/example.zip');
    var archive = archiver('zip', {
        zlib: { level: 9 }
    });

    output.on('close', function () {
        console.log(archive.pointer() + ' total bytes');
        console.log('archiver has been finalized and the output file descriptor has closed.');
        // res.end();
        res.sendFile(__dirname + '/example.zip', function () {

            tmp.forEach(function (item) {
                fs.unlink(__dirname + '/' + item + '.dcm', function (err) {
                    if (err) throw err;
                });
            })

            fs.unlink(__dirname + '/example.zip', function (err) {
                if (err) throw err;
                console.log("Archive deleted");
            });
        });
    });

    output.on('end', function () {
        console.log('Data has been drained');
    });

    archive.on('warning', function (err) {
        if (err.code === 'ENOENT') {
            // log warning
        } else {
            throw err;
        }
    });

    archive.on('error', function (err) {
        throw err;
    });

    archive.pipe(output);

    const id = new ObjectId(req.params.id);
    const collection = req.app.locals.samples;
    collection.findOne({ _id: id }, async function (err, result) {
        let counter = 0;
        if (err) return console.log(err);

        result.instances.forEach(function (item) {
            request('http://localhost:8042/instances/' + item + '/file').pipe(fs.createWriteStream(__dirname + '/' + item + '.dcm').on('finish', function () {
                counter++;
                if (counter == result.instances.length) {
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

router.post("/api/samples", jsonParser, function (req, res) {
    if (!req.body) return res.sendStatus(400);

    const sample = {
        username: req.body.username,
        time: new Date().toLocaleString(),
        instances: req.body.instances
    };

    const collection = req.app.locals.samples;
    collection.insertOne(sample, function (err, result) {
        if (err) return console.log(err);
        res.send(result.ops);
    });
});

router.delete("/api/samples/:id", function (req, res) {
    console.log(req.params.id);
    const id = new ObjectId(req.params.id);
    const collection = req.app.locals.samples;
    collection.findOneAndDelete({ _id: id }, function (err, result) {
        if (err) return console.log(err);
        res.send(result.value);
    });
});

module.exports = router;