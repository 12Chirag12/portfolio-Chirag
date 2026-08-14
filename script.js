(() => {
  "use strict";

  const qs = (selector, scope = document) => scope.querySelector(selector);
  const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const lerp = (from, to, amount) => from + (to - from) * amount;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

  const observeMediaChange = (query, handler) => {
    if (typeof query.addEventListener === "function") query.addEventListener("change", handler);
    else query.addListener(handler);
  };

  document.addEventListener("DOMContentLoaded", () => {
    initLoader();
    initNavigation();
    initScrollState();
    initSectionTransitions();
    initRevealSystem();
    initProjectFilters();
    initContactForm();
    initCopyEmail();
    initLocation();

    const particleField = new ParticleField(qs("#atmosphere"));
    const magneticSystem = new MagneticSystem(qsa(".magnetic"));
    const interactiveCards = initInteractiveCards();
    const heroParallax = initHeroParallax();

    const syncMotionSystems = () => {
      const motionAllowed = !reducedMotion.matches;
      const fineMotionAllowed = motionAllowed && finePointer.matches;
      const desktopMotionAllowed = fineMotionAllowed && window.innerWidth > 900;

      particleField.setEnabled(motionAllowed);
      magneticSystem.setEnabled(desktopMotionAllowed);
      interactiveCards.setEnabled(fineMotionAllowed);
      heroParallax.setEnabled(desktopMotionAllowed);
    };

    let motionResizeTimer = 0;
    window.addEventListener("resize", () => {
      clearTimeout(motionResizeTimer);
      motionResizeTimer = window.setTimeout(syncMotionSystems, 140);
    }, { passive: true });
    observeMediaChange(reducedMotion, syncMotionSystems);
    observeMediaChange(finePointer, syncMotionSystems);
    syncMotionSystems();

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

  function initSectionTransitions() {
    const sections = qsa("main > section");
    if (!sections.length) return;

    let activeIndex = -1;
    let frame = 0;

    sections.forEach((section) => section.classList.add("section-transition"));

    const update = () => {
      frame = 0;
      const viewportAnchor = window.innerHeight * 0.48;
      let nextActiveIndex = 0;
      let shortestDistance = Number.POSITIVE_INFINITY;

      sections.forEach((section, index) => {
        const rect = section.getBoundingClientRect();
        const containsAnchor = rect.top <= viewportAnchor && rect.bottom >= viewportAnchor;
        const distance = containsAnchor
          ? 0
          : Math.min(Math.abs(rect.top - viewportAnchor), Math.abs(rect.bottom - viewportAnchor));

        if (distance < shortestDistance) {
          shortestDistance = distance;
          nextActiveIndex = index;
        }
      });

      if (nextActiveIndex === activeIndex) return;
      activeIndex = nextActiveIndex;

      sections.forEach((section, index) => {
        section.classList.toggle("is-section-active", index === activeIndex);
        section.classList.toggle("is-section-above", index < activeIndex);
        section.classList.toggle("is-section-below", index > activeIndex);
      });
    };

    const requestUpdate = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate, { passive: true });
    update();
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
      if (!canvas) return;
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d", { alpha: true });
      if (!this.ctx) return;

      this.enabled = false;
      this.width = 0;
      this.height = 0;
      this.dpr = 1;
      this.particles = [];
      this.pointer = {
        x: -1000,
        y: -1000,
        previousX: -1000,
        previousY: -1000,
        velocityX: 0,
        velocityY: 0,
        targetVelocityX: 0,
        targetVelocityY: 0,
        speed: 0,
        lastMove: performance.now(),
        active: false,
      };
      this.parallax = { x: 0, y: 0, targetX: 0, targetY: 0 };
      this.field = {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        targetX: window.innerWidth / 2,
        targetY: window.innerHeight / 2,
        intensity: 0,
        targetIntensity: 0,
        radius: 190,
      };
      this.visible = !document.hidden;
      this.frame = 0;
      this.lastTime = performance.now();
      this.resizeTimer = 0;
      this.animate = this.animate.bind(this);

      this.onPointerMove = (event) => {
        if (!this.enabled) return;
        if (event.target instanceof HTMLIFrameElement) {
          this.onPointerLeave();
          return;
        }
        const now = performance.now();
        const wasActive = this.pointer.active;
        const elapsed = clamp((now - this.pointer.lastMove) / 16.67, 0.45, 3);

        if (wasActive) {
          const rawVelocityX = (event.clientX - this.pointer.previousX) / elapsed;
          const rawVelocityY = (event.clientY - this.pointer.previousY) / elapsed;
          const rawSpeed = Math.hypot(rawVelocityX, rawVelocityY);
          const velocityLimit = 22;
          const velocityScale = rawSpeed > velocityLimit ? velocityLimit / rawSpeed : 1;
          this.pointer.targetVelocityX = rawVelocityX * velocityScale;
          this.pointer.targetVelocityY = rawVelocityY * velocityScale;
        }

        this.pointer.x = event.clientX;
        this.pointer.y = event.clientY;
        this.pointer.previousX = event.clientX;
        this.pointer.previousY = event.clientY;
        this.pointer.lastMove = now;
        this.pointer.active = true;

        const x = (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * -12;
        const y = (event.clientY / Math.max(window.innerHeight, 1) - 0.5) * -12;
        this.parallax.targetX = x;
        this.parallax.targetY = y;
        this.field.targetX = event.clientX;
        this.field.targetY = event.clientY;
        this.field.targetIntensity = 1;
      };

      this.onPointerLeave = () => {
        this.pointer.x = -1000;
        this.pointer.y = -1000;
        this.pointer.velocityX = 0;
        this.pointer.velocityY = 0;
        this.pointer.targetVelocityX = 0;
        this.pointer.targetVelocityY = 0;
        this.pointer.speed = 0;
        this.pointer.active = false;
        this.parallax.targetX = 0;
        this.parallax.targetY = 0;
        this.field.targetIntensity = 0;
      };

      this.onPointerEnd = (event) => {
        if (event.pointerType !== "mouse") this.onPointerLeave();
      };

      this.onResize = () => {
        if (!this.enabled) return;
        clearTimeout(this.resizeTimer);
        this.resizeTimer = window.setTimeout(() => this.resize(), 120);
      };

      this.onVisibility = () => {
        this.visible = !document.hidden;
        if (!this.visible) {
          cancelAnimationFrame(this.frame);
          this.frame = 0;
        } else if (this.enabled) {
          this.lastTime = performance.now();
          cancelAnimationFrame(this.frame);
          this.frame = requestAnimationFrame(this.animate);
        }
      };

      this.resize();
      window.addEventListener("pointermove", this.onPointerMove, { passive: true });
      window.addEventListener("pointerup", this.onPointerEnd, { passive: true });
      window.addEventListener("pointercancel", this.onPointerEnd, { passive: true });
      window.addEventListener("resize", this.onResize, { passive: true });
      document.documentElement.addEventListener("mouseleave", this.onPointerLeave);
      document.addEventListener("pointerover", (event) => {
        if (event.target instanceof HTMLIFrameElement) this.onPointerLeave();
      });
      qsa("iframe").forEach((frame) => frame.addEventListener("pointerenter", this.onPointerLeave));
      document.addEventListener("visibilitychange", this.onVisibility);
    }

    setEnabled(enabled) {
      if (!this.ctx) return;
      const nextEnabled = Boolean(enabled && this.ctx);
      if (nextEnabled === this.enabled) return;
      this.enabled = nextEnabled;

      cancelAnimationFrame(this.frame);
      this.frame = 0;

      if (this.enabled) {
        this.visible = !document.hidden;
        this.resize();
        this.lastTime = performance.now();
        if (this.visible) this.frame = requestAnimationFrame(this.animate);
        return;
      }

      this.onPointerLeave();
      this.parallax.x = 0;
      this.parallax.y = 0;
      this.field.intensity = 0;
      this.field.targetIntensity = 0;
      document.documentElement.style.setProperty("--ambient-x", "0px");
      document.documentElement.style.setProperty("--ambient-y", "0px");
      this.ctx.clearRect(0, 0, this.width, this.height);
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
      const baseCount = this.width < 680 ? 42 : this.width < 1024 ? 72 : 128;
      const count = lowPower ? Math.round(baseCount * 0.58) : baseCount;
      this.particles = Array.from({ length: count }, () => this.makeParticle());
    }

    makeParticle() {
      const depth = 0.2 + Math.random() * 0.8;
      const driftScale = 0.035 + depth * 0.085;
      const driftX = (Math.random() - 0.5) * driftScale;
      const driftY = (Math.random() - 0.5) * driftScale;
      return {
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: driftX,
        vy: driftY,
        driftX,
        driftY,
        depth,
        radius: 0.42 + depth * 1.28,
        phase: Math.random() * Math.PI * 2,
        sparkle: Math.random() * Math.PI * 2,
        tone: (Math.random() - 0.5) * 14,
        energy: 0,
      };
    }

    animate(now) {
      if (!this.enabled || !this.visible) {
        this.frame = 0;
        return;
      }
      const delta = Math.min((now - this.lastTime) / 16.67, 2);
      this.lastTime = now;
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.width, this.height);

      const parallaxEase = 1 - Math.exp(-0.045 * delta);
      this.parallax.x = lerp(this.parallax.x, this.parallax.targetX, parallaxEase);
      this.parallax.y = lerp(this.parallax.y, this.parallax.targetY, parallaxEase);
      document.documentElement.style.setProperty("--ambient-x", `${this.parallax.x}px`);
      document.documentElement.style.setProperty("--ambient-y", `${this.parallax.y}px`);

      const fieldPositionEase = 1 - Math.exp(-0.16 * delta);
      const fieldIntensityEase = 1 - Math.exp(-(this.field.targetIntensity > this.field.intensity ? 0.2 : 0.075) * delta);
      this.field.x = lerp(this.field.x, this.field.targetX, fieldPositionEase);
      this.field.y = lerp(this.field.y, this.field.targetY, fieldPositionEase);
      this.field.intensity = lerp(this.field.intensity, this.field.targetIntensity, fieldIntensityEase);
      this.field.radius = (this.width < 680 ? 150 : 190) + this.field.intensity * (this.width < 680 ? 48 : 76);

      const pointerEase = 1 - Math.exp(-0.22 * delta);
      this.pointer.velocityX = lerp(this.pointer.velocityX, this.pointer.targetVelocityX, pointerEase);
      this.pointer.velocityY = lerp(this.pointer.velocityY, this.pointer.targetVelocityY, pointerEase);
      if (now - this.pointer.lastMove > 48) {
        const velocityDecay = Math.exp(-0.12 * delta);
        this.pointer.targetVelocityX *= velocityDecay;
        this.pointer.targetVelocityY *= velocityDecay;
      }
      this.pointer.speed = Math.hypot(this.pointer.velocityX, this.pointer.velocityY);

      for (const particle of this.particles) {
        particle.phase += 0.005 * delta;

        const driftRestore = 1 - Math.exp(-0.02 * delta);
        particle.vx = lerp(particle.vx, particle.driftX, driftRestore);
        particle.vy = lerp(particle.vy, particle.driftY, driftRestore);

        const dx = particle.x - this.pointer.x;
        const dy = particle.y - this.pointer.y;
        const distanceSquared = dx * dx + dy * dy;
        const influence = this.width < 680 ? 146 : 230;
        let pointerEnergy = 0;

        if (this.pointer.active && distanceSquared < influence * influence && distanceSquared > 0.01) {
          const distance = Math.sqrt(distanceSquared);
          const normalX = dx / distance;
          const normalY = dy / distance;
          const falloff = 1 - distance / influence;
          const force = falloff * falloff * (3 - 2 * falloff);
          const speedRatio = clamp(this.pointer.speed / 16, 0, 1);
          const flowStrength = (0.018 + particle.depth * 0.034) * force * delta;
          const orbitStrength = (0.006 + speedRatio * 0.014) * force * delta;
          const pullStrength = (0.0035 + speedRatio * 0.0045) * force * delta;

          // Carry nearby particles in the pointer's direction, then curl the wake
          // slightly so the response feels fluid instead of mechanically attached.
          particle.vx += this.pointer.velocityX * flowStrength;
          particle.vy += this.pointer.velocityY * flowStrength;
          particle.vx += -normalY * orbitStrength - normalX * pullStrength;
          particle.vy += normalX * orbitStrength - normalY * pullStrength;
          pointerEnergy = clamp(force * (0.62 + speedRatio * 0.52), 0, 1);
        }

        const energyEase = 1 - Math.exp(-(pointerEnergy > particle.energy ? 0.28 : 0.075) * delta);
        particle.energy = lerp(particle.energy, pointerEnergy, energyEase);

        const velocity = Math.hypot(particle.vx, particle.vy);
        const velocityLimit = 0.86 + particle.depth * 1.05;
        if (velocity > velocityLimit) {
          const scale = velocityLimit / velocity;
          particle.vx *= scale;
          particle.vy *= scale;
        }

        particle.x += (particle.vx + Math.sin(particle.phase) * 0.018 * particle.depth) * delta;
        particle.y += (particle.vy + Math.cos(particle.phase) * 0.018 * particle.depth) * delta;

        if (particle.x < -20) particle.x = this.width + 20;
        if (particle.x > this.width + 20) particle.x = -20;
        if (particle.y < -20) particle.y = this.height + 20;
        if (particle.y > this.height + 20) particle.y = -20;

        particle.renderX = particle.x + this.parallax.x * particle.depth;
        particle.renderY = particle.y + this.parallax.y * particle.depth;
      }

      if (this.field.intensity > 0.01) {
        const glowRadius = this.field.radius * 0.92;
        const glow = ctx.createRadialGradient(
          this.field.x,
          this.field.y,
          0,
          this.field.x,
          this.field.y,
          glowRadius,
        );
        glow.addColorStop(0, `rgba(87, 218, 255, ${0.075 * this.field.intensity})`);
        glow.addColorStop(0.38, `rgba(75, 181, 255, ${0.035 * this.field.intensity})`);
        glow.addColorStop(1, "rgba(62, 135, 255, 0)");
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = glow;
        ctx.fillRect(
          this.field.x - glowRadius,
          this.field.y - glowRadius,
          glowRadius * 2,
          glowRadius * 2,
        );
        ctx.restore();
      }

      // Draw the constellation behind the nodes so every particle keeps a crisp core.
      if (this.width >= 680) {
        for (let i = 0; i < this.particles.length; i += 1) {
          const particle = this.particles[i];
          for (let j = i + 1; j < this.particles.length; j += 1) {
            const other = this.particles[j];
            const linkX = particle.renderX - other.renderX;
            const linkY = particle.renderY - other.renderY;
            const linkDistanceSquared = linkX * linkX + linkY * linkY;
            const sharedDepth = Math.min(particle.depth, other.depth);
            const interactionGlow = Math.max(particle.energy, other.energy);
            const threshold = 96 + sharedDepth * 32 + interactionGlow * 34;
            if (linkDistanceSquared >= threshold * threshold) continue;
            const opacity = Math.min(
              0.32,
              (1 - Math.sqrt(linkDistanceSquared) / threshold) *
                (0.032 + sharedDepth * 0.068) * (1 + interactionGlow * 2.4),
            );
            ctx.beginPath();
            ctx.strokeStyle = `hsla(${196 + sharedDepth * 10}, 92%, 72%, ${opacity})`;
            ctx.lineWidth = 0.34 + sharedDepth * 0.38 + interactionGlow * 0.48;
            ctx.moveTo(particle.renderX, particle.renderY);
            ctx.lineTo(other.renderX, other.renderY);
            ctx.stroke();
          }
        }
      }

      for (const particle of this.particles) {
        const pulse = 0.92 + Math.sin(particle.phase * 1.7 + particle.sparkle) * 0.12;
        const radius = particle.radius * pulse * (1 + particle.energy * 0.78);
        const hue = 190 + (1 - particle.depth) * 30 + particle.tone;
        const haloRadius = radius * (3.35 + particle.energy * 2.8);

        if (particle.energy > 0.16) {
          const streakScale = 5 + particle.energy * 9;
          ctx.beginPath();
          ctx.strokeStyle = `hsla(${hue}, 96%, 76%, ${particle.energy * 0.2})`;
          ctx.lineWidth = 0.45 + particle.energy * 0.55;
          ctx.moveTo(
            particle.renderX - particle.vx * streakScale,
            particle.renderY - particle.vy * streakScale,
          );
          ctx.lineTo(particle.renderX, particle.renderY);
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.fillStyle = `hsla(${hue}, 96%, 70%, ${0.024 + particle.depth * 0.034 + particle.energy * 0.11})`;
        ctx.arc(particle.renderX, particle.renderY, haloRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = `hsla(${hue}, 94%, ${72 + particle.depth * 10}%, ${0.16 + particle.depth * 0.3 + particle.energy * 0.32})`;
        ctx.arc(particle.renderX, particle.renderY, radius, 0, Math.PI * 2);
        ctx.fill();

        if (particle.depth > 0.66 || particle.energy > 0.28) {
          const coreRadius = Math.max(0.32, radius * 0.38);
          ctx.beginPath();
          ctx.fillStyle = `rgba(238, 252, 255, ${Math.min(0.96, 0.34 + particle.depth * 0.38 + particle.energy * 0.24)})`;
          ctx.arc(
            particle.renderX - radius * 0.16,
            particle.renderY - radius * 0.16,
            coreRadius,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }

        if (particle.energy > 0.26) {
          ctx.beginPath();
          ctx.strokeStyle = `hsla(${hue}, 96%, 82%, ${particle.energy * 0.22})`;
          ctx.lineWidth = 0.5 + particle.energy * 0.22;
          ctx.arc(particle.renderX, particle.renderY, radius * 2.25, 0, Math.PI * 2);
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
      this.pressed = false;
      this.pressScale = 1;
      this.pressVelocity = 0;
      this.particles = [];
      this.pool = [];
      this.enabled = false;
      this.active = false;
      this.visible = !document.hidden;
      this.frame = 0;
      this.lastSpawn = 0;
      this.lastPointerTime = performance.now();
      this.lastFrameTime = performance.now();
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.dpr = 1;
      this.animate = this.animate.bind(this);

      this.resize();
      this.bindEvents();
    }

    bindEvents() {
      window.addEventListener("pointermove", (event) => {
        if (!this.enabled) return;
        if (event.target instanceof HTMLIFrameElement) {
          this.suspendForFrame();
          return;
        }
        const now = performance.now();
        const elapsed = clamp((now - this.lastPointerTime) / 1000, 1 / 240, 0.05);
        const dx = event.clientX - this.target.x;
        const dy = event.clientY - this.target.y;
        this.target.x = event.clientX;
        this.target.y = event.clientY;
        if (!this.active) {
          this.position.x = event.clientX;
          this.position.y = event.clientY;
          this.active = true;
          document.body.classList.add("cursor-active");
        } else {
          const vx = dx / elapsed;
          const vy = dy / elapsed;
          const speed = Math.hypot(vx, vy);
          this.inputVelocity.x = vx;
          this.inputVelocity.y = vy;
          if (speed > 12) this.angle = Math.atan2(vy, vx);
          this.spawnParticles(speed, vx, vy, now);
        }
        this.lastPointerTime = now;
      }, { passive: true });

      window.addEventListener("pointerdown", (event) => {
        if (!this.enabled) return;
        if (event.pointerType === "mouse" && event.button !== 0) return;
        this.setPressed(true);
      }, { passive: true });

      window.addEventListener("pointerup", () => {
        if (this.enabled) this.setPressed(false, true);
      }, { passive: true });
      window.addEventListener("pointercancel", () => {
        if (this.enabled) this.setPressed(false);
      }, { passive: true });
      window.addEventListener("blur", () => this.setPressed(false));

      document.documentElement.addEventListener("mouseleave", () => {
        document.body.classList.remove("cursor-active");
      });

      document.documentElement.addEventListener("mouseenter", () => {
        if (this.enabled && this.active) document.body.classList.add("cursor-active");
      });

      document.addEventListener("pointerover", (event) => {
        if (!this.enabled) return;
        if (event.target instanceof HTMLIFrameElement) {
          this.suspendForFrame();
          return;
        }
        this.updateMode(event.target);
      });
      document.addEventListener("pointerout", (event) => {
        if (this.enabled) this.updateMode(event.relatedTarget);
      });
      qsa("iframe").forEach((frame) => frame.addEventListener("pointerenter", () => this.suspendForFrame()));
      window.addEventListener("resize", () => {
        if (this.enabled) this.resize();
      }, { passive: true });
      document.addEventListener("visibilitychange", () => {
        this.visible = !document.hidden;
        if (!this.visible) {
          cancelAnimationFrame(this.frame);
          this.frame = 0;
        } else if (this.enabled) {
          this.lastFrameTime = performance.now();
          this.lastPointerTime = performance.now();
          cancelAnimationFrame(this.frame);
          this.frame = requestAnimationFrame(this.animate);
        }
      });
    }

    suspendForFrame() {
      if (!this.enabled) return;
      this.active = false;
      this.inputVelocity.x = 0;
      this.inputVelocity.y = 0;
      this.setPressed(false);
      this.updateMode(null);
      document.body.classList.remove("cursor-active");
    }

    setEnabled(enabled) {
      if (!this.ctx) return;
      const nextEnabled = Boolean(enabled && this.ctx);
      if (nextEnabled === this.enabled) return;
      this.enabled = nextEnabled;

      cancelAnimationFrame(this.frame);
      this.frame = 0;

      if (this.enabled) {
        this.visible = !document.hidden;
        this.resize();
        this.lastFrameTime = performance.now();
        this.lastPointerTime = performance.now();
        if (this.visible) this.frame = requestAnimationFrame(this.animate);
        return;
      }

      this.active = false;
      this.pressed = false;
      this.inputVelocity.x = 0;
      this.inputVelocity.y = 0;
      this.velocity.x = 0;
      this.velocity.y = 0;
      this.smoothedSpeed = 0;
      this.pressScale = 1;
      this.pressVelocity = 0;
      this.lastSpawn = 0;
      this.particles.splice(0).forEach((particle) => this.pool.push(particle));
      this.dot.classList.remove("is-pressed");
      this.ring.classList.remove("is-pressed", "is-link", "is-view");
      this.label.textContent = "";
      document.body.classList.remove("cursor-active");
      this.ctx.clearRect(0, 0, this.width, this.height);
    }

    setPressed(pressed, burst = false) {
      if (pressed && !this.pressed) {
        this.pressScale = Math.min(this.pressScale, 0.88);
        this.pressVelocity = Math.min(this.pressVelocity, -0.9);
      }
      if (!pressed && this.pressed) this.pressVelocity += 0.45;
      this.pressed = pressed;
      this.dot.classList.toggle("is-pressed", pressed);
      this.ring.classList.toggle("is-pressed", pressed);
      if (burst && this.active) this.spawnPressParticles();
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
      if (speed < 90 || now - this.lastSpawn < 15 || this.particles.length >= 46) return;
      this.lastSpawn = now;
      const amount = Math.min(46 - this.particles.length, clamp(Math.floor(speed / 650), 1, 4));
      const direction = Math.atan2(vy, vx);

      for (let i = 0; i < amount; i += 1) {
        const particle = this.pool.pop() || {};
        const life = 0.28 + Math.random() * 0.22;
        particle.x = this.target.x + (Math.random() - 0.5) * 3;
        particle.y = this.target.y + (Math.random() - 0.5) * 3;
        particle.vx = -vx * (0.016 + Math.random() * 0.012) + (Math.random() - 0.5) * 18;
        particle.vy = -vy * (0.016 + Math.random() * 0.012) + (Math.random() - 0.5) * 18;
        particle.life = life;
        particle.maxLife = life;
        particle.size = clamp(speed * 0.0012, 0.8, 2.1) * (0.7 + Math.random() * 0.5);
        particle.drag = 5.5 + Math.random() * 2.5;
        particle.angle = direction;
        particle.seed = Math.random() * Math.PI * 2;
        this.particles.push(particle);
      }
    }

    spawnPressParticles() {
      const amount = Math.min(3, 46 - this.particles.length);
      for (let i = 0; i < amount; i += 1) {
        const particle = this.pool.pop() || {};
        const angle = (Math.PI * 2 * i) / Math.max(amount, 1) + Math.random() * 0.35;
        const speed = 24 + Math.random() * 20;
        const life = 0.22 + Math.random() * 0.12;
        particle.x = this.target.x;
        particle.y = this.target.y;
        particle.vx = Math.cos(angle) * speed;
        particle.vy = Math.sin(angle) * speed;
        particle.life = life;
        particle.maxLife = life;
        particle.size = 1 + Math.random() * 0.7;
        particle.drag = 7 + Math.random() * 2;
        particle.angle = angle;
        particle.seed = Math.random() * Math.PI * 2;
        this.particles.push(particle);
      }
    }

    animate(time) {
      if (!this.enabled || !this.visible) {
        this.frame = 0;
        return;
      }
      const delta = clamp((time - this.lastFrameTime) / 1000, 1 / 240, 0.033);
      this.lastFrameTime = time;

      const springStrength = 140;
      const springDamping = 20;
      this.velocity.x += ((this.target.x - this.position.x) * springStrength - this.velocity.x * springDamping) * delta;
      this.velocity.y += ((this.target.y - this.position.y) * springStrength - this.velocity.y * springDamping) * delta;
      this.position.x += this.velocity.x * delta;
      this.position.y += this.velocity.y * delta;

      const instantaneousSpeed = Math.hypot(this.inputVelocity.x, this.inputVelocity.y);
      const speedEase = 1 - Math.exp(-12 * delta);
      this.smoothedSpeed = lerp(this.smoothedSpeed, instantaneousSpeed, speedEase);
      const inputDamping = Math.exp(-8 * delta);
      this.inputVelocity.x *= inputDamping;
      this.inputVelocity.y *= inputDamping;

      const pressTarget = this.pressed ? 0.74 : 1;
      this.pressVelocity += (pressTarget - this.pressScale) * 120 * delta;
      this.pressVelocity *= Math.exp(-16 * delta);
      this.pressScale += this.pressVelocity * delta;

      const stretch = 1 + clamp(this.smoothedSpeed * 0.00045, 0, 0.34);
      const squash = 1 - clamp(this.smoothedSpeed * 0.00014, 0, 0.11);
      const rotation = this.angle * 180 / Math.PI;
      const ringScaleX = stretch * this.pressScale;
      const ringScaleY = squash * this.pressScale;
      const dotScale = 1 + (1 - this.pressScale) * 1.9;

      this.dot.style.transform = `translate3d(${this.target.x}px, ${this.target.y}px, 0) scale(${dotScale})`;
      this.ring.style.transform = `translate3d(${this.position.x}px, ${this.position.y}px, 0) rotate(${rotation}deg) scale(${ringScaleX}, ${ringScaleY})`;
      this.label.style.transform = `rotate(${-rotation}deg) scale(${1 / ringScaleX}, ${1 / ringScaleY})`;

      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.width, this.height);
      for (let i = this.particles.length - 1; i >= 0; i -= 1) {
        const particle = this.particles[i];
        particle.life -= delta;
        const drag = Math.exp(-particle.drag * delta);
        particle.vx *= drag;
        particle.vy *= drag;
        particle.x += particle.vx * delta + Math.sin(time * 0.006 + particle.seed) * 1.5 * delta;
        particle.y += particle.vy * delta + Math.cos(time * 0.006 + particle.seed) * 1.5 * delta;

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
      this.enabled = false;
      this.running = false;
      this.frame = 0;
      this.pointerFrame = 0;
      this.refreshFrame = 0;
      this.tick = this.tick.bind(this);

      window.addEventListener("pointermove", (event) => {
        if (!this.enabled) return;
        this.pointer.x = event.clientX;
        this.pointer.y = event.clientY;
        if (this.pointerFrame) return;
        this.pointerFrame = requestAnimationFrame(() => {
          this.pointerFrame = 0;
          if (!this.enabled) return;
          this.updateTargets();
          this.start();
        });
      }, { passive: true });

      const refresh = () => this.items.forEach((item) => {
        const transform = item.element.style.transform;
        item.element.style.transform = "";
        item.rect = item.element.getBoundingClientRect();
        item.element.style.transform = transform;
      });

      this.requestRefresh = () => {
        if (!this.enabled || this.refreshFrame) return;
        this.refreshFrame = requestAnimationFrame(() => {
          this.refreshFrame = 0;
          if (!this.enabled) return;
          refresh();
          this.updateTargets();
          this.start();
        });
      };

      let resizeTimer = 0;
      window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(this.requestRefresh, 120);
      }, { passive: true });
      window.addEventListener("scroll", this.requestRefresh, { passive: true });
    }

    setEnabled(enabled) {
      if (!this.items?.length) return;
      const nextEnabled = Boolean(enabled);
      if (nextEnabled === this.enabled) return;
      this.enabled = nextEnabled;

      cancelAnimationFrame(this.frame);
      cancelAnimationFrame(this.pointerFrame);
      cancelAnimationFrame(this.refreshFrame);
      this.frame = 0;
      this.pointerFrame = 0;
      this.refreshFrame = 0;
      this.running = false;

      if (this.enabled) {
        this.requestRefresh();
        return;
      }

      this.pointer.x = -1000;
      this.pointer.y = -1000;
      this.items.forEach((item) => {
        item.x = 0;
        item.y = 0;
        item.vx = 0;
        item.vy = 0;
        item.targetX = 0;
        item.targetY = 0;
        item.element.style.transform = "";
        if (item.content instanceof HTMLElement) item.content.style.transform = "";
      });
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
      if (!this.enabled || this.running) return;
      this.running = true;
      this.frame = requestAnimationFrame(this.tick);
    }

    tick() {
      if (!this.enabled) {
        this.running = false;
        this.frame = 0;
        return;
      }
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
        this.frame = requestAnimationFrame(this.tick);
      } else {
        this.running = false;
        this.frame = 0;
      }
    }
  }

  function initInteractiveCards() {
    const cards = qsa(".spotlight-card");
    if (!cards.length) return { setEnabled() {} };

    let enabled = false;
    const states = cards.map((card) => ({ card, frame: 0, pointerX: 0, pointerY: 0 }));

    states.forEach((state) => {
      const { card } = state;
      card.addEventListener("pointermove", (event) => {
        if (!enabled) return;
        state.pointerX = event.clientX;
        state.pointerY = event.clientY;
        if (state.frame) return;

        state.frame = requestAnimationFrame(() => {
          state.frame = 0;
          if (!enabled) return;
          const rect = card.getBoundingClientRect();
          const x = state.pointerX - rect.left;
          const y = state.pointerY - rect.top;
          card.style.setProperty("--spot-x", `${x}px`);
          card.style.setProperty("--spot-y", `${y}px`);

          if (!card.classList.contains("tilt-card")) return;
          const normalizedX = x / rect.width - 0.5;
          const normalizedY = y / rect.height - 0.5;
          card.style.setProperty("--tilt-x", `${normalizedY * -5}deg`);
          card.style.setProperty("--tilt-y", `${normalizedX * 5}deg`);
        });
      }, { passive: true });

      card.addEventListener("pointerleave", () => {
        cancelAnimationFrame(state.frame);
        state.frame = 0;
        card.style.setProperty("--tilt-x", "0deg");
        card.style.setProperty("--tilt-y", "0deg");
      });
    });

    return {
      setEnabled(nextEnabled) {
        enabled = Boolean(nextEnabled);
        if (enabled) return;
        states.forEach((state) => {
          cancelAnimationFrame(state.frame);
          state.frame = 0;
          state.card.style.setProperty("--tilt-x", "0deg");
          state.card.style.setProperty("--tilt-y", "0deg");
        });
      },
    };
  }

  function initProjectFilters() {
    const filters = qsa("[data-project-filter]");
    const cards = qsa("[data-project-card]");
    const count = qs("#project-count");
    const list = qs(".projects-list");
    if (!filters.length || !cards.length || !count || !list) return;

    const applyFilter = (selectedFilter) => {
      let visibleCount = 0;
      list.classList.toggle("is-filtered", selectedFilter.dataset.projectFilter !== "all");

      filters.forEach((filter) => {
        const active = filter === selectedFilter;
        filter.classList.toggle("is-active", active);
        filter.setAttribute("aria-pressed", String(active));
      });

      cards.forEach((card) => {
        const visible = selectedFilter.dataset.projectFilter === "all" ||
          card.dataset.projectCategory === selectedFilter.dataset.projectFilter;
        card.hidden = !visible;
        if (!visible) return;
        visibleCount += 1;

        if (!reducedMotion.matches && typeof card.animate === "function") {
          card.animate([
            { opacity: 0, transform: "translateY(14px) scale(0.985)" },
            { opacity: 1, transform: "translateY(0) scale(1)" },
          ], {
            duration: 420,
            easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          });
        }
      });

      count.textContent = String(visibleCount).padStart(2, "0");
    };

    filters.forEach((filter) => filter.addEventListener("click", () => applyFilter(filter)));
  }

  function initHeroParallax() {
    const visual = qs("[data-parallax]");
    if (!visual) return { setEnabled() {} };

    let enabled = false;
    let frame = 0;
    let targetX = 0;
    let targetY = 0;

    window.addEventListener("pointermove", (event) => {
      if (!enabled) return;
      targetX = (event.clientX / window.innerWidth - 0.5) * 12;
      targetY = (event.clientY / window.innerHeight - 0.5) * 10;
      if (frame) return;

      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!enabled) return;
        visual.style.setProperty("--portrait-x", `${targetX}px`);
        visual.style.setProperty("--portrait-y", `${targetY}px`);
      });
    }, { passive: true });

    return {
      setEnabled(nextEnabled) {
        enabled = Boolean(nextEnabled);
        if (enabled) return;
        cancelAnimationFrame(frame);
        frame = 0;
        targetX = 0;
        targetY = 0;
        visual.style.setProperty("--portrait-x", "0px");
        visual.style.setProperty("--portrait-y", "0px");
      },
    };
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
