"use strict";
const express = require("express");
const Stream = require("node-rtsp-stream");
process.chdir(__dirname);

const app = express();
const cors = require("cors");

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000");
  res.header("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

var onvif = null;
let stream = null;
let currentRtspStreamUrl = null;
app.get("/stream", (req, res) => {
  const newRtspStreamUrl = req.query.rtsp;
  console.log(`Received stream request: ${newRtspStreamUrl}`);

  if (newRtspStreamUrl === "stop" && stream) {
    stream.stop();
    stream = null;
    currentRtspStreamUrl = null;
    console.log("Stream stopped.");
  } else if (newRtspStreamUrl && currentRtspStreamUrl !== newRtspStreamUrl) {
    if (stream) {
      stream.stop();
    }
    stream = new Stream({
      name: "Camera Stream",
      streamUrl: newRtspStreamUrl,
      wsPort: 9999,
    });
    currentRtspStreamUrl = newRtspStreamUrl;
    console.log(`New RTSP stream started: ${newRtspStreamUrl}`);
  }

  res.status(200).json({ url: "ws://127.0.0.1:9999" });
});
try {
  onvif = require("../../lib/node-onvif.js");
} catch (e) {
  onvif = require("node-onvif");
}
var WebSocketServer = require("websocket").server;
var http = require("http");
var fs = require("fs");
var port = 3003;

(function main() {
  var http_server = http.createServer(httpServerRequest);
  http_server.listen(port, function () {
    console.log("Listening on port " + port);
  });
  var wsserver = new WebSocketServer({
    httpServer: http_server,
  });
  wsserver.on("request", wsServerRequest);
})();

function httpServerRequest(req, res) {
  if (req.url.startsWith("/stream")) {
    return app(req, res); // Передаємо запит в Express
  }

  var path = req.url.replace(/\?.*$/, "");
  if (path.match(/\.{2,}/) || path.match(/[^a-zA-Z\d\_\-\.\/]/)) {
    httpServerResponse404(req.url, res);
    return;
  }
  if (path === "/") {
    path = "/index.html";
    console.log("html?");
  }
  var fpath = "./html" + path;
  fs.readFile(fpath, "utf-8", function (err, data) {
    if (err) {
      httpServerResponse404(req.url, res);
      return;
    } else {
      var ctype = getContentType(fpath);
      res.writeHead(200, { "Content-Type": ctype });
      res.write(data);
      res.end();
      console.log("HTTP : 200 OK : " + req.url);
    }
  });
}

function httpServerResponse404(url, res) {
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.write("404 Not Found: " + url);
  res.end();
  console.log("HTTP : 404 Not Found : " + url);
}

function wsServerRequest(request) {
  var conn = request.accept(null, request.origin);

  if (Object.keys(devices).length === 0) {
    startDiscovery(conn);
  }

  conn.on("message", function (message) {
    if (message.type !== "utf8") {
      return;
    }
    var data = JSON.parse(message.utf8Data);
    var method = data["method"];
    console.log(`Received method: ${method}`);

    var params = data["params"];
    if (method === "startDiscovery") {
      startDiscovery(conn);
    } else if (method === "connect") {
      console.log("connect init");

      connect(conn, params);
    } else if (method === "ptzMove") {
      console.log("Move command received, initiating PTZ...");
      ptzMove(conn, params);
    } else if (method === "ptzStop") {
      ptzStop(conn, params);
    } else if (method === "ptzHome") {
      ptzHome(conn, params);
    }
  });

  conn.on("close", function (message) {});
  conn.on("error", function (error) {
    console.log(error);
  });
}

var devices = {};
function startDiscovery(conn) {
  devices = {};
  let names = {};
  onvif
    .startProbe()
    .then((device_list) => {
      device_list.forEach((device) => {
        let odevice = new onvif.OnvifDevice({
          xaddr: device.xaddrs[0],
        });
        let addr = odevice.address;
        devices[addr] = odevice;
        names[addr] = device.name;
      });
      var devs = {};
      for (var addr in devices) {
        devs[addr] = {
          name: names[addr],
          address: addr,
        };
      }
      let res = { id: "startDiscovery", result: devs };
      conn.send(JSON.stringify(res));
    })
    .catch((error) => {
      let res = { id: "connect", error: error.message };
      conn.send(JSON.stringify(res));
    });
  console.log("Found ONVIF devices:", devices);
}

function connect(conn, params) {
  console.log("params:", params, "conn:", conn);

  var device = devices[params.address];
  console.log("device:", device);

  if (!device) {
    var res = {
      id: "connect",
      error: "The specified device is not found: " + params.address,
    };
    conn.send(JSON.stringify(res));
    return;
  }
  if (params.user) {
    device.setAuth(params.user, params.pass);
  }
  device.init((error, result) => {
    var res = { id: "connect" };
    if (error) {
      res["error"] = error.toString();
    } else {
      res["result"] = result;
    }
    console.log(JSON.stringify(res));
    console.log("JSON SEND");

    conn.send(JSON.stringify(res));
  });
}
function ptzMove(conn, params) {
  console.log("Received PTZ Move params:", params); // Логування параметрів
  console.log(devices);

  var device = devices[params.address];
  console.log(device);

  if (!device) {
    var res = {
      id: "ptzMove",
      error: "The specified device is not found: " + params.address,
    };
    conn.send(JSON.stringify(res)); // Надсилаємо відповідь з помилкою
    console.log("Device not found: ", params.address);
    return;
  }

  device.ptzMove(params, (error) => {
    var res = { id: "ptzMove" };
    if (error) {
      res["error"] = error.toString();
    } else {
      res["result"] = "success";
    }
    conn.send(JSON.stringify(res));
  });
}
