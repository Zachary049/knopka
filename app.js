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

// Элементы страницы
const statusText = document.getElementById("status-text");
const toggleBtn = document.getElementById("toggle-btn");
const info = document.getElementById("info");
const myNameDisplay = document.getElementById("my-name-display");
const changeNameLink = document.getElementById("change-name");

let currentData = { busy: false };

// --- ЛОГИКА ИМЕН ---
// Получаем имя из памяти телефона/браузера. Если нет - спрашиваем.
let myName = localStorage.getItem("accountUserName");

function askName() {
    let name = prompt("Как вас зовут? (Чтобы друзья видели, кто занял аккаунт)", myName || "");
    if (name && name.trim() !== "") {
        myName = name.trim();
        localStorage.setItem("accountUserName", myName);
        myNameDisplay.textContent = myName;
        updateUI(); // Обновляем кнопку с учетом нового имени
    } else if (!myName) {
        // Если отменили ввод и имени нет - ставим Анонима
        myName = "Аноним";
        localStorage.setItem("accountUserName", myName);
        myNameDisplay.textContent = myName;
    }
}

if (!myName) {
    askName();
} else {
    myNameDisplay.textContent = myName;
}

changeNameLink.addEventListener("click", (e) => {
    e.preventDefault();
    askName();
});

// --- ЛОГИКА СТАТУСА ---
onValue(statusRef, (snapshot) => {
    currentData = snapshot.val() || { busy: false };
    updateUI();
});

function updateUI() {
    document.body.className = currentData.busy ? "busy" : "free";
    statusText.textContent = currentData.busy ? "ЗАНЯТ" : "СВОБОДЕН";
    
    if (currentData.busy) {
        const time = new Date(currentData.updatedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        info.textContent = `Занял: ${currentData.who || 'Кто-то'} в ${time}`;
        
        // Если занял кто-то другой
        if (currentData.who !== myName) {
            toggleBtn.textContent = "Занято другим";
            toggleBtn.disabled = true; // Кнопка неактивна
        } else {
            // Если заняли мы
            toggleBtn.textContent = "Освободить";
            toggleBtn.disabled = false;
        }
    } else {
        info.textContent = "";
        toggleBtn.textContent = "Занять";
        toggleBtn.disabled = false;
    }
}

// Обработка нажатия на кнопку
toggleBtn.addEventListener("click", () => {
    if (!currentData.busy) {
        // Занимаем аккаунт
        set(statusRef, {
            busy: true,
            who: myName, 
            updatedAt: Date.now() 
        });
    } else if (currentData.who === myName) {
        // Освобождаем аккаунт (только если заняли мы)
        set(statusRef, {
            busy: false,
            who: null, 
            updatedAt: Date.now() 
        });
    }
});
