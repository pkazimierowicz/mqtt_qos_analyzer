const jsonfile = require('jsonfile')
const stats = require("stats-lite");
const commandLineArgs = require("command-line-args");
const mqtt = require("mqtt");
const client = mqtt.connect("mqtt://127.0.0.1:1883");

const options = commandLineArgs([{ name: "sub_qos", defaultOption: 0, type: Number }]);

let devices = {};

client.on("connect", () => {
    client.subscribe("qos_testing/#", {
        qos: options.sub_qos
    });
});

client.on("message", (topic, message) => {
    const device = topic.split("/")[1];
    const i = parseInt(message.toString());
    const ts = process.hrtime();

    if(!devices[device]) {
        devices[device] = {
            last_i: i,
            last_timestamp: ts,
            intervals: [],
            seen: [],
            duplicates: [],
            out_of_order: []
        }
    } else {
        let diff = process.hrtime(devices[device].last_timestamp);
        diff = diff[0]*1000 + diff[1]/1000000.0;
        devices[device].intervals.push(diff);
        if (devices[device].seen.indexOf(i) > -1) {
            devices[device].duplicates.push([Date.now(), i]);
        } else if (devices[device].last_i >= i) {
            devices[device].out_of_order.push([Date.now(), i]);
        }
        devices[device].last_i = i;
        devices[device].seen.push(i);
        devices[device].last_timestamp = ts;
    }
});

setInterval(function() {
    Object.keys(devices).forEach((device) => {
        let d = devices[device];
        console.log("=====");
        console.log("Status for device #" + device);
        console.log("i:", d.last_i);
        console.log("Mean interval:", stats.mean(d.intervals));
        console.log("stddev interval:", stats.stdev(d.intervals));
        console.log("95th percentile interval:", stats.percentile(d.intervals, 0.95));
        console.log("max interval:", Math.max(...d.intervals));
        console.log("number of duplicates:", d.duplicates.length);
        console.log("number of out_of_order:", d.out_of_order.length);
    });
}, 1000);

function dump(reason) {
    console.log("Dumping state to devices.json");
    jsonfile.writeFileSync("devices.json", devices);

    if(reason) {
        console.log("Quiting because:", reason);
        process.exit();
    }
}

process.on("exit", dump.bind(null, "process exit"));
process.on("SIGINT", dump.bind(null, "SIGINT"));
process.on("SIGHUP", dump.bind(null, false));
process.on("uncaughtException", dump.bind(null, "EXCEPTION"));
