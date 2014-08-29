/*
 *  GraVITas Premier League
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

var express = require('express');
var path = require('path');
var async = require('async');
var router = express.Router();

var mongoPlayers = require(path.join(__dirname, '..', '..', 'db', 'mongo-players'));
var mongoUsers = require(path.join(__dirname, '..', '..', 'db', 'mongo-users'));
var mongoTeam = require(path.join(__dirname, '..', '..', 'db', 'mongo-team'));
var mongoMatches = require(path.join(__dirname, '..', '..', 'db', 'mongo-matches'));

router.get('/', function (req, res)
{
    if (req.signedCookies.name)
    {
        var credentials = {
            '_id': req.signedCookies.name
        };
        var onFetch = function (err, doc)
        {
            //var getDetails = function(elt,index,array);
            if (err)
            {
                res.redirect('/');
            }
            else
            {
                /*  var document = [];
                 document=doc.team;
                 document.forEach(getDetails);*/
            }
        };
        mongoUsers.fetch(credentials, onFetch);
    }
    else
    {
        res.redirect('/');
    }
});


router.get('/matches', function (req, res)
{
    if (req.signedCookies.name)
    {
        var teamName = req.signedCookies.name;

        var credentials1 = {
            'Team_1': teamName
        };
        var credentials2 = {
            'Team_2': teamName
        };
        var parallel_tasks = {};
        var response = {};
        var onFinish = function (err, results)
        {
            if (err)
            {
                //do something with the error
            }
            else
            {
                response["previousMatch"] = results.previousMatch;
                response["nextMatch"] = results.nextMatch;
                res.render('matches', response);
            }

        };

        parallel_tasks.previousMatch = function (asyncCallback)
        {
            mongoMatches.fetchPreviousMatch(credentials1, credentials2, asyncCallback);
        };
        parallel_tasks.nextMatch = function (asyncCallback)
        {
            mongoMatches.fetchNextMatch(credentials1, credentials2, asyncCallback);

        };
        async.parallel(parallel_tasks, onFinish);
        res.render('matches', response);


    }
    else
    {
        res.redirect('/');
    }
});

router.post('/getTeam', function (req, res)
{
    var players = [], cost = 0;
    var player1 = parseInt(req.body.p1);
    var player2 = parseInt(req.body.p2);
    var player3 = parseInt(req.body.p3);
    var player4 = parseInt(req.body.p4);
    var player5 = parseInt(req.body.p5);
    var player6 = parseInt(req.body.p6);
    var player7 = parseInt(req.body.p7);
    var player8 = parseInt(req.body.p8);
    var player9 = parseInt(req.body.p9);
    var player10 = parseInt(req.body.p10);
    var player11 = parseInt(req.body.p11);
    var player12 = parseInt(req.body.p12);
    var player13 = parseInt(req.body.p13);
    var player14 = parseInt(req.body.p14);
    var player15 = parseInt(req.body.p15);
    var player16 = parseInt(req.body.p16);
    players.push(player1);
    players.push(player2);
    players.push(player3);
    players.push(player4);
    players.push(player5);
    players.push(player6);
    players.push(player7);
    players.push(player8);
    players.push(player9);
    players.push(player10);
    players.push(player11);
    players.push(player12);
    players.push(player13);
    players.push(player14);
    players.push(player15);
    players.push(player16);

    var onUpdate = function (err, documents)
    {
        if (err)
        {
            // do something with the error
        }
        else
        {
            console.log(documents);
            res.redirect('/home');
        }

    };

    var getCost = function (id, callback)
    {
        var fields = {
            _id: 1,
            Name: 1,
            Cost: 1,
            Country: 1,
            Type: 1
        };
        var player = {
            _id: id
        };
        mongoPlayers.getPlayer(player, fields, callback)
    };
    var onFinish = function (err, documents)
    {
        if (err)
        {
            // do something with the error
        }
        else
        {
            console.log(documents);
            for (var i = 0; i < documents.length; i ++)
            {
                cost = (cost - 0) + (documents[i].Cost - 0);
                if (cost > 10000000)
                {
                    res.redirect('/home/players', {err: "Cost Exceeded"});
                }
            }
            res.redirect('/home/squad');
        }
    };
    async.map(players, getCost, onFinish);

    var teamName = req.signedCookies.name;
    var credentials = {
        _id: teamName
    };

    mongoUsers.updateUser(credentials, players, onUpdate);


});
router.get('/players', function (req, res) // page for all players, only available if no squad has been chosen
{
    var onFetch = function (err, documents)
    {
        if (err)
        {
            res.redirect('/home');
        }
        else
        {
            res.render('players', {
                Players: documents
            });
        }

    };
    mongoPlayers.fetchPlayers(onFetch);
});


router.get('/team', function (req, res) // view the assigned playing 11 with options to change the playing 11
{
    if (req.cookies.name)                           // if cookies exists then access the database
    {
        var teamName = req.cookies.name;
        var credentials =
        {
            '_id': teamName
        };

        var getTeam = function (err, documents)
        {
            if (err)
            {
                res.redirect('/home');
            }
            else
            {
                res.render('team', {Squad: documents});
            }

        };
        mongoTeam.getTeam(credentials, getTeam);
    }
    else                                                        // if cookies does not exists , go to login page
    {
        res.redirect('/');
    }
});
module.exports = router;
