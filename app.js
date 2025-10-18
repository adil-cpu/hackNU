document.addEventListener("DOMContentLoaded", () => {
    // Получаем все нужные элементы со страницы
    const chatMessages = document.getElementById("chat-messages");
    const userInput = document.getElementById("user-input");
    const sendBtn = document.getElementById("send-btn");
    const micBtn = document.getElementById("mic-btn");

    // --- !!! ВАШ URL ИЗ N8N !!! ---
    // Это URL, который вы скопировали из ноды "Webhook" в n8n
    const N8N_WEBHOOK_URL = "https://unreplete-kash-singly.ngrok-free.dev/webhook/5ac114ab-2b53-4dec-b78f-af8321a14c6a";
    // ---------------------------------

    /**
     * Добавляет сообщение в окно чата
     * @param {string} text - Текст сообщения
     * @param {'user' | 'bot'} sender - Отправитель ('user' или 'bot')
     */
    function addMessage(text, sender) {
        const messageDiv = document.createElement("div");
        messageDiv.classList.add("message", sender);
        messageDiv.textContent = text;
        chatMessages.appendChild(messageDiv);
        // Автоматически прокручиваем чат вниз
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    /**
     * Отправляет сообщение боту (в n8n) и получает ответ
     */
    async function handleSendMessage() {
        const messageText = userInput.value.trim();
        if (messageText === "") return;

        // 1. Отображаем сообщение пользователя в чате
        addMessage(messageText, "user");
        userInput.value = ""; // Очищаем поле ввода
        
        // Показываем индикатор загрузки (можно добавить)
        addMessage("Печатает...", "bot-loading");

        // 2. Отправляем запрос на Webhook n8n
        try {
            const response = await fetch(N8N_WEBHOOK_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                // n8n будет ожидать JSON в таком формате
                body: JSON.stringify({ message: messageText }), 
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // 3. Получаем ответ от n8n
            // Мы ожидаем, что n8n вернет JSON вида: {"reply": "Текст ответа..."}
            const data = await response.json();
            const botReply = data.reply || "Извините, у меня нет ответа.";

            // 4. Убираем "Печатает..." и показываем ответ бота
            const loadingIndicator = document.querySelector(".bot-loading");
            if (loadingIndicator) {
                loadingIndicator.remove();
            }
            addMessage(botReply, "bot");

        } catch (error) {
            console.error("Ошибка при обращении к n8n:", error);
            // Убираем "Печатает..." и показываем ошибку
            const loadingIndicator = document.querySelector(".bot-loading");
            if (loadingIndicator) {
                loadingIndicator.remove();
            }
            addMessage(`Произошла ошибка: ${error.message}. Попробуйте еще раз.`, "bot");
        }
    }

    // --- ЛОГИКА ГОЛОСОВОГО ВВОДА (Web Speech API) ---

    // Проверяем, поддерживает ли браузер SpeechRecognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.lang = 'ru-RU'; // Устанавливаем язык
        recognition.interimResults = false; // Нам нужен только финальный результат

        micBtn.addEventListener("click", () => {
            micBtn.classList.add("recording"); // Делаем кнопку красной
            micBtn.disabled = true;
            recognition.start();
        });

        // Когда речь распознана
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            userInput.value = transcript; // Вставляем распознанный текст в поле
            handleSendMessage(); // Сразу отправляем сообщение
        };

        // Когда распознавание закончено (или по таймауту)
        recognition.onend = () => {
            micBtn.classList.remove("recording"); // Возвращаем обычный цвет
            micBtn.disabled = false;
        };

        // Обработка ошибок
        recognition.onerror = (event) => {
            console.error("Ошибка распознавания речи:", event.error);
            micBtn.classList.remove("recording");
            micBtn.disabled = false;
            if (event.error === 'no-speech') {
                 addMessage("Я вас не расслышал. Попробуйте еще раз.", "bot");
            }
        };

    } else {
        // Если API не поддерживается, прячем кнопку микрофона
        console.warn("Web Speech API не поддерживается в этом браузере.");
        micBtn.style.display = "none";
    }

    // --- Навешиваем события ---
    
    // Нажатие на кнопку "Отправить"
    sendBtn.addEventListener("click", handleSendMessage);

    // Нажатие на "Enter" в поле ввода
    userInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            handleSendMessage();
        }
    });
});