import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, onValue, set, update, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

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
const notifyCheckbox = document.getElementById("notify-when-free");
const checkboxContainer = document.getElementById("checkbox-container");

let currentData = { busy: false };
let myName = localStorage.getItem("accountUserName");
let wasBusy = false; 
let lastRequestFrom = "";
let sessionStartTime = 0; 

// --- УВЕДОМЛЕНИЯ ---
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
        const newName = name.trim();
        const usersRef = ref(db, "users");
        onValue(usersRef, (snapshot) => {
            const users = snapshot.val() || {};
            if (users[newName] && newName !== myName) {
                alert(`Имя "${newName}" уже занято кем-то другим! Выберите другое.`);
                askName();
                return;
            }
            myName = newName;
            localStorage.setItem("accountUserName", myName);
            document.getElementById("my-name-display").textContent = myName;
            set(ref(db, "users/" + myName), true);
            updateUI(currentData.requestFrom || "", currentData.requestStatus || "");
        }, { onlyOnce: true });
    }
}

// --- ЛОГИКА СТАТУСА ---
onValue(statusRef, (snapshot) => {
    const data = snapshot.val() || { busy: false };
    const requestFrom = data.requestFrom || "";
    const requestStatus = data.requestStatus || "";
    
    // Обработка отказа
    if (requestFrom === myName && requestStatus === "declined" && currentData.requestStatus !== "declined") {
        sendNotification("Отказ", `${data.who} ответил: я еще работаю.`);
        update(statusRef, { requestFrom: null, requestStatus: null });
    }

    // Обработка запроса (если мы заняли место)
    if (data.busy && data.who === myName && requestFrom !== "" && requestFrom !== myName && requestStatus === "pending") {
        if (requestFrom !== lastRequestFrom) {
            lastRequestFrom = requestFrom;
            sendNotification("Запрос на освобождение!", `${requestFrom} просит освободить аккаунт.`);
            
            setTimeout(() => {
                if (confirm(`${requestFrom} просит освободить аккаунт. Освободить?`)) {
                    if (sessionStartTime > 0) {
                        set(ref(db, "sessions/" + myName), {
                            startTime: sessionStartTime,
                            endTime: Date.now()
                        });
                        sessionStartTime = 0;
                    }
                    update(statusRef, { busy: false, who: null, requestStatus: "accepted" });
                } else {
                    update(statusRef, { requestStatus: "declined" });
                }
            }, 500); 
        }
    } else if (!data.busy) {
        lastRequestFrom = ""; 
    }

    // УВЕДОМЛЕНИЕ ОБ ОСВОБОЖДЕНИИ (галочка)
    if (wasBusy && !data.busy && notifyCheckbox.checked) {
        sendNotification("Аккаунт свободен!", "Можно заходить.");
        notifyCheckbox.checked = false; // Снимаем галочку после срабатывания
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
            
            // Показываем галочку только если занято другим
            checkboxContainer.style.display = "block"; 

            if (requestFrom === myName && requestStatus === "pending") {
                info.innerHTML = `Занял: ${currentData.who} в ${time}<br><b>(Ожидаем ответа...)</b>`;
            } else {
                info.innerHTML = `Занял: ${currentData.who} в ${time}<br><button id="req-btn" style="margin-top:5px; padding: 5px 10px; cursor:pointer;">Попросить освободить</button>`;
                setTimeout(() => {
                    document.getElementById("req-btn")?.addEventListener("click", () => {
                        update(statusRef, { requestFrom: myName, requestStatus: "pending" });
                    });
                }, 10);
            }
        } else {
            toggleBtn.textContent = "Освободить";
            toggleBtn.disabled = false;
            
            // Скрываем галочку, если мы сами заняли
            checkboxContainer.style.display = "none";
            notifyCheckbox.checked = false;

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
        checkboxContainer.style.display = "none";
    }
}

// --- КНОПКИ ---
document.getElementById("change-name")?.addEventListener("click", (e) => {
    e.preventDefault();
    askName();
});

if (!myName) {
    askName();
} else {
    document.getElementById("my-name-display").textContent = myName;
}

// Клик по "Занять/Освободить"
toggleBtn.addEventListener("click", () => {
    if (!myName) {
        askName();
        return;
    }

    if (!currentData.busy) {
        sessionStartTime = Date.now(); 
        set(statusRef, {
            busy: true,
            who: myName, 
            requestFrom: null,
            requestStatus: null,
            updatedAt: Date.now() 
        });
        requestNotificationPermission();
    } else if (currentData.who === myName) {
        if (sessionStartTime > 0) {
            set(ref(db, "sessions/" + myName), {
                startTime: sessionStartTime,
                endTime: Date.now()
            });
            sessionStartTime = 0; 
        }
        set(statusRef, {
            busy: false,
            who: null, 
            requestFrom: null,
            requestStatus: null,
            updatedAt: Date.now() 
        });
    }
});

// --- ИСТОРИЯ СЕССИЙ (МОДАЛЬНОЕ ОКНО) ---
const historyBtn = document.getElementById("history-btn");
const historyModal = document.getElementById("history-modal");
const closeHistoryBtn = document.getElementById("close-history");
const historyList = document.getElementById("history-list");

historyBtn.addEventListener("click", () => {
    historyList.innerHTML = "<p>Загрузка...</p>";
    historyModal.style.display = "flex";

    const sessionsRef = ref(db, "sessions");
    get(sessionsRef).then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            historyList.innerHTML = "";
            
            // Превращаем объект в массив и сортируем по времени окончания (новые сверху)
            const sessionsArray = Object.values(data).sort((a, b) => b.endTime - a.endTime);

            sessionsArray.forEach(session => {
                const start = new Date(session.startTime).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
                const end = new Date(session.endTime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                
                // Считаем длительность в минутах
                const durationMin = Math.round((session.endTime - session.startTime) / 60000);

                const div = document.createElement("div");
                div.className = "history-item";
                div.innerHTML = `
                    <b>${session.who || "Неизвестный"}</b><br>
                    Занял: ${start}<br>
                    Освободил: ${end}<br>
                    <i>(Длительность: ${durationMin} мин.)</i>
                `;
                historyList.appendChild(div);
            });
        } else {
            historyList.innerHTML = "<p>История пуста.</p>";
        }
    }).catch((error) => {
        historyList.innerHTML = "<p>Ошибка загрузки истории.</p>";
    });
});

closeHistoryBtn.addEventListener("click", () => {
    historyModal.style.display = "none";
});
