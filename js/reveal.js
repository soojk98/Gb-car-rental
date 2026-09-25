/* Scroll reveal + stat count-up for the landing page.

   Elements start hidden in CSS, so both guards matter: if motion is not
   wanted, or the browser has no IntersectionObserver, everything is shown
   immediately rather than staying invisible. */
(function () {
    'use strict';

    var reduced = window.matchMedia &&
                  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var noIO = !('IntersectionObserver' in window);

    /* ---------- reveal ---------- */
    var els = document.querySelectorAll('[data-reveal]');
    var show = function (el) { el.classList.add('is-revealed'); };

    if (els.length) {
        if (reduced || noIO) {
            Array.prototype.forEach.call(els, show);
        } else {
            var io = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) { show(entry.target); io.unobserve(entry.target); }
                });
            }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
            Array.prototype.forEach.call(els, function (el) { io.observe(el); });
        }
    }

    /* ---------- count-up ---------- */
    var nums = document.querySelectorAll('[data-count]');
    if (!nums.length) return;

    function settle(el) {
        el.textContent = (el.dataset.prefix || '') + el.dataset.count + (el.dataset.suffix || '');
    }

    if (reduced || noIO) {
        Array.prototype.forEach.call(nums, settle);
        return;
    }

    function run(el) {
        var target = parseFloat(el.dataset.count);
        if (!isFinite(target)) { settle(el); return; }
        var prefix = el.dataset.prefix || '';
        var suffix = el.dataset.suffix || '';
        var dur = 900;
        var start = null;

        function frame(ts) {
            if (start === null) start = ts;
            var p = Math.min(1, (ts - start) / dur);
            // easeOutCubic
            var eased = 1 - Math.pow(1 - p, 3);
            el.textContent = prefix + Math.round(target * eased) + suffix;
            if (p < 1) requestAnimationFrame(frame);
            else settle(el);
        }
        requestAnimationFrame(frame);
    }

    var nio = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) { run(entry.target); nio.unobserve(entry.target); }
        });
    }, { threshold: 0.4 });

    Array.prototype.forEach.call(nums, function (el) {
        el.textContent = (el.dataset.prefix || '') + '0' + (el.dataset.suffix || '');
        nio.observe(el);
    });
}());
