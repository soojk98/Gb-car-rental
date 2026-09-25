/* Mobile navigation sheet for the landing page. */
(function () {
    var toggle = document.getElementById('nav-toggle');
    var links = document.getElementById('nav-links');
    if (!toggle || !links) return;

    function setOpen(open) {
        links.classList.toggle('is-open', open);
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }

    toggle.addEventListener('click', function () {
        setOpen(!links.classList.contains('is-open'));
    });

    // Tapping a link, or hitting Escape, closes the sheet.
    links.addEventListener('click', function (event) {
        if (event.target.tagName === 'A') setOpen(false);
    });
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') setOpen(false);
    });

    // If the viewport grows past the breakpoint the sheet must not stay open,
    // or the desktop nav inherits the mobile positioning.
    window.addEventListener('resize', function () {
        if (window.innerWidth > 833) setOpen(false);
    });
}());
