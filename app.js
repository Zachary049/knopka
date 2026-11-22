import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, onValue, set, update, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCORdHoa6TZDt3eyhNa7V0A46VXnnTJzyk",
  authDomain: "knopkagpt.firebaseapp.com",
  // ВОЗВРАЩАЕМ ПРАВИЛЬНУЮ ССЫЛКУ!
  databaseURL: "https://knopkagpt-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "knopkagpt",
  storageBucket: "knopkagpt.firebasestorage.app",
  messagingSenderId: "59784956213",
  appId: "1:59784956213:web:14bd3a3617d391f823e47c"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const statusRef = ref(db, "accountStatus");

const $ = (id) => document.getElementById(id);
const statusText = $("status-text");
const toggleBtn = $("toggle-btn");
const info = $("info");
const nameEditor = $("name-editor");
const nameInput = $("name-input");
const nameDisplay = $("my-name-display");
const notifyCheckbox = $("notifyWhenFree");
const notifyLabel = $("notify-label");
const requestBtn = $("request-btn");
const requestStatusBox = $("request-status");
const requestStatusText = $("request-status-text");

let currentData = { busy: false };
let myName = null;
try { myName = localStorage.getItem("accountUserName"); } catch (e) {}
let wasBusy = false;
let lastRequestFrom = "";

/* ================= УВЕДОМЛЕНИЯ ================= */
function requestNotificationPermission() {
    try {
        if (!("Notification" in window)) return;
        if (Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission();
        }
    } catch (e) { console.warn(e); }
}

function sendNotification(title, body) {
    try {
        if (!("Notification" in window)) return;
        if (Notification.permission !== "granted") return;
        new Notification(title, { body });
    } catch (e) { console.warn("Notification failed", e); }
}

/* ================= ИМЯ ================= */
function openNameEditor() {
    if (!nameEditor) return;
    nameEditor.style.display = "block";
    nameInput.value = myName || "";
    nameInput.focus();
}

// ОБНОВЛЕННАЯ ФУНКЦИЯ СОХРАНЕНИЯ ИМЕНИ (С ЗАПИСЬЮ В FIREBASE)
function saveName() {
    const name = (nameInput?.value || "").trim();
    if (!name) return;

    // Проверяем, не занято ли это имя в базе
    const usersRef = ref(db, "users");
    get(usersRef).then((snapshot) => {
        const users = snapshot.val() || {};
        
        // Если имя уже есть в базе и это не наше старое имя
        if (users[name] && name !== myName) {
            alert(`Имя "${name}" уже занято кем-то другим! Выберите другое.`);
            return; // Прерываем сохранение
        }

        // Если меняем имя, удаляем старое из базы
        if (myName && myName !== name) {
            set(ref(db, "users/" + myName), null);
        }

        myName = name;
        try { localStorage.setItem("accountUserName", myName); } catch (e) {}
        if (nameDisplay) nameDisplay.textContent = myName;
        if (nameEditor) nameEditor.style.display = "none";
        
        // ЗАПИСЫВАЕМ НОВОЕ ИМЯ В БАЗУ
        set(ref(db, "users/" + myName), true);
        
        updateUI(currentData.requestFrom || "", currentData.requestStatus || "");
    }).catch(err => {
        console.error("Ошибка проверки имени:", err);
        alert("Ошибка подключения к базе. Попробуйте еще раз.");
    });
}

/* ================= ОСНОВНАЯ ЛОГИКА ================= */
onValue(statusRef, (snapshot) => {
    const data = snapshot.val() || { busy: false };
    const requestFrom = data.requestFrom || "";
    const requestStatus = data.requestStatus || "";

    // 1) Нам ответили отказом
    if (myName && requestFrom === myName && requestStatus === "declined" && currentData.requestStatus !== "declined") {
        sendNotification("Отказ", `${data.who || "Кто-то"} ответил: я еще работаю.`);
        update(statusRef, { requestFrom: null, requestStatus: null });
    }

    // 2) Нас просят освободить (мы заняли)
    if (data.busy && data.who === myName && requestFrom && requestFrom !== myName && requestStatus === "pending") {
        if (requestFrom !== lastRequestFrom) {
            lastRequestFrom = requestFrom;
            sendNotification("Запрос на освобождение!", `${requestFrom} просит освободить аккаунт.`);
            setTimeout(() => {
                let ok = false;
                try { ok = window.confirm(`${requestFrom} просит освободить аккаунт. Освободить?`); }
                catch (e) { ok = false; }
                if (ok) {
                    update(statusRef, { busy: false, who: null, requestStatus: "accepted" });
                } else {
                    update(statusRef, { requestStatus: "declined" });
                }
            }, 400);
        }
    } else if (!data.busy) {
        lastRequestFrom = "";
    }

    // 3) Уведомить, когда освободится
    if (wasBusy && !data.busy && notifyCheckbox?.checked) {
        sendNotification("Аккаунт свободен!", "Можно заходить.");
        notifyCheckbox.checked = false;
    }

    wasBusy = data.busy;
    currentData = data;
    updateUI(requestFrom, requestStatus);
});

/* ================= ОТРИСОВКА UI ================= */
function updateUI(requestFrom, requestStatus) {
    if (!myName) return;

    document.body.className = currentData.busy ? "busy" : "free";
    if (statusText) statusText.textContent = currentData.busy ? "ЗАНЯТ" : "СВОБОДЕН";

    if (currentData.busy) {
        const time = currentData.updatedAt
            ? new Date(currentData.updatedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
            : "?";

        if (currentData.who !== myName) {
            toggleBtn.textContent = "Занято другим";
            toggleBtn.disabled = true;

            if (requestFrom === myName && requestStatus === "pending") {
                info.innerHTML = `Занял: ${currentData.who || "?"} в ${time}<br><b>(Ожидаем ответа...)</b>`;
            } else {
                info.innerHTML = `Занял: ${currentData.who || "?"} в ${time}`;
            }

            if (requestFrom === myName && requestStatus === "pending") {
                requestBtn.style.display = "none";
                requestStatusBox.style.display = "flex";
                requestStatusText.textContent = "Ожидаем ответа…";
            } else if (requestFrom === myName && requestStatus === "declined") {
                requestBtn.style.display = "inline-block";
                requestStatusBox.style.display = "none";
            } else {
                requestBtn.style.display = "inline-block";
                requestStatusBox.style.display = "none";
                requestBtn.disabled = false;
                requestBtn.textContent = "Попросить освободить";
            }
            notifyLabel.style.display = "none";

        } else {
            toggleBtn.textContent = "Освободить";
            toggleBtn.disabled = false;

            if (requestFrom && requestFrom !== myName && requestStatus === "pending") {
                info.innerHTML = `Занял: ${currentData.who} в ${time}<br><b style="color:red;">⚠️ ${requestFrom} просит освободить!</b>`;
            } else {
                info.innerHTML = `Занял: ${currentData.who} в ${time}`;
            }

            requestBtn.style.display = "none";
            requestStatusBox.style.display = "none";
            notifyLabel.style.display = "none";
        }

    } else {
        info.textContent = "";
        toggleBtn.textContent = "Занять";
        toggleBtn.disabled = false;

        requestBtn.style.display = "none";
        requestStatusBox.style.display = "none";
        notifyLabel.style.display = "flex";
    }
}

/* ================= ОБРАБОТЧИКИ ================= */
$("change-name")?.addEventListener("click", (e) => {
    e.preventDefault();
    openNameEditor();
});

$("save-name-btn")?.addEventListener("click", saveName);
nameInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); saveName(); }
});

// Кнопка "Попросить освободить"
requestBtn?.addEventListener("click", () => {
    if (!myName || !currentData.busy) return;
    requestNotificationPermission();
    update(statusRef, { requestFrom: myName, requestStatus: "pending" });
    requestBtn.style.display = "none";
    requestStatusBox.style.display = "flex";
    requestStatusText.textContent = "Ожидаем ответа…";
});

// Основная кнопка "Занять / Освободить"
toggleBtn.addEventListener("click", () => {
    if (!myName) { openNameEditor(); return; }

    if (!currentData.busy) {
        set(statusRef, {
            busy: true,
            who: myName,
            requestFrom: null,
            requestStatus: null,
            updatedAt: Date.now()
        });
        requestNotificationPermission();
    } else if (currentData.who === myName) {
        set(statusRef, {
            busy: false,
            who: null,
            requestFrom: null,
            requestStatus: null,
            updatedAt: Date.now()
        });
    }
});

/* ================= ИНИЦИАЛИЗАЦИЯ ================= */
if (!myName) {
    openNameEditor();
} else if (nameDisplay) {
    nameDisplay.textContent = myName;
    // СИНХРОНИЗАЦИЯ ИМЕНИ ПРИ ЗАГРУЗКЕ
    // Если ты уже заходил раньше, при загрузке сайта имя автоматически добавится в базу
    set(ref(db, "users/" + myName), true);
}

/* ================= ПРИНУДИТЕЛЬНАЯ СИНХРОНИЗАЦИЯ ================= */
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
        get(statusRef).then((snapshot) => {
            const data = snapshot.val() || { busy: false };
            currentData = data;
            updateUI(data.requestFrom || "", data.requestStatus || "");
        }).catch(err => console.warn("Sync error:", err));
    }
});
