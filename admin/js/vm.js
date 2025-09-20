// vm.js - Vehicle Management JavaScript
import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import {
  getFirestore,
  collection,
  collectionGroup,
  getDocs,
  addDoc,
  doc
} from "https://www.gstatic.com/firebasejs/9.17.1/firebase-firestore.js";

// 🔑 Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBDG2sJZF5Z2T3ABa0bJ_dOF2E_CDZvRFk",
  authDomain: "parknex-e6cea.firebaseapp.com",
  projectId: "parknex-e6cea",
  storageBucket: "parknex-e6cea.firebasestorage.app",
  messagingSenderId: "830756459271",
  appId: "1:830756459271:web:f2c5591a282887a10b6ba2",
  measurementId: "G-VN0P6KKP50"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

let selectedEmployeeId = null;
let firestoreReadCount = 0;
// ===== Caches to reduce reads =====
let employeesMap = {}; // empId → empData
let vehiclesMap = {}; // empId → { vehId → vehData }
let bookingsMap = {}; // slotId → bookingData

// ================= Date/Time =================
function updateDateTime() {
  const now = new Date();
  document.getElementById("current-date").textContent =
    now.toLocaleDateString("en-GB");
  document.getElementById("current-time").textContent =
    now.toLocaleTimeString("en-GB");
}
updateDateTime();
setInterval(updateDateTime, 1000);

// ================= Helpers =================
function parseRefPath(ref) {
  if (!ref) return null;
  if (typeof ref === "string") return ref;
  if (ref.path) return ref.path;
  try {
    return String(ref);
  } catch {
    return null;
  }
}



async function trackedGetDocs(queryRef) {
  firestoreReadCount++;
  console.log(`[READ #${firestoreReadCount}] getDocs ->`, queryRef._queryPath?.segments?.join("/") || queryRef);
  return await getDocs(queryRef);
}

async function trackedGetDoc(docRef) {
  firestoreReadCount++;
  console.log(`[READ #${firestoreReadCount}] getDoc ->`, docRef.path);
  return await getDoc(docRef);
}

function trackedOnSnapshot(queryRef, callback) {
  firestoreReadCount++;
  console.log(`[READ #${firestoreReadCount}] onSnapshot ->`, queryRef._queryPath?.segments?.join("/") || queryRef);
  return onSnapshot(queryRef, callback);
}



function parseSlotIdFromSlotRef(slotRef) {
  const path = parseRefPath(slotRef);
  if (!path) return null;
  const parts = path.split("/");
  return parts[parts.length - 1] || null;
}

function parseEmpAndVehFromVehicleRef(vehicleRef) {
  const path = parseRefPath(vehicleRef);
  if (!path) return {
    empId: null,
    vehId: null
  };
  const parts = path.split("/");
  return {
    empId: parts.length >= 2 ? parts[1] : null,
    vehId: parts.length >= 4 ? parts[3] : null
  };
}

// ================= Preload Functions =================
async function preloadEmployees() {
  employeesMap = {};
  const snap = await trackedGetDocs(collection(db, "employees")); //changed to trackedGetDocs
  for (const d of snap.docs) employeesMap[d.id] = d.data();
}

async function preloadVehicles() {
  vehiclesMap = {};
  for (const empId of Object.keys(employeesMap)) {
    const vSnap = await trackedGetDocs(collection(db, "employees", empId, "vehicles"));
    vehiclesMap[empId] = {};
    vSnap.forEach((vDoc) => {
      vehiclesMap[empId][vDoc.id] = vDoc.data();
    });
  }
}

async function preloadBookings() {
  bookingsMap = {};
  const bSnap = await trackedGetDocs(collection(db, "bookings"));
  bSnap.forEach((bDoc) => {
    const bData = bDoc.data();
    if (!bData?.slot_id) return;
    const slotKey = parseSlotIdFromSlotRef(bData.slot_id);
    if (!slotKey) return;
    bookingsMap[slotKey] = { ...bData, __bookingDocId: bDoc.id };
  });
}

