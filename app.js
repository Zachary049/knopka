import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// Ваши реальные настройки Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCORdHoa6TZDt3eyhNa7V0A46VXnnTJzyk",
  authDomain: "knopkagpt.firebaseapp.com",
  databaseURL: "https://knopkagpt-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "knopkagpt",
  storageBucket: "knopkagpt.firebasestorage.app",
  messagingSenderId: "59784956213",
  appId: "1:59784956213:web:14bd3a3617d391f823e47c"
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const statusRef = ref(db, "accountStatus");

// Получаем элементы со страницы
const statusText = document.getElementById("status-text");
const toggleBtn = document.getElementById("toggle-btn");
const info = document.getElementById("info");

let currentData = { busy: false };

// Слушаем изменения в базе данных в реальном времени
onValue(statusRef, (snapshot) => {
    currentData = snapshot.val() || { busy: false };
    
    // Обновляем цвета и текст
    document.body.className = currentData.busy ? "busy" : "free";
    statusText.textContent = currentData.busy ? "ЗАНЯТ" : "СВОБОДЕН";
    toggleBtn.textContent = currentData.busy ? "Освободить" : "Занять";
    toggleBtn.disabled = false;
    
    if (currentData.busy && currentData.updatedAt) {
        const time = new Date(currentData.updatedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        info.textContent = `Занял: ${currentData.who || 'Друг'} в ${time}`;
    } else {
        info.textContent = "";
    }
});

// Обработка нажатия на кнопку
toggleBtn.addEventListener("click", () => {
    const newState = !currentData.busy;
    set(statusRef, {
        busy: newState,
        who: newState ? "Друг" : null, 
        updatedAt: Date.now() 
    });
});
