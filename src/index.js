import React from 'react';
import ReactDOM from 'react-dom/client'; // Оновлений імпорт для React 18
import './index.css'; // Якщо у вас є стилі для вашого додатку
import StreamPlayer from './App'; // Імпортуємо компонент
import OnvifCameraManager from './App';

const root = ReactDOM.createRoot(document.getElementById('root')); // Оновлений спосіб створення кореня

root.render(
  <React.StrictMode>
    <OnvifCameraManager />  {/* Використовуємо компонент StreamPlayer */}
  </React.StrictMode>
);
