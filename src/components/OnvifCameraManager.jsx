import React, { useEffect, useState } from "react";
import axios from "axios";
import JSMpeg from "@cycjimmy/jsmpeg-player";
import CameraConnection from "./CameraConnection";
import VideoStream from "./VideoStream";
import PtzControls from "./PtzControls";
import WebSocketManager from "./WebSocketManager";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min";
import "../index.css";

const OnvifCameraManager = () => {
  const [ws, setWs] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [connected, setConnected] = useState(false);
  const [rtspUrl, setRtspUrl] = useState("");
  const [cameraConnected, setCameraConnected] = useState(false);

  useEffect(() => {
    if (selectedDevice && user && pass) {
      setRtspUrl(`rtsp://${user}:${pass}@${selectedDevice}:554/stream1`);
    } else {
      setRtspUrl("");
    }
  }, [selectedDevice, user, pass]);

  return (
    <div className="container mt-4">
      <div className="title">
        <h1>ONVIF Network Camera Manager</h1>
        {cameraConnected ? (
          <button className="secondary" onClick={() => setConnected(false)}>
            Disconnect
          </button>
        ) : (
          <div></div>
        )}
      </div>

      <WebSocketManager
        setWs={setWs}
        setDevices={setDevices}
        setConnected={setConnected}
      />

      {!connected ? (
        <CameraConnection
          devices={devices}
          selectedDevice={selectedDevice}
          setSelectedDevice={setSelectedDevice}
          user={user}
          setUser={setUser}
          pass={pass}
          setPass={setPass}
          setCameraConnected={setCameraConnected}
          setConnected={setConnected}
          ws={ws}
        />
      ) : (
        <>
          <VideoStream rtspUrl={rtspUrl} cameraConnected={cameraConnected} />
          <PtzControls ws={ws} selectedDevice={selectedDevice} />
        </>
      )}
    </div>
  );
};

export default OnvifCameraManager;
