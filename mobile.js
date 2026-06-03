"use strict";

const mobileRoot = document.documentElement;
const mobileWrap = document.querySelector(".mobile-game-wrap");
const mobileButtons = document.querySelectorAll(".mobile-page .touch-btn");

function setMobileViewportHeight() {
  const height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  mobileRoot.style.setProperty("--mobile-vh", `${height}px`);
}

function clearMobileHeldInput() {
  if (window.clearVirtualControls) {
    window.clearVirtualControls();
    return;
  }
  try {
    if (typeof keys !== "undefined") {
      keys.delete("ArrowLeft");
      keys.delete("ArrowRight");
      keys.delete("Space");
    }
  } catch (error) {
    // The desktop game script owns keyboard state; mobile cleanup is best-effort.
  }
}

function tryEnterMobileImmersiveMode() {
  if (!mobileWrap) {
    return;
  }
  if (!document.fullscreenElement && mobileWrap.requestFullscreen) {
    mobileWrap.requestFullscreen({ navigationUI: "hide" }).catch(() => {});
  }
  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock("landscape").catch(() => {});
  }
}

function preventMobileScroll(event) {
  if (event.target.closest(".mobile-game-wrap")) {
    event.preventDefault();
  }
}

setMobileViewportHeight();
window.addEventListener("resize", setMobileViewportHeight);
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", setMobileViewportHeight);
}

document.addEventListener("touchmove", preventMobileScroll, { passive: false });
document.addEventListener("contextmenu", (event) => event.preventDefault());
window.addEventListener("blur", clearMobileHeldInput);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    clearMobileHeldInput();
  }
});

mobileButtons.forEach((button) => {
  button.addEventListener("pointerdown", (event) => {
    button.classList.add("is-pressed");
    if (button.setPointerCapture) {
      button.setPointerCapture(event.pointerId);
    }
    if (navigator.vibrate) {
      navigator.vibrate(button.dataset.tap === "jump" ? 12 : 8);
    }
  });

  const release = () => {
    button.classList.remove("is-pressed");
  };
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
});

document.querySelectorAll("#primaryAction, #secondaryAction").forEach((button) => {
  button.addEventListener("pointerdown", tryEnterMobileImmersiveMode);
});
