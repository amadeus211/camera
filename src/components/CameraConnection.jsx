import React from "react";
import "../index.css"

const CameraConnection = ({
  devices,
  selectedDevice,
  setSelectedDevice,
  user,
  setUser,
  pass,
  setPass,
  setCameraConnected,
  setConnected,
  ws,
}) => {
  const sendRequest = (method, params = {}) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.error("WebSocket is not open.");
      return;
    }
    ws.send(JSON.stringify({ method, params }));
  };

  const connectDevice = () => {
    if (!selectedDevice) {
      alert("Please select a device");
      return;
    }
    sendRequest("connect", { address: selectedDevice, user, pass });
    setCameraConnected(true);
    setConnected(true);
  };

  return (
    <div className="connect-container">
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
  );
};

export default CameraConnection;
