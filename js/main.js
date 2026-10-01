AOS.init({
    duration: 680,
    once: true,
    offset: 55
});

/* NAVBAR SCROLL & ACTIVE LINK  */
window.addEventListener('scroll', function() {
    document.getElementById('nav').classList.toggle('scrolled', window.scrollY > 60);
    document.getElementById('btt').classList.toggle('show', window.scrollY > 300);
    document.querySelectorAll('section[id]').forEach(function(sec) {
        var top = sec.offsetTop - 110,
            bot = top + sec.offsetHeight;
        if (window.scrollY >= top && window.scrollY < bot) {
            document.querySelectorAll('.nav-link').forEach(function(l) {
                l.classList.remove('active');
            });
            var lnk = document.querySelector('.nav-link[href="#' + sec.id + '"]');
            if (lnk) lnk.classList.add('active');
        }
    });
});

/*  SMOOTH SCROLL + MOBILE NAV CLOSE  */
document.querySelectorAll('a[href^="#"]').forEach(function(a) {
    a.addEventListener('click', function(e) {
        var href = this.getAttribute('href');
        if (href === '#') return;
        var t = document.querySelector(href);
        if (t) {
            e.preventDefault();
            // Close Bootstrap mobile navbar if open
            var navCollapse = document.getElementById('navmenu');
            if (navCollapse && navCollapse.classList.contains('show')) {
                var bsCollapse = bootstrap.Collapse.getInstance(navCollapse);
                if (bsCollapse) {
                    bsCollapse.hide();
                } else {
                    navCollapse.classList.remove('show');
                }
            }
            // Scroll after slight delay to let navbar close
            setTimeout(function() {
                window.scrollTo({
                    top: t.offsetTop - 78,
                    behavior: 'smooth'
                });
            }, 50);
        }
    });
});


var searchOv = document.getElementById('searchOv');

document.getElementById('navSearchBtn').addEventListener('click', function() {
    searchOv.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(function() {
        document.getElementById('searchInput').focus();
    }, 220);
});

document.getElementById('searchClose').addEventListener('click', closeSearch);

// Close when clicking backdrop
searchOv.addEventListener('click', function(e) {
    if (e.target === searchOv) closeSearch();
});

function closeSearch() {
    searchOv.classList.remove('open');
    document.body.style.overflow = '';
}

// Category buttons inside search box
document.querySelectorAll('.sovcat').forEach(function(btn) {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.sovcat').forEach(function(b) {
            b.classList.remove('active');
        });
        this.classList.add('active');
        var f = this.getAttribute('data-cat');
        closeSearch();
        setTimeout(function() {
            filterMenu(f);
            document.getElementById('menu').scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }, 300);
    });
});

// Live search over the menu cards
var searchInput = document.getElementById('searchInput');
var sovRes = document.getElementById('sovRes');