// ================= Render Table =================
function renderRow(slotId, slotData, tableBody) {
  const bookingData = bookingsMap[slotId] || null;
  let empData = {};
  let vehData = {};
  let empIdForButton = "";

  if (bookingData?.vehicle_id) {
    const { empId, vehId } = parseEmpAndVehFromVehicleRef(bookingData.vehicle_id);
    empIdForButton = empId || "";
    if (empId && employeesMap[empId]) empData = employeesMap[empId];
    if (empId && vehId && vehiclesMap[empId]?.[vehId]) {
      vehData = vehiclesMap[empId][vehId];
    }
  }

  const row = `
    <tr data-slot-id="${slotId}">
      <td>${empData.full_name || "-"}</td>
      <td>${empData.department || "-"}</td>
      <td>${vehData.registration_no || "-"} (${vehData.model || ""}, ${vehData.color || ""})</td>
      <td>${empData.contact_number || "-"}</td>
      <td>${bookingData?.booking_time?.toDate?.().toLocaleString() || "-"} - ${slotData.slot_name}</td>
      <td><span class="status ${slotData.status === "Booked" ? "active" : "inactive"}">${slotData.status || "No booking"}</span></td>
      <td><span class="status ${bookingData ? "authorized" : "unauthorized"}">${bookingData ? "Authorized" : "Unauthorized"}</span></td>
      <td>${slotData.building || "-"}</td>
      <td class="action-buttons">
        <button class="action-btn1" title="Call"><i class="fas fa-phone"></i></button>
        <button class="action-btn2" title="Flag"><i class="fas fa-flag"></i></button>
        <button class="action-btn3" title="Add Vehicle" data-emp-id="${empIdForButton}"><i class="fas fa-plus"></i></button>
      </td>
    </tr>
  `;
  tableBody.insertAdjacentHTML("beforeend", row);
}

// ================= Load Employee Data =================
// ================= Load Employee Data =================
async function loadEmployeeData() {
  const tableBody = document.querySelector(".records-table tbody");
  tableBody.innerHTML = "";

  await preloadEmployees();
  await preloadVehicles();
  await preloadBookings();

  const slotsSnap = await trackedGetDocs(collection(db, "ParkingSlots"));
  for (const slotDoc of slotsSnap.docs) {
    const slotData = slotDoc.data();

    // ✅ Only consider Booked and Unbooked
    if (slotData.status === "Booked") {
      renderRow(slotDoc.id, slotData, tableBody);
    } 
    else if (slotData.status === "Unbooked") {
      // ✅ Force unauthorized display for Unbooked slots
      renderRow(slotDoc.id, { ...slotData, unauthorized: true }, tableBody);
    }
  }

  attachRowClickEvents();
  await updateSummaryCards();

}



async function updateSummaryCards() {
  // 🔹 Total Vehicles
  const vehiclesSnap = await trackedGetDocs(collectionGroup(db, "vehicles"));
  const totalVehicles = vehiclesSnap.size;

  // 🔹 Parking slots
  const slotsSnap = await trackedGetDocs(collection(db, "ParkingSlots"));

  let currentlyParked = 0;
  let securityAlerts = 0;

  slotsSnap.forEach((slotDoc) => {
    const slotData = slotDoc.data();

    if (slotData.status === "Booked" || slotData.status === "Unbooked") {
      currentlyParked++;
    }
    if (slotData.status === "Unbooked") {
      securityAlerts++;
    }
  });

  // 🔹 Update DOM
  document.querySelector(".summary-card:nth-child(1) .value").innerText = totalVehicles;
  document.querySelector(".summary-card:nth-child(2) .value").innerText = currentlyParked;
  document.querySelector(".summary-card:nth-child(3) .value").innerText = securityAlerts;
}


// ================= Row & Modal Handling =================
const modal = document.getElementById("popupModal");
const closeBtn = document.querySelector(".close-btn");

function attachRowClickEvents() {
  document.querySelectorAll(".records-table tbody tr").forEach((row) => {
    row.addEventListener("click", (e) => {
      if (e.target.closest(".action-buttons")) return;

      const slotId = row.dataset.slotId;
      const bookingData = bookingsMap[slotId] || null;
      let empData = {};
      let vehicleList = []; // ✅ always start fresh

      if (bookingData?.vehicle_id) {
        const { empId } = parseEmpAndVehFromVehicleRef(bookingData.vehicle_id);
        if (empId && employeesMap[empId]) {
          empData = employeesMap[empId];

          // ✅ Rebuild the list without duplicates
          vehicleList = Object.values(vehiclesMap[empId] || {}).map(
            (v) =>
              `${v.registration_no || "-"}, ${v.model || ""} ${v.color || ""}`
          );

          // ✅ DEBUG LOG
          console.log(
            `[DEBUG] Vehicles for Employee ${empId}:`,
            vehicleList
          );
        }
      }

      // ✅ Update modal fields
      document.getElementById("empName").innerText = empData.full_name || "-";
      document.getElementById("empId").innerText = empData.emp_id || "-";
      document.getElementById("department").innerText =
        empData.department || "-";
      document.getElementById("building").innerText = empData.building || "-";
      document.getElementById("contact").innerText =
        empData.contact_number || "-";
      document.getElementById("authStatus").innerText =
        empData.authorization_level || "Unauthorized";

      document.getElementById("vehicleInfo").innerHTML = vehicleList.length
        ? "<ul>" +
          vehicleList.map((v) => `<li>${v}</li>`).join("") +
          "</ul>"
        : "No Vehicles";

      const badge = document.getElementById("authStatus");
      badge.className =
        "status-badge " +
        (empData.authorization_level === "Employee"
          ? "authorized"
          : "unauthorized");

      modal.style.display = "flex";
    });
  });

  // Action button for adding vehicle
  document.querySelectorAll(".action-btn3").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      selectedEmployeeId = btn.dataset.empId;
      addVehicleModal.style.display = "flex";
    });
  });
}

