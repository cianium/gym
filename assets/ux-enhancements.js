const ready = (callback) => {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", callback, { once: true });
  } else {
    callback();
  }
};

ready(() => {
  const liveRegion = document.createElement("div");
  liveRegion.id = "ux-route-announcer";
  liveRegion.className = "ux-visually-hidden";
  liveRegion.setAttribute("role", "status");
  liveRegion.setAttribute("aria-live", "polite");
  liveRegion.setAttribute("aria-atomic", "true");
  document.body.appendChild(liveRegion);

  const connectionBanner = document.createElement("div");
  connectionBanner.className = "ux-connection-banner";
  connectionBanner.setAttribute("role", "status");
  connectionBanner.setAttribute("aria-live", "polite");
  connectionBanner.hidden = true;
  connectionBanner.textContent = "اتصال اینترنت قطع است؛ بعضی عملیات تا برقراری دوباره اتصال انجام نمی‌شوند.";
  document.body.appendChild(connectionBanner);

  const updateConnectionState = () => {
    connectionBanner.hidden = navigator.onLine;
    if (navigator.onLine) {
      liveRegion.textContent = "اتصال اینترنت دوباره برقرار شد.";
    }
  };

  window.addEventListener("online", updateConnectionState);
  window.addEventListener("offline", updateConnectionState);
  updateConnectionState();

  const hardenExternalLinks = (root = document) => {
    root.querySelectorAll?.('a[target="_blank"]').forEach((link) => {
      const values = new Set((link.getAttribute("rel") || "").split(/\s+/).filter(Boolean));
      values.add("noopener");
      values.add("noreferrer");
      link.setAttribute("rel", [...values].join(" "));
    });
  };

  const announceRoute = () => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const main = document.querySelector("main");
        if (main) {
          if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
          main.focus({ preventScroll: true });
        }
        liveRegion.textContent = document.title || "صفحه جدید بارگذاری شد.";
        hardenExternalLinks();
      });
    });
  };

  const wrapHistoryMethod = (methodName) => {
    const original = history[methodName];
    history[methodName] = function (...args) {
      const result = original.apply(this, args);
      window.dispatchEvent(new Event("ux:navigation"));
      return result;
    };
  };

  wrapHistoryMethod("pushState");
  wrapHistoryMethod("replaceState");
  window.addEventListener("popstate", announceRoute);
  window.addEventListener("ux:navigation", announceRoute);

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node instanceof Element) hardenExternalLinks(node);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  hardenExternalLinks();
});
