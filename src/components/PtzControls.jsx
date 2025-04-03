import React from "react";
import "../index.css";

const PtzControls = ({ ws, selectedDevice }) => {
  const ptzSpeed = 2.5;

  const sendRequest = (method, params = {}) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.error("WebSocket is not open.");
      return;
    }
    ws.send(JSON.stringify({ method, params }));
  };

  const ptzControl = (direction) => {
    let speed = { x: 0, y: 0, z: 0 };
    if (direction === "up") speed.y = ptzSpeed;
    if (direction === "down") speed.y = -ptzSpeed;
    if (direction === "left") speed.x = -ptzSpeed;
    if (direction === "right") speed.x = ptzSpeed;

    sendRequest("ptzMove", { address: selectedDevice, speed, timeout: 2 });
  };

  return (
    <div className="ptz-ctl-box">
      <div className="ptz-grid">
        <button className="ptz-btn empty"></button>
        <button className="ptz-btn up" onClick={() => ptzControl("up")}>
          ↑
        </button>
        <button className="ptz-btn empty"></button>

        <button className="ptz-btn left" onClick={() => ptzControl("left")}>
          ←
        </button>
        <button className="ptz-btn empty"></button>

        <button className="ptz-btn right" onClick={() => ptzControl("right")}>
          →
        </button>

        <button className="ptz-btn empty"></button>
        <button className="ptz-btn down" onClick={() => ptzControl("down")}>
          ↓
        </button>
        <button className="ptz-btn empty"></button>
      </div>
    </div>
  );
};

export default PtzControls;
