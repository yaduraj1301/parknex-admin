// vm.js - Vehicle Management JavaScript
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-firestore.js";

// 🔑 Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyBh0XI8p736BK2Zn-PuC9r2FbDNBSddWRE",
    authDomain: "parknex-admin.firebaseapp.com",
    projectId: "parknex-admin",
    storageBucket: "parknex-admin.firebasestorage.app",
    messagingSenderId: "1018594733850",
    appId: "1:1018594733850:web:91a7f78628eb5e089846a3",
    measurementId: "G-0ETW3XZN2E"
};


// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
let selectedEmployeeId = null;

// ================= Load Employee Data =================



function updateDateTime() {
    const now = new Date();

    // Format date as DD/MM/YYYY
    const date = now.toLocaleDateString("en-GB");

    // Format time as HH:MM:SS
    const time = now.toLocaleTimeString("en-GB");

    document.getElementById("current-date").textContent = date;
    document.getElementById("current-time").textContent = time;
}

// Update immediately
updateDateTime();

// Update every second
setInterval(updateDateTime, 1000);

async function loadEmployeeData() {
    const tableBody = document.querySelector(".records-table tbody");
    tableBody.innerHTML = ""; // clear old rows

    // Get all employees
    const employeeSnapshot = await getDocs(collection(db, "employees"));

    for (const empDoc of employeeSnapshot.docs) {
        const empData = empDoc.data();

        // Get subcollection "vehicles"
        const vehiclesRef = collection(db, `employees/${empDoc.id}/vehicles`);
        const vehiclesSnapshot = await getDocs(vehiclesRef);

        if (vehiclesSnapshot.empty) {
            // No vehicle registered
            const row = `
        <tr data-emp-id="${empDoc.id}">
          <td>${empData.full_name || "-"}</td>
          <td>${empData.department || "-"}</td>
          <td>-</td>
          <td>${empData.contact_number || "-"}</td>
          <td>-</td>
          <td><span class="status inactive">No booking</span></td>
          <td>
            <span class="status ${empData.authorization_level === "Employee" ? "authorized" : "unauthorized"}">
              ${empData.authorization_level || "Unauthorized"}
            </span>
          </td>
          <td>${empData.building || "-"}</td>
          <td class="action-buttons">
  <button class="action-btn1" title="Call"><i class="fas fa-phone"></i></button>
  <button class="action-btn2" title="Flag"><i class="fas fa-flag"></i></button>
  <button class="action-btn3" title="Add Vehicle" data-emp-id="${empDoc.id}">
    <i class="fas fa-plus"></i>
  </button>
</td>

        </tr>
      `;
            tableBody.insertAdjacentHTML("beforeend", row);
        } else {
            // Loop through all vehicles for this employee
            vehiclesSnapshot.forEach((vehDoc) => {
                const vehData = vehDoc.data();

                const row = `
          <tr data-emp-id="${empDoc.id}">
            <td>${empData.full_name || "-"}</td>
            <td>${empData.department || "-"}</td>
            <td>${vehData.registration_no || "-"} (${vehData.model || ""}, ${vehData.color || ""})</td>
            <td>${empData.contact_number || "-"}</td>
            <td>-</td>
            <td><span class="status inactive">No booking</span></td>
            <td>
              <span class="status ${empData.authorization_level === "Employee" ? "authorized" : "unauthorized"}">
                ${empData.authorization_level || "Unauthorized"}
              </span>
            </td>
            <td>${empData.building || "-"}</td>
          <td class="action-buttons">
  <button class="action-btn1" title="Call"><i class="fas fa-phone"></i></button>
  <button class="action-btn2" title="Flag"><i class="fas fa-flag"></i></button>
  <button class="action-btn3" title="Add Vehicle" data-emp-id="${empDoc.id}">
    <i class="fas fa-plus"></i>
  </button>
</td>

          </tr>
        `;
                tableBody.insertAdjacentHTML("beforeend", row);
            });
        }
    }

    attachRowClickEvents(db);
}

// ================= Modal Handling =================
const modal = document.getElementById("popupModal");
const closeBtn = document.querySelector(".close-btn");

