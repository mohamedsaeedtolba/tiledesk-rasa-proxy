const { parse } = require('querystring');
var express = require('express');
var cors = require('cors');
const uuid = require('uuid');
const bodyParser = require('body-parser');
const https = require('https');
const request = require('request');
const tiledeskUtil = require('./tiledeskUtil.js')

var app = express();
app.use(cors());
app.use(express.static('public'))
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: true , limit: '50mb'}));

const SESSION_KEY = 'session'
const UID_KEY = 'uid'
const TEXT_KEY = 'text'
const AGENT_KEY = 'agent'
const RECIPIENT_KEY = 'recipient'
const RECIPIENT_FULLNAME_KEY = 'recipientFullname'
const SENDER_KEY = 'sender'
const SENDER_FULLNAME_KEY = 'senderFullname'
const LANGUAGE_KEY = 'language'
const TYPE_KEY = 'type'
const KEY_KEY = 'key'
const STATUS_KEY = 'status'
const ATTRIBUTES_KEY = 'attributes'
const CHANNEL_TYPE_KEY = 'channel_type'
const TIMESTAMP_KEY = 'timestamp'
const METADATA_KEY = "metadata"
const TYPE_TEXT = 'text'
const TYPE_IMAGE = 'image'
const TYPE_AUDIO = 'audio'
const COMMAND_TYPE_MESSAGE = "message"
const COMMAND_TYPE_WAIT = "wait"


const endpoint = "https://tiledesk-server-pre.herokuapp.com";

function message_from_request(req) {
  return req.body
}

app.get("/hello", (req, res) => {
  res.status(200).send("Hello from webhook");
})

app.post("/bot", (req, res) => {
  delete req.body.payload.request.messages;
  console.log("BOT: req.body: " + JSON.stringify(req.body));
  const agent_id = req.params.agent;
  console.log("BOT: agent id: ", agent_id)
  var body = req.body;
  var recipient = body.payload.recipient;
  console.log("BOT: recipient", recipient);
  var text = body.payload.text;
  console.log("BOT: text", text);
  const tdrequest = body.payload.request;
  var botId = tdrequest.department.bot._id;
  console.log("BOT: botId", botId);
  var botName = tdrequest.department.bot.name;
  console.log("BOT: botName", botName);
  var token = body.token;
  console.log("BOT: token", token);
  var id_project = body.payload.id_project;
  console.log("BOT: projectId ", id_project);
  console.log("BOT: request.headers.host",req.headers.host);

  // immediatly reply to TILEDESK
  res.status(200).send({"success":true});

  // you can optionally use the request id as a session identifier
  const session_id = tdrequest.request_id

  if (text === "custom timestamp") {
    // shows how manually timestamp setting works with a simple test
    var timestamp = Date.now()
    for (let i = 0; i <= 3; i++) {
      var msg = "mesg[" + i + "] t: " + timestamp
      sendMessage(
        {
          "text": msg,
          "timestamp": timestamp,
          "type": "text",
          "senderFullname": "Test Bot"
        }, id_project, recipient, token, function (err) {
        console.log("Message: " + msg + " sent. Error? ", err)
      })
      timestamp = timestamp - 60000
    }
  }
  else {
    runRASAQuery(text, function(result) {
      console.log("BOT: RASA REPLY: " + JSON.stringify(result));
      if(res.statusCode === 200) {
        
        var reply = "I didn't understand, can you rephrase?"
        if (result.intent.confidence > 0.8) {
          reply = result.reply
        }

        // optionally you can parse a message tagged
        // with micro-language (documentation coming soon)
        const parsed_reply = tiledeskUtil.parseReply(reply)
        
        parsed_message = parsed_reply.message
        
        sendMessage(
          {
            "text": parsed_message.text, // or message text
            // "timestamp": Date.now(),
            "type": parsed_message.type, // or "text"
            "attributes": parsed_message.attributes, // can be null
            "metadata": parsed_message.metadata, // used for media like images
            "senderFullname": "Guest Bot (RASA)" // or whatever you want
          }, id_project, recipient, token, function (err) {
          console.log("Message sent. Error? ", err)
        })
        
      }
    })
  }
})

function runRASAQuery(text, callback) {
  // RASA QUERY ENDPOINT: http://34.253.240.71:5000/parse?project=miobot&q=

  intents = {
    hello: "Hello from RASA\n*How are you?\n*oops sorry!"
  }

  request({
    url: `http://34.253.240.71:5000/parse?project=miobot&q=${text}`,
    method: 'GET'
    },
    function(err, res, resbody) {
      console.log("RASA REPLY: ", resbody)
      var result = JSON.parse(resbody)
      result.reply = intents[result.intent.name]
      callback(result)
    }
  );
  
}

function sendMessage(msg_json, project_id, recipient, token, callback) {
  console.log("Sending message to Tiledesk: " + JSON.stringify(msg_json))
  request({
    url: `${endpoint}/${project_id}/requests/${recipient}/messages`,
    headers: {
      'Content-Type' : 'application/json',
      'Authorization':'JWT '+token
    },
    json: msg_json,
    method: 'POST'
    },
    function(err, res, resbody) {
      callback(err)
    }
  );
}

var port = process.env.PORT || 3000; // heroku
app.listen(port, function () {
    console.log('Example app listening on port ', port);
});