function runSearch() {
    var q = searchInput.value.trim().toLowerCase();
    if (!q) { sovRes.innerHTML = ''; sovRes.classList.remove('show'); return; }
    var words = q.split(/\s+/).filter(function(w) { return w.length > 2; });
    if (!words.length) words = [q];
    var hits = Array.prototype.filter.call(document.querySelectorAll('.mcard'), function(c) {
        var hay = (c.getAttribute('data-title') + ' ' + c.getAttribute('data-cat') + ' ' + c.getAttribute('data-desc')).toLowerCase();
        if (hay.indexOf(q) > -1) return true;
        return words.some(function(w) { return hay.indexOf(w.replace(/s$/, '')) > -1; });
    });
    sovRes.classList.add('show');
    if (!hits.length) {
        sovRes.innerHTML = '<div class="sovnone"><i class="fas fa-search"></i> No dishes match "' +
            q.replace(/[<>&"]/g, '') + '". Try burger, pizza or chicken.</div>';
        return;
    }
    sovRes.innerHTML = hits.map(function(c) {
        return '<div class="sovhit" data-id="' + c.getAttribute('data-id') + '">' +
            '<img src="' + c.getAttribute('data-img') + '" alt="">' +
            '<div class="sovhit-t"><b>' + c.getAttribute('data-title') + '</b><small>' + c.getAttribute('data-cat') + '</small></div>' +
            '<span class="sovhit-p">' + c.getAttribute('data-price') + '</span>' +
            '<button type="button" class="sovadd" aria-label="Add to cart"><i class="fas fa-plus"></i></button></div>';
    }).join('');
}
searchInput.addEventListener('input', runSearch);
searchInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { var f = sovRes.querySelector('.sovhit'); if (f) f.click(); }
});
document.getElementById('searchGo').addEventListener('click', runSearch);
sovRes.addEventListener('click', function(e) {
    var hit = e.target.closest('.sovhit'); if (!hit) return;
    var card = document.querySelector('.mcard[data-id="' + hit.getAttribute('data-id') + '"]');
    if (!card) return;
    if (e.target.closest('.sovadd')) {
        window.SarabCart.add(window.SarabCart.cardItem(card), 1);
        window.SarabCart.toast('<i class="fas fa-check-circle"></i> ' + card.getAttribute('data-title') + ' added');
        return;
    }
    closeSearch();
    setTimeout(function() { openMenuPop(card); }, 250);
});

// Trending tags fill the search input
document.querySelectorAll('.sovtrend .ttag').forEach(function(t) {
    t.addEventListener('click', function() {
        searchInput.value = this.textContent.trim();
        runSearch();
        searchInput.focus();
    });
});


$(document).ready(function() {
	$('.magnific_popup').magnificPopup({
	  disableOn: 700,
	  type: 'iframe',
	  mainClass: 'mfp-fade',
	  removalDelay: 160,
	  preloader: false,
	  fixedContentPos: false,
	  disableOn: 300
	});	
});


function filterMenu(cat) {
    // sync filter buttons
    document.querySelectorAll('.filtbtn').forEach(function(b) {
        b.classList.toggle('active', b.getAttribute('data-f') === cat);
    });
    // sync category cards
    document.querySelectorAll('.catcard').forEach(function(c) {
        c.classList.toggle('active', c.getAttribute('data-filter') === cat);
    });
    // show/hide menu cards
    document.querySelectorAll('.mwrap').forEach(function(w) {
        var c = w.getAttribute('data-c');
        if (cat === 'all' || c === cat) {
            w.classList.remove('gone');
            w.style.opacity = '0';
            w.style.transform = 'translateY(16px)';
            setTimeout(function() {
                w.style.transition = 'opacity .38s,transform .38s';
                w.style.opacity = '1';
                w.style.transform = 'translateY(0)';
            }, 60);
        } else {
            w.classList.add('gone');
        }
    });
}

// Filter buttons
document.querySelectorAll('.filtbtn').forEach(function(btn) {
    btn.addEventListener('click', function() {
        filterMenu(this.getAttribute('data-f'));
    });
});

// Category section cards -> scroll + filter
document.querySelectorAll('.catcard').forEach(function(card) {
    card.addEventListener('click', function() {
        var f = this.getAttribute('data-filter');
        window.scrollTo({
            top: document.getElementById('menu').offsetTop - 80,
            behavior: 'smooth'
        });
        setTimeout(function() {
            filterMenu(f);
        }, 480);
    });
});


var menuPop = document.getElementById('menuPop');
var mpQty = 1;
var mpCard = null;           // card currently shown in the popup
var mpUnitCents = 0;         // unit price of that card, in cents

function starHTML(rating) {
    var full = Math.floor(rating), half = rating - full >= 0.5 ? 1 : 0, empty = 5 - full - half;
    return '<i class="fas fa-star"></i>'.repeat(full) +
        (half ? '<i class="fas fa-star-half-alt"></i>' : '') +
        '<i class="far fa-star"></i>'.repeat(empty);
}

