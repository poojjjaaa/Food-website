new Swiper('.blogSwiper',{slidesPerView:1.12,spaceBetween:12,pagination:{el:'.blog-pg',clickable:true},autoplay:{delay:4500,disableOnInteraction:true},breakpoints:{640:{slidesPerView:2,spaceBetween:16},992:{slidesPerView:3,spaceBetween:22}}});
document.querySelectorAll('.bnav a:not([data-open-cart])').forEach(a=>a.addEventListener('click',()=>{document.querySelectorAll('.bnav a').forEach(x=>x.classList.toggle('on',x===a))}));

(function(){var s=document.querySelectorAll('.hslide'),d=document.querySelectorAll('.hb-dots i'),n=0,t;
function go(i){n=(i+s.length)%s.length;s.forEach((x,k)=>x.classList.toggle('on',k===n));d.forEach((x,k)=>x.classList.toggle('on',k===n))}
function start(){clearInterval(t);t=setInterval(()=>go(n+1),4500)}
d.forEach(x=>x.addEventListener('click',()=>{go(+x.dataset.i);start()}));
var b=document.getElementById('hbanner'),x0=0;
b.addEventListener('touchstart',e=>{x0=e.touches[0].clientX},{passive:true});
b.addEventListener('touchend',e=>{var dx=e.changedTouches[0].clientX-x0;if(Math.abs(dx)>40){go(n+(dx<0?1:-1));start()}});
start()})();
