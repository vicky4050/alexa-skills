var https = require('http')
const parseString = require('xml2js').parseString

exports.handler = (event, context) => {

    try {

        if (event.session.new) {
            // New Session
            console.log("NEW SESSION")
        }

        switch (event.request.type) {

            case "LaunchRequest":

                break;

            case "IntentRequest":

                switch (event.request.intent.name) {
                    case "GetBusSchedule":
                        var busId = 163;
                        var stopId = 13456;
                        init(busId, stopId);
                        break;
                    case "GetBusScheduleExpress":
                        var busId = 144;
                        var stopId = 12460;
                        init(busId, stopId);
                        break;
                    default:
                        throw "Invalid intent"
                }

                break;

            case "SessionEndedRequest":
                // Session Ended Request
                console.log(`SESSION ENDED REQUEST`)
                break;

            default:
                context.fail(`INVALID REQUEST TYPE: ${event.request.type}`)

        }


        function init(busId, stopId) {

            var endpoint = "http://mybusnow.njtransit.com/bustime/eta/getStopPredictionsETA.jsp?route=" + busId + "&stop=" + stopId + "";
            var body = ""
            https.get(endpoint, (response) => {
                response.on('data', (chunk) => {
                    body += chunk
                })
                response.on('end', () => {
                    parseString(body, handler)
                })
            });
        }

        function handler(err, result) {
            var response_message = ParseJson(result);
            console.log(response_message);
            context.succeed(generateResponse(buildSpeechletResponse(response_message, true), {}));
        }

        function ParseJson(result) {
            var announceMsg, announceMsg1, announceMsg2;
            var intrestedBusIteration = 2;
            var options = {
                expressOnlyBus: true,
                ignoreBus: 'LOCAL|VIA UNION'
            }

            if (result.stop.pre) {
                let timeList = createBusObj(result.stop.pre, options);

                if (timeList.length == 0) {
                    return "Bus data is unavailable.";
                }

                announceMsg = timeList[0].name + " is ";
                for (var i = 0, len = timeList.length; i < len && i < intrestedBusIteration; i++) {

                    if (i == 1) announceMsg += " and the next bus is ";

                    d = timeList[i];
                    announceMsg += d.time + " " + d.minute;
                }
            } else if (result.stop.noPredictionMessage) {
                announceMsg = "Bus data is unavailable.";
            }
            return announceMsg;
        }

        function createBusObj(timeList, options) {
            var objArr = [];
            for (var i = 0, len = timeList.length; i < len; i++) {
                let bObj = new BusObj(timeList[i]);


                var rgxp = new RegExp(options.ignoreBus, "g");
                if (options.expressOnlyBus) {
                    if (!bObj.name.match(rgxp))
                        objArr[i] = bObj;
                } else {
                    objArr[i] = bObj;
                }
            }
            //console.log(  objArr);
            return objArr;
        }

        function BusObj(b) {
            this.name = b.fd[0];
            this.time = b.pt[0];
            this.min = b.pu[0];
            this.qualifier = ' away';

            if (this.time == '&nbsp;') {
                this.time = '';
                this.qualifier = '';
            }
            this.minute = this.min + this.qualifier;
        }

    } catch (error) {
        context.fail(`Exception: ${error}`)
    }

}

function createObj(b) {
    return {
        "time": b.pt[0],
        "name": b.fd[0],
        "minute": b.pu[0]
    };
}
// Helpers
buildSpeechletResponse = (outputText, shouldEndSession) => {

    return {
        outputSpeech: {
            type: "PlainText",
            text: outputText
        },
        shouldEndSession: shouldEndSession
    }

}

generateResponse = (speechletResponse, sessionAttributes) => {

    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    }

}