function updatePopTotal() {
    var C = window.SarabCart;
    document.getElementById('mpQnum').textContent = mpQty;
    document.getElementById('mpMinus').disabled = mpQty <= 1;
    document.getElementById('mpPlus').disabled = mpQty >= C.MAX_QTY;
    document.getElementById('mpTotal').textContent = C.money(mpUnitCents * mpQty);
    document.getElementById('mpUnit').textContent = mpQty > 1 ? C.money(mpUnitCents) + ' each' : 'portion';
}

function openMenuPop(card) {
    mpCard = card;
    var img = card.getAttribute('data-img');
    var title = card.getAttribute('data-title');
    var cat = card.getAttribute('data-cat');
    var price = card.getAttribute('data-price');
    var old = card.getAttribute('data-old');
    var rating = parseFloat(card.getAttribute('data-rating'));
    var reviews = card.getAttribute('data-reviews');
    var cal = card.getAttribute('data-cal');
    var time = card.getAttribute('data-time');
    var desc = card.getAttribute('data-desc');
    var tags = card.getAttribute('data-tags') || '';

    document.getElementById('mpImg').setAttribute('src', img);
    document.getElementById('mpImg').setAttribute('alt', title);
    document.getElementById('mpCat').textContent = cat;
    document.getElementById('mpTitle').textContent = title;
    document.getElementById('mpStars').innerHTML = starHTML(rating) +
        ' <span class="mpsrev">' + rating + ' (' + reviews + ' reviews)</span>';
    document.getElementById('mpDesc').textContent = desc;
    document.getElementById('mpPrice').innerHTML = price + (old ? '<small>' + old + '</small>' : '');
    document.getElementById('mpMeta').innerHTML =
        '<div class="mpm"><div class="mpmv">' + cal + ' kcal</div><div class="mpml">Calories</div></div>' +
        '<div class="mpm"><div class="mpmv">' + time + ' min</div><div class="mpml">Prep Time</div></div>' +
        '<div class="mpm"><div class="mpmv">' + rating + '/5</div><div class="mpml">Rating</div></div>';
    document.getElementById('mpTags').innerHTML =
        tags.split(',').filter(Boolean).map(function(t) {
            return '<span class="mptag">' + t.trim() + '</span>';
        }).join('');

    mpUnitCents = window.SarabCart.toCents(price);
    mpQty = 1;
    updatePopTotal();
    var inCart = window.SarabCart.qtyOf(card.getAttribute('data-id'));
    document.getElementById('mpAddCart').querySelector('span').innerHTML =
        '<i class="fas fa-shopping-cart"></i> ' + (inCart ? 'Add more (' + inCart + ' in cart)' : 'Add to Cart');
    document.getElementById('mpAddCart').classList.remove('done');

    menuPop.classList.add('open');
    document.body.style.overflow = 'hidden';
}

// Card click → details popup
document.querySelectorAll('.mcard').forEach(function(card) {
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.addEventListener('click', function() { openMenuPop(this); });
    card.addEventListener('keydown', function(e) {
        if ((e.key === 'Enter' || e.key === ' ') && e.target === this) { e.preventDefault(); openMenuPop(this); }
    });
});

// "+" on a card → add straight to cart (like Swiggy / Zomato "ADD")
document.querySelectorAll('.madd').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var card = this.closest('.mcard');
        window.SarabCart.add(window.SarabCart.cardItem(card), 1);
        window.SarabCart.toast('<i class="fas fa-check-circle"></i> ' + card.getAttribute('data-title') + ' added');
    });
});

// Close popup
document.getElementById('mpClose').addEventListener('click', closeMenuPop);
menuPop.addEventListener('click', function(e) {
    if (e.target === this) closeMenuPop();
});

function closeMenuPop() {
    menuPop.classList.remove('open');
    document.body.style.overflow = '';
}

