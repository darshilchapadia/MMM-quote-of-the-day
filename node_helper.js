const NodeHelper = require('node_helper');
const request = require("request");
const translate = require('google-translate-api');
const bodyParser = require('body-parser');

module.exports = NodeHelper.create({
    start: function () {
        console.log(this.name + ' helper started');

        this.handleApiRequest();

        this.quoteConfig = {}

    },

    getNewQuote: function () {
        let self = this;

        self.url = this.quoteConfig.url;
        self.language = this.quoteConfig.language;

        let options = {
            url: self.url,
            format: "text",
            method: "GET"
        };

        request(options, function (error, response, body) {
            if (error) {
                return console.log(error);
            }
            let strObject = JSON.stringify(body, null, 4);

            if(typeof(body) === "string"){
                try{
                    body = JSON.parse(body);
                }
                catch(e){
                    body = body
                }
            }
            self.returned_data = body;

            if (self.language !== "en") {
                translate(self.returned_data.quoteText, {
                    to: "fr"
                }).then(res => {
                    // console.log(res.text);
                    self.returned_data.quoteText = res.text;
                    self.sendSocketNotification('QUOTE_RESULT', self.returned_data);

                }).catch(err => {
                    console.error(err);
                    self.sendSocketNotification('QUOTE_RESULT', self.returned_data);
                });
            } else {
                // return the quote directly without translating it
                self.sendSocketNotification('QUOTE_RESULT', self.returned_data);
            }
        });

    },

    socketNotificationReceived: function (notification, payload) {
        let self = this;
        console.log(this.name + " received a socket notification: " + notification + " - Payload: " + payload);
        if (notification === 'INIT_HELPER') {
            this.quoteConfig = payload
        }

        if (notification === 'GET_QUOTE') {
            this.getNewQuote();
        }
    },

    handleApiRequest: function () {
        this.expressApp.use(bodyParser.json()); // support json encoded bodies
        this.expressApp.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

        this.expressApp.post('/quote-of-the-day', (req, res) => {
            if (req.body.notification && req.body.notification === "QUOTE-OF-THE-DAY"){
                if (req.body.payload){
                    let payload = req.body.payload;
                    console.log("[MMM-quote-of-the-day] payload received: " + payload);

                    if (payload === "getNewQuote") {
                        this.getNewQuote();
                        res.send({"status": "success"});
                    }else{
                        res.send({"status": "failed", "error": "non recognized payload"});
                    }

                }else{
                    res.send({"status": "failed", "error": "No payload given."});
                }
            }else{
                res.send({"status": "failed", "error": "No notification given."});
            }
        });
    }


});