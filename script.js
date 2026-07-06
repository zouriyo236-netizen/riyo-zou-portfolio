const root = document.documentElement;
const video = document.querySelector("[data-opening-video]");
const opening = document.querySelector(".opening");
const stage = document.querySelector(".stage");
const portalStage = document.querySelector("[data-portal-stage]");
const homeVideo = document.querySelector("[data-home-video]");
const progressNumber = document.querySelector(".progress-number");
const navTabs = Array.from(document.querySelectorAll("[data-nav-tab]"));
const galleryCards = Array.from(document.querySelectorAll(".gallery-card"));
const lightbox = document.querySelector("[data-project-lightbox]");
const lightboxImage = document.querySelector("[data-lightbox-image]");
const lightboxClose = document.querySelector("[data-lightbox-close]");
const internshipCards = Array.from(document.querySelectorAll("[data-internship-card]"));
const projectSelectors = Array.from(document.querySelectorAll("[data-project-selector]"));
const projectPageSets = Array.from(document.querySelectorAll("[data-project-page-set]"));

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const smooth = (value) => value * value * (3 - 2 * value);
const map = (value, start, end) => clamp((value - start) / (end - start));
const portalImages = Array.from(document.querySelectorAll(".portal-layer"));

let videoEnded = false;
let locked = false;
let portalStep = 0;
let portalReady = false;
let homeEntered = false;
let homeTopArmed = false;
let homeTopArmedAt = 0;
let lastHomeTopWheelAt = 0;
let fallbackStart = performance.now();

const homeReturnGestureGap = 700;
const homeReturnArmTimeout = 2600;

root.classList.add("is-sequencing");

function clearHomeReturnArm() {
  homeTopArmed = false;
  homeTopArmedAt = 0;
  lastHomeTopWheelAt = 0;
}

function setHomeWidth() {
  const designWidth = window.innerWidth;
  root.style.setProperty("--home-w", `${designWidth}px`);
  root.style.setProperty("--ui-scale", `${Math.max(0.55, designWidth / 1280)}`);
}

function setScrollTypography() {
  root.style.setProperty("--type-scroll", `${window.scrollY}px`);
}

function prepareImages() {
  portalImages.forEach((image) => {
    if (typeof image.decode === "function") {
      image.decode().catch(() => {});
    }
  });
}

function currentTime() {
  return video && Number.isFinite(video.currentTime) ? video.currentTime : (performance.now() - fallbackStart) / 1000;
}

function setVars() {
  const time = currentTime();
  const hiReveal = smooth(map(time, 1.5, 2.0));
  const lineReveal = smooth(map(time, 1.65, 2.35));
  const progressReveal = smooth(map(time, 1.85, 2.35));
  const progress = smooth(map(time, 2.0, 4.0));
  const copyOpacity = 1 - smooth(map(time, 4.0, 4.35));

  root.style.setProperty("--hi-reveal", hiReveal.toFixed(4));
  root.style.setProperty("--line-reveal", lineReveal.toFixed(4));
  root.style.setProperty("--progress-reveal", progressReveal.toFixed(4));
  root.style.setProperty("--progress", progress.toFixed(4));
  root.style.setProperty("--copy-opacity", copyOpacity.toFixed(4));

  if (progressNumber) {
    let number = Math.round(progress * 100);
    if (progress > 0.94 && progress < 0.985) number = 98;
    if (progress >= 0.985 && progress < 1) number = 99;
    if (progress >= 1 || time >= 4.0) number = 100;
    progressNumber.textContent = `${number}%`;
  }

  requestAnimationFrame(setVars);
}

function startVideo() {
  if (!video) return;
  video.currentTime = 0;
  if (homeVideo) {
    homeVideo.pause();
    homeVideo.currentTime = 0;
  }
  videoEnded = false;
  portalStep = 0;
  portalReady = false;
  homeEntered = false;
  clearHomeReturnArm();
  root.classList.add("is-sequencing");
  opening.classList.remove("is-home");
  stage.classList.remove("is-home");
  portalStage?.classList.remove("is-visible");
  portalStage?.classList.remove("is-home");
  portalStage?.setAttribute("data-step", "0");
  fallbackStart = performance.now();
  root.style.setProperty("--home-in", "0");

  const playPromise = video.play();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch(() => {
      video.controls = true;
    });
  }
}

function revealPortal() {
  if (!videoEnded || locked || portalReady) return;
  opening.scrollIntoView({ behavior: "auto", block: "start" });
  portalStage?.classList.add("is-visible");
  portalReady = true;
  if (homeVideo) {
    const playPromise = homeVideo.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
  }
}

function resetOpening() {
  locked = true;
  opening.scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(() => {
    startVideo();
    locked = false;
  }, 700);
}

function enterHome() {
  portalStep = 2;
  portalStage?.setAttribute("data-step", "2");
  root.style.setProperty("--home-in", "1");
  locked = true;
  window.setTimeout(() => {
    homeEntered = true;
    clearHomeReturnArm();
    root.classList.remove("is-sequencing");
    opening.classList.add("is-home");
    stage.classList.add("is-home");
    portalStage?.classList.add("is-home");
    if (homeVideo) {
      const playPromise = homeVideo.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
    }
    window.scrollTo({ top: 0, behavior: "auto" });
    locked = false;
  }, 1500);
}

function advancePortal() {
  if (!portalReady || locked) return;

  if (portalStep === 0) {
    portalStep = 1;
    portalStage?.setAttribute("data-step", "1");
    return;
  }

  if (portalStep === 1) {
    enterHome();
  }
}

if (video) {
  setHomeWidth();
  prepareImages();
  video.addEventListener("loadedmetadata", startVideo, { once: true });
  video.addEventListener("ended", () => {
    videoEnded = true;
    root.style.setProperty("--home-in", "0");
    requestAnimationFrame(revealPortal);
  });

  if (video.readyState >= 1) {
    startVideo();
  }
}

window.addEventListener("resize", setHomeWidth);
window.addEventListener("scroll", setScrollTypography, { passive: true });

window.addEventListener(
  "wheel",
  (event) => {
    const onOpening = !homeEntered || window.scrollY < window.innerHeight * 0.55;
    const atHomeTop = homeEntered && window.scrollY <= 8;

    if (locked) {
      event.preventDefault();
      return;
    }

    if (homeEntered) {
      if (event.deltaY > 8) {
        clearHomeReturnArm();
        return;
      }

      if (event.deltaY < -8) {
        if (!atHomeTop) {
          clearHomeReturnArm();
          return;
        }

        event.preventDefault();
        const now = performance.now();
        const sameGesture = lastHomeTopWheelAt > 0 && now - lastHomeTopWheelAt < homeReturnGestureGap;
        const armExpired = homeTopArmed && now - homeTopArmedAt > homeReturnArmTimeout;
        lastHomeTopWheelAt = now;

        if (!homeTopArmed || armExpired) {
          homeTopArmed = true;
          homeTopArmedAt = now;
          return;
        }

        if (sameGesture) {
          return;
        }

        resetOpening();
        return;
      }
    }

    if (event.deltaY > 8 && onOpening) {
      event.preventDefault();
      if (!portalReady) {
        revealPortal();
      } else if (portalStep < 2) {
        advancePortal();
      }
    }

  },
  { passive: false },
);

window.addEventListener("keydown", (event) => {
  if (["ArrowDown", "PageDown", " "].includes(event.key) && (!homeEntered || window.scrollY < window.innerHeight * 0.55)) {
    event.preventDefault();
    if (!portalReady) {
      revealPortal();
    } else if (portalStep < 2) {
      advancePortal();
    }
  }

  if (["ArrowUp", "PageUp"].includes(event.key) && homeEntered && window.scrollY <= 8) {
    event.preventDefault();
    if (event.repeat) return;

    const now = performance.now();
    if (!homeTopArmed || now - homeTopArmedAt > homeReturnArmTimeout) {
      homeTopArmed = true;
      homeTopArmedAt = now;
      return;
    }

    resetOpening();
  }
});

stage?.addEventListener("click", () => {
  if (!videoEnded || locked) return;

  if (!portalReady) {
    revealPortal();
    return;
  }

  advancePortal();
});

navTabs.forEach((tab) => {
  tab.addEventListener("click", (event) => {
    event.stopPropagation();
    navTabs.forEach((item) => item.classList.remove("is-selected"));
    tab.classList.add("is-selected");
  });
});

galleryCards.forEach((card) => {
  card.addEventListener("click", (event) => {
    event.stopPropagation();
    const image = card.querySelector("img");
    const projectName = card.dataset.projectName || image?.alt || "Project";
    console.log(projectName);

    if (!lightbox || !lightboxImage || !image) return;
    lightboxImage.src = image.currentSrc || image.src;
    lightboxImage.alt = projectName;
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
  });
});

function closeLightbox() {
  if (!lightbox || !lightboxImage) return;
  lightbox.classList.remove("is-open");
  lightbox.setAttribute("aria-hidden", "true");
  window.setTimeout(() => {
    if (!lightbox.classList.contains("is-open")) {
      lightboxImage.removeAttribute("src");
    }
  }, 300);
}

lightboxClose?.addEventListener("click", closeLightbox);

internshipCards.forEach((card) => {
  card.addEventListener("click", (event) => {
    event.stopPropagation();
    internshipCards.forEach((item) => item.classList.remove("is-active"));
    card.classList.add("is-active");
  });

  card.addEventListener("mousemove", (event) => {
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    card.style.setProperty("--tilt-x", `${(-y * 12).toFixed(2)}deg`);
    card.style.setProperty("--tilt-y", `${(x * 12).toFixed(2)}deg`);
  });

  card.addEventListener("mouseleave", () => {
    card.style.setProperty("--tilt-x", "0deg");
    card.style.setProperty("--tilt-y", "0deg");
  });
});

projectSelectors.forEach((selector) => {
  selector.addEventListener("click", (event) => {
    event.stopPropagation();
    const index = selector.dataset.projectSelector;

    projectSelectors.forEach((item) => item.classList.toggle("is-active", item === selector));
    projectPageSets.forEach((set) => {
      set.classList.toggle("is-active", set.dataset.projectPageSet === index);
    });
  });
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeLightbox();
  }
});

setScrollTypography();
setVars();