// Qty +/- (price follows quantity)
document.getElementById('mpPlus').addEventListener('click', function() {
    if (mpQty < window.SarabCart.MAX_QTY) { mpQty++; updatePopTotal(); }
});
document.getElementById('mpMinus').addEventListener('click', function() {
    if (mpQty > 1) { mpQty--; updatePopTotal(); }
});

// Add to cart
document.getElementById('mpAddCart').addEventListener('click', function() {
    if (!mpCard || this.classList.contains('done')) return;
    var C = window.SarabCart;
    C.add(C.cardItem(mpCard), mpQty);
    this.classList.add('done');
    this.querySelector('span').innerHTML = '<i class="fas fa-check"></i> Added to Cart';
    C.toast('<i class="fas fa-check-circle"></i> ' + mpQty + ' × ' + mpCard.getAttribute('data-title') + ' added');
    setTimeout(closeMenuPop, 650);
});


/* ---------- FORM VALIDATION (reservation + contact) ---------- */
function validateCard(card) {
    var ok = true, first = null;
    card.querySelectorAll('.fctrl').forEach(function(el) {
        var v = (el.value || '').trim(), good = true;
        if (el.required && !v) good = false;
        else if (v && el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) good = false;
        else if (v && el.type === 'tel' && v.replace(/\D/g, '').length < 7) good = false;
        else if (v && el.minLength > 0 && v.length < el.minLength) good = false;
        else if (v && el.type === 'date') {
            var today = new Date(); today.setHours(0, 0, 0, 0);
            if (new Date(v + 'T00:00:00') < today) good = false;
        }
        el.classList.toggle('is-bad', !good);
        el.setAttribute('aria-invalid', good ? 'false' : 'true');
        if (!good) { ok = false; first = first || el; }
    });
    if (first) first.focus();
    return ok;
}
document.querySelectorAll('.fcard .fctrl').forEach(function(el) {
    el.addEventListener('input', function() { if (el.classList.contains('is-bad')) el.classList.remove('is-bad'); });
});
(function() {
    var d = document.getElementById('resDate');
    if (d) {
        var t = new Date(), m = String(t.getMonth() + 1).padStart(2, '0'), dd = String(t.getDate()).padStart(2, '0');
        d.min = t.getFullYear() + '-' + m + '-' + dd;
    }
})();
function resetCard(card) {
    card.querySelectorAll('input.fctrl, textarea.fctrl').forEach(function(el) { el.value = ''; });
    card.querySelectorAll('select.fctrl').forEach(function(el) { el.selectedIndex = 0; });
}

document.getElementById('resBtn').addEventListener('click', function() {
    var btn = this, card = btn.closest('.fcard');
    document.getElementById('resOk').style.display = 'none';
    if (!validateCard(card)) { window.SarabCart.toast('<i class="fas fa-exclamation-circle"></i> Please fill the highlighted fields'); return; }
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Booking...';
    btn.disabled = true;
    setTimeout(function() {
        btn.innerHTML = '<i class="fas fa-calendar-check"></i> Confirm Reservation';
        btn.disabled = false;
        resetCard(card);
        var ok = document.getElementById('resOk');
        ok.style.display = 'block';
        ok.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
        });
    }, 1500);
});


document.getElementById('ctcBtn').addEventListener('click', function() {
    var btn = this, card = btn.closest('.fcard');
    document.getElementById('ctcOk').style.display = 'none';
    if (!validateCard(card)) { window.SarabCart.toast('<i class="fas fa-exclamation-circle"></i> Please fill the highlighted fields'); return; }
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    btn.disabled = true;
    setTimeout(function() {
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
        btn.disabled = false;
        resetCard(card);
        var ok = document.getElementById('ctcOk');
        ok.style.display = 'block';
        ok.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
        });
    }, 1500);
});


var galPop = document.getElementById('galPop');
var galData = [];
var galIdx = 0;

document.querySelectorAll('.gitem').forEach(function(item) {
    galData.push({
        img: item.getAttribute('data-gimg'),
        title: item.getAttribute('data-gtitle'),
        desc: item.getAttribute('data-gdesc')
    });
    item.addEventListener('click', function() {
        openGal(parseInt(this.getAttribute('data-gi')));
    });
});

