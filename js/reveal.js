/* Scroll-reveal for the landing page. Adds .is-revealed to any
   [data-reveal] element once it scrolls into view. Elements start hidden
   in CSS, so both guards below matter: if motion is not wanted, or the
   browser has no IntersectionObserver, everything is shown immediately. */
(function () {
    var els = document.querySelectorAll('[data-reveal]');
    if (!els.length) return;

    var show = function (el) { el.classList.add('is-revealed'); };
    var showAll = function () { Array.prototype.forEach.call(els, show); };

    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !('IntersectionObserver' in window)) {
        showAll();
        return;
    }

    var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                show(entry.target);
                io.unobserve(entry.target);
            }
        });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    Array.prototype.forEach.call(els, function (el) { io.observe(el); });
}());
