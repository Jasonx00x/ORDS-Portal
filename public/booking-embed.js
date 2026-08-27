(function () {
  "use strict";

  function bookingFrames() {
    return Array.from(document.querySelectorAll("iframe[data-ords-booking]"));
  }

  function resizeFrame(event) {
    if (!event.data || event.data.type !== "ords-booking-resize") return;
    var frame = bookingFrames().find(function (candidate) {
      try {
        return candidate.contentWindow === event.source && new URL(candidate.src).origin === event.origin;
      } catch (_error) {
        return false;
      }
    });
    if (!frame) return;

    var requestedHeight = Number(event.data.height);
    if (!Number.isFinite(requestedHeight)) return;
    frame.style.height = Math.min(Math.max(Math.ceil(requestedHeight), 640), 4000) + "px";
  }

  bookingFrames().forEach(function (frame) {
    frame.style.width = "100%";
    frame.style.minHeight = "900px";
    frame.style.border = "0";
  });
  window.addEventListener("message", resizeFrame);
})();
