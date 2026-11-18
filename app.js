import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, onValue, set, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// 🔥 ВСТАВЬТЕ СЮДА ВАШИ ДАННЫЕ ИЗ FIREBASE 🔥
const firebaseConfig = {
  apiKey: "ВАШ_API_KEY",
  authDomain: "ВАШ_ПРОЕКТ.firebaseapp.com",
  databaseURL: "https://ВАШ_ПРОЕКТ-default-rtdb.firebaseio.com", // Ссылка из Realtime Database
  projectId: "ВАШ_ПРОЕКТ",
  storageBucket: "ВАШ_ПРОЕКТ.firebasestorage.app",
  messagingSenderId: "ВАШ_ID",
  appId: "ВАШ_APP_ID"
};
// 🔥 БОЛЬШЕ НИЧЕГО НЕ МЕНЯЙТЕ 🔥

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const statusRef = ref(db, "accountStatus");

const statusText = document.getElementById("status-text");
const toggleBtn = document.getElementById("toggle-btn");
const info = document.getElementById("info");

let currentData = { busy: false };

// Слушаем изменения в базе данных в реальном времени
onValue(statusRef, (snapshot) => {
    currentData = snapshot.val() || { busy: false };
    
    // Обновляем цвета и текст на экране
    document.body.className = currentData.busy ? "busy" : "free";
    statusText.textContent = currentData.busy ? "ЗАНЯТ" : "СВОБОДЕН";
    toggleBtn.textContent = currentData.busy ? "Освободить" : "Занять";
    toggleBtn.disabled = false;
    
    if (currentData.busy && currentData.who) {
        const time = new Date(currentData.updatedAt).toLocaleTimeString();
        info.textContent = `Занял: ${currentData.who} в ${time}`;
    } else {
        info.textContent = "";
    }
});

// Обработка нажатия на кнопку
toggleBtn.addEventListener("click", () => {
    const newState = !currentData.busy;
    set(statusRef, {
        busy: newState,
        who: newState ? "Кто-то из друзей" : null, // Можно вписать своё имя в кавычки
        updatedAt: Date.now() // Используем Date.now(), чтобы время точно отображалось на телефонах
    });
});
