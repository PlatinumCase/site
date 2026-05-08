document.addEventListener("DOMContentLoaded", () => {
    initSmoothScroll();
    initForm();
    createParticles();
});

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

function initForm() {
    const form = document.getElementById("contact-form");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const button = form.querySelector('button[type="submit"]');
        const originalText = button?.textContent || "Отправить";

        if (button) {
            button.disabled = true;
            button.textContent = "Отправка...";
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        try {
            const formData = new FormData(form);

            const response = await fetch("https://formspree.io/f/xaqvdqok", {
                method: "POST",
                body: formData,
                headers: {
                    Accept: "application/json",
                },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error("Form submission failed");
            }

            showToast("Сообщение успешно отправлено ✅", true);
            form.reset();

            window.scrollTo({
                top: 0,
                behavior: "smooth",
            });
        } catch (error) {
            showToast("Ошибка отправки ❌ попробуйте позже", false);
        } finally {
            clearTimeout(timeoutId);

            if (button) {
                button.disabled = false;
                button.textContent = originalText;
            }
        }
    });
}

function showToast(text, success) {
    let toast = document.getElementById("form-toast");

    if (!toast) {
        toast = document.createElement("div");
        toast.id = "form-toast";
        document.body.appendChild(toast);
    }

    toast.textContent = text;
    toast.className = `form-toast show ${success ? "success" : "error"}`;

    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

function createParticles() {
    const container = document.querySelector(".particles");
    if (!container) return;

    const canvas = document.createElement("canvas");
    container.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = window.innerWidth;
    let h = window.innerHeight;

    canvas.width = w;
    canvas.height = h;

    const particles = [];
    const count = 60;

    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            r: Math.random() * 2 + 0.8,
            xSpeed: (Math.random() - 0.5) * 0.4,
            ySpeed: (Math.random() - 0.5) * 0.4,
            alpha: Math.random() * 0.2,
        });
    }

    function draw() {
        ctx.clearRect(0, 0, w, h);

        for (const p of particles) {
            ctx.beginPath();
            ctx.shadowBlur = 15;
            ctx.shadowColor = "rgba(45, 228, 207, 0.3)";
            ctx.fillStyle = `rgba(45, 228, 207, ${p.alpha})`;
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
        canvas.width = w;
        canvas.height = h;
    });
}