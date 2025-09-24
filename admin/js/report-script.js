import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy, where, limit } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import jsPDF from "https://cdn.skypack.dev/jspdf@2.5.1";

// const pdfViewerSection = document.getElementById("pdfViewerSection");
// const pdfViewer = document.getElementById("pdfViewer");
// const downloadPdfBtn = document.getElementById("downloadPdfBtn");

const firebaseConfig = {
  apiKey: "AIzaSyBh0XI8p736BK2Zn-PuC9r2FbDNBSddWRE",
  authDomain: "parknex-admin.firebaseapp.com",
  projectId: "parknex-admin",
  storageBucket: "parknex-admin.firebasestorage.app",
  messagingSenderId: "1018594733850",
  appId: "1:1018594733850:web:91a7f78628eb5e089846a3",
  measurementId: "G-0ETW3XZN2E"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let cachedSlots = null;
let cachedBookings = null;

async function fetchParkingSlots() {
  if (cachedSlots) return cachedSlots;
  
  console.log("📋 Fetching ParkingSlots from Firestore...");
  const snapshot = await getDocs(collection(db, "ParkingSlots"));
  cachedSlots = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  console.log(`✅ Loaded ${cachedSlots.length} parking slots`);
  return cachedSlots;
}

async function fetchBookings() {
  if (cachedBookings) return cachedBookings;
  
  console.log("📋 Fetching bookings from Firestore...");
  const snapshot = await getDocs(collection(db, "bookings"));
  cachedBookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  console.log(`✅ Loaded ${cachedBookings.length} bookings`);
  return cachedBookings;
}

function parseBookingDate(timestamp) {
  if (!timestamp) return null;
  
  try {
    let date;
    
    if (typeof timestamp === "object" && typeof timestamp.toDate === "function") {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp);
    }
    
    if (isNaN(date)) return null;
    
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  } catch (error) {
    console.warn("Failed to parse date:", timestamp, error);
    return null;
  }
}

function parseFullTimestamp(timestamp) {
    if (!timestamp) return null;
    try {
        if (typeof timestamp.toDate === "function") {
            return timestamp.toDate(); 
        }
        const date = new Date(timestamp);
        return isNaN(date) ? null : date;
    } catch (error) {
        console.warn("Failed to parse full timestamp:", timestamp, error);
        return null;
    }
}

function normalizeSlotId(slotRef) {
  if (!slotRef) return null;
  
  try {
 
    if (typeof slotRef === "object" && slotRef.id) {
      console.log(`📎 Found DocumentReference with id: ${slotRef.id}`);
      return slotRef.id;
    }
    
    if (typeof slotRef === "object" && slotRef.path) {
      const parts = slotRef.path.split("/");
      const id = parts[parts.length - 1];
      console.log(`📎 Extracted ID from path ${slotRef.path}: ${id}`);
      return id;
    }
    
    if (typeof slotRef === "string") {
      const parts = slotRef.split("/");
      return parts[parts.length - 1];
    }
    
    return String(slotRef);
  } catch (error) {
    console.warn("Failed to normalize slot_id:", slotRef, error);
    return null;
  }
}

function getLast7DaysLabels() {
  const today = new Date();
  const labels = [];
  const dateObjects = [];
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    labels.push(normalizedDate.toLocaleDateString("en-GB")); // dd/mm/yyyy
    dateObjects.push(normalizedDate);
  }
  
  return { labels, dateObjects };
}

function isSameDay(date1, date2) {
  if (!date1 || !date2) return false;
  return date1.getTime() === date2.getTime();
}

async function getUsageDataForBuilding(buildingName) {
  const [slots, bookings] = await Promise.all([fetchParkingSlots(), fetchBookings()]);
  
  const slotMap = {};
  slots.forEach(slot => {
    slotMap[slot.id] = slot;
  });
  
  const buildingSlotsCount = slots.filter(slot => {
    const slotBuilding = (slot.building || "").toLowerCase().trim();
    const targetBuilding = buildingName.toLowerCase().trim();
    return slotBuilding === targetBuilding;
  }).length;
  
  console.log(`Building "${buildingName}" has ${buildingSlotsCount} total slots`);
  
  const { labels, dateObjects } = getLast7DaysLabels();
  console.log(`Date range: ${dateObjects[0].toLocaleDateString()} to ${dateObjects[dateObjects.length-1].toLocaleDateString()}`);
  
  const dailyBookedCounts = {};
  labels.forEach(label => dailyBookedCounts[label] = 0);
  
  let processedBookings = 0;
  let matchedBookings = 0;
  let slotMatchFailures = 0;
  let dateParseFailures = 0;
  let buildingMismatches = 0;
  
  console.log(`\nProcessing ${bookings.length} bookings...`);
  
  bookings.forEach((booking, index) => {
    console.log(`\n--- Booking ${index + 1} (${booking.id}) ---`);
    
const normalizedSlotId = normalizeSlotId(booking.slot_id);
    
    if (!normalizedSlotId) {
      console.log(`Could not extract slot ID from:`, booking.slot_id);
      slotMatchFailures++;
      return;
    }
    
    const slot = slotMap[normalizedSlotId];
    if (!slot) {
      console.log(`No slot found for ID: ${normalizedSlotId}`);
      slotMatchFailures++;
      return;
    }
    
    console.log(`Found slot: ${slot.id} in building "${slot.building}"`);
    
    const slotBuilding = (slot.building || "").toLowerCase().trim();
    const targetBuilding = buildingName.toLowerCase().trim();
    
    if (slotBuilding !== targetBuilding) {
      console.log(`Wrong building: "${slotBuilding}" ≠ "${targetBuilding}"`);
      buildingMismatches++;
      return;
    }
    
    processedBookings++;
    console.log(`Building match! Processing booking...`);
    
    const bookingDate = parseBookingDate(booking.booking_time);
    
    if (!bookingDate) {
      console.log(`Invalid date:`, booking.booking_time);
      dateParseFailures++;
      return;
    }
    
    console.log(`Parsed date: ${bookingDate.toLocaleDateString()}`);
    
    let dayMatched = false;
    dateObjects.forEach((dayDate, dayIndex) => {
      if (isSameDay(bookingDate, dayDate)) {
        const dayLabel = labels[dayIndex];
        dailyBookedCounts[dayLabel]++;
        console.log(`Matched to day: ${dayLabel} (count now: ${dailyBookedCounts[dayLabel]})`);
        dayMatched = true;
        matchedBookings++;
      }
    });
    
    if (!dayMatched) {
      console.log(`Date outside 7-day range: ${bookingDate.toLocaleDateString()}`);
    }
  });
  
  const bookedData = labels.map(label => dailyBookedCounts[label]);
  const freeData = labels.map(label => {
    const booked = dailyBookedCounts[label];
    return Math.max(0, buildingSlotsCount - booked);
  });
  
  console.log(`\nPROCESSING SUMMARY for "${buildingName}":`);
  console.log(`   Total bookings in Firestore: ${bookings.length}`);
  console.log(`   Slot match failures: ${slotMatchFailures}`);
  console.log(`   Building mismatches: ${buildingMismatches}`);
  console.log(`   Date parse failures: ${dateParseFailures}`);
  console.log(`   Successfully processed: ${processedBookings}`);
  console.log(`   Matched to 7-day window: ${matchedBookings}`);
  console.log(`   Building total slots: ${buildingSlotsCount}`);
  console.log(`   Daily booked: [${bookedData.join(", ")}]`);
  console.log(`   Daily free: [${freeData.join(", ")}]`);
  
  return {
    labels,
    bookedData,
    freeData,
    totalSlots: buildingSlotsCount
  };
}
let myChart = null;

async function renderUsageChart(buildingName) {
    console.log(`Rendering chart for building: ${buildingName}`);
    try {
        const data = await getUsageDataForBuilding(buildingName);
        const ctx = document.getElementById('usageTrendsChart').getContext('2d');

        if (myChart) {
            myChart.destroy();
        }

        myChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Booked Slots',
                    data: data.bookedData,
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }, {
                    label: 'Free Slots',
                    data: data.freeData,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        stacked: true,
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        max: data.totalSlots,
                        title: {
                            display: true,
                            text: 'Number of Parking Slots'
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: `Parking Usage for ${buildingName}`
                    }
                }
            }
        });
        console.log("Chart rendered successfully.");
    } catch (error) {
        console.error("Failed to render chart:", error);
    }
}


async function initializeUsageTrendsChart() {
  try {
    console.log("Initializing parking usage trends chart...");
    
    if (typeof Chart === "undefined") {
      console.error("Chart.js is not loaded. Include: <script src='https://cdn.jsdelivr.net/npm/chart.js'></script>");
      return;
    }
    
    const buildingSelect = document.getElementById("buildingSelect");
    if (!buildingSelect) {
      console.error("Element with id 'buildingSelect' not found. Add: <select id='buildingSelect'></select>");
      return;
    }
    
    const slots = await fetchParkingSlots();
    const uniqueBuildings = [...new Set(slots.map(slot => slot.building).filter(Boolean))].sort();
    
    if (uniqueBuildings.length === 0) {
      console.warn("No buildings found in parking slots data");
      buildingSelect.innerHTML = '<option value="">No buildings available</option>';
      return;
    }
    
    buildingSelect.innerHTML = "";
    uniqueBuildings.forEach((building, index) => {
      const option = document.createElement("option");
      option.value = building;
      option.textContent = building;
      if (index === 0) option.selected = true; 
      buildingSelect.appendChild(option);
    });
    
    console.log(`Found ${uniqueBuildings.length} buildings: ${uniqueBuildings.join(", ")}`);
    
    const initialBuilding = uniqueBuildings[0];
    await renderUsageChart(initialBuilding);
    
    buildingSelect.addEventListener("change", async (event) => {
      const selectedBuilding = event.target.value;
      if (selectedBuilding) {
        console.log(`Switching to building: ${selectedBuilding}`);
        await renderUsageChart(selectedBuilding);
      }
    });
    
    console.log("Parking usage trends chart initialized successfully");
    
  } catch (error) {
    console.error("Failed to initialize chart:", error);
  }
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeUsageTrendsChart);
} else {
  initializeUsageTrendsChart();
}
const generatePdfBtn = document.getElementById("generatePdfBtn");
generatePdfBtn.addEventListener("click", () => {
    generateAndDisplayPdf();
});

// async function getRealtimeReportData(buildingName) {
//     const [slots, bookings] = await Promise.all([fetchParkingSlots(), fetchBookings()]);
//     const notificationsSnapshot = await getDocs(collection(db, "notifications"));
//     const notifications = notificationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

//     const slotMap = {};
//     slots.forEach(slot => { slotMap[slot.id] = slot; });

//     const buildingSlots = slots.filter(slot => (slot.building || "").toLowerCase().trim() === buildingName.toLowerCase().trim());
//     const buildingSlotIds = buildingSlots.map(slot => slot.id);
//     const totalSlots = buildingSlots.length;

//     const { labels, dateObjects } = getLast7DaysLabels();

//     const dailyBookedCounts = {};
//     const dailyUnauthorizedCounts = {};
//     labels.forEach(label => {
//         dailyBookedCounts[label] = 0;
//         dailyUnauthorizedCounts[label] = 0;
//     });

//     const slotBookingCounts = {};
//     const hourlyBookings = {};

//     bookings.forEach(booking => {
//         const slotId = normalizeSlotId(booking.slot_id);
//         if (!slotId || !buildingSlotIds.includes(slotId)) return;

//         const bookingDate = parseBookingDate(booking.booking_time);
//         if (!bookingDate) return;

//         labels.forEach((label, idx) => {
//             if (isSameDay(bookingDate, dateObjects[idx])) {
//                 dailyBookedCounts[label]++;
//             }
//         });

//         slotBookingCounts[slotId] = (slotBookingCounts[slotId] || 0) + 1;

//         if (bookingDate) {
//             const hour = bookingDate.getHours();
//             hourlyBookings[hour] = (hourlyBookings[hour] || 0) + 1;
//         }
//     });
//     console.log("All notifications:", notifications);
// const buildingNotifications = notifications.filter(n =>
//     (n.building || "").toLowerCase().trim() === buildingName.toLowerCase().trim()
// );
// console.log("Notifications for building:", buildingNotifications);

// const criticalNotifications = buildingNotifications.filter(n => n.isCritical);
// console.log("Critical notifications for building:", criticalNotifications);
//     notifications.forEach(notification => {
//         if (notification.type !== 'unauthorized_parking') return;
//         const slotId = normalizeSlotId(notification.slotId);
//         if (!slotId || !buildingSlotIds.includes(slotId)) return;
//         const notifDate = parseBookingDate(notification.timestamp);
//         if (!notifDate) return;
//         labels.forEach((label, idx) => {
//             if (isSameDay(notifDate, dateObjects[idx])) {
//                 dailyUnauthorizedCounts[label]++;
//             }
//         });
//     });
  
