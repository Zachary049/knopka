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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const statusRef = ref(db, "accountStatus");

// Элементы страницы
const statusText = document.getElementById("status-text");
const toggleBtn = document.getElementById("toggle-btn");
const info = document.getElementById("info");
const myNameDisplay = document.getElementById("my-name-display");
const changeNameLink = document.getElementById("change-name");

// Элементы для ввода имени
const userBlock = document.getElementById("user-block");
const nameEditor = document.getElementById("name-editor");
const nameInput = document.getElementById("name-input");
const saveNameBtn = document.getElementById("save-name-btn");

let currentData = { busy: false };
let myName = localStorage.getItem("accountUserName");

// --- ЛОГИКА ИМЕН ---
function showNameEditor() {
    userBlock.style.display = "none";
    nameEditor.style.display = "block";
    nameInput.value = myName || "";
    nameInput.focus();
}

function saveName() {
    let newName = nameInput.value.trim();
    if (newName !== "") {
        myName = newName;
        localStorage.setItem("accountUserName", myName);
        myNameDisplay.textContent = myName;
        nameEditor.style.display = "none";
        userBlock.style.display = "block";
        updateUI(); // Пересчитываем, какая должна быть кнопка
    }
}

// Если имени нет при загрузке - показываем редактор
if (!myName) {
    showNameEditor();
} else {
    myNameDisplay.textContent = myName;
}

// Обработчики событий для смены имени
changeNameLink.addEventListener("click", (e) => {
    e.preventDefault();
    showNameEditor();
});

saveNameBtn.addEventListener("click", saveName);

nameInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") saveName();
});


// --- ЛОГИКА СТАТУСА ---
onValue(statusRef, (snapshot) => {
    currentData = snapshot.val() || { busy: false };
    updateUI();
});

function updateUI() {
    if (!myName) return; // Если имя еще не введено, не трогаем кнопку

    document.body.className = currentData.busy ? "busy" : "free";
    statusText.textContent = currentData.busy ? "ЗАНЯТ" : "СВОБОДЕН";
    
    if (currentData.busy) {
        const time = new Date(currentData.updatedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        info.textContent = `Занял: ${currentData.who || 'Кто-то'} в ${time}`;
        
        if (currentData.who !== myName) {
            // Если занял кто-то другой
            toggleBtn.textContent = "Занято другим";
            toggleBtn.disabled = true; 
        } else {
            // Если заняли мы
            toggleBtn.textContent = "Освободить";
            toggleBtn.disabled = false;
        }
    } else {
        // Свободно
        info.textContent = "";
        toggleBtn.textContent = "Занять";
        toggleBtn.disabled = false;
    }
}

// Клик по кнопке Занять/Освободить
toggleBtn.addEventListener("click", () => {
    if (!myName) {
        showNameEditor();
        return;
    }

    if (!currentData.busy) {
        set(statusRef, {
            busy: true,
            who: myName, 
            updatedAt: Date.now() 
        });
    } else if (currentData.who === myName) {
        set(statusRef, {
            busy: false,
            who: null, 
            updatedAt: Date.now() 
        });
    }
});
