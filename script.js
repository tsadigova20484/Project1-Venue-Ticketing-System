const venueData = {
    sections: [
        {
            name: "VIP Stall (Front Arc)",
            price: 50.00,
            rows: [
                { rowId: "A", seats: 10 },
                { rowId: "B", seats: 12 }
            ]
        },
        {
            name: "Standard Circle (Middle Arc)",
            price: 30.00,
            rows: [
                { rowId: "C", seats: 14 },
                { rowId: "D", seats: 16 },
                { rowId: "E", seats: 18 }
            ]
        },
        {
            name: "Balcony (Rear Arc)",
            price: 15.00,
            rows: [
                { rowId: "F", seats: 20 }
            ]
        }
    ]
};

let inspectedElement = null;

const unavailableSeats = new Set(["A-5", "B-6", "C-10", "D-3"]);

document.addEventListener("DOMContentLoaded", () => {
    renderVenueMap();
    setupEventListeners();
});

function renderVenueMap() {
    const mapContainer = document.getElementById("venue-map");
    mapContainer.innerHTML = "";

    venueData.sections.forEach(section => {
        section.rows.forEach(rowObj => {
            const rowDiv = document.createElement("div");
            rowDiv.className = "seat-row";

            for (let i = 1; i <= rowObj.seats; i++) {
                const seatId = `${rowObj.rowId}-${i}`;
                const seatBtn = document.createElement("button");
                
                seatBtn.className = "seat";
                seatBtn.dataset.seatId = seatId;
                seatBtn.dataset.row = rowObj.rowId;
                seatBtn.dataset.number = i;
                seatBtn.dataset.section = section.name;
                seatBtn.dataset.price = section.price;
                seatBtn.textContent = i;

                // Check initial state
                if (unavailableSeats.has(seatId)) {
                    seatBtn.classList.add("unavailable");
                    seatBtn.disabled = true;
                } else {
                    seatBtn.classList.add("available");
                }

                seatBtn.addEventListener("click", () => handleSeatClick(seatBtn));

                rowDiv.appendChild(seatBtn);
            }

            mapContainer.appendChild(rowDiv);
        });
    });
}

function handleSeatClick(seatBtn) {
    if (seatBtn.classList.contains("unavailable")) return;

    if (inspectedElement && inspectedElement !== seatBtn && !inspectedElement.classList.contains("in-cart")) {
        inspectedElement.classList.remove("inspected");
        inspectedElement.classList.add("available");
    }

    inspectedElement = seatBtn;
    seatBtn.classList.remove("available");
    seatBtn.classList.add("inspected");

    selectedSeat = {
        id: seatBtn.dataset.seatId,
        section: seatBtn.dataset.section,
        row: seatBtn.dataset.row,
        number: seatBtn.dataset.number,
        price: parseFloat(seatBtn.dataset.price)
    };

    updateInspectionPanel();
}

function updateInspectionPanel() {
    const detailsContainer = document.getElementById("seat-details");
    const addToCartBtn = document.getElementById("add-to-cart-btn");

    if (!selectedSeat) {
        detailsContainer.innerHTML = `<p class="placeholder-text">No seat selected. Click a seat on the map to inspect.</p>`;
        addToCartBtn.disabled = true;
        return;
    }

    detailsContainer.innerHTML = `
        <div class="seat-info-item">Seat ID: <span>${selectedSeat.id}</span></div>
        <div class="seat-info-item">Section: <span>${selectedSeat.section}</span></div>
        <div class="seat-info-item">Row: <span>${selectedSeat.row}</span> | Seat: <span>${selectedSeat.number}</span></div>
        <div class="seat-info-item">Price: <span>${selectedSeat.price.toFixed(2)} AZN</span></div>
    `;

    addToCartBtn.disabled = false;
}

function setupEventListeners() {
    const addToCartBtn = document.getElementById("add-to-cart-btn");
    addToCartBtn.addEventListener("click", () => {
        if (selectedSeat) {
            alert(`[Week 2 Preview] Seat ${selectedSeat.id} ready to add to cart! Cart logic will be implemented in Week 3.`);
        }
    });
}