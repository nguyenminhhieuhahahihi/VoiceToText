document.addEventListener("DOMContentLoaded", () => {
    // --- Element ---
    const btnVoice = document.getElementById("btnVoice");
    const textArea = document.getElementById("textArea");
    const btnCopy = document.getElementById("btnCopy");
    const btnClear = document.getElementById("btnClear");
    const notification = document.getElementById("notification");

    const helpIcon = document.getElementById("helpIcon");
    const guideDialog = document.getElementById("guideDialog");
    const closeDialog = document.getElementById("closeDialog");

    const btnSelectChar = document.getElementById("btnSelectChar");
    const charDialog = document.getElementById("charDialog");
    const closeCharDialog = document.getElementById("closeCharDialog");

    const lowercase = document.getElementById("lowercase");
    const uppercase = document.getElementById("uppercase");

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    let recognition = null;
    let isRecording = false;
    let savedTranscript = "";
    let silenceTimeout = null;
    let ignoreResults = false;

    // --- Mapping từ → ký tự ---
    const wordToCharMap = {
        "chấm than": "!",
        "chấm hỏi": "?",
        "chấm": ".",
        "phẩy": ",",
        "xuống dòng": "\n"
    };

    function replaceWordsWithChars(text) {
        let result = text;
        for (const key in wordToCharMap) {
            const regex = new RegExp(`\\b${key}\\b`, "gi");
            result = result.replace(regex, wordToCharMap[key]);
        }
        return result;
    }

    function capitalizeAfterPunctuation(text) {
        let result = "";
        let capitalizeNext = true;
        for (let i = 0; i < text.length; i++) {
            let char = text[i];
            if (capitalizeNext && /[a-zA-ZÀ-ỹ]/.test(char)) {
                char = char.toUpperCase();
                capitalizeNext = false;
            }
            result += char;
            if ([".", "!", "?", "\n"].includes(char)) capitalizeNext = true;
        }
        return result;
    }

    // --- Speech Recognition ---
    function createRecognition() {
        const rec = new SpeechRecognition();
        rec.lang = "vi-VN";
        rec.continuous = true;
        rec.interimResults = true;

        rec.onresult = (event) => {
            if (ignoreResults) return;

            clearTimeout(silenceTimeout);
            silenceTimeout = setTimeout(() => stopRecording(), 5000);

            let interimText = "";
            let finalText = "";

            for (let i = 0; i < event.results.length; i++) {
                let transcript = event.results[i][0].transcript;
                transcript = replaceWordsWithChars(transcript);

                transcript = transcript
                    .split("\n")
                    .map(line => line.replace(/^\s+/, ""))
                    .join("\n");

                if (event.results[i].isFinal) {
                    transcript = capitalizeAfterPunctuation(transcript);
                    finalText += transcript;
                    if (!transcript.endsWith("\n")) finalText += " ";
                } else {
                    interimText += transcript + " ";
                }
            }

            textArea.value = (savedTranscript + finalText + interimText).trim();
            textArea.scrollTop = textArea.scrollHeight;
            updateButtons();
        };

        rec.onerror = (event) => {
            console.error("Lỗi micro:", event.error);
            stopRecording();
        };

        return rec;
    }

    function startRecording() {
        recognition = createRecognition();
        ignoreResults = false;
        recognition.start();

        isRecording = true;
        btnVoice.classList.add("recording");
        btnVoice.innerText = "🔴 Listening...";

        updateButtons();
        silenceTimeout = setTimeout(() => stopRecording(), 5000);
    }

    function stopRecording() {
        if (!isRecording) return;

        savedTranscript = textArea.value;
        ignoreResults = true;
        recognition.stop();
        isRecording = false;

        btnVoice.classList.remove("recording");
        btnVoice.innerText = "🎤 Start";

        updateButtons();
        clearTimeout(silenceTimeout);
    }

    // --- Update trạng thái nút ---
    function updateButtons() {
        const hasText = textArea.value.trim().length > 0;
        btnCopy.disabled = !hasText || isRecording;
        btnClear.disabled = !hasText || isRecording;
        btnSelectChar.disabled = isRecording; // disable chọn chữ khi ghi âm
    }

    function showNotification(msg, duration = 1500) {
        notification.textContent = msg;
        notification.style.display = "block";
        setTimeout(() => {
            notification.style.display = "none";
        }, duration);
    }

    // --- Buttons chức năng ---
    btnVoice.addEventListener("click", () => {
        if (!isRecording) startRecording();
        else stopRecording();
    });

    btnCopy.addEventListener("click", () => {
        if (!textArea.value.trim()) return;
        navigator.clipboard.writeText(textArea.value).then(() => showNotification("Copied!"));
    });

    btnClear.addEventListener("click", () => {
        textArea.value = "";
        savedTranscript = "";
        updateButtons();
        showNotification("Cleared!");
    });

    // Ngăn thao tác với textarea khi đang ghi âm
    ["keydown","paste","copy","cut","selectstart"].forEach(ev => {
        textArea.addEventListener(ev, (e) => { if(isRecording) e.preventDefault(); });
    });

    textArea.addEventListener("input", () => {
        if (!isRecording) savedTranscript = textArea.value;
        updateButtons();
    });

    // --- Dialog Hướng dẫn ---
    helpIcon.addEventListener("click", () => guideDialog.style.display = "block");
    closeDialog.addEventListener("click", () => guideDialog.style.display = "none");

    // --- Dialog Bảng chữ cái ---
    btnSelectChar.addEventListener("click", () => {
        if (isRecording) return; // không mở khi đang ghi âm
        charDialog.style.display = "block";
    });
    closeCharDialog.addEventListener("click", () => charDialog.style.display = "none");

    window.addEventListener("click", (e) => {
        if (e.target === guideDialog) guideDialog.style.display = "none";
        if (e.target === charDialog) charDialog.style.display = "none";
    });

    function createCharButtons(container, startCode, endCode, type) {
    for (let c = startCode; c <= endCode; c++) {
        const btn = document.createElement("button");
        btn.textContent = String.fromCharCode(c);
        btn.classList.add(type); // "lowercase" hoặc "uppercase"

        btn.addEventListener("click", () => {
            if (!isRecording) { // chỉ cho nhập khi không ghi âm
                textArea.value += btn.textContent;
                savedTranscript = textArea.value;
                updateCopyClearButtons();
            }
        });

        container.appendChild(btn);
    }
}

createCharButtons(lowercase, 97, 122, "lowercase"); 
createCharButtons(uppercase, 65, 90, "uppercase");
});
