/*
 *  GraVITas Premier League <gravitaspremierleague@gmail.com>
 *  Copyright (C) 2014  IEEE Computer Society - VIT Student Chapter <ieeecs@vit.ac.in>
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

var log;
var token;
var bcrypt;
var path = require('path');
var crypto = require('crypto');
var router = require('express').Router();
var email = require(path.join(__dirname, '..', 'worker', 'email'));
var record = require(path.join(__dirname, '..', 'db', 'mongo-record'));
var mongoTeam = require(path.join(__dirname, '..', 'db', 'mongo-team'));
var mongoUsers = require(path.join(__dirname, '..', 'db', 'mongo-users'));
var mongoInterest = require(path.join(__dirname, '..', 'db', 'mongo-interest'));
var mongoFeatures = require(path.join(__dirname, '..', 'db', 'mongo-features'));

try
{
    bcrypt = require('bcrypt');
}
catch (err)
{
    try
    {
        bcrypt = require('bcryptjs');
    }
    catch (err)
    {
        throw "Failure to compile run time requirement: bcrypt(js)";
    }
}


if (process.env.LOGENTRIES_TOKEN)
{
    var logentries = require('node-logentries');
    log = logentries.logger({token: process.env.LOGENTRIES_TOKEN});
}

router.get('/', function (req, res) {
    if (req.signedCookies.name)
    {
        if (log)
        {
            log.log(req.signedCookies.name + "logged in");
        }
        res.redirect('/home');
    }
    else if (process.env.NODE_ENV)
    {
        var time = new Date;
        time.setTime(time.getTime() + time.getTimezoneOffset() * 60000 + 19800000);
        var date =
        {
            seconds: time.getSeconds(),
            minutes: time.getMinutes(),
            hour: time.getHours(),
            day: time.getDate(),
            month: time.getMonth() + 1,
            year: time.getFullYear()
        };
        res.render('static', {date: date});
    }
    else
    {
        res.render('index');
    }
});

router.get('/interest', function (req, res) {
    res.render('interest', {csrfToken: req.csrfToken()});
});

router.post('/interest', function (req, res) // interest form
{
    var newUser =
    {
        name: req.body.name,
        regno: req.body.regno,
        email: req.body.email,
        phone: req.body.phone
    };
    var onInsert = function (err, docs)
    {
        if (err)
        {
            console.log(err.message);
        }
        else
        {
            var onSend = function (err)
            {
                if (err)
                {
                    console.log(err.message);
                }
                else
                {
                    console.log('Sent!');
                }
                res.redirect('/interest');
            };

            var message = email.wrap({
                from: 'gravitaspremierleague@gmail.com',
                to: newUser.email,
                subject: 'Welcome to graVITas premier league 2.0!'
            });

            message.attach_alternative("<table background='http://res.cloudinary.com/gpl/general/img0.jpg' align='center' cellpadding='0' cellspacing='0' width='600' style='box-shadow: 5px 5px 15px #888888; border-radius: 12px; background-position: center; border-collapse: collapse;'>" +
                "<tr><td align='center' style='font-family:Lucida Sans Unicode; font-size:50px; padding: 40px 0 40px 0;color: #ffd195;'>graVITas Premier League</td>" +
                "</tr><tr><td align='center' style='padding: 5px 30px 40px 30px;font-family: Arial; line-height:30px; font-size:x-large;'> Thank you for your interest in graVITas Premier League <br>" +
                "Please check out  our Facebook <a href='http://www.facebook.com/gravitaspremierleague' style='text-decoration: none;'>page</a> to stay close to all the action! </td>" +
                "</tr><tr><td align='left' style='padding: 20px 20px 20px 20px; font-family: courier; font-size: large;color: #ffd195; font-weight: bold;'>Regards,<br>Team GPL,<br>IEEE Computer Society<br>IEEE Computer Society</td></tr></table>");

            email.send(message, onSend);
        }
    };
    mongoInterest.insert(newUser, onInsert);
});

// TODO: delete this route when ready to launch
router.get(/\/^.*$/, function (req, res, next) {
    if (process.env.NODE_ENV)
    {
        res.redirect('/');
    }
    else
    {
        next();
    }
});

router.get('/login', function (req, res) {
    res.clearCookie('team', {});
    res.clearCookie('email', {});
    res.clearCookie('phone', {});
    if (req.signedCookies.name)
    {
        res.redirect('/home');
    }
    else
    {
        res.render('login', {csrfToken: req.csrfToken()});
    }
});

router.post('/login', function (req, res) {
    var user = req.body.team;
    var password = req.body.password;
    if (req.signedCookies.name)
    {
        res.clearCookie('name');
    }
    if (log)
    {
        log.log(user + " " + password + "recieved");
    }

    var credentials =
    {
        '_id': user
    };
    var onFetch = function (err, doc)
    {
        if (err)
        {
            console.log(err.message);
            res.render('index', {response: "Incorrect Username"});
        }
        else if (doc)
        {
            if (bcrypt.compareSync(password, doc['password_hash']))
            {
                console.log("Login Successful" + user);
                res.cookie('name', doc['_id'], {maxAge: 86400000, signed: true});
                res.redirect('/home');
            }
            else
            {
                console.log('Incorrect Credentials');
                res.render('index', {response: "Incorrect Password"});
            }
        }
        else
        {
            var onGetAdmin = function (err, doc)
            {
                if (err)
                {
                    console.log(err.message);
                    res.render('index', {response: "Incorrect Username"});
                }
                else if (doc)
                {
                    if (bcrypt.compareSync(password, doc['password_hash']))
                    {
                        console.log("Admin login successful" + user);
                        res.cookie('admin', doc['_id'], {signed: true, maxAge : 86400000});
                        res.redirect('/admin');
                    }
                    else
                    {
                        console.log('Incorrect Credentials');
                        res.render('index', {response: "Incorrect Password"});
                    }
                }
                else
                {
                    console.log('No user exists');
                    res.render('index', {response: "Incorrect Username"});
                }
            };
            mongoUsers.admin(credentials, onGetAdmin);
        }
    };
    mongoUsers.fetch(credentials, onFetch);
});

router.get('/forgot/password', function (req, res) {
    res.render('forgot', {csrfToken: req.csrfToken(), mode:'password'});
});

router.post('/forgot/password', function (req, res) {
    var doc =
    {
        _id: req.body.team,
        email: req.body.email
    };

    var message = email.wrap({
        from: 'gravitaspremierleague@gmail.com',
        to: req.body.email,
        subject: 'Time to get back in the game'
    });

    crypto.randomBytes(20, function (err, buf) {
        token = buf.toString('hex');
        message.attach_alternative("<table background='http://res.cloudinary.com/gpl/general/img1.jpg' align='center' cellpadding='0' cellspacing='0' width='600' style ='box-shadow: 5px 5px 15px #888888; border-radius: 12px; background-position: center; border-collapse: collapse;'>" +
            "<tr><td align='center' style='font-family:Lucida Sans Unicode; font-size:50px; padding: 40px 0 40px 0;color: #ffd195;'>graVITas Premier League</td>" +
            "</tr><tr><td align=\'left\' style=\'padding: 2px 30px 40px 30px;font-family: Arial; line-height:30px; font-size:large;\'> Please click <a href=\"http://" + req.headers.host + "/reset/" + token + "\">here</a> in order to reset your password.<br>" +
            "For the purposes of security, this link is valid for one use only, and shall expire in sixty minutes. <br> In the event that this password reset was not requested by you, please ignore this message and your password shall remain intact.<br>" +
            "</tr><tr><td align='left' style='padding: 20px 20px 20px 20px; font-family: courier; font-size: large;color: #ffd195; font-weight: bold;'>Regards,<br>Team GPL<br>IEEE Computer Society<br>VIT Student chapter</td></tr></table>"
        );
        var details =
        {
            $set:
            {
                token: token,
                expire: Date.now() + 3600000
            }
        };

        var onFetch = function (err, doc)
        {
            if (err)
            {
                console.log(err.message);
            }
            else if (doc)
            {
                email.send(message, function (err)
                {
                    if (err)
                    {
                        console.log(err.message);
                    }
                    res.redirect('/login');
                });
            }
            else
            {
                console.log('Invalid credentials!');
                res.redirect('/forgot/password');
            }
        };
        mongoUsers.forgotPassword(doc, details, onFetch);
    });
});

router.get('/reset/:token', function (req, res) {
    var onGetReset = function (err, doc)
    {
        if (err)
        {
            console.log(err.message);
        }
        else if (!doc)
        {
            res.redirect('/forgot');
        }
        else
        {
            res.render('reset', {csrfToken: req.csrfToken()});
        }
    };
    mongoUsers.getReset({token: req.params.token, expire: {$gt: Date.now()}}, onGetReset);
});

router.get('/forgot/user', function(req, res){
    res.render('forgot', {csrfToken: req.csrfToken(), mode:'user'});
});

router.post('/forgot/user', function (req, res) {
    var doc =
    {
        phone: req.body.phone,
        email: req.body.email
    };
    var onFetch = function (err, docs)
    {
        if (err)
        {
            console.log(err.message);
        }
        else if (docs)
        {
            var message = email.wrap({
                from: 'gravitaspremierleague@gmail.com',
                to: req.body.email,
                subject: 'Time to get back in the game'
            });

            message.attach_alternative("The following teams were found in association with your details:<br><br><ol>" + docs + "</ol><br><br><br>Regards, <br>Team G.P.L<br>IEEE Computer Society");
            email.send(message, function (err) {
                if (err)
                {
                    console.log(err.message);
                }
                res.redirect('/login');
            });
        }
        else
        {
            console.log('Invalid credentials!');
            res.redirect('/forgot/user');
        }
    };
    mongoUsers.forgotUser(doc, onFetch);
});

router.post('/reset/:token', function (req, res) {
    if (req.body.password === req.body.confirm)
    {
        var query =
        {
            token: req.params.token,
            expire:
            {
                $gt: Date.now()
            }
        };
        var op =
        {
            $set:
            {
                password_hash: bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(10))
            },
            $unset:
            {
                token: '',
                expire: ''
            }
        };
        var onReset = function (err, doc)
        {
            if (err)
            {
                console.log(err.message);
            }
            else if (!doc)
            {
                console.log('No matches found!');
                res.redirect('/forgot');
            }
            else
            {
                var message = email.wrap({
                    from: 'gravitaspremierleague@gmail.com',
                    to: doc.value.email,
                    subject: 'Password change successful !'
                });

                message.attach_alternative("<table background='http://res.cloudinary.com/gpl/general/img3.jpg' align='center' cellpadding='0' cellspacing='0' width='600' style='box-shadow: 5px 5px 15px #888888; border-radius: 12px; background-position: center; border-collapse: collapse;'>" +
                    "<tr><td align='center' style='font-family:Lucida Sans Unicode; font-size:50px; padding: 40px 0 40px 0;color: #ffd195;'>graVITas Premier League</td>" +
                    "</tr><tr><td align='left' style='padding: 5px 30px 40px 30px;font-family: Arial; line-height:30px; font-size:x-large;'>Hey there, " + doc.value.manager_name + "!<br>We\'re just writing in to let you know that the recent password change for your team " +
                    doc.value._id + " was successful.<br>Welcome Back to G.P.L!" +
                    "</tr><tr><td align='left' style='padding: 20px 20px 20px 20px; font-family: courier; font-size: large;color: #ffd195; font-weight: bold;'>Regards,<br>Team GPL<br>IEEE Computer Society<br>VIT Student chapter</td></tr></table>"
                );

                email.send(message, function (err) {
                    if (err)
                    {
                        console.log(err.message);
                    }
                    res.redirect('/login');
                });
            }
        };
        mongoUsers.resetPassword(query, op, onReset);
    }
    else // passwords do not match
    {
        res.redirect('/reset/' + req.params.token);
    }
});

router.get('/register', function (req, res) {
    if (req.signedCookies.name)
    {
        res.redirect('/home');
    }
    else
    {
        res.render('register', {response: "", csrfToken: req.csrfToken()});
    }
});

router.post('/register', function (req, res) {
    if (req.signedCookies.name)
    {
        res.clearCookie('name');
    }
    var onGetCount = function (err, number)
    {
        if (err)
        {
            console.log(err.message);
        }
        else
        {
            if (req.body.confirm_password === req.body.password)
            {
                var newUser = record;
                newUser._id = req.body.team_name;
                newUser.dob = new Date();
                newUser.team_no = parseInt(number) + 1;
                newUser.password_hash = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(10));
                newUser.manager_name = req.body.manager_name;
                newUser.email = req.body.email;
                newUser.phone = req.body.phone;
                newUser.authStrategy = 'local';

                var onInsert = function (err, docs)
                {
                    if (err)
                    {
                        console.log(err.message);
                        res.render('register', {response: "Team Name Already Exists"});
                    }
                    else
                    {
                        var name = newUser._id;
                        var message = email.wrap({
                            from: 'gravitaspremierleague@gmail.com',
                            to: newUser.email,
                            subject: 'Welcome to graVITas premier league 2.0!'
                        });

                        message.attach_alternative("<table background='http://res.cloudinary.com/gpl/general/img4.jpg' align='center' cellpadding='0' cellspacing='0' width='600' style='box-shadow: 5px 5px 15px #888888; border-radius: 12px; background-position: center; border-collapse: collapse;'>" +
                            "<tr><td align='center' style='font-family:Lucida Sans Unicode; font-size:50px; padding: 40px 0 40px 0;color: #ffd195;'>graVITas Premier League</td>" +
                            "</tr><tr><td align='left' style='padding: 5px 30px 40px 30px;font-family: Arial; line-height:30px; font-size:x-large;'> This is to inform that that you have successfully registered for GPL 2.0 <br>" +
                            "Please click <a href='http://gravitaspremierleague.com' style='text-decoration: none;'> here </a> for more details<br> Good luck!  </td>" +
                            "</tr><tr><td align='left' style='padding: 20px 20px 20px 20px; font-family: courier; font-size: large;color: #ffd195; font-weight: bold;'>Regards,<br>Team GPL<br>IEEE Computer Society<></td></tr></table>"
                        );
                        res.cookie('name', name, {maxAge: 86400000, signed: true});
                        email.send(message, function (err) {
                            if (err)
                            {
                                console.log(err.message);
                            }
                            res.redirect('/home/players');
                        });
                    }
                };
                mongoUsers.insert(newUser, onInsert);
            }
            else
            {
                console.log("Incorrect Password");
                res.render('register', {response: "Passwords do not match", csrfToken: req.csrfToken()});
            }
        }
    };
    mongoUsers.getCount({}, onGetCount);
});

router.get('/logout', function (req, res) {
    if (req.signedCookies.name)
    {
        res.clearCookie('name', {});
        res.clearCookie('lead', {});
        res.clearCookie('team', {});
        res.clearCookie('email', {});
        res.clearCookie('phone', {});
        res.redirect('/login');
    }
    else
    {
        res.redirect('/');
    }
});

router.get('/admin', function (req, res) {
    if (req.signedCookies.admin)
    {
        var onGetInfo = function (err, doc)
        {
            if (err)
            {
                console.log(err.message);
            }
            else if (doc)
            {
                res.render('admin', {info: doc});
            }
            else
            {
                res.redirect('/');
            }
        };
        mongoTeam.adminInfo(onGetInfo);
    }
    else
    {
        res.redirect('/');
    }
});

router.get('/social/login', function (req, res) {
    if (req.signedCookies.name)
    {
        res.render('home');
    }
    else
    {
        console.log(req.signedCookies.team);
        res.render('social', {mode: req.signedCookies.team ? 0 : 1, type : 'login', csrfToken : req.csrfToken()});
    }
});

router.post('/social/login', function (req, res) {
    res.cookie('team', req.body.team, {signed : true});
    res.redirect('/social/login');
});

router.get('/social/register', function (req, res) {
    if (req.signedCookies.name)
    {
        res.render('home');
    }
    else
    {
        console.log(req.signedCookies.team);
        res.render('social', {mode: req.signedCookies.team ? 0 : 1, type : 'register', csrfToken : req.csrfToken()});
    }
});

router.post('/social/register', function (req, res) {
    res.cookie('team', req.body.team, {signed : true});
    res.cookie('phone', req.body.phone, {signed : true});
    res.cookie('email', req.body.email, {signed : true});
    res.redirect('/social/register');
});

router.get('/social/callback', function (req, res) {
    if (req.signedCookies.team)
    {
        res.cookie('name', req.user._id, {maxAge: 86400000, signed: true});
        res.clearCookie('team', {});
        res.clearCookie('email', {});
        res.clearCookie('phone', {});
        delete req.user;
        res.redirect('/home');
    }
    else
    {
        res.redirect('/');
    }
});

router.get(/\/developers?/, function (req, res) {
    res.render('developers');
});

router.get('/privacy', function (req, res) {
    res.render('privacy');
});

router.get('/simulate', function (req, res) {
    if (req.signedCookies.admin)
    {
        var onSimulate = function (err, docs)
        {
            if (err)
            {
                console.log(err);
            }
            else
            {
                res.render('results', {results: docs});
            }
        };
        mongoFeatures.simulate(onSimulate);
    }
    else
    {
        res.redirect('/');
    }
});

module.exports = router;