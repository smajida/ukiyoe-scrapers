var url = require("url");
var _ = require("lodash");
var async = require("async");

module.exports = function(ukiyoe, stackScraper) {
    var nameUtils = require("./names.js")(ukiyoe);

    var saveImage = function(baseURL, imageURL, callback) {
        imageURL = url.resolve(baseURL, imageURL);

        var resultHandler = function(err, md5) {
            callback(err, {
                imageURL: imageURL,
                imageName: md5,
                _id: stackScraper.options.source + "/" + md5
            });
        };

        if (imageURL.indexOf("http") === 0) {
            if (stackScraper.options.debug) {
                console.log("Downloading Image:", imageURL);
            }

            ukiyoe.images.download(imageURL,
                stackScraper.options.sourceDataRoot, resultHandler);
        } else {
            if (stackScraper.options.debug) {
                console.log("Processing Image:", imageURL);
            }

            // Handle a file differently, skip the download
            ukiyoe.images.processImage(imageURL,
                stackScraper.options.sourceDataRoot, resultHandler);
        }
    };

    return {
        _id: function(data, scraper, callback) {
            data._id = stackScraper.options.source + "/" + data._id;
            callback(null, [data]);
        },

        price: function(data, scraper, callback) {
            data.forSale = true;
            callback(null, [data]);
        },

        artists: nameUtils.correctNames("artists"),
        publisher: nameUtils.correctNames("publisher"),
        carver: nameUtils.correctNames("publisher"),
        depicted: nameUtils.correctNames("depicted"),

        images: function(data, scraper, callback) {
            async.map(data.images, function(image, callback) {
                saveImage(data.url, image, callback);
            }, function(err, imageDatas) {
                if (err) {
                    return callback(err);
                }

                var related = _.pluck(imageDatas, "imageName");

                callback(null, imageDatas.map(function(imageData) {
                    for (var prop in imageData) {
                        if (!(prop in data)) {
                            data[prop] = imageData[prop];
                        }
                    }

                    data.related = _.without(related, imageData.imageName);

                    return data;
                }));
            });
        }
    };
};