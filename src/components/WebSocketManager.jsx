import { useEffect } from "react";

const WebSocketManager = ({ setWs, setDevices, setConnected }) => {
  useEffect(() => {
    const socket = new WebSocket(`ws://${window.location.hostname}:3003`);
    socket.onopen = () => socket.send(JSON.stringify({ method: "startDiscovery" }));
    socket.onmessage = (res) => setDevices(JSON.parse(res.data).result || []);
    setWs(socket);
    return () => socket.close();
  }, []);

  return null;
};

export default WebSocketManager;