function openGal(i) {
    galIdx = i;
    var g = galData[i];
    document.getElementById('gpImg').setAttribute('src', g.img);
    document.getElementById('gpTitle').textContent = g.title;
    document.getElementById('gpDesc').innerHTML = g.desc;
    galPop.classList.add('open');
    document.body.style.overflow = 'hidden';
}

document.getElementById('gpClose').addEventListener('click', closeGal);
galPop.addEventListener('click', function(e) {
    if (e.target === this) closeGal();
});

function closeGal() {
    galPop.classList.remove('open');
    document.body.style.overflow = '';
}

document.getElementById('gpPrev').addEventListener('click', function() {
    openGal((galIdx - 1 + galData.length) % galData.length);
});
document.getElementById('gpNext').addEventListener('click', function() {
    openGal((galIdx + 1) % galData.length);
});

/*  ESC key closes everything */
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeSearch();
        closeMenuPop();
        closeGal();
        if (typeof $.magnificPopup !== 'undefined') $.magnificPopup.close();
    }
});


new Swiper('.tesSwiper', {
    slidesPerView: 1,
    spaceBetween: 22,
    loop: true,
    autoplay: {
        delay: 4000,
        disableOnInteraction: false
    },
    pagination: {
        el: '.swiper-pagination',
        clickable: true
    },
    breakpoints: {
        640: {
            slidesPerView: 2
        },
        1024: {
            slidesPerView: 3
        }
    }
});


var cH = 8,
    cM = 45,
    cS = 30;
setInterval(function() {
    cS--;
    if (cS < 0) {
        cS = 59;
        cM--;
    }
    if (cM < 0) {
        cM = 59;
        cH--;
    }
    if (cH < 0) {
        cH = 8;
        cM = 45;
        cS = 30;
    }
    document.getElementById('cdH').textContent = String(cH).padStart(2, '0');
    document.getElementById('cdM').textContent = String(cM).padStart(2, '0');
    document.getElementById('cdS').textContent = String(cS).padStart(2, '0');
}, 1000);

/* NEWSLETTER */
document.getElementById('nlBtn').addEventListener('click', function() {
    var inp = document.getElementById('nlEmail');
    var email = inp.value.trim();
    var btn = this;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        inp.classList.add('is-bad');
        inp.focus();
        window.SarabCart.toast('<i class="fas fa-exclamation-circle"></i> Please enter a valid email');
        return;
    }
    inp.classList.remove('is-bad');
    btn.innerHTML = '<i class="fas fa-check me-1"></i>Subscribed!';
    btn.style.background = '#4ade80';
    btn.style.color = '#222';
    inp.value = '';
    window.SarabCart.toast('<i class="fas fa-gift"></i> Use code <b>SARAB15</b> for 15% off');
    setTimeout(function() {
        btn.innerHTML = '<i class="fas fa-paper-plane me-1"></i>Subscribe';
        btn.style.background = '';
        btn.style.color = '';
    }, 3000);
});
document.getElementById('nlEmail').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') document.getElementById('nlBtn').click();
});

/*  NUMBER COUNTER ANIMATION*/
var numAnimated = false;
window.addEventListener('scroll', function() {
    var hero = document.getElementById('hero');
    if (!numAnimated && hero && window.scrollY > hero.offsetHeight - 300) {
        numAnimated = true;
        document.querySelectorAll('.snum').forEach(function(el) {
            var txt = el.textContent;
            var num = parseInt(txt);
            var suf = txt.replace(/[0-9]/g, '');
            if (isNaN(num)) return;
            var start = 0;
            var step = Math.ceil(num / 55);
            var iv = setInterval(function() {
                start += step;
                if (start >= num) {
                    start = num;
                    clearInterval(iv);
                }
                el.textContent = start + suf;
            }, 1400 / 55);
        });
    }
});