
document.addEventListener('DOMContentLoaded', () => {
    const STORAGE_KEY = 'venueCart';
 
    const viewport = document.getElementById('viewport');
    const world = document.getElementById('world');
    const seatsLayer = document.getElementById('seats-layer');
    const tooltip = document.getElementById('tooltip');
    const mapCard = document.querySelector('.map-card');
    const zoneLegend = document.getElementById('zone-legend');
 
    const dSeat = document.getElementById('d-seat');
    const dSection = document.getElementById('d-section');
    const dPrice = document.getElementById('d-price');
    const dStatus = document.getElementById('d-status');
    const addBtn = document.getElementById('add-to-cart-btn');
 
    const cartList = document.getElementById('cart-list');
    const cartCount = document.getElementById('cart-count');
    const totalAmount = document.getElementById('total-amount');
    const checkoutBtn = document.getElementById('checkout-btn');
    const statusMsg = document.getElementById('status-msg');
 
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const zoomResetBtn = document.getElementById('zoom-reset');
    const moveUpBtn = document.getElementById('move-up');
    const moveDownBtn = document.getElementById('move-down');
    const moveLeftBtn = document.getElementById('move-left');
    const moveRightBtn = document.getElementById('move-right');
 
    const WORLD_W = 800;          
    const WORLD_H = 560;
    const CENTER_X = 400;         
    const CENTER_Y = 480;
    const SEAT_SIZE = 14;
    const SEAT_SPACING = 17;      
 
    
    const ZONES = {
    standard: {
        name: 'Standard',
        price: 55,
        color: '#AAB4C4'
    },
    premium: {
        name: 'Premium',
        price: 85,
        color: '#6689D9'
    },
    vip: {
        name: 'VIP',
        price: 120,
        color: '#7665A8'
    }
};
 
    
const ROWS = [
    { label: 'A', zone: 'vip' },
    { label: 'B', zone: 'vip' },
    { label: 'C', zone: 'vip' },
    { label: 'D', zone: 'premium' },
    { label: 'E', zone: 'premium' },
    { label: 'F', zone: 'premium' },
    { label: 'G', zone: 'standard' },
    { label: 'H', zone: 'standard' },
    { label: 'I', zone: 'standard' }
];

 
    const FIRST_RADIUS = 125;     
    const ROW_GAP = 26;           
    const FIRST_END_ANGLE = 72;   
    const END_ANGLE_STEP = 1;     // each next row is slightly narrower
 
    // seats are unavailable after every refresh and saved carts stay valid.
    function isSold(rowIndex, number) {
        return ((rowIndex * 131 + number * 197 + 17) % 97) < 9;
    }
 
    const seats = [];       
    const seatsById = {};   
    const seatEls = {};     
 
    const STATUS_TEXT = {
        'available': 'Available',
        'in-cart': 'In your cart',
        'unavailable': 'Unavailable'
    };
 
    // ---------- STATE ----------
    let cart = [];            
    let inspectedId = null;   
    let dragMoved = false;    
 
    const toRad = deg => deg * Math.PI / 180;
    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
    const round2 = v => Math.round(v * 100) / 100;
    const seatLabel = seat => `Row ${seat.row}, Seat ${seat.number}`;
 
    function seatStatus(seat) {
        if (seat.unavailable) return 'unavailable';
        if (cart.includes(seat.id)) return 'in-cart';
        return 'available';
    }
 
    function buildSeatData() {
        ROWS.forEach((rowCfg, rowIndex) => {
            const zone = ZONES[rowCfg.zone];
            const radius = FIRST_RADIUS + rowIndex * ROW_GAP;
            const endAngle = FIRST_END_ANGLE - rowIndex * END_ANGLE_STEP;
            const arcLength = 2 * toRad(endAngle) * radius;
            const count = Math.round(arcLength / SEAT_SPACING) + 1;
            const step = (2 * endAngle) / (count - 1);
 
            for (let i = 0; i < count; i++) {
                const angle = -endAngle + i * step;
                const number = i + 1;
                const id = `${rowCfg.label}-${number}`;
 
                const seat = {
                    id,
                    row: rowCfg.label,
                    number,
                    zoneKey: rowCfg.zone,
                    zoneName: zone.name,
                    price: zone.price,
                    x: round2(CENTER_X + radius * Math.sin(toRad(angle))),
                    y: round2(CENTER_Y - radius * Math.cos(toRad(angle))),
                    angle: round2(angle),
                    unavailable: isSold(rowIndex, number)
                };
                seats.push(seat);
                seatsById[id] = seat;
            }
        });
    }
 
    function createSeatButton(seat) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'seat';
        btn.dataset.id = seat.id;
        btn.style.left = `${seat.x - SEAT_SIZE / 2}px`;
        btn.style.top = `${seat.y - SEAT_SIZE / 2}px`;
        btn.style.setProperty('--seat', ZONES[seat.zoneKey].color);
        btn.style.setProperty('--rot', `${seat.angle}deg`);
 
        btn.addEventListener('mouseenter', (e) => showTooltip(e, seat));
        btn.addEventListener('mousemove', moveTooltip);
        btn.addEventListener('mouseleave', hideTooltip);
 
        btn.addEventListener('click', () => {
            if (dragMoved) return;   // it was a drag, not a click
            inspectSeat(seat.id);
        });
        return btn;
    }
 
    function renderSeats() {
        const fragment = document.createDocumentFragment();
        seats.forEach(seat => {
            const btn = createSeatButton(seat);
            seatEls[seat.id] = btn;
            fragment.appendChild(btn);
        });
        seatsLayer.appendChild(fragment);
    }
 
    function renderZoneLegend() {
        zoneLegend.innerHTML = Object.values(ZONES)
            .sort((a, b) => b.price - a.price)
            .map(z => `<div class="zone-item"><span class="dot" style="background:${z.color}"></span>${z.name} &mdash; ${z.price} AZN</div>`)
            .join('');
    }
 
    function showTooltip(e, seat) {
        tooltip.style.display = 'block';
        tooltip.innerHTML = `${seatLabel(seat)} &middot; ${seat.zoneName} &middot; <strong>${seat.price} AZN</strong>`;
        moveTooltip(e);
    }
 
    function moveTooltip(e) {
        const rect = mapCard.getBoundingClientRect();
        tooltip.style.left = `${e.clientX - rect.left + 12}px`;
        tooltip.style.top = `${e.clientY - rect.top - 38}px`;
    }
 
    function hideTooltip() {
        tooltip.style.display = 'none';
    }
 
    function updateSeatStates() {
        const inCart = new Set(cart);
        seats.forEach(seat => {
            const el = seatEls[seat.id];
            const status = seatStatus(seat);
            el.classList.toggle('unavailable', seat.unavailable);
            el.classList.toggle('in-cart', inCart.has(seat.id));
            el.classList.toggle('inspected', seat.id === inspectedId);
            el.setAttribute('aria-disabled', seat.unavailable ? 'true' : 'false');
            if (seat.id === inspectedId) {
                el.setAttribute('aria-current', 'true');
            } else {
                el.removeAttribute('aria-current');
            }
            el.setAttribute(
                'aria-label',
                `${seatLabel(seat)}, ${seat.zoneName}, ${seat.price} AZN, ${STATUS_TEXT[status]}`
            );
        });
    }
 
    // ---------- INSPECTOR ----------
    function inspectSeat(id) {
        inspectedId = id;
        showStatus('');
        render();
    }
 
    function renderInspector() {
        const seat = inspectedId ? seatsById[inspectedId] : null;
 
        if (!seat) {
            dSeat.textContent = '\u2014';
            dSection.textContent = '\u2014';
            dPrice.textContent = '\u2014';
            dStatus.textContent = '\u2014';
            addBtn.disabled = true;
            addBtn.textContent = 'Add to Cart';
            return;
        }
 
        const status = seatStatus(seat);
        dSeat.textContent = seatLabel(seat);
        dSection.textContent = seat.zoneName;
        dPrice.textContent = `${seat.price} AZN`;
        dStatus.innerHTML = `<span class="badge ${status}">${STATUS_TEXT[status]}</span>`;
 
        if (status === 'available') {
            addBtn.disabled = false;
            addBtn.textContent = 'Add to Cart';
        } else if (status === 'in-cart') {
            addBtn.disabled = true;
            addBtn.textContent = 'Already in cart';
        } else {
            addBtn.disabled = true;
            addBtn.textContent = 'Unavailable';
        }
    }
 
    // ---------- CART ----------
    function addToCart(id) {
    const seat = seatsById[id];
    if (!seat) return;

    if (seat.unavailable) {
        showStatus('This seat is unavailable.', true);
        return;
    }

    if (cart.includes(id)) {
        showStatus('This seat is already in your cart.', true);
        return;
    }

    cart.push(id);
    showStatus('');
    render();
}
 
    function removeFromCart(id) {
    cart = cart.filter(item => item !== id);
    showStatus('');
    render();
}
 
    function renderCart() {
        cartList.innerHTML = '';
 
        if (cart.length === 0) {
            const li = document.createElement('li');
            li.className = 'cart-empty';
            li.textContent = 'No tickets yet. Click a seat, then press Add to Cart.';
            cartList.appendChild(li);
        }
 
        let total = 0;
        cart.forEach(id => {
            const seat = seatsById[id];
            total += seat.price;
 
            const li = document.createElement('li');
            li.className = 'cart-item';
            li.innerHTML = `
                <div class="cart-info">
                    <strong>${seatLabel(seat)}</strong>
                    <span>${seat.zoneName}</span>
                </div>
                <span class="cart-price">${seat.price} AZN</span>
            `;
 
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'remove-btn';
            removeBtn.title = 'Remove from cart';
            removeBtn.setAttribute('aria-label', `Remove ${seatLabel(seat)} from cart`);
            removeBtn.innerHTML = '&times;';
            removeBtn.addEventListener('click', () => removeFromCart(id));
 
            li.appendChild(removeBtn);
            cartList.appendChild(li);
        });
 
        cartCount.textContent = cart.length;
        totalAmount.textContent = `${total} AZN`;
        checkoutBtn.disabled = cart.length === 0;
    }
 
    function showStatus(message, isError = false) {
        statusMsg.textContent = message;
        statusMsg.classList.toggle('error', isError);
    }
 
    // ---------- LOCAL STORAGE ----------


    const MIN_SCALE = 0.7;
    const MAX_SCALE = 3;
    const ZOOM_STEP = 0.2;
    const PAN_STEP = 60;       
    const PAN_MARGIN = 100;    
    const DRAG_THRESHOLD = 5;  
 
    let view = { x: 0, y: 0, scale: 1 };
    let base = 1, offX = 0, offY = 0;
 
    function measure() {
        const r = viewport.getBoundingClientRect();
        base = Math.min(r.width / WORLD_W, r.height / WORLD_H);
        offX = (r.width - WORLD_W * base) / 2;
        offY = (r.height - WORLD_H * base) / 2;
    }
 
    function panBounds() {
        const spanX = WORLD_W - WORLD_W * view.scale;
        const spanY = WORLD_H - WORLD_H * view.scale;
        return {
            loX: Math.min(spanX, 0) - PAN_MARGIN,
            hiX: Math.max(spanX, 0) + PAN_MARGIN,
            loY: Math.min(spanY, 0) - PAN_MARGIN,
            hiY: Math.max(spanY, 0) + PAN_MARGIN
        };
    }
 
    function applyView() {
        view.scale = round2(clamp(view.scale, MIN_SCALE, MAX_SCALE));
        const b = panBounds();
        view.x = clamp(view.x, b.loX, b.hiX);
        view.y = clamp(view.y, b.loY, b.hiY);
 
        world.style.transform =
            `translate(${offX + view.x * base}px, ${offY + view.y * base}px) scale(${base * view.scale})`;
        updateNavButtons(b);
    }
 
    function updateNavButtons(b) {
        const eps = 0.5;
        zoomInBtn.disabled = view.scale >= MAX_SCALE;
        zoomOutBtn.disabled = view.scale <= MIN_SCALE;
        moveUpBtn.disabled = view.y >= b.hiY - eps;
        moveDownBtn.disabled = view.y <= b.loY + eps;
        moveLeftBtn.disabled = view.x >= b.hiX - eps;
        moveRightBtn.disabled = view.x <= b.loX + eps;
    }
 
    function zoomAt(cx, cy, nextScale) {
        nextScale = clamp(nextScale, MIN_SCALE, MAX_SCALE);
        const ratio = nextScale / view.scale;
        view.x = cx - (cx - view.x) * ratio;
        view.y = cy - (cy - view.y) * ratio;
        view.scale = nextScale;
        applyView();
    }
 
    function panBy(dx, dy) {
        view.x += dx;
        view.y += dy;
        applyView();
    }
 
    zoomInBtn.addEventListener('click', () => zoomAt(WORLD_W / 2, WORLD_H / 2, round2(view.scale + ZOOM_STEP)));
    zoomOutBtn.addEventListener('click', () => zoomAt(WORLD_W / 2, WORLD_H / 2, round2(view.scale - ZOOM_STEP)));
    moveUpBtn.addEventListener('click', () => panBy(0, PAN_STEP));
    moveDownBtn.addEventListener('click', () => panBy(0, -PAN_STEP));
    moveLeftBtn.addEventListener('click', () => panBy(PAN_STEP, 0));
    moveRightBtn.addEventListener('click', () => panBy(-PAN_STEP, 0));
    zoomResetBtn.addEventListener('click', () => {
        view = { x: 0, y: 0, scale: 1 };
        applyView();
    });
 
    if (typeof ResizeObserver !== 'undefined') {
        new ResizeObserver(() => { measure(); applyView(); }).observe(viewport);
    } else {
        window.addEventListener('resize', () => { measure(); applyView(); });
    }
 
    function clientToWorld(clientX, clientY) {
        const r = viewport.getBoundingClientRect();
        return {
            x: (clientX - r.left - offX) / base,
            y: (clientY - r.top - offY) / base
        };
    }
 
    viewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        const p = clientToWorld(e.clientX, e.clientY);
        const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
        zoomAt(p.x, p.y, view.scale * factor);
    }, { passive: false });
 
    let drag = null;
 
    viewport.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y };
        dragMoved = false;
    });
 
    window.addEventListener('pointermove', (e) => {
        if (!drag || e.pointerId !== drag.id) return;
        const dx = e.clientX - drag.sx;
        const dy = e.clientY - drag.sy;
 
        if (!dragMoved) {
            if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
            dragMoved = true;
            viewport.classList.add('dragging');
            hideTooltip();
        }
 
        view.x = drag.vx + dx / base;
        view.y = drag.vy + dy / base;
        applyView();
    });
 
    function endDrag(e) {
        if (!drag || e.pointerId !== drag.id) return;
        drag = null;
        viewport.classList.remove('dragging');
        setTimeout(() => { dragMoved = false; }, 0);
    }
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
 
    addBtn.addEventListener('click', () => {
        if (inspectedId) addToCart(inspectedId);
    });
 
    checkoutBtn.addEventListener('click', () => {
        showStatus(`Demo checkout: ${cart.length} ticket(s), ${totalAmount.textContent}. No real payment is made.`);
    });
 
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && inspectedId) {
            inspectedId = null;
            render();
        }
    });
 
    function render() {
        updateSeatStates();
        renderInspector();
        renderCart();
    }
 
    buildSeatData();
renderSeats();
renderZoneLegend();

cart = [];
inspectedId = null;
view = { x: 0, y: 0, scale: 1 };

applyView();
render();
});
 