// Close modal
closeBtn.addEventListener("click", () => (modal.style.display = "none"));
window.addEventListener("click", (e) => {
  if (e.target === modal) modal.style.display = "none";
});


// ================= Add Vehicle Modal =================
const addVehicleBtn = document.querySelector(".add-vehicle .add-btn");
const addVehicleModal = document.getElementById("addVehicleModal");
const addVehicleCloseBtn = addVehicleModal.querySelector(".close-btn");
const addVehicleCancelBtn = addVehicleModal.querySelector(".cancel-btn");
const addVehicleForm = document.getElementById("vehicleForm");

addVehicleBtn.addEventListener("click", () => {
  addVehicleModal.style.display = "flex";
});
addVehicleCloseBtn.addEventListener("click", () => {
  addVehicleModal.style.display = "none";
});
addVehicleCancelBtn.addEventListener("click", () => {
  addVehicleModal.style.display = "none";
});
window.addEventListener("click", (e) => {
  if (e.target === addVehicleModal) {
    addVehicleModal.style.display = "none";
  }
});

addVehicleForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!selectedEmployeeId) {
    alert("No employee selected.");
    return;
  }

  const formData = new FormData(addVehicleForm);
  let vehicleData = {};
  formData.forEach((value, key) => {
    vehicleData[key] = key === "is_default" ? value === "true" : value;
  });

  try {
    const vehicleRef = collection(db, "employees", selectedEmployeeId, "vehicles");
    await addDoc(vehicleRef, vehicleData);

    alert("Vehicle added successfully!");
    addVehicleForm.reset();
    addVehicleModal.style.display = "none";
    loadEmployeeData(); // refresh table
  } catch (err) {
    console.error("Error adding vehicle:", err);
    alert("Error adding vehicle: " + err.message);
  }
});

// ================= Run =================
window.addEventListener("DOMContentLoaded", loadEmployeeData);

// 🔍 FILTERS & SEARCH FUNCTIONALITY
function initTableFilters() {
  const searchInput = document.querySelector(".search-input");
  const statusFilter = document.querySelectorAll(".filter-select")[1]; // All Status
  const deptFilter = document.querySelectorAll(".filter-select")[0];   // All Departments
  const authFilter = document.querySelectorAll(".filter-select")[2];   // Authorization
  const clearBtn = document.querySelector(".clear-btn");

  function applyFilters() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    const statusVal = statusFilter.value;
    const deptVal = deptFilter.value;
    const authVal = authFilter.value;

    document.querySelectorAll(".records-table tbody tr").forEach((row) => {
      let show = true;

      // Employee / Vehicle search
      const employee = row.cells[0]?.innerText.toLowerCase();
      const vehicle = row.cells[2]?.innerText.toLowerCase();
      if (searchTerm && !(employee.includes(searchTerm) || vehicle.includes(searchTerm))) {
        show = false;
      }

      // Department filter
      const department = row.cells[1]?.innerText;
      if (deptVal !== "All Departments" && department !== deptVal) {
        show = false;
      }

      // Status filter (Booking column = index 5)
      const booking = row.cells[5]?.innerText;
      if (statusVal !== "All Status" && !booking.includes(statusVal)) {
        show = false;
      }

      // Authorization filter (column 6)
      const auth = row.cells[6]?.innerText;
      if (authVal !== "Authorization" && auth !== authVal) {
        show = false;
      }

      row.style.display = show ? "" : "none";
    });
  }

  // Event listeners
  searchInput.addEventListener("input", applyFilters);
  statusFilter.addEventListener("change", applyFilters);
  deptFilter.addEventListener("change", applyFilters);
  authFilter.addEventListener("change", applyFilters);

  clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    statusFilter.value = "All Status";
    deptFilter.value = "All Departments";
    authFilter.value = "Authorization";
    applyFilters();
  });
}

// Call once DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  initTableFilters();
});