//     let mostParkedSlot = "N/A";
//     let mostParkedSlotCount = 0;
//     for (const slotId in slotBookingCounts) {
//         if (slotBookingCounts[slotId] > mostParkedSlotCount) {
//             mostParkedSlotCount = slotBookingCounts[slotId];
//             mostParkedSlot = slotMap[slotId]?.slot_name || slotId;
//         }
//     }

//     return {
//         building: buildingName,
//         dailyBookedCounts,
//         dailyUnauthorizedCounts,
//         totalSlots,
//         peakTime,
//         mostParkedSlot,
//         mostParkedSlotCount,
//         dateStrings: labels
//     };
// }
// function getLast7DaysDateRange() {
//     const today = new Date();
//     today.setHours(23, 59, 59, 999);
//     const startDate = new Date();
//     startDate.setDate(startDate.getDate() - 6);
//     startDate.setHours(0, 0, 0, 0);

//     const dateStrings = [];
//     const dateObjects = [];
//     for (let i = 0; i < 7; i++) {
//         const date = new Date(startDate);
//         date.setDate(startDate.getDate() + i);
//         dateObjects.push(date);
//         dateStrings.push(date.toLocaleDateString("en-GB"));
//     }
//     return { startDate, endDate: today, dateObjects, dateStrings };
// }

async function getPdfReportDataForBuilding(buildingName) {
    console.log("Starting getPdfReportDataForBuilding function...");

    const [slots, bookings, notificationsSnapshot] = await Promise.all([
        fetchParkingSlots(),
        fetchBookings(),
        getDocs(collection(db, "notifications"))
    ]);

    const notifications = notificationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const slotMap = {};
    slots.forEach(slot => { slotMap[slot.id] = slot; });
    console.log(`Loaded ${Object.keys(slotMap).length} parking slots into map.`);

    const buildingSlots = slots.filter(slot => (slot.building || "").toLowerCase().trim() === buildingName.toLowerCase().trim());
    const buildingSlotIds = buildingSlots.map(slot => slot.id);
    const totalSlots = buildingSlots.length;
    console.log(`Found ${totalSlots} slots for building "${buildingName}".`);

    const { labels, dateObjects } = getLast7DaysLabels();
    const dailyBookedCounts = {};
    const dailyUnauthorizedCounts = {};
    labels.forEach(label => {
        dailyBookedCounts[label] = 0;
        dailyUnauthorizedCounts[label] = 0;
    });

    const slotBookingCounts = {};
    const hourlyBookings = {};

    bookings.forEach(booking => {
        const slotId = normalizeSlotId(booking.slot_id);
        if (!slotId || !buildingSlotIds.includes(slotId)) return;

        const bookingDay = parseBookingDate(booking.booking_time);
        if (bookingDay) {
            labels.forEach((label, idx) => {
                if (isSameDay(bookingDay, dateObjects[idx])) {
                    dailyBookedCounts[label]++;
                }
            });
        }
        
        const fullBookingDate = parseFullTimestamp(booking.booking_time);
        if (fullBookingDate) {
            const hour = fullBookingDate.getHours();
            hourlyBookings[hour] = (hourlyBookings[hour] || 0) + 1;
        }

        slotBookingCounts[slotId] = (slotBookingCounts[slotId] || 0) + 1;
    });

    notifications.forEach(notification => {
        if (notification.type !== 'unauthorized_parking') return;
        const slotId = normalizeSlotId(notification.slotId);
        const slot = slotId ? slotMap[slotId] : null;
        if (!slot || (slot.building || "").toLowerCase().trim() !== buildingName.toLowerCase().trim()) {
            return;
        }

        const notifDate = parseBookingDate(notification.timestamp);
        if (!notifDate) return;

        labels.forEach((label, idx) => {
            if (isSameDay(notifDate, dateObjects[idx])) {
                dailyUnauthorizedCounts[label]++;
            }
        });
    });

    console.log("Daily Unauthorized Counts:", dailyUnauthorizedCounts);

    let mostParkedSlot = "N/A";
    let mostParkedSlotCount = 0;
    for (const slotId in slotBookingCounts) {
        if (slotBookingCounts[slotId] > mostParkedSlotCount) {
            mostParkedSlotCount = slotBookingCounts[slotId];
            mostParkedSlot = slotMap[slotId]?.slot_name || slotId;
        }
    }

    let peakTime = "N/A";
    let maxBookingsInHour = 0;
    for (const hour in hourlyBookings) {
        if (hourlyBookings[hour] > maxBookingsInHour) {
            maxBookingsInHour = hourlyBookings[hour];
            const startHour = parseInt(hour);
            const endHour = startHour + 1;

            
            const getAmPmTime = (h) => {
                const hour12 = h % 12 || 12; 
                const ampm = h >= 12 ? 'PM' : 'AM';
                return `${hour12}:00 ${ampm}`;
            };
            
            peakTime = `${getAmPmTime(startHour)} - ${getAmPmTime(endHour)}`;
        }
    }

    console.log("Report Data Ready!");
    console.log("Peak Time:", peakTime);

    return {
        building: buildingName,
        dailyBookedCounts,
        dailyUnauthorizedCounts,
        totalSlots,
        mostParkedSlot,
        mostParkedSlotCount,
        peakTime,
        dateStrings: labels
    };
}

