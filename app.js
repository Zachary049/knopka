import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, onValue, set, update } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// Твои настройки Firebase
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

const statusText = document.getElementById("status-text");
const toggleBtn = document.getElementById("toggle-btn");
const info = document.getElementById("info");

let currentData = { busy: false };
let myName = localStorage.getItem("accountUserName");
let wasBusy = false; // Для отслеживания смены статуса
let lastRequestFrom = ""; // Защита от спама уведомлениями

// --- УВЕДОМЛЕНИЯ НА ПК ---
function requestNotificationPermission() {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
    }
}

function sendNotification(title, body) {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
        new Notification(title, { body: body });
    }
}

// --- ИМЕНА ---
function askName() {
    let name = prompt("Как вас зовут?");
    if (name && name.trim() !== "") {
        myName = name.trim();
        localStorage.setItem("accountUserName", myName);
        document.getElementById("my-name-display").textContent = myName;
        updateUI(currentData.requestFrom || "", currentData.requestStatus || "");
    }
}

// --- ЛОГИКА ---
onValue(statusRef, (snapshot) => {
    const data = snapshot.val() || { busy: false };
    
    const requestFrom = data.requestFrom || "";
    const requestStatus = data.requestStatus || "";
    
    // 1. Если мы просили, и нам ответили "declined" (отказ)
    if (requestFrom === myName && requestStatus === "declined" && currentData.requestStatus !== "declined") {
        sendNotification("Отказ", `${data.who} ответил: я еще работаю.`);
        // Сбрасываем запрос в базе
        update(statusRef, { requestFrom: null, requestStatus: null });
    }

    // 2. Если мы сидим (busy), а кто-то просит освободить
    if (data.busy && data.who === myName && requestFrom !== "" && requestFrom !== myName && requestStatus === "pending") {
        if (requestFrom !== lastRequestFrom) {
            lastRequestFrom = requestFrom;
            sendNotification("Запрос на освобождение!", `${requestFrom} просит освободить аккаунт.`);
            
            // Спрашиваем пользователя через стандартное окно браузера
            setTimeout(() => {
                if (confirm(`${requestFrom} просит освободить аккаунт. Освободить?`)) {
                    // Нажали "ОК" - освобождаем
                    update(statusRef, { busy: false, who: null, requestStatus: "accepted" });
                } else {
                    // Нажали "Отмена" - отказ
                    update(statusRef, { requestStatus: "declined" });
                }
            }, 500); // Небольшая задержка, чтобы уведомление успело выскочить
        }
    } else if (!data.busy) {
        lastRequestFrom = ""; // Сброс при освобождении
    }

    // 3. Если мы ставили галочку "уведомить когда свободно"
    if (wasBusy && !data.busy && document.getElementById("notifyWhenFree")?.checked) {
        sendNotification("Аккаунт свободен!", "Можно заходить.");
        document.getElementById("notifyWhenFree").checked = false;
    }

    wasBusy = data.busy;
    currentData = data;
    updateUI(requestFrom, requestStatus);
});

function updateUI(requestFrom, requestStatus) {
    if (!myName) return;

    document.body.className = currentData.busy ? "busy" : "free";
    statusText.textContent = currentData.busy ? "ЗАНЯТ" : "СВОБОДЕН";
    
    if (currentData.busy) {
        const time = new Date(currentData.updatedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        
        if (currentData.who !== myName) {
            toggleBtn.textContent = "Занято другим";
            toggleBtn.disabled = true; 
            
            if (requestFrom === myName && requestStatus === "pending") {
                info.innerHTML = `Занял: ${currentData.who} в ${time}<br><b>(Ожидаем ответа...)</b>`;
            } else {
                info.innerHTML = `Занял: ${currentData.who} в ${time}<br><button id="req-btn" style="margin-top:5px; padding: 5px 10px; cursor:pointer;">Попросить освободить</button>`;
                
                // Привязываем кнопку запроса
                setTimeout(() => {
                    document.getElementById("req-btn")?.addEventListener("click", () => {
                        update(statusRef, { requestFrom: myName, requestStatus: "pending" });
                    });
                }, 10);
            }
        } else {
            toggleBtn.textContent = "Освободить";
            toggleBtn.disabled = false;
            
            if (requestFrom !== "" && requestFrom !== myName && requestStatus === "pending") {
                info.innerHTML = `Занял: ${currentData.who} в ${time}<br><b style="color:red;">⚠️ ${requestFrom} просит освободить!</b>`;
            } else {
                info.innerHTML = `Занял: ${currentData.who} в ${time}`;
            }
        }
    } else {
        info.textContent = "";
        toggleBtn.textContent = "Занять";
        toggleBtn.disabled = false;
    }
}

// Навешиваем кнопки
document.getElementById("change-name")?.addEventListener("click", (e) => {
    e.preventDefault();
    askName();
});

// Инициализация
if (!myName) {
    askName();
} else {
    document.getElementById("my-name-display").textContent = myName;
}

toggleBtn.addEventListener("click", () => {
    if (!myName) {
        askName();
        return;
    }

    if (!currentData.busy) {
        // Занимаем
        set(statusRef, {
            busy: true,
            who: myName, 
            requestFrom: null,
            requestStatus: null,
            updatedAt: Date.now() 
        });
        requestNotificationPermission(); // Спросим разрешение на уведомления при первом клике
    } else if (currentData.who === myName) {
        // Освобождаем
        set(statusRef, {
            busy: false,
            who: null, 
            requestFrom: null,
            requestStatus: null,
            updatedAt: Date.now() 
        });
    }
});
