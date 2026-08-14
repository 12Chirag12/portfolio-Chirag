(() => {
  "use strict";

  const qs = (selector, scope = document) => scope.querySelector(selector);
  const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const lerp = (from, to, amount) => from + (to - from) * amount;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

  document.addEventListener("DOMContentLoaded", () => {
    initLoader();
    initNavigation();
    initScrollState();
    initRevealSystem();
    initInteractiveCards();
    initContactForm();
    initCopyEmail();
    initLocation();

    new ParticleField(qs("#atmosphere"));

    if (finePointer.matches && !reducedMotion.matches && window.innerWidth > 900) {
      new PhysicsCursor({
        canvas: qs("#cursor-trail"),
        dot: qs("#cursor-dot"),
        ring: qs("#cursor-ring"),
        label: qs("#cursor-label"),
      });
      new MagneticSystem(qsa(".magnetic"));
      initHeroParallax();
    }

    const year = qs("#current-year");
    if (year) year.textContent = String(new Date().getFullYear());
  });

  function initLoader() {
    const loader = qs("#loader");
    if (!loader) return;

    let returningVisitor = false;
    try {
      returningVisitor = sessionStorage.getItem("cp-intro-seen") === "1";
      sessionStorage.setItem("cp-intro-seen", "1");
    } catch {
      returningVisitor = false;
    }

    const delay = reducedMotion.matches || returningVisitor ? 120 : 980;
    window.setTimeout(() => loader.classList.add("is-hidden"), delay);
    window.setTimeout(() => loader.remove(), delay + 600);
  }

  function initNavigation() {
    const toggle = qs("#menu-toggle");
    const nav = qs("#site-nav");
    if (!toggle || !nav) return;

    const closeMenu = () => {
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open navigation");
      nav.classList.remove("is-open");
      document.body.classList.remove("nav-open");
    };

    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
      nav.classList.toggle("is-open", open);
      document.body.classList.toggle("nav-open", open);
    });

    qsa("a", nav).forEach((link) => link.addEventListener("click", closeMenu));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 900) closeMenu();
    }, { passive: true });
  }

  function initScrollState() {
    const header = qs("#site-header");
    const progress = qs("#scroll-progress");
    const cue = qs(".scroll-cue");
    const links = qsa(".nav-link");
    const sections = qsa("main section[id]");
    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      const currentY = Math.max(window.scrollY, 0);
      const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const direction = currentY - lastY;

      if (progress) progress.style.transform = `scaleX(${clamp(currentY / maxScroll, 0, 1)})`;
      if (header) {
        header.classList.toggle("is-scrolled", currentY > 18);
        if (!document.body.classList.contains("nav-open")) {
          header.classList.toggle("is-hidden", direction > 7 && currentY > 480);
        }
      }
      if (cue) cue.classList.toggle("is-hidden", currentY > 70);

      lastY = currentY;
      ticking = false;
    };

    const requestUpdate = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    window.addEventListener("scroll", requestUpdate, { passive: true });
    update();

    if (!("IntersectionObserver" in window)) return;
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        links.forEach((link) => link.classList.toggle("active", link.getAttribute("href") === `#${id}`));
      });
    }, { rootMargin: "-34% 0px -54% 0px", threshold: 0 });

    sections.forEach((section) => sectionObserver.observe(section));
  }

  function initRevealSystem() {
    const elements = qsa("[data-reveal]");
    if (!elements.length) return;

    elements.forEach((element, index) => {
      element.style.transitionDelay = `${(index % 3) * 70}ms`;
    });

    if (reducedMotion.matches || !("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.12 });

    elements.forEach((element) => observer.observe(element));
  }

  class ParticleField {
    constructor(canvas) {
      if (!canvas || reducedMotion.matches) return;
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d", { alpha: true });
      if (!this.ctx) return;

      this.width = 0;
      this.height = 0;
      this.dpr = 1;
      this.particles = [];
      this.pointer = { x: -1000, y: -1000 };
      this.visible = !document.hidden;
      this.frame = 0;
      this.lastTime = performance.now();
      this.resizeTimer = 0;
      this.animate = this.animate.bind(this);

      this.onPointerMove = (event) => {
        this.pointer.x = event.clientX;
        this.pointer.y = event.clientY;

        const x = (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * -12;
        const y = (event.clientY / Math.max(window.innerHeight, 1) - 0.5) * -12;
        document.documentElement.style.setProperty("--ambient-x", `${x}px`);
        document.documentElement.style.setProperty("--ambient-y", `${y}px`);
      };

      this.onResize = () => {
        clearTimeout(this.resizeTimer);
        this.resizeTimer = window.setTimeout(() => this.resize(), 120);
      };

      this.onVisibility = () => {
        this.visible = !document.hidden;
        if (this.visible) {
          this.lastTime = performance.now();
          cancelAnimationFrame(this.frame);
          this.frame = requestAnimationFrame(this.animate);
        }
      };

      this.resize();
      window.addEventListener("pointermove", this.onPointerMove, { passive: true });
      window.addEventListener("resize", this.onResize, { passive: true });
      document.addEventListener("visibilitychange", this.onVisibility);
      this.frame = requestAnimationFrame(this.animate);
    }

    resize() {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.dpr = Math.min(window.devicePixelRatio || 1, 1.7);
      this.canvas.width = Math.round(this.width * this.dpr);
      this.canvas.height = Math.round(this.height * this.dpr);
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

      const lowPower = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
        (navigator.deviceMemory && navigator.deviceMemory <= 4);
      const baseCount = this.width < 680 ? 18 : this.width < 1024 ? 30 : 48;
      const count = lowPower ? Math.round(baseCount * 0.58) : baseCount;
      this.particles = Array.from({ length: count }, () => this.makeParticle());
    }

    makeParticle() {
      return {
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
        radius: Math.random() * 1.1 + 0.45,
        phase: Math.random() * Math.PI * 2,
      };
    }

    animate(now) {
      if (!this.visible) return;
      const delta = Math.min((now - this.lastTime) / 16.67, 2);
      this.lastTime = now;
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.width, this.height);

      for (let i = 0; i < this.particles.length; i += 1) {
        const particle = this.particles[i];
        particle.phase += 0.005 * delta;
        particle.x += (particle.vx + Math.sin(particle.phase) * 0.018) * delta;
        particle.y += (particle.vy + Math.cos(particle.phase) * 0.018) * delta;

        const dx = particle.x - this.pointer.x;
        const dy = particle.y - this.pointer.y;
        const distanceSquared = dx * dx + dy * dy;
        const influence = this.width < 680 ? 90 : 145;

        if (distanceSquared < influence * influence && distanceSquared > 0.01) {
          const distance = Math.sqrt(distanceSquared);
          const force = (influence - distance) / influence;
          particle.x += (dx / distance) * force * 0.62 * delta;
          particle.y += (dy / distance) * force * 0.62 * delta;
        }

        if (particle.x < -20) particle.x = this.width + 20;
        if (particle.x > this.width + 20) particle.x = -20;
        if (particle.y < -20) particle.y = this.height + 20;
        if (particle.y > this.height + 20) particle.y = -20;

        ctx.beginPath();
        ctx.fillStyle = `rgba(137, 227, 255, ${0.16 + particle.radius * 0.08})`;
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fill();

        if (this.width < 680) continue;
        for (let j = i + 1; j < this.particles.length; j += 1) {
          const other = this.particles[j];
          const linkX = particle.x - other.x;
          const linkY = particle.y - other.y;
          const linkDistanceSquared = linkX * linkX + linkY * linkY;
          const threshold = 112;
          if (linkDistanceSquared >= threshold * threshold) continue;
          const opacity = (1 - Math.sqrt(linkDistanceSquared) / threshold) * 0.075;
          ctx.beginPath();
          ctx.strokeStyle = `rgba(121, 220, 255, ${opacity})`;
          ctx.lineWidth = 0.55;
          ctx.moveTo(particle.x, particle.y);
          ctx.lineTo(other.x, other.y);
          ctx.stroke();
        }
      }

      this.frame = requestAnimationFrame(this.animate);
    }
  }

  class PhysicsCursor {
    constructor({ canvas, dot, ring, label }) {
      if (!canvas || !dot || !ring || !label) return;
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d", { alpha: true });
      if (!this.ctx) return;
      this.dot = dot;
      this.ring = ring;
      this.label = label;
      this.target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      this.position = { ...this.target };
      this.velocity = { x: 0, y: 0 };
      this.inputVelocity = { x: 0, y: 0 };
      this.smoothedSpeed = 0;
      this.angle = 0;
      this.particles = [];
      this.pool = [];
      this.active = false;
      this.frame = 0;
      this.lastSpawn = 0;
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.dpr = 1;
      this.animate = this.animate.bind(this);

      this.resize();
      this.bindEvents();
      this.frame = requestAnimationFrame(this.animate);
    }

    bindEvents() {
      window.addEventListener("pointermove", (event) => {
        const vx = event.clientX - this.target.x;
        const vy = event.clientY - this.target.y;
        const speed = Math.hypot(vx, vy);
        this.target.x = event.clientX;
        this.target.y = event.clientY;
        this.inputVelocity.x = vx;
        this.inputVelocity.y = vy;
        if (speed > 0.2) this.angle = Math.atan2(vy, vx);
        if (!this.active) {
          this.position.x = event.clientX;
          this.position.y = event.clientY;
          this.active = true;
          document.body.classList.add("cursor-active");
        }
        this.spawnParticles(speed, vx, vy, performance.now());
      }, { passive: true });

      document.documentElement.addEventListener("mouseleave", () => {
        document.body.classList.remove("cursor-active");
      });

      document.documentElement.addEventListener("mouseenter", () => {
        if (this.active) document.body.classList.add("cursor-active");
      });

      document.addEventListener("pointerover", (event) => this.updateMode(event.target));
      document.addEventListener("pointerout", (event) => this.updateMode(event.relatedTarget));
      window.addEventListener("resize", () => this.resize(), { passive: true });
    }

    updateMode(target) {
      const element = target instanceof Element ? target.closest("[data-cursor], a, button, input, textarea") : null;
      const mode = element?.dataset.cursor === "view" ? "view" : element ? "link" : "default";
      this.ring.classList.toggle("is-link", mode === "link");
      this.ring.classList.toggle("is-view", mode === "view");
      this.label.textContent = mode === "view" ? "VIEW" : "";
    }

    resize() {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.dpr = Math.min(window.devicePixelRatio || 1, 1.7);
      this.canvas.width = Math.round(this.width * this.dpr);
      this.canvas.height = Math.round(this.height * this.dpr);
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    spawnParticles(speed, vx, vy, now) {
      if (speed < 3 || now - this.lastSpawn < 15 || this.particles.length >= 46) return;
      this.lastSpawn = now;
      const amount = clamp(Math.floor(speed / 11), 1, 4);
      const direction = Math.atan2(vy, vx);

      for (let i = 0; i < amount; i += 1) {
        const particle = this.pool.pop() || {};
        const life = 0.58 + Math.random() * 0.32;
        particle.x = this.target.x + (Math.random() - 0.5) * 3;
        particle.y = this.target.y + (Math.random() - 0.5) * 3;
        particle.vx = -vx * (0.025 + Math.random() * 0.025) + (Math.random() - 0.5) * 0.5;
        particle.vy = -vy * (0.025 + Math.random() * 0.025) + (Math.random() - 0.5) * 0.5;
        particle.life = life;
        particle.maxLife = life;
        particle.size = clamp(speed * 0.035, 0.8, 2.1) * (0.7 + Math.random() * 0.5);
        particle.friction = 0.92 + Math.random() * 0.035;
        particle.angle = direction;
        particle.seed = Math.random() * Math.PI * 2;
        this.particles.push(particle);
      }
    }

    animate(time) {
      const forceX = (this.target.x - this.position.x) * 0.14;
      const forceY = (this.target.y - this.position.y) * 0.14;
      this.velocity.x = (this.velocity.x + forceX) * 0.67;
      this.velocity.y = (this.velocity.y + forceY) * 0.67;
      this.position.x += this.velocity.x;
      this.position.y += this.velocity.y;

      const instantaneousSpeed = Math.hypot(this.inputVelocity.x, this.inputVelocity.y);
      this.smoothedSpeed = lerp(this.smoothedSpeed, instantaneousSpeed, 0.14);
      this.inputVelocity.x *= 0.78;
      this.inputVelocity.y *= 0.78;

      const stretch = 1 + clamp(this.smoothedSpeed * 0.012, 0, 0.34);
      const squash = 1 - clamp(this.smoothedSpeed * 0.0038, 0, 0.11);
      const rotation = this.angle * 180 / Math.PI;

      this.dot.style.transform = `translate3d(${this.target.x}px, ${this.target.y}px, 0)`;
      this.ring.style.transform = `translate3d(${this.position.x}px, ${this.position.y}px, 0) rotate(${rotation}deg) scale(${stretch}, ${squash})`;
      this.label.style.transform = `rotate(${-rotation}deg) scale(${1 / stretch}, ${1 / squash})`;

      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.width, this.height);
      for (let i = this.particles.length - 1; i >= 0; i -= 1) {
        const particle = this.particles[i];
        particle.life -= 0.027;
        particle.vx *= particle.friction;
        particle.vy *= particle.friction;
        particle.x += particle.vx + Math.sin(time * 0.006 + particle.seed) * 0.025;
        particle.y += particle.vy + Math.cos(time * 0.006 + particle.seed) * 0.025;

        if (particle.life <= 0) {
          this.pool.push(this.particles.splice(i, 1)[0]);
          continue;
        }

        const ratio = particle.life / particle.maxLife;
        const size = particle.size * ratio;
        ctx.beginPath();
        ctx.fillStyle = `rgba(121, 231, 255, ${ratio * 0.42})`;
        ctx.shadowColor = "rgba(121, 231, 255, 0.45)";
        ctx.shadowBlur = 5;
        ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      this.frame = requestAnimationFrame(this.animate);
    }
  }

  class MagneticSystem {
    constructor(elements) {
      if (!elements.length) return;
      this.items = elements.map((element) => ({
        element,
        content: element.firstElementChild,
        rect: element.getBoundingClientRect(),
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        targetX: 0,
        targetY: 0,
      }));
      this.pointer = { x: -1000, y: -1000 };
      this.running = false;
      this.tick = this.tick.bind(this);

      window.addEventListener("pointermove", (event) => {
        this.pointer.x = event.clientX;
        this.pointer.y = event.clientY;
        this.updateTargets();
        this.start();
      }, { passive: true });

      const refresh = () => this.items.forEach((item) => {
        const transform = item.element.style.transform;
        item.element.style.transform = "";
        item.rect = item.element.getBoundingClientRect();
        item.element.style.transform = transform;
      });

      let refreshQueued = false;
      const requestRefresh = () => {
        if (refreshQueued) return;
        refreshQueued = true;
        requestAnimationFrame(() => {
          refresh();
          this.updateTargets();
          this.start();
          refreshQueued = false;
        });
      };

      let resizeTimer = 0;
      window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(requestRefresh, 120);
      }, { passive: true });
      window.addEventListener("scroll", requestRefresh, { passive: true });
    }

    updateTargets() {
      this.items.forEach((item) => {
        const centerX = item.rect.left + item.rect.width / 2;
        const centerY = item.rect.top + item.rect.height / 2;
        const dx = this.pointer.x - centerX;
        const dy = this.pointer.y - centerY;
        const distance = Math.hypot(dx, dy);
        const radius = Math.max(item.rect.width, item.rect.height) * 0.7 + 54;
        const influence = distance < radius ? Math.pow(1 - distance / radius, 1.5) : 0;
        item.targetX = dx * 0.16 * influence;
        item.targetY = dy * 0.16 * influence;
      });
    }

    start() {
      if (this.running) return;
      this.running = true;
      requestAnimationFrame(this.tick);
    }

    tick() {
      let moving = false;
      this.items.forEach((item) => {
        const forceX = (item.targetX - item.x) * 0.12;
        const forceY = (item.targetY - item.y) * 0.12;
        item.vx = (item.vx + forceX) * 0.7;
        item.vy = (item.vy + forceY) * 0.7;
        item.x += item.vx;
        item.y += item.vy;
        item.element.style.transform = `translate3d(${item.x}px, ${item.y}px, 0)`;
        if (item.content instanceof HTMLElement) {
          item.content.style.transform = `translate3d(${item.x * 0.16}px, ${item.y * 0.16}px, 0)`;
        }
        if (Math.abs(item.x - item.targetX) > 0.03 || Math.abs(item.y - item.targetY) > 0.03 || Math.abs(item.vx) > 0.03 || Math.abs(item.vy) > 0.03) moving = true;
      });

      if (moving) {
        requestAnimationFrame(this.tick);
      } else {
        this.running = false;
      }
    }
  }

  function initInteractiveCards() {
    if (!finePointer.matches || reducedMotion.matches) return;
    const cards = qsa(".spotlight-card");
    cards.forEach((card) => {
      card.addEventListener("pointermove", (event) => {
        const rect = card.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        card.style.setProperty("--spot-x", `${x}px`);
        card.style.setProperty("--spot-y", `${y}px`);

        if (!card.classList.contains("tilt-card")) return;
        const normalizedX = x / rect.width - 0.5;
        const normalizedY = y / rect.height - 0.5;
        card.style.setProperty("--tilt-x", `${normalizedY * -5}deg`);
        card.style.setProperty("--tilt-y", `${normalizedX * 5}deg`);
      }, { passive: true });

      card.addEventListener("pointerleave", () => {
        card.style.setProperty("--tilt-x", "0deg");
        card.style.setProperty("--tilt-y", "0deg");
      });
    });
  }

  function initHeroParallax() {
    const visual = qs("[data-parallax]");
    if (!visual) return;
    window.addEventListener("pointermove", (event) => {
      const x = (event.clientX / window.innerWidth - 0.5) * 12;
      const y = (event.clientY / window.innerHeight - 0.5) * 10;
      visual.style.setProperty("--portrait-x", `${x}px`);
      visual.style.setProperty("--portrait-y", `${y}px`);
    }, { passive: true });
  }

  function initContactForm() {
    const form = qs("#contact-form");
    const status = qs("#form-status");
    if (!form || !status) return;

    const controls = qsa("input[required], textarea[required]", form);
    const setValidity = (control) => {
      const field = control.closest(".field");
      if (field) field.classList.toggle("is-invalid", !control.validity.valid);
      return control.validity.valid;
    };

    controls.forEach((control) => {
      control.addEventListener("blur", () => setValidity(control));
      control.addEventListener("input", () => {
        if (control.closest(".field")?.classList.contains("is-invalid")) setValidity(control);
      });
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const valid = controls.map(setValidity).every(Boolean);
      if (!valid) {
        status.className = "form-status is-error";
        status.textContent = "Please complete the highlighted fields.";
        qs(".field.is-invalid input, .field.is-invalid textarea", form)?.focus();
        return;
      }

      const honey = qs('input[name="_honey"]', form);
      if (honey?.value) {
        form.reset();
        status.textContent = "Thanks — your message has been received.";
        return;
      }

      const button = qs("button[type='submit']", form);
      const buttonLabel = qs(".form-submit__label", form);
      const originalLabel = buttonLabel?.textContent || "Send message";
      if (button) button.disabled = true;
      if (buttonLabel) buttonLabel.textContent = "Sending…";
      form.setAttribute("aria-busy", "true");
      status.className = "form-status";
      status.textContent = "Securely sending your message…";

      const endpoint = form.action.replace("formsubmit.co/", "formsubmit.co/ajax/");
      const payload = Object.fromEntries(new FormData(form).entries());

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error(`Form service returned ${response.status}`);

        form.reset();
        qsa(".field", form).forEach((field) => field.classList.remove("is-invalid"));
        status.className = "form-status is-success";
        status.textContent = "Message sent. Thank you — I'll get back to you soon.";
      } catch (error) {
        console.warn("Contact form submission failed:", error);
        status.className = "form-status is-error";
        status.innerHTML = 'The form could not send right now. Please email <a href="mailto:223chirag2012@sjcem.edu.in">223chirag2012@sjcem.edu.in</a>.';
      } finally {
        if (button) button.disabled = false;
        if (buttonLabel) buttonLabel.textContent = originalLabel;
        form.removeAttribute("aria-busy");
      }
    });
  }

  function initCopyEmail() {
    qsa("[data-copy-email]").forEach((button) => {
      button.addEventListener("click", async () => {
        const email = button.dataset.copyEmail;
        if (!email) return;
        const original = button.textContent;
        try {
          await navigator.clipboard.writeText(email);
          button.textContent = "Copied";
        } catch {
          window.location.href = `mailto:${email}`;
          button.textContent = "Open mail";
        }
        window.setTimeout(() => { button.textContent = original; }, 1800);
      });
    });
  }

  function initLocation() {
    const toggle = qs("#location-toggle");
    const panel = qs("#location-map");
    const iframe = qs("iframe", panel || document);
    if (!toggle || !panel || !iframe) return;

    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(open));
      panel.hidden = !open;
      if (open && !iframe.getAttribute("src")) iframe.src = iframe.dataset.src || "";
    });
  }
})();
