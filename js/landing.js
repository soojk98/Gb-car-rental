/* Landing page behaviour: language switching, the break-even calculator,
   and the per-car WhatsApp links. No dependencies. */
(function () {
    'use strict';

    var WA_NUMBER = '60163652235';
    var STORE_KEY = 'gb-lang';

    /* Weekly rates must match the markup and admin/leads.html slugs. */
    var CARS = {
        saga:  { label: 'Proton Saga',  weekly: 330 },
        bezza: { label: 'Perodua Bezza', weekly: 420 },
        alza:  { label: 'Perodua Alza',  weekly: 460 }
    };

    /* ---------------- language ---------------- */

    var dict = window.GB_I18N || { en: {}, ms: {} };
    var lang = 'en';

    function readStored() {
        try { return localStorage.getItem(STORE_KEY); } catch (e) { return null; }
    }
    function writeStored(v) {
        try { localStorage.setItem(STORE_KEY, v); } catch (e) { /* private mode */ }
    }

    function t(key) {
        var table = dict[lang] || {};
        if (Object.prototype.hasOwnProperty.call(table, key)) return table[key];
        return (dict.en && dict.en[key]) || '';
    }

    function applyLang(next) {
        lang = (next === 'ms') ? 'ms' : 'en';
        document.documentElement.setAttribute('lang', lang === 'ms' ? 'ms' : 'en');

        // Text nodes. Values may contain <br> and <em>, so they are trusted
        // markup from our own dictionary, never user input.
        var nodes = document.querySelectorAll('[data-i18n]');
        Array.prototype.forEach.call(nodes, function (el) {
            var v = t(el.getAttribute('data-i18n'));
            if (v) el.innerHTML = v;
        });

        // Attributes, e.g. data-i18n-attr="placeholder:apply.car.placeholder"
        var attrNodes = document.querySelectorAll('[data-i18n-attr]');
        Array.prototype.forEach.call(attrNodes, function (el) {
            el.getAttribute('data-i18n-attr').split(',').forEach(function (pair) {
                var bits = pair.split(':');
                if (bits.length !== 2) return;
                var v = t(bits[1].trim());
                if (v) el.setAttribute(bits[0].trim(), v);
            });
        });

        var buttons = document.querySelectorAll('.lang-toggle button');
        Array.prototype.forEach.call(buttons, function (b) {
            b.setAttribute('aria-pressed', b.dataset.lang === lang ? 'true' : 'false');
        });

        writeStored(lang);
        renderCalc();
        buildWaLinks();
    }

    /* ---------------- per-car WhatsApp links ---------------- */

    function waHref(slug) {
        var car = CARS[slug];
        var msg = car
            ? (lang === 'ms'
                ? 'Hi GB Car Rental, saya berminat nak sewa ' + car.label + ' (RM' + car.weekly + ' seminggu). Boleh maklumkan deposit dan availability?'
                : 'Hi GB Car Rental, I am interested in the ' + car.label + ' (RM' + car.weekly + ' a week). Could you tell me the deposit and availability?')
            : (lang === 'ms'
                ? 'Hi GB Car Rental, saya nak tanya pasal sewa kereta e-hailing.'
                : 'Hi GB Car Rental, I would like to ask about e-hailing car rental.');
        return 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(msg);
    }

    function buildWaLinks() {
        var links = document.querySelectorAll('[data-wa]');
        Array.prototype.forEach.call(links, function (a) {
            a.setAttribute('href', waHref(a.getAttribute('data-wa')));
        });
    }

    /* ---------------- break-even calculator ---------------- */

    var takingsInput, carButtons, calcCar = 'saga';

    function renderCalc() {
        if (!takingsInput) return;

        var car = CARS[calcCar];
        var weekly = car.weekly;
        var daily = weekly / 7;
        var takings = parseFloat(takingsInput.value);

        var elBig   = document.getElementById('calc-big');
        var elLabel = document.getElementById('calc-big-label');
        var elWeek  = document.getElementById('calc-weekly');
        var elDay   = document.getElementById('calc-daily');
        var elKeep  = document.getElementById('calc-keep');

        elWeek.textContent = 'RM ' + weekly.toLocaleString('en-MY');
        elDay.textContent  = 'RM ' + daily.toFixed(2);

        if (!isFinite(takings) || takings <= 0) {
            elBig.textContent = '—';
            elLabel.textContent = t('calc.zero');
            elKeep.textContent = '—';
            return;
        }

        // What share of one day's takings the rental costs.
        var share = Math.min(100, Math.round((daily / takings) * 100));
        var keepWeekly = (takings * 7) - weekly;

        elBig.textContent = share + '%';
        elLabel.textContent = t('calc.result.label');
        elKeep.textContent = (keepWeekly < 0 ? '−RM ' : 'RM ') +
            Math.abs(Math.round(keepWeekly)).toLocaleString('en-MY');
    }

    /* ---------------- boot ---------------- */

    function init() {
        // language toggle
        var toggle = document.querySelector('.lang-toggle');
        if (toggle) {
            toggle.addEventListener('click', function (e) {
                var btn = e.target.closest('button[data-lang]');
                if (btn) applyLang(btn.dataset.lang);
            });
        }

        // calculator
        takingsInput = document.getElementById('calc-takings');
        carButtons = document.querySelector('.calc-cars');
        if (takingsInput) takingsInput.addEventListener('input', renderCalc);
        if (carButtons) {
            carButtons.addEventListener('click', function (e) {
                var btn = e.target.closest('button[data-car]');
                if (!btn) return;
                calcCar = btn.dataset.car;
                Array.prototype.forEach.call(carButtons.querySelectorAll('button'), function (b) {
                    b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
                });
                renderCalc();
            });
        }

        applyLang(readStored() || 'en');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
}());