function attachRowClickEvents(db) {
    document.querySelectorAll(".records-table tbody tr").forEach(row => {
        row.addEventListener("click", async (e) => {
            // ❌ Ignore clicks on action buttons
            if (e.target.closest(".action-buttons")) return;

            const empId = row.dataset.empId;
            if (!empId) return;

            // Fetch employee doc
            const employees = await getDocs(collection(db, "employees"));
            const empDoc = employees.docs.find(d => d.id === empId);
            if (!empDoc) return;
            const empData = empDoc.data();

            // Fetch vehicles
            const vehiclesRef = collection(db, `employees/${empId}/vehicles`);
            const vehiclesSnapshot = await getDocs(vehiclesRef);

            let vehicleList = [];
            vehiclesSnapshot.forEach((vehDoc) => {
                const v = vehDoc.data();
                vehicleList.push(`${v.registration_no || "-"}, ${v.model || ""} ${v.color || ""}`);
            });

            // Update modal
            document.getElementById("empName").innerText = empData.full_name || "-";
            document.getElementById("empId").innerText = empData.emp_id || "-";
            document.getElementById("department").innerText = empData.department || "-";
            document.getElementById("building").innerText = empData.building || "-";
            document.getElementById("contact").innerText = empData.contact_number || "-";
            document.getElementById("authStatus").innerText = empData.authorization_level || "Unauthorized";

            document.getElementById("vehicleInfo").innerHTML = vehicleList.length
                ? "<ul>" + vehicleList.map(v => `<li>${v}</li>`).join("") + "</ul>"
                : "No Vehicles";

            // Badge color
            const badge = document.getElementById("authStatus");
            badge.className = "status-badge " + (empData.authorization_level === "Employee" ? "authorized" : "unauthorized");

            modal.style.display = "flex";
        });
    });
    document.querySelectorAll(".action-btn3").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation(); // don’t trigger row modal
            selectedEmployeeId = btn.dataset.empId;
            addVehicleModal.style.display = "flex";
        });
    });
}


// Close modal
closeBtn.addEventListener("click", () => modal.style.display = "none");
window.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
});

// Run on page load
window.addEventListener("DOMContentLoaded", loadEmployeeData);

// ================= Add Vehicle Modal Handling =================
const addVehicleBtn = document.querySelector(".add-vehicle .add-btn");
const addVehicleModal = document.getElementById("addVehicleModal");
const addVehicleCloseBtn = addVehicleModal.querySelector(".close-btn");
const addVehicleCancelBtn = addVehicleModal.querySelector(".cancel-btn");
const addVehicleForm = document.getElementById("vehicleForm");

// Open modal
addVehicleBtn.addEventListener("click", () => {
    addVehicleModal.style.display = "flex";
});

// Close modal (× button)
addVehicleCloseBtn.addEventListener("click", () => {
    addVehicleModal.style.display = "none";
});

// Close modal (Cancel button)
addVehicleCancelBtn.addEventListener("click", () => {
    addVehicleModal.style.display = "none";
});

// Close modal when clicking outside content
window.addEventListener("click", (e) => {
    if (e.target === addVehicleModal) {
        addVehicleModal.style.display = "none";
    }
});

// Handle form submission
addVehicleForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!selectedEmployeeId) {
        alert("No employee selected.");
        return;
    }

    // Collect form values
    const formData = new FormData(addVehicleForm);
    let vehicleData = {};
    formData.forEach((value, key) => {
        vehicleData[key] = key === "is_default" ? value === "true" : value;
    });

    console.log("Adding vehicle for employee doc.id:", selectedEmployeeId, vehicleData);

    try {
        const vehicleRef = collection(db, "employees", selectedEmployeeId, "vehicles");
        await addDoc(vehicleRef, vehicleData);

        alert("Vehicle added successfully!");
        addVehicleForm.reset();
        addVehicleModal.style.display = "none";

        // Refresh the employee table
        loadEmployeeData();
    } catch (err) {
        console.error("Error adding vehicle:", err);
        alert("Error adding vehicle: " + err.message);
    }
});