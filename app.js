document.addEventListener("DOMContentLoaded", () => {
    // Получаем элементы DOM
    const chatMessages = document.getElementById("chat-messages");
    const userInput = document.getElementById("user-input");
    const sendBtn = document.getElementById("send-btn");
    const micBtn = document.getElementById("mic-btn");

    // --- !!! ВАШ URL ИЗ N8N !!! ---
    const N8N_WEBHOOK_URL = "https://unreplete-kash-singly.ngrok-free.dev/webhook/5ac114ab-2b53-4dec-b78f-af8321a14c6a";

    /**
     * Добавляет сообщение в окно чата
     * @param {string} text - Текст сообщения
     * @param {'user' | 'bot' | 'bot-loading'} sender - Отправитель
     */
    function addMessage(text, sender) {
        const messageDiv = document.createElement("div");
        messageDiv.classList.add("message", sender);
        messageDiv.textContent = text;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Автопрокрутка
    }

    /**
     * Отправляет сообщение боту и получает ответ
     */
    async function handleSendMessage() {
        const messageText = userInput.value.trim();
        if (messageText === "") return;

        addMessage(messageText, "user");
        userInput.value = "";
        userInput.focus();
        
        addMessage("Печатает...", "bot-loading");

        try {
            const response = await fetch(N8N_WEBHOOK_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: messageText }),
            });

            // Удаляем индикатор загрузки
            const loadingIndicator = document.querySelector(".bot-loading");
            if(loadingIndicator) loadingIndicator.remove();

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const botReply = data?.[0]?.reply || "Извините, у меня нет ответа.";

            addMessage(botReply, "bot");

        } catch (error) {
            console.error("Ошибка при обращении к бэкенду:", error);
            const loadingIndicator = document.querySelector(".bot-loading");
            if (loadingIndicator) loadingIndicator.remove();
            
            let errorMessage = `Произошла ошибка: ${error.message}. Попробуйте еще раз.`;
            if (error instanceof SyntaxError) {
                errorMessage = "Произошла ошибка: получен некорректный ответ от сервера.";
            }
            addMessage(errorMessage, "bot");
        }
    }

    // --- ЛОГИКА ГОЛОСОВОГО ВВОДА (Web Speech API) ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.lang = 'ru-RU';
        recognition.interimResults = false;

        micBtn.addEventListener("click", () => {
            if (micBtn.classList.contains("recording")) {
                recognition.stop();
            } else {
                recognition.start();
            }
        });

        recognition.onstart = () => {
            micBtn.classList.add("recording");
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            userInput.value = transcript;
            // Сразу отправляем распознанный текст
            handleSendMessage();
        };

        recognition.onend = () => {
            micBtn.classList.remove("recording");
        };

        recognition.onerror = (event) => {
            console.error("Ошибка распознавания речи:", event.error);
            if (event.error === 'no-speech') {
                 addMessage("Я вас не расслышал. Попробуйте еще раз.", "bot");
            }
        };
    } else {
        console.warn("Web Speech API не поддерживается в этом браузере.");
        micBtn.style.display = "none"; // Прячем кнопку, если API нет
    }

    // --- Назначаем обработчики событий ---
    sendBtn.addEventListener("click", handleSendMessage);
    userInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            e.preventDefault(); // Предотвращаем стандартное поведение Enter
            handleSendMessage();
        }
    });
});