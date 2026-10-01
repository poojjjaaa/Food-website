/* =====================================================================
   SARAB – CART
   - Single source of truth for the cart (all money in integer cents,
     so 3 × $14.99 is always exactly $44.97 – no floating-point drift)
   - Persists to localStorage (safely – works in private mode too)
   - Renders: navbar / bottom-nav badges, menu-card steppers,
     View-Cart bar, cart drawer (cart → checkout → success)
   ===================================================================== */
(function () {
    'use strict';

    /* ---------- config ---------- */
    var STORE_KEY = 'sarab_cart_v1';
    var MAX_QTY = 20;
    var TAX_RATE = 0.08875;          // NY sales tax
    var PACKAGING_CENTS = 99;        // flat, per order
    var COUPONS = {
        SARAB15: { type: 'pct', value: 15, label: '15% off', max: 1000 },   // max $10 off
        WELCOME5: { type: 'flat', value: 500, label: '$5 off', min: 2500 }   // $5 off over $25
    };

    /* ---------- helpers ---------- */
    function toCents(v) {
        if (typeof v === 'number') return Math.round(v * 100);
        var n = parseFloat(String(v || '').replace(/[^0-9.]/g, ''));
        return isNaN(n) ? 0 : Math.round(n * 100);
    }
    function money(c) {
        var neg = c < 0; c = Math.abs(c);
        return (neg ? '-$' : '$') + (c / 100).toFixed(2);
    }
    function slug(t) { return String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }
    function esc(t) {
        return String(t).replace(/[&<>"']/g, function (ch) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
        });
    }
    function $(id) { return document.getElementById(id); }
    function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

    /* ---------- state ---------- */
    var state = load();

    function load() {
        try {
            var raw = localStorage.getItem(STORE_KEY);
            if (raw) {
                var d = JSON.parse(raw);
                if (d && Array.isArray(d.items)) return { items: d.items, coupon: d.coupon || null };
            }
        } catch (e) { /* storage unavailable */ }
        return { items: [], coupon: null };
    }
    function save() {
        try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { }
    }

    function find(id) {
        for (var i = 0; i < state.items.length; i++) if (state.items[i].id === id) return state.items[i];
        return null;
    }

    /** item: {id?, title, price, old?, img, cat} – price/old may be "$14.99" or 14.99 */
    function add(item, qty) {
        qty = Math.max(1, parseInt(qty, 10) || 1);
        var id = item.id || slug(item.title);
        var line = find(id);
        if (line) {
            line.qty = Math.min(MAX_QTY, line.qty + qty);
        } else {
            state.items.push({
                id: id,
                title: item.title,
                cat: item.cat || '',
                img: item.img || '',
                price: toCents(item.price),
                old: item.old ? toCents(item.old) : 0,
                qty: Math.min(MAX_QTY, qty)
            });
        }
        commit();
        var nb = $('navCartBtn');
        if (nb) { nb.classList.remove('bump'); void nb.offsetWidth; nb.classList.add('bump'); }
        return find(id);
    }
    function setQty(id, qty) {
        var line = find(id);
        if (!line) return;
        qty = parseInt(qty, 10) || 0;
        if (qty <= 0) state.items = state.items.filter(function (l) { return l.id !== id; });
        else line.qty = Math.min(MAX_QTY, qty);
        commit();
    }
    function inc(id) { var l = find(id); if (l) setQty(id, l.qty + 1); }
    function dec(id) { var l = find(id); if (l) setQty(id, l.qty - 1); }
    function clear() { state.items = []; state.coupon = null; commit(); }
    function qtyOf(id) { var l = find(id); return l ? l.qty : 0; }

    function totals() {
        var count = 0, items = 0, mrp = 0;
        state.items.forEach(function (l) {
            count += l.qty;
            items += l.price * l.qty;
            mrp += (l.old > l.price ? l.old : l.price) * l.qty;
        });
        var coupon = 0, cp = state.coupon && COUPONS[state.coupon];
        if (cp) {
            if (cp.min && items < cp.min) { coupon = 0; }
            else if (cp.type === 'pct') coupon = Math.min(Math.round(items * cp.value / 100), cp.max || Infinity);
            else coupon = Math.min(cp.value, items);
        }
        var taxable = items - coupon;
        var pack = count ? PACKAGING_CENTS : 0;
        var tax = count ? Math.round(taxable * TAX_RATE) : 0;
        var total = count ? taxable + pack + tax : 0;
        var deliverySaved = count ? 299 : 0;
        return {
            count: count, items: items, mrp: mrp, coupon: coupon, pack: pack, tax: tax, total: total,
            savings: (mrp - items) + coupon + deliverySaved
        };
    }

    function applyCoupon(code) {
        code = String(code || '').trim().toUpperCase();
        if (!code) return { ok: false, msg: 'Please enter a coupon code' };
        var cp = COUPONS[code];
        if (!cp) return { ok: false, msg: '“' + esc(code) + '” is not a valid coupon' };
        var t = totals();
        if (cp.min && t.items < cp.min) return { ok: false, msg: 'Add ' + money(cp.min - t.items) + ' more to use ' + code };
        state.coupon = code; commit();
        return { ok: true, msg: '<i class="fas fa-check-circle"></i> ' + code + ' applied – ' + cp.label };
    }
    function removeCoupon() { state.coupon = null; commit(); }

    /* ---------- subscribers ---------- */
    var subs = [];
    function onChange(fn) { subs.push(fn); }
    function commit() {
        // drop a coupon that no longer qualifies
        if (state.coupon) {
            var cp = COUPONS[state.coupon];
            var items = state.items.reduce(function (a, l) { return a + l.price * l.qty; }, 0);
            if (!cp || !state.items.length || (cp.min && items < cp.min)) state.coupon = null;
        }
        save();
        render();
        subs.forEach(function (fn) { try { fn(state, totals()); } catch (e) { } });
    }

    /* =================================================================
       UI
       ================================================================= */
    var drawer, ov, view = 'cart', lastFocus = null;

    function toast(html) {
        var t = $('toast'); if (!t) return;
        t.innerHTML = html;
        t.classList.add('show');
        clearTimeout(toast._t);
        toast._t = setTimeout(function () { t.classList.remove('show'); }, 2200);
    }

    function render() {
        var t = totals();

        // badges
        $$('[data-cart-count]').forEach(function (b) {
            b.textContent = t.count > 99 ? '99+' : t.count;
            b.hidden = !t.count;
        });

        // view-cart bar (mobile / tablet)
        var bar = $('vcBar');
        if (bar) {
            bar.hidden = !t.count;
            $('vcCount').textContent = t.count + (t.count === 1 ? ' item' : ' items');
            $('vcTotal').textContent = money(t.items);
            document.body.classList.toggle('has-cart', !!t.count);
        }

        // menu card steppers
        $$('.mcard').forEach(function (card) {
            var id = card.getAttribute('data-id');
            var q = qtyOf(id);
            var step = card.querySelector('.mstep');
            card.classList.toggle('incart', q > 0);
            if (step) step.querySelector('.mstep-n').textContent = q;
        });

        // deal button
        var deal = $('dealBtn');
        if (deal) {
            var dq = qtyOf(deal.getAttribute('data-id'));
            deal.innerHTML = dq
                ? '<i class="fas fa-check"></i>Deal added (' + dq + ') &middot; View Cart'
                : '<i class="fas fa-shopping-cart"></i>Grab the Deal';
        }

        renderDrawer(t);
    }

    function renderDrawer(t) {
        if (!$('cartDrawer')) return;
        t = t || totals();
        var empty = !state.items.length;

        if (empty && view !== 'done') view = 'cart';

        $('cdSub').textContent = view === 'done' ? 'Thank you for ordering'
            : (t.count + (t.count === 1 ? ' item' : ' items') + (t.count ? ' · ' + money(t.total) : ''));
        $('cdTitle').textContent = view === 'checkout' ? 'Checkout' : view === 'done' ? 'Order confirmed' : 'Your Cart';
        $('cdBack').hidden = view !== 'checkout';

        $('cdViewCart').hidden = view !== 'cart';
        $('cdViewCheckout').hidden = view !== 'checkout';
        $('cdViewDone').hidden = view !== 'done';
        $('cdEmpty').hidden = !empty;
        $('cdFilled').hidden = empty;
        $('cdFoot').hidden = empty || view === 'done';

        // items
        $('cdItems').innerHTML = state.items.map(function (l) {
            return '<li class="cd-item" data-id="' + esc(l.id) + '">' +
                '<img src="' + esc(l.img) + '" alt="" loading="lazy" width="64" height="64">' +
                '<div class="cd-iinfo"><b>' + esc(l.title) + '</b>' +
                '<small>' + money(l.price) + (l.old > l.price ? ' <s>' + money(l.old) + '</s>' : '') + ' each</small></div>' +
                '<div class="cd-iright">' +
                '<div class="qstep" role="group" aria-label="Quantity for ' + esc(l.title) + '">' +
                '<button type="button" data-act="dec" aria-label="Decrease">' + (l.qty === 1 ? '<i class="far fa-trash-alt"></i>' : '&minus;') + '</button>' +
                '<span aria-live="polite">' + l.qty + '</span>' +
                '<button type="button" data-act="inc" aria-label="Increase"' + (l.qty >= MAX_QTY ? ' disabled' : '') + '>+</button>' +
                '</div><span class="cd-ltot">' + money(l.price * l.qty) + '</span></div></li>';
        }).join('');

        // bill
        $('bItems').textContent = money(t.items);
        $('bCpRow').hidden = !t.coupon;
        $('bCpCode').textContent = state.coupon || '';
        $('bCp').textContent = money(-t.coupon);
        $('bPack').textContent = money(t.pack);
        $('bTax').textContent = money(t.tax);
        $('bTotal').textContent = money(t.total);
        $('bSave').hidden = !t.savings;
        $('bSaveAmt').textContent = money(t.savings);
        $('fTotal').textContent = money(t.total);
        $('coItems').textContent = t.count + (t.count === 1 ? ' item' : ' items');
        $('coSubtotal').textContent = money(t.items - t.coupon);
        $('coTotal').textContent = money(t.total);

        // coupon box
        var msg = $('cpMsg'), inp = $('cpInput'), btn = $('cpApply');
        if (state.coupon) {
            inp.value = state.coupon; inp.disabled = true;
            btn.textContent = 'Remove'; btn.dataset.mode = 'remove';
            msg.className = 'cd-cmsg ok';
            msg.innerHTML = '<i class="fas fa-check-circle"></i> ' + state.coupon + ' applied – you save ' + money(t.coupon);
        } else if (btn.dataset.mode === 'remove') {
            inp.disabled = false; inp.value = '';
            btn.textContent = 'Apply'; btn.dataset.mode = '';
            msg.className = 'cd-cmsg';
            msg.innerHTML = 'Try <b>SARAB15</b> for 15% off your order';
        }

        $('cdCta').innerHTML = view === 'checkout'
            ? 'Place Order <i class="fas fa-lock"></i>'
            : 'Checkout <i class="fas fa-arrow-right"></i>';
    }

    function setView(v) {
        view = v;
        renderDrawer();
        $('cdBody').scrollTop = 0;
    }

    function openCart() {
        if (!drawer) return;
        lastFocus = document.activeElement;
        if (view === 'done') view = 'cart';
        renderDrawer();
        ov.hidden = false;
        // next frame → transition
        requestAnimationFrame(function () {
            ov.classList.add('show');
            drawer.classList.add('open');
        });
        drawer.setAttribute('aria-hidden', 'false');
        document.body.classList.add('cart-open');
        setTimeout(function () { $('cartClose').focus({ preventScroll: true }); }, 60);
    }
    function closeCart() {
        if (!drawer || !drawer.classList.contains('open')) return;
        drawer.classList.remove('open');
        ov.classList.remove('show');
        drawer.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('cart-open');
        setTimeout(function () { ov.hidden = true; if (view === 'done') setView('cart'); }, 300);
        if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }

    /* ---------- checkout ---------- */
    function validateField(el) {
        var v = (el.value || '').trim(), ok = true;
        if (el.required && !v) ok = false;
        else if (el.type === 'tel' && v && v.replace(/\D/g, '').length < 7) ok = false;
        else if (el.name === 'address' && v && v.length < 8) ok = false;
        el.classList.toggle('is-bad', !ok);
        el.setAttribute('aria-invalid', ok ? 'false' : 'true');
        return ok;
    }
    function placeOrder() {
        var form = $('cdViewCheckout');
        var fields = $$('.fctrl', form);
        var bad = fields.filter(function (f) { return !validateField(f); });
        if (bad.length) {
            bad[0].focus();
            toast('<i class="fas fa-exclamation-circle"></i> Please complete your delivery details');
            return;
        }
        var btn = $('cdCta'), t = totals();
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Placing order…';
        setTimeout(function () {
            var pay = (form.querySelector('input[name="pay"]:checked') || {}).value || 'Cash on delivery';
            $('doId').textContent = '#SRB' + String(Date.now()).slice(-6);
            $('doPay').textContent = pay;
            $('doTotal').textContent = money(t.total);
            btn.disabled = false;
            form.reset();
            fields.forEach(function (f) { f.classList.remove('is-bad'); });
            view = 'done';
            clear();             // re-renders the drawer in the "done" view
            setView('done');
        }, 1100);
    }

    /* ---------- menu cards ---------- */
    function cardItem(card) {
        return {
            id: card.getAttribute('data-id'),
            title: card.getAttribute('data-title'),
            cat: card.getAttribute('data-cat'),
            price: card.getAttribute('data-price'),
            old: card.getAttribute('data-old'),
            img: card.getAttribute('data-img')
        };
    }
    function enhanceCards() {
        $$('.mcard').forEach(function (card) {
            if (!card.getAttribute('data-id')) card.setAttribute('data-id', slug(card.getAttribute('data-title')));
            var buy = card.querySelector('.mbuy');
            if (!buy || buy.querySelector('.mstep')) return;
            var add = buy.querySelector('.madd');
            if (add) { add.setAttribute('aria-label', 'Add ' + card.getAttribute('data-title') + ' to cart'); add.title = 'Add to cart'; }
            var st = document.createElement('div');
            st.className = 'mstep';
            st.innerHTML = '<button type="button" data-act="dec" aria-label="Decrease">&minus;</button>' +
                '<span class="mstep-n">0</span>' +
                '<button type="button" data-act="inc" aria-label="Increase">+</button>';
            buy.appendChild(st);
            st.addEventListener('click', function (e) {
                e.stopPropagation();
                var b = e.target.closest('button'); if (!b) return;
                var id = card.getAttribute('data-id');
                if (b.dataset.act === 'inc') {
                    if (qtyOf(id) >= MAX_QTY) return toast('Maximum ' + MAX_QTY + ' per item');
                    inc(id);
                } else dec(id);
            });
        });
    }

    /* ---------- init ---------- */
    function init() {
        drawer = $('cartDrawer');
        ov = $('cartOv');
        enhanceCards();

        // open / close
        document.addEventListener('click', function (e) {
            var o = e.target.closest('[data-open-cart]');
            if (o) { e.preventDefault(); openCart(); return; }
            var c = e.target.closest('[data-close-cart]');
            if (c) { closeCart(); }
        });
        if (ov) ov.addEventListener('click', closeCart);
        $('cartClose') && $('cartClose').addEventListener('click', closeCart);
        $('cdBack') && $('cdBack').addEventListener('click', function () { setView('cart'); });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeCart();
            // keep focus inside the drawer while open
            if (e.key === 'Tab' && drawer && drawer.classList.contains('open')) {
                var f = $$('button:not([disabled]):not([hidden]), a[href], input:not([disabled]), textarea, select', drawer)
                    .filter(function (el) { return el.offsetParent !== null; });
                if (!f.length) return;
                var first = f[0], last = f[f.length - 1];
                if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        });

        // drawer item steppers
        $('cdItems') && $('cdItems').addEventListener('click', function (e) {
            var b = e.target.closest('button'); if (!b) return;
            var id = b.closest('.cd-item').getAttribute('data-id');
            if (b.dataset.act === 'inc') inc(id); else dec(id);
        });
        $('cdClear') && $('cdClear').addEventListener('click', function () {
            clear(); toast('Cart cleared');
        });

        // coupons
        function doCoupon() {
            var btn = $('cpApply');
            if (btn.dataset.mode === 'remove') { removeCoupon(); return; }
            var r = applyCoupon($('cpInput').value);
            if (!r.ok) { var m = $('cpMsg'); m.className = 'cd-cmsg bad'; m.innerHTML = r.msg; }
            else toast(r.msg);
        }
        $('cpApply') && $('cpApply').addEventListener('click', doCoupon);
        $('cpInput') && $('cpInput').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); doCoupon(); } });

        // CTA
        $('cdCta') && $('cdCta').addEventListener('click', function () {
            if (view === 'cart') setView('checkout');
            else if (view === 'checkout') placeOrder();
        });
        $('cdViewCheckout') && $('cdViewCheckout').addEventListener('submit', function (e) { e.preventDefault(); placeOrder(); });
        $$('#cdViewCheckout .fctrl').forEach(function (f) {
            f.addEventListener('blur', function () { if (f.value) validateField(f); });
            f.addEventListener('input', function () { if (f.classList.contains('is-bad')) validateField(f); });
        });

        // special-offer deal
        var deal = $('dealBtn');
        deal && deal.addEventListener('click', function () {
            var id = deal.getAttribute('data-id');
            if (qtyOf(id)) { openCart(); return; }
            add({
                id: id, title: deal.getAttribute('data-title'), cat: deal.getAttribute('data-cat'),
                price: deal.getAttribute('data-price'), old: deal.getAttribute('data-old'), img: deal.getAttribute('data-img')
            }, 1);
            toast('<i class="fas fa-check-circle"></i> Signature Burger Meal added');
        });

        // keep tabs in sync
        window.addEventListener('storage', function (e) {
            if (e.key === STORE_KEY) { state = load(); render(); }
        });

        render();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    /* ---------- public API (used by main.js) ---------- */
    window.SarabCart = {
        add: add, setQty: setQty, inc: inc, dec: dec, clear: clear, qtyOf: qtyOf,
        totals: totals, open: openCart, close: closeCart, toast: toast, onChange: onChange,
        money: money, toCents: toCents, cardItem: cardItem, MAX_QTY: MAX_QTY
    };
})();
