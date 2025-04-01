"use strict";
const express = require("express");
const Stream = require("node-rtsp-stream");
process.chdir(__dirname);

const app = express();
const cors = require("cors");

// app.use(
//   cors({
//     origin: "http://localhost:3000",
//     methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
//     credentials: true,
//   })
// );


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

function getContentType(fpath) {
  var ext = fpath.split(".").pop().toLowerCase();
  if (ext.match(/^(html|htm)$/)) {
    return "text/html";
  } else if (ext.match(/^(jpeg|jpg)$/)) {
    return "image/jpeg";
  } else if (ext.match(/^(png|gif)$/)) {
    return "image/" + ext;
  } else if (ext === "css") {
    return "text/css";
  } else if (ext === "js") {
    return "text/javascript";
  } else if (ext === "woff2") {
    return "application/font-woff";
  } else if (ext === "woff") {
    return "application/font-woff";
  } else if (ext === "ttf") {
    return "application/font-ttf";
  } else if (ext === "svg") {
    return "image/svg+xml";
  } else if (ext === "eot") {
    return "application/vnd.ms-fontobject";
  } else if (ext === "oft") {
    return "application/x-font-otf";
  } else {
    return "application/octet-stream";
  }
}

function httpServerResponse404(url, res) {
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.write("404 Not Found: " + url);
  res.end();
  console.log("HTTP : 404 Not Found : " + url);
}

var client_list = [];

function wsServerRequest(request) {
  var conn = request.accept(null, request.origin);
  conn.on("message", function (message) {
    if (message.type !== "utf8") {
      return;
    }
    var data = JSON.parse(message.utf8Data);
    var method = data["method"];
    var params = data["params"];
    if (method === "startDiscovery") {
      startDiscovery(conn);
    } else if (method === "connect") {
      connect(conn, params);
    } else if (method === "ptzMove") {
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
  var device = devices[params.address];
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
    conn.send(JSON.stringify(res));
  });
}

function ptzMove(conn, params) {
  var device = devices[params.address];
  if (!device) {
    var res = {
      id: "ptzMove",
      error: "The specified device is not found: " + params.address,
    };
    conn.send(JSON.stringify(res));
    return;
  }
  device.ptzMove(params, (error) => {
    var res = { id: "ptzMove" };
    if (error) {
      res["error"] = error.toString();
    } else {
      res["result"] = true;
    }
    conn.send(JSON.stringify(res));
  });
}

function ptzStop(conn, params) {
  var device = devices[params.address];
  if (!device) {
    var res = {
      id: "ptzStop",
      error: "The specified device is not found: " + params.address,
    };
    conn.send(JSON.stringify(res));
    return;
  }
  device.ptzStop((error) => {
    var res = { id: "ptzStop" };
    if (error) {
      res["error"] = error.toString();
    } else {
      res["result"] = true;
    }
    conn.send(JSON.stringify(res));
  });
}

function ptzHome(conn, params) {
  var device = devices[params.address];
  if (!device) {
    var res = {
      id: "ptzMove",
      error: "The specified device is not found: " + params.address,
    };
    conn.send(JSON.stringify(res));
    return;
  }
  if (!device.services.ptz) {
    var res = {
      id: "ptzHome",
      error: "The specified device does not support PTZ.",
    };
    conn.send(JSON.stringify(res));
    return;
  }

  var ptz = device.services.ptz;
  var profile = device.getCurrentProfile();
  var params = {
    ProfileToken: profile["token"],
    Speed: 1,
  };
  ptz.gotoHomePosition(params, (error, result) => {
    var res = { id: "ptzMove" };
    if (error) {
      res["error"] = error.toString();
    } else {
      res["result"] = true;
    }
    conn.send(JSON.stringify(res));
  });
}
