var Client = require('instagram-private-api').V1;
var https = require('https');
var fs = require('fs');
var async = require('async');

var username = process.argv[2];
var profileId = process.argv[3];
var download = process.argv[4];
if (!username && !download) {
    console.log("node index.js <username> <download_images='yes/no'>");
    process.exit();
}

var users = JSON.parse(fs.readFileSync('users.json'));
var user_id = process.argv[5] ? process.argv[5] : 0;

if (!users[user_id]) {
    console.log("User not found.");
    process.exit();
}

try {
    var device = new Client.Device(users[user_id]['username']);
    var storage = new Client.CookieFileStorage(__dirname + '\\' + users[user_id]['username'] + '.json');
    var Request = new Client.Request();

    Client.Session.create(device, storage, users[user_id]['username'], users[user_id]['password'])
        .then(function (session) {
            return [session, Client.Account.searchForUser(session, username)]
        })
        .spread(function (session, account) {
            var feed = new Client.Feed.UserMedia(session, account.id);
            var downloaded = 0;

            fs.readFile('./dump/' + username + '.json', function (err1, data) {
                var json;
                if (err1) {
                    // console.log(err1.errno);
                    if (err1.errno == -4058) {
                        json = [];
                        fs.writeFile('./dump/' + username + '.json', "[]", function (err) { if (err) console.log(err) });
                        if (!fs.existsSync('./images/' + username)) {
                            fs.mkdirSync('./images/' + username);
                        }
                    }
                } else {
                    json = JSON.parse(data);
                }
                var lastPageMediaId = '';
                var feedFlag = true;

                async.whilst(function () {
                    return feedFlag;
                },
                    function (next) {
                        console.log("Running... " + json.length + " Downloaded.");
                        feed.get().then(function (result) {
                            if (lastPageMediaId != result[0]._params.code) {
                                lastPageMediaId = result[0]._params.code;
                                async.eachSeries(result, function (media, cb) {
                                    // MediaType: 1(Image), 2(Video), 8(Carousel)
                                    // console.log(media);
                                    if (media._params.mediaType == 1) {
                                        json.push({
                                            socialId: media._params.id,
                                            profileId: profileId,
                                            likes_count: media._params.likeCount,
                                            caption: media._params.caption,
                                            images: media._params.images,
                                            image: media._params.images[0],
                                            social_created_time: new Date(media._params.deviceTimestamp * 1000),
                                            status: ["unassigned"],
                                            source: "instagram",
                                            type: "image",
                                            analytics: {
                                                impression: 0,
                                                click: 0,
                                                sale: 0
                                            }
                                        });
                                    } else if (media._params.mediaType == 8) {
                                        async.eachSeries(media._params.images, function (im, cbi) {
                                            json.push({
                                                socialId: media._params.id,
                                                profileId: profileId,
                                                likes_count: media._params.likeCount,
                                                caption: media._params.caption,
                                                images: im,
                                                image: im[0],
                                                social_created_time: new Date(media._params.deviceTimestamp * 1000),
                                                status: ["unassigned"],
                                                source: "instagram",
                                                type: "image",
                                                analytics: {
                                                    impression: 0,
                                                    click: 0,
                                                    sale: 0
                                                }
                                            });
                                            cbi();
                                        }, function (err) {
                                            if (err) {
                                                console.log(err);
                                            }
                                        })
                                    }

                                    if (download == 'yes') {
                                        if (media._params.mediaType < 3) {
                                            downloaded += 1;
                                            var file = fs.createWriteStream('./images/' + username + '/' + downloaded + '_' + media._params.code + ".jpg");
                                            var request = https.get(media._params.images[0].url, function (response) {
                                                response.pipe(file);
                                                response.on('end', function () {
                                                    console.log("File Downloaded");
                                                    cb();
                                                });
                                            }).on('error', (e) => {
                                                console.error(`Got error: ${e.message}`);
                                                cb();
                                            });
                                        } else if (media._params.mediaType == 8) {
                                            async.eachSeries(media._params.images, function (im, cbi) {
                                                downloaded += 1;
                                                var file = fs.createWriteStream('./images/' + username + '/' + downloaded + '_' + media._params.code + ".jpg");
                                                var request = https.get(im[0].url, function (response) {
                                                    response.pipe(file);
                                                    response.on('end', function () {
                                                        console.log("File Downloaded");
                                                        cbi();
                                                    }).on('error', (e) => {
                                                        console.error(`Got error: ${e.message}`);
                                                        cbi();
                                                    });
                                                });
                                            }, function () {
                                                cb();
                                            });
                                        }
                                    } else {
                                        downloaded += 1;
                                        cb();
                                    }
                                }, function (err2) {
                                    if (!err2) {
                                        next();
                                        fs.writeFile('./dump/' + username + '.json', JSON.stringify(json), function (err_w) {
                                            if (err_w) {
                                                console.log("Write File Err: " + err_w);
                                            }
                                        });
                                    }
                                });
                            } else {
                                feedFlag = false;
                                next();
                            }
                        });
                    }, function () {
                        console.log("Done! Feed Count: " + downloaded);
                        process.exit();
                    });
            });
        });
} catch (exception) {
    console.log(exception);
}
