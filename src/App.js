import React, { useEffect, useState } from "react";
import JSMpeg from "@cycjimmy/jsmpeg-player";
import axios from "axios";
import $ from "jquery";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min";
import "./index.css";

const OnvifCameraManager = () => {
  const [ws, setWs] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [connected, setConnected] = useState(false);
  const [snapshot, setSnapshot] = useState("");
  const [ptzSpeed, setPtzSpeed] = useState("1.0");
  const [cameraConnected, setCameraConnected] = useState(false);

  const rtspurl = "rtsp://admin:Sasha21012004@192.168.0.106:554/stream1";

  useEffect(() => {
    // Додавання jQuery перед Onvif.js
    const jqueryScript = document.createElement("script");
    jqueryScript.src = "https://code.jquery.com/jquery-3.6.0.min.js";
    jqueryScript.async = true;
    document.body.appendChild(jqueryScript);

    jqueryScript.onload = () => {
      console.log("jQuery loaded");

      const onvifScript = document.createElement("script");
      onvifScript.src = "/onvif.js";
      onvifScript.async = true;
      document.body.appendChild(onvifScript);

      onvifScript.onload = () => {
        console.log("Onvif.js loaded");
      };
    };

    return () => {
      document.body.removeChild(jqueryScript);
    };
  }, []);

  const httpRequest = (url) => {
    console.log(`Sending request to start stream: ${url}`);
    axios
      .get(`http://127.0.0.1:3003/stream?rtsp=${url}`)
      .then((response) => console.log("Stream started", response.data))
      .catch((error) => console.log("Error starting stream", error));
  };

  useEffect(() => {
    if (cameraConnected) {
      setTimeout(() => {
        console.log("camera connected");

        httpRequest(rtspurl);
        const url = "ws://127.0.0.1:9999";
        let canvas = document.getElementById("video-canvas");

        if (canvas) {
          try {
            new JSMpeg.Player(url, { canvas: canvas });
            console.log("Video player initialized");
          } catch (error) {
            console.error("Error initializing video player:", error);
          }
        }
      }, 5000);
    }
  }, [cameraConnected]);

  const initWebSocket = () => {
    const socket = new WebSocket(`ws://${window.location.hostname}:3003`);
    socket.onopen = () => {
      console.log("WebSocket connection established.");
      sendRequest(socket, "startDiscovery");
    };
    socket.onmessage = (res) => {
      const data = JSON.parse(res.data);
      handleWebSocketResponse(data);
    };
    socket.onerror = () => {
      alert("WebSocket connection error. Make sure the server is running.");
    };
    socket.onclose = () => {
      console.log("WebSocket connection closed.");
    };
    setWs(socket);
  };

  useEffect(() => {
    initWebSocket();

    return () => ws && ws.close();
  }, []);

  const sendRequest = (socket, method, params = {}) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.error("WebSocket is not open. Cannot send request.");
      return;
    }
    socket.send(JSON.stringify({ method, params }));
  };

  useEffect(() => {
    if (!ws) return;
    sendRequest(ws, "startDiscovery");
  }, []);

  const handleWebSocketResponse = (data) => {
    if (data.id === "startDiscovery") {
      setDevices(data.result || []);
    } else if (data.id === "connect") {
      if (data.result) {
        setConnected(true);
      } else {
        console.error("Connection failed:", data.error);
        alert(
          "Failed to connect to device. " + (data.error || "Unknown error")
        );
      }
    } else if (data.id === "fetchSnapshot") {
      if (data.result) {
        setSnapshot(data.result);
      }
    }
  };

  useEffect(() => {
    if (!ws) {
      initWebSocket();
    }
    return () => {
      if (ws) ws.close();
    };
  }, []);

  const connectDevice = () => {
    if (!selectedDevice) {
      alert("Please select a device");
      return;
    }
    console.log("Connecting to:", selectedDevice, "User:", user, "Pass:", pass);
    console.log(`device info: ${user} ${selectedDevice}`);

    sendRequest(ws, "connect", { address: selectedDevice, user, pass });
    setCameraConnected(true);
  };

  const disconnectDevice = () => {
    setConnected(false);
    setCameraConnected(false);
    setSnapshot("");
  };

  useEffect(() => {
    console.log(connected);
  }, [connected]);

  const ptzControl = (direction) => {
    if (!cameraConnected) return;

    let speed = { x: 0, y: 0, z: 0 };

    switch (direction) {
      case "up":
        speed.y = parseFloat(ptzSpeed);
        break;
      case "down":
        speed.y = -parseFloat(ptzSpeed);
        break;
      case "left":
        speed.x = -parseFloat(ptzSpeed);
        break;
      case "right":
        speed.x = parseFloat(ptzSpeed);
        break;
      default:
        console.error("Unknown direction:", direction);
        return;
    }

    console.log("Sending PTZ command with params:", {
      address: selectedDevice,
      speed,
      timeout: 5,
    });

    sendRequest(ws, "ptzMove", { address: selectedDevice, speed, timeout: 30 });
  };

  return (
    <div className="container mt-4">
      <h1>ONVIF Network Camera Manager</h1>

      {!connected ? (
        <div>
          <div className="form-group">
            <label>Device</label>
            <select
              className="form-control"
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
            >
              <option value="">Select a device</option>
              {Object.entries(devices).map(([key, device]) => (
                <option key={key} value={device.address}>
                  {device.name} ({device.address})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              className="form-control"
              value={user}
              onChange={(e) => setUser(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              className="form-control"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
          </div>

          <button className="btn btn-primary" onClick={connectDevice}>
            Connect
          </button>
        </div>
      ) : (
        <div className="container-cam">
          <div>
            <canvas id="video-canvas"></canvas>
          </div>
          <div className="control">
            <div className="ptz-ctl-box">
              <div className="ptz-pad-box">
                <button className="ptz-btn up" onClick={() => ptzControl("up")}>
                  Up
                </button>
                <button
                  className="ptz-btn left"
                  onClick={() => ptzControl("left")}
                >
                  Left
                </button>
                <button
                  className="ptz-btn right"
                  onClick={() => ptzControl("right")}
                >
                  Right
                </button>
                <button
                  className="ptz-btn down"
                  onClick={() => ptzControl("down")}
                >
                  Down
                </button>
              </div>
            </div>
            <div>
              <button className="secondary" onClick={disconnectDevice}>
                Disconnect
              </button>
            </div>
            <div className="speed-control">
              <label>Speed: {ptzSpeed}</label>
              <button
                className="btn btn-secondary"
                onClick={() => setPtzSpeed((prev) => Math.max(0.1, prev - 0.1))}
              >
                -
              </button>
              <input
                type="number"
                className="form-control"
                value={ptzSpeed}
                onChange={(e) => setPtzSpeed(parseFloat(e.target.value) || 0.1)}
                step="0.1"
                min="0.1"
                max="5.0"
              />
              <button
                className="btn btn-secondary"
                onClick={() => setPtzSpeed((prev) => Math.min(5.0, prev + 0.1))}
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnvifCameraManager;
