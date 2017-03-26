const mqtt = require("mqtt");
const client = mqtt.connect("mqtt://127.0.0.1:1883");

let i = 0;

function spam() {
    client.publish("qos_testing/7", (i++).toString(), { qos: 0 });
}

client.on("connect", function() {
    spam()
    setInterval(spam, 100);
});
