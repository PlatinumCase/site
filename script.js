/* ── MODULE-LEVEL STATE: file attachments (contact page) ── */
let contactFiles  = [];   // [{id, file, url}]
let _nextFileId   = 0;
let _syncAttachUI = null; // set by initAttachments, called after reset

document.addEventListener("DOMContentLoaded", () => {
    initSmoothScroll();
    initAttachments();
    initForm();
    initCustomSelects();
    createParticles();
    loadStatus();
    initScrollbarTrack();
    preventActiveNavReload();
});

/* ── SCROLLBAR TRACK VISIBILITY ── */
let scrollbarTrackUpdateScheduled = false;

function updateScrollbarTrack() {
    const needsScroll = document.documentElement.scrollHeight > window.innerHeight + 1;
    document.documentElement.classList.toggle("no-scroll", !needsScroll);
    document.body.classList.toggle("no-scroll", !needsScroll);
    updateHeaderLayout();
}

function updateHeaderLayout() {
    const headerWrap = document.querySelector(".site-header-wrap");
    if (!headerWrap) return;

    const scrollbarComp = Math.max(window.innerWidth - document.documentElement.clientWidth, 0);
    const headerHeight = Math.ceil(headerWrap.getBoundingClientRect().height);

    document.documentElement.style.setProperty("--viewport-scrollbar-comp", `${scrollbarComp}px`);
    document.documentElement.style.setProperty("--header-offset", `${headerHeight}px`);
}

function scheduleScrollbarTrackUpdate() {
    if (scrollbarTrackUpdateScheduled) return;
    scrollbarTrackUpdateScheduled = true;
    requestAnimationFrame(() => {
        scrollbarTrackUpdateScheduled = false;
        updateScrollbarTrack();
    });
}

function initScrollbarTrack() {
    updateScrollbarTrack();
    window.addEventListener("resize", scheduleScrollbarTrackUpdate);
    window.addEventListener("load", scheduleScrollbarTrackUpdate, { once: true });
    if (document.fonts?.ready) {
        document.fonts.ready.then(scheduleScrollbarTrackUpdate).catch(() => {});
    }
}

/* ── STATUS.JSON ── */
async function loadStatus() {
    try {
        const res = await fetch("status.json");
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        renderAnnouncement(data.announcement);
        renderStatusGrid(data.services);
        scheduleScrollbarTrackUpdate();
    } catch (e) {
        const bar = document.getElementById("announcement-bar");
        if (bar) bar.classList.remove("ann-visible");
        renderStatusFallback();
        scheduleScrollbarTrackUpdate();
        setTimeout(scheduleScrollbarTrackUpdate, 360);
    }
}

/* ── ANNOUNCEMENT BAR ── */
function renderAnnouncement(ann) {
    const bar = document.getElementById("announcement-bar");
    if (!bar) return;

    if (!ann || !ann.enabled) {
        bar.classList.remove("ann-visible");
        try { sessionStorage.setItem("ann-state", JSON.stringify({ visible: false })); } catch(e) {}
        scheduleScrollbarTrackUpdate();
        setTimeout(scheduleScrollbarTrackUpdate, 360);
        return;
    }

    const titleEl = document.getElementById("ann-title");
    const descEl  = document.getElementById("ann-desc");
    const desc    = parseBold(ann.message);

    // Only update content if it changed (avoid re-triggering transition)
    if (titleEl.textContent !== ann.title) titleEl.textContent = ann.title;
    if (descEl.innerHTML    !== desc)      descEl.innerHTML    = desc;

    try {
        sessionStorage.setItem("ann-state", JSON.stringify({
            visible: true, title: ann.title, desc
        }));
    } catch(e) {}

    if (!bar.classList.contains("ann-visible")) {
        requestAnimationFrame(() => bar.classList.add("ann-visible"));
    }
    setTimeout(scheduleScrollbarTrackUpdate, 360);
}

/** *текст* → <strong>текст</strong> */
function parseBold(str) {
    return str.replace(/\*([^*]+)\*/g, "<strong>$1</strong>");
}

