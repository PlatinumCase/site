document.addEventListener("DOMContentLoaded", () => {
    initSmoothScroll();
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
            const formData = new FormData(form);
            const response = await fetch("https://formspree.io/f/xaqvdqok", {
                method: "POST",
                body:   formData,
                headers: { Accept: "application/json" },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            if (!response.ok) throw new Error("Form submission failed");

            showToast("Сообщение успешно отправлено ✅", true);
            form.reset();
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (error) {
            showToast("Ошибка отправки ❌ попробуйте позже", false);
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
