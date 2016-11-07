'use strict';

const apiai = require('apiai');
const uuid = require('node-uuid');
const request = require('request');

// change to turn on debug
const devmode = false;

module.exports = class TropoBot {

    get apiaiService() {
        return this._apiaiService;
    }

    set apiaiService(value) {
        this._apiaiService = value;
    }

    get botConfig() {
        return this._botConfig;
    }

    set botConfig(value) {
        this._botConfig = value;
    }

    get sessionIds() {
        return this._sessionIds;
    }

    set sessionIds(value) {
        this._sessionIds = value;
    }

    constructor(botConfig) {
        this._botConfig = botConfig;
        var apiaiOptions = {
            language: botConfig.apiaiLang,
            requestSource: "tropo"
        };

        this._apiaiService = apiai(botConfig.apiaiAccessToken, apiaiOptions);
        this._sessionIds = new Map();
    }

    processMessage(req, res) {
      if (this._botConfig.devConfig || devmode) {
        console.log("body", req.body);
      }

      var originalRequest = {
        source: 'tropo',
        data: req.body
      };

      // case where responding to a REST call sent to tropo
      if (req.body
          && req.body.session
          && req.body.session.parameters
          && req.body.session.parameters.start_conversation
          && req.body.session.parameters.send_to
          && req.body.session.parameters.message)
      {
        // use number to send_to as chatid
        let phone_number = req.body.session.parameters.send_to;
        let chatId = phone_number;
        let messageText = req.body.session.parameters.message;

        console.log("Attempting to initiate text: ", phone_number,
                    ", api.ai message: ", messageText);

        if (!this._sessionIds.has(chatId)) {
            this._sessionIds.set(chatId, uuid.v1());
        }

        // change the source, since the originalRequest looks very different
        originalRequest.source = 'tropo_initiate';
        let apiaiRequest = this._apiaiService.textRequest(
          messageText,
          { sessionId: this._sessionIds.get(chatId),
            originalRequest: originalRequest
          });

        apiaiRequest.on('response', (response) => {
          if (TropoBot.isDefined(response.result)) {
            console.log("api_ai response: ", response)
            let responseText = response.result.fulfillment.speech;

            if (TropoBot.isDefined(responseText)) {
              console.log('Initiate text message');

              return res.status(200).json({
                tropo: [
                  {call:
                   {
                     to: phone_number,
                     network: "SMS",
                   }
                  },
                  {say:{value: responseText}}
                ]});

            } else {
              console.log('Received empty speech');
              return res.status(400).end('Received empty speech');
            }
          } else {
            console.log('Received empty result');
            return res.status(400).end('Received empty result');
          }
        });

        apiaiRequest.on('error', (error) => {
          console.error(error)
          return res.status(400).end('Internal Error');
        });
        apiaiRequest.end();
      }

      // case where receiving an incoming message
      else if (req.body
               && req.body.session
          && req.body.session.from
          && req.body.session.initialText)
      {
        let chatId = req.body.session.from.id;
        let messageText = req.body.session.initialText;

        console.log(chatId, messageText);

        if (messageText) {
          if (!this._sessionIds.has(chatId)) {
            this._sessionIds.set(chatId, uuid.v1());
          }

          let apiaiRequest = this._apiaiService.textRequest(
            messageText,
            { sessionId: this._sessionIds.get(chatId),
              originalRequest: originalRequest
            });

          apiaiRequest.on('response', (response) => {
            if (TropoBot.isDefined(response.result)) {
              let responseText = response.result.fulfillment.speech;

              if (TropoBot.isDefined(responseText)) {
                console.log('Response as text message');

                return res.status(200).json({
                  tropo: [{say: {value: responseText}}]
                });

              } else {
                console.log('Received empty speech');
                return res.status(400).end('Received empty speech');
              }
            } else {
              console.log('Received empty result');
              return res.status(400).end('Received empty result');
            }
          });

          apiaiRequest.on('error', (error) => {
            console.error(error)
            return res.status(400).end('Internal Error');
          });
          apiaiRequest.end();
        } else {
          // XX (mtourne): seems like the first if takes care of this
          console.log('Empty message');
          return res.status(400).end('Empty message');
        }
      } else {
        console.log('Empty message');
        return res.status(400).end('Empty message');
      }
    }

    static isDefined(obj) {
        if (typeof obj == 'undefined') {
            return false;
        }

        if (!obj) {
            return false;
        }

        return obj != null;
    }
}