/* ── STATUS GRID ── */
const SERVICE_ICONS = {
    auth:           '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    messaging:      '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    channels:       '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
    chats:          '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    search:         '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    change_profile: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/>',
};

const STATUS_META = {
    ok:   { label: "Работает",   cls: "s-ok"   },
    warn: { label: "Ограничено", cls: "s-warn"  },
    down: { label: "Недоступно", cls: "s-down"  },
};

function renderStatusGrid(services) {
    const grid = document.getElementById("status-grid");
    if (!grid) return; // страница без статус-сетки — пропускаем

    if (!services) { grid.innerHTML = ""; return; }

    grid.innerHTML = Object.entries(services).map(([key, svc]) => {
        const meta  = STATUS_META[svc.status] || STATUS_META.ok;
        const icon  = SERVICE_ICONS[key] || SERVICE_ICONS.search;
        const label = svc.text || meta.label;

        return `
        <div class="status-card ${meta.cls}">
            <div class="sc-icon" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                     viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    ${icon}
                </svg>
            </div>
            <div class="sc-body">
                <span class="sc-name">${svc.label}</span>
                <span class="sc-status">
                    <span class="sc-dot"></span>
                    ${label}
                </span>
            </div>
        </div>`;
    }).join("");

    // Итоговая строка
    const total   = Object.keys(services).length;
    const issues  = Object.values(services).filter(s => s.status !== "ok").length;
    const noteEl  = document.getElementById("status-note");
    if (!noteEl) return;

    if (issues === 0) {
        noteEl.textContent = "Все системы работают в штатном режиме.";
        noteEl.className   = "status-note ok";
    } else {
        noteEl.textContent = `${issues} из ${total} компонентов работают с ограничениями.`;
        noteEl.className   = "status-note warn";
    }
}

function renderStatusFallback() {
    const grid = document.getElementById("status-grid");
    if (!grid) return;
    grid.innerHTML = `<p class="status-fallback">Не удалось загрузить статус. Проверьте наличие файла status.json.</p>`;
}

/* ── SMOOTH SCROLL ── */
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener("click", (e) => {
            const href = anchor.getAttribute("href");
            if (!href || href === "#") return;
            const target = document.querySelector(href);
            if (!target) return;
            e.preventDefault();
            target.scrollIntoView({ behavior: "smooth" });
        });
    });
}

/* ── FORM ── */
const FIELD_ERRORS = {
    name:     { valueMissing: "Пожалуйста, введите ваше имя." },
    email:    { valueMissing: "Введите адрес электронной почты.", typeMismatch: "Проверьте формат: name@example.com" },
    category: { valueMissing: "Выберите категорию ошибки из списка." },
    message:  { valueMissing: "Опишите проблему — без этого мы не сможем помочь." },
};

function getFieldError(input) {
    const rules = FIELD_ERRORS[input.id] || {};
    if (input.validity.valueMissing) return rules.valueMissing || "Это поле обязательно.";
    if (input.validity.typeMismatch) return rules.typeMismatch || "Некорректное значение.";
    if (input.validity.tooShort)     return `Минимум ${input.minLength} символов.`;
    return null;
}

function showFieldError(group, msg) {
    clearFieldError(group);
    group.classList.add("has-error");
    const err = document.createElement("span");
    err.className = "form-error-msg";
    err.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/></svg>${msg}`;
    group.appendChild(err);
    scheduleScrollbarTrackUpdate();
}

function clearFieldError(group) {
    group.classList.remove("has-error");
    const existing = group.querySelector(".form-error-msg");
    if (existing) existing.remove();
    scheduleScrollbarTrackUpdate();
}

function validateForm(form) {
    let valid = true;
    // Validate standard inputs and textareas
    form.querySelectorAll("input:not([type=hidden]), textarea").forEach(input => {
        const group = input.closest(".form-group");
        if (!group) return;
        const msg = getFieldError(input);
        if (msg) { showFieldError(group, msg); valid = false; }
        else clearFieldError(group);
    });
    // Validate custom selects (hidden input)
    form.querySelectorAll(".custom-select").forEach(cs => {
        const hidden = cs.querySelector("input[type=hidden]");
        const group  = cs.closest(".form-group");
        if (!hidden || !group) return;
        if (!hidden.value) {
            showFieldError(group, FIELD_ERRORS.category?.valueMissing || "Выберите категорию.");
            valid = false;
        } else clearFieldError(group);
    });
    return valid;
}

function initForm() {
    const form = document.getElementById("contact-form");
    if (!form) return;

    // Clear errors as soon as the user starts editing a field that already has one
    form.querySelectorAll("input, textarea").forEach(input => {
        input.addEventListener("input", () => {
            const group = input.closest(".form-group");
            if (group && group.classList.contains("has-error")) clearFieldError(group);
        });
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!validateForm(form)) {
            const firstErr = form.querySelector(".has-error");
            if (firstErr) firstErr.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }

        const button = form.querySelector('button[type="submit"]');
        const originalText = button?.textContent || "Отправить";

        if (button) {
            button.disabled = true;
            button.textContent = "Отправка...";
        }

        const controller = new AbortController();
        const timeoutId  = setTimeout(() => controller.abort(), 8000);

        try {
            // Build FormData using Forminit's fi-{type}-{name} field convention
            const formData = new FormData();
            formData.append("fi-sender-fullName", form.querySelector("#name")?.value  || "");
            formData.append("fi-sender-email",    form.querySelector("#email")?.value || "");
            formData.append("fi-text-category",   form.querySelector("#category")?.value || "");
            formData.append("fi-text-message",    form.querySelector("#message")?.value || "");

            // Attach files — Forminit supports fi-file-{name} up to 25 MB
            contactFiles.forEach(entry => {
                formData.append("fi-file-attachments[]", entry.file, entry.file.name);
            });

            const response = await fetch("https://forminit.com/f/5u722hwhbce", {
                method:  "POST",
                body:    formData,
                headers: { Accept: "application/json" },
                signal:  controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                let detail = "";
                try { const j = await response.json(); detail = j.error || j.errors?.[0]?.message || ""; } catch {}
                throw new Error(detail || "HTTP " + response.status);
            }

            showToast("Сообщение успешно отправлено ✅", true);
            form.reset();
            if (_syncAttachUI) _syncAttachUI(true); // clear previews after success
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (error) {
            clearTimeout(timeoutId);
            const isAbort   = error.name === "AbortError";
            const isCors    = error.name === "TypeError" && !error.message.includes("HTTP");
            let toastMsg;
            if (isAbort)   toastMsg = "Превышено время ожидания ❌ попробуйте снова";
            else if (isCors) toastMsg = "Ошибка сети ❌ проверь консоль браузера";
            else            toastMsg = "Ошибка: " + (error.message || "попробуйте позже") + " ❌";
            showToast(toastMsg, false);
        } finally {
            clearTimeout(timeoutId);
            if (button) {
                button.disabled    = false;
                button.textContent = originalText;
            }
        }
    });
}

/* ── TOAST ── */
function showToast(text, success) {
    let toast = document.getElementById("form-toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "form-toast";
        document.body.appendChild(toast);
    }
    toast.textContent = text;
    toast.className   = `form-toast show ${success ? "success" : "error"}`;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove("show"), 3000);
}

/* ── CUSTOM SELECT ── */
function initCustomSelects() {
    document.querySelectorAll(".custom-select").forEach(cs => {
        const trigger  = cs.querySelector(".cs-trigger");
        const valueEl  = cs.querySelector(".cs-value");
        const dropdown = cs.querySelector(".cs-dropdown");
        const hidden   = cs.querySelector("input[type=hidden]");
        const options  = cs.querySelectorAll(".cs-option");

        function open() {
            cs.classList.add("cs-open");
            trigger.setAttribute("aria-expanded", "true");
            options.forEach(o => (o.tabIndex = 0));
        }
        function close() {
            cs.classList.remove("cs-open");
            trigger.setAttribute("aria-expanded", "false");
            options.forEach(o => (o.tabIndex = -1));
        }

        trigger.addEventListener("click", () => cs.classList.contains("cs-open") ? close() : open());

        // Close all others when opening
        trigger.addEventListener("click", () => {
            if (cs.classList.contains("cs-open")) {
                document.querySelectorAll(".custom-select.cs-open").forEach(other => {
                    if (other !== cs) other.querySelector(".cs-trigger").click();
                });
            }
        });

        options.forEach(opt => {
            opt.addEventListener("click", () => {
                hidden.value  = opt.dataset.value;
                valueEl.textContent = opt.textContent;
                valueEl.classList.remove("cs-placeholder");
                options.forEach(o => o.classList.remove("cs-selected"));
                opt.classList.add("cs-selected");
                close();
                trigger.focus();
                // Clear error on selection
                const group = cs.closest(".form-group");
                if (group) clearFieldError(group);
            });

            opt.addEventListener("keydown", e => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); opt.click(); }
                if (e.key === "ArrowDown") { e.preventDefault(); (opt.nextElementSibling || options[0])?.focus(); }
                if (e.key === "ArrowUp")   { e.preventDefault(); (opt.previousElementSibling || options[options.length - 1])?.focus(); }
                if (e.key === "Escape")    { close(); trigger.focus(); }
            });
        });

        trigger.addEventListener("keydown", e => {
            if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                open();
                options[0]?.focus();
            }
        });

        document.addEventListener("click", e => {
            if (!cs.contains(e.target)) close();
        });
    });
}

function preventActiveNavReload() {
    document.querySelectorAll(".topnav-link.active").forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
        });
    });
}

/* ── IMAGE ATTACHMENTS (contact page) ── */
function initAttachments() {
    const MAX_FILES = 3;
    const fileInput = document.getElementById("file-input");
    const attachBtn = document.getElementById("attach-btn");
    const preview   = document.getElementById("file-preview");
    const counter   = document.getElementById("attach-counter");
    const limitMsg  = document.getElementById("attach-limit-msg");
    if (!fileInput) return;

    /* helpers */
    function fmtSize(b) {
        if (b >= 1048576) return (b / 1048576).toFixed(1) + " МБ";
        if (b >= 1024)    return Math.round(b / 1024)      + " КБ";
        return b + " Б";
    }

    function imgIconSVG() {
        return '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"'
             + ' fill="none" stroke="currentColor" stroke-width="1.8"'
             + ' stroke-linecap="round" stroke-linejoin="round">'
             + '<rect x="3" y="3" width="18" height="18" rx="3"/>'
             + '<circle cx="8.5" cy="8.5" r="1.5"/>'
             + '<polyline points="21 15 16 10 5 21"/></svg>';
    }

    /* sync counter / attach-btn state; pass reset=true to clear all previews */
    function syncUI(reset) {
        if (reset) {
            contactFiles.forEach(e => { if (e.url) URL.revokeObjectURL(e.url); });
            contactFiles = [];
            preview.innerHTML = "";
        }
        const n = contactFiles.length;
        preview.dataset.count = n;
        if (n === 0) {
            counter.textContent = "";
            counter.classList.remove("visible", "maxed");
        } else {
            counter.textContent = n + " / " + MAX_FILES;
            counter.classList.add("visible");
            counter.classList.toggle("maxed", n >= MAX_FILES);
        }
        attachBtn.classList.toggle("attach-maxed", n >= MAX_FILES);
    }

    /* expose so initForm can reset after successful submit */
    _syncAttachUI = syncUI;

    /* build a card DOM node */
    function buildCard(entry) {
        const card  = document.createElement("div");
        card.className = "file-card";
        card.dataset.fid = entry.id;

        const thumb = document.createElement("div");
        thumb.className = "fc-thumb";
        if (entry.url) {
            const img = document.createElement("img");
            img.src = entry.url;
            img.alt = entry.file.name;
            thumb.appendChild(img);
        } else {
            thumb.innerHTML = imgIconSVG();
        }

        const info = document.createElement("div");
        info.className = "fc-info";
        const name = document.createElement("div");
        name.className = "fc-name";
        name.textContent = entry.file.name;
        const size = document.createElement("div");
        size.className = "fc-size";
        size.textContent = fmtSize(entry.file.size);
        info.appendChild(name);
        info.appendChild(size);

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "fc-remove";
        btn.setAttribute("aria-label", "Удалить " + entry.file.name);
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13"'
                      + ' viewBox="0 0 24 24" fill="none" stroke="currentColor"'
                      + ' stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">'
                      + '<line x1="18" y1="6" x2="6" y2="18"/>'
                      + '<line x1="6" y1="6" x2="18" y2="18"/></svg>';
        btn.addEventListener("click", () => removeEntry(entry.id));

        card.appendChild(thumb);
        card.appendChild(info);
        card.appendChild(btn);
        return card;
    }

    function addCards(newEntries) {
        newEntries.forEach(entry => {
            const card = buildCard(entry);
            card.classList.add("fc-entering");
            preview.appendChild(card);
            card.addEventListener("animationend", () => card.classList.remove("fc-entering"), { once: true });
        });
        syncUI();
    }

    function removeEntry(id) {
        const idx = contactFiles.findIndex(e => e.id === id);
        if (idx === -1) return;
        if (contactFiles[idx].url) URL.revokeObjectURL(contactFiles[idx].url);
        contactFiles.splice(idx, 1);
        limitMsg.classList.remove("show");

        const n = contactFiles.length;
        if (n === 0) {
            counter.textContent = "";
            counter.classList.remove("visible", "maxed");
        } else {
            counter.textContent = n + " / " + MAX_FILES;
            counter.classList.add("visible");
            counter.classList.toggle("maxed", n >= MAX_FILES);
        }
        attachBtn.classList.toggle("attach-maxed", n >= MAX_FILES);

        const card = preview.querySelector('[data-fid="' + id + '"]');
        if (!card) { preview.dataset.count = n; return; }
        card.classList.add("fc-leaving");
        card.addEventListener("animationend", () => {
            card.remove();
            preview.dataset.count = contactFiles.length;
        }, { once: true });
    }

    fileInput.addEventListener("change", () => {
        const incoming = Array.from(fileInput.files);
        const added = [];
        let blocked = false;

        incoming.forEach(file => {
            if (contactFiles.length >= MAX_FILES) { blocked = true; return; }
            const dup = contactFiles.some(e => e.file.name === file.name && e.file.size === file.size);
            if (dup) return;
            const url   = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
            const entry = { id: _nextFileId++, file, url };
            contactFiles.push(entry);
            added.push(entry);
        });

        if (added.length) addCards(added);

        if (blocked) {
            limitMsg.classList.add("show");
            clearTimeout(limitMsg._t);
            limitMsg._t = setTimeout(() => limitMsg.classList.remove("show"), 3000);
        }

        fileInput.value = "";
    });
}

/* ── PARTICLES ── */
function createParticles() {
    const container = document.querySelector(".particles");
    if (!container) return;

    const canvas = document.createElement("canvas");
    container.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = window.innerWidth;
    let h = window.innerHeight;
    canvas.width  = w;
    canvas.height = h;

    const particles = [];
    const count = 60;

    for (let i = 0; i < count; i++) {
        particles.push({
            x:      Math.random() * w,
            y:      Math.random() * h,
            r:      Math.random() * 2 + 0.8,
            xSpeed: (Math.random() - 0.5) * 0.4,
            ySpeed: (Math.random() - 0.5) * 0.4,
            alpha:  Math.random() * 0.2,
        });
    }

    function draw() {
        ctx.clearRect(0, 0, w, h);
        for (const p of particles) {
            ctx.beginPath();
            ctx.shadowBlur  = 15;
            ctx.shadowColor = "rgba(45, 228, 207, 0.3)";
            ctx.fillStyle   = `rgba(45, 228, 207, ${p.alpha})`;
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
            p.x += p.xSpeed;
            p.y += p.ySpeed;
            if (p.x < 0 || p.x > w) p.xSpeed *= -1;
            if (p.y < 0 || p.y > h) p.ySpeed *= -1;
        }
        requestAnimationFrame(draw);
    }
    

    draw();

    window.addEventListener("resize", () => {
        w = window.innerWidth;
        h = window.innerHeight;
        canvas.width  = w;
        canvas.height = h;
    });
}