async function generateAndDisplayPdf() {
    const buildingSelect = document.getElementById("buildingSelect");
    const selectedBuilding = buildingSelect.value;

    if (!selectedBuilding) {
        alert("Please select a building.");
        return;
    }

    const reportData = await getPdfReportDataForBuilding(selectedBuilding);

    if (!reportData) {
        alert("No report data available for the selected building.");
        return;
    }

    const doc = new jsPDF();
    let y = 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(34, 40, 49);
    doc.text("ParkNex Parking Management", 12, y);
    doc.setFontSize(13);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text("Weekly Parking Report", 12, y + 8);
    y += 18;

    doc.setFontSize(12);
    doc.setTextColor(34, 40, 49);
    doc.text(`Building: ${selectedBuilding}`, 12, y);
    doc.text(`Report Generated: ${new Date().toLocaleString()}`, 120, y);
    y += 8;

    doc.setDrawColor(54, 162, 235);
    doc.setLineWidth(0.8);
    doc.line(12, y, 198, y);
    y += 6;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(54, 162, 235);
    doc.text("Weekly Overview", 12, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(34, 40, 49);
    doc.text(`Total Slots: ${reportData.totalSlots}`, 14, y);
    doc.text(`Most Parked Slot: ${reportData.mostParkedSlot} (${reportData.mostParkedSlotCount})`, 60, y);
    doc.text(`Peak Time: ${reportData.peakTime}`, 135, y);
    y += 10;

    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(12, y, 198, y);
    y += 7;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(54, 162, 235);
    doc.text("Daily Metrics", 12, y);
    y += 8;

    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.setFillColor(54, 162, 235);
    doc.rect(12, y, 184, 10, "F");
    doc.text("Date", 20, y + 7);
    doc.text("Booked Slots", 70, y + 7, { align: "center" });
    doc.text("Free Slots", 110, y + 7, { align: "center" });
    doc.text("Unauthorized Parking", 160, y + 7, { align: "center" });
    y += 12;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    reportData.dateStrings.forEach((date, idx) => {
        if (y > 270) {
            doc.addPage();
            y = 20;
        }
        if (idx % 2 === 0) {
            doc.setFillColor(245, 247, 250);
            doc.rect(12, y - 2, 184, 10, "F");
        }
        const booked = reportData.dailyBookedCounts[date] || 0;
        const unauthorized = reportData.dailyUnauthorizedCounts[date] || 0;
        const free = reportData.totalSlots - (booked + unauthorized);

        doc.setTextColor(34, 40, 49);
        doc.text(date, 20, y + 6);
        doc.text(String(booked), 70, y + 6, { align: "center" });
        doc.text(String(free), 110, y + 6, { align: "center" });
        doc.text(String(unauthorized), 160, y + 6, { align: "center" });

        y += 11;
    });

    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text("ParkNex | Smart Parking Solutions", 12, 290);

    const pdfDataUri = doc.output('datauristring');
    document.getElementById("pdfViewer").src = pdfDataUri;
    document.getElementById("pdfViewerSection").style.display = 'block';
    document.getElementById("downloadPdfBtn").onclick = () => {
        doc.save(`ParkNex_Realtime_Report_${selectedBuilding}.pdf`);
    };
    const element = document.getElementById("pdfViewerSection");
    if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}