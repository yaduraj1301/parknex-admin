import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy, where, limit } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
//import jsPDF from "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
import jsPDF from "https://cdn.skypack.dev/jspdf@2.5.1";

// Get the generate PDF button and the new elements
//const generatePdfBtn = document.getElementById("generatePdfBtn");
const pdfViewerSection = document.getElementById("pdfViewerSection");
const pdfViewer = document.getElementById("pdfViewer");
const downloadPdfBtn = document.getElementById("downloadPdfBtn");


// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBDG2sJZF5Z2T3ABa0bJ_dOF2E_CDZvRFk",
  authDomain: "parknex-e6cea.firebasestorage.app",
  projectId: "parknex-e6cea",
  storageBucket: "parknex-e6cea.firebasestorage.app",
  messagingSenderId: "830756459271",
  appId: "1:830756459271:web:f2c5591a282887a10b6ba2",
  measurementId: "G-VN0P6KKP50"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Data caching
let cachedSlots = null;
let cachedBookings = null;

// Fetch ParkingSlots (cached)
async function fetchParkingSlots() {
  if (cachedSlots) return cachedSlots;
  
  console.log("📋 Fetching ParkingSlots from Firestore...");
  const snapshot = await getDocs(collection(db, "ParkingSlots"));
  cachedSlots = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  console.log(`✅ Loaded ${cachedSlots.length} parking slots`);
  return cachedSlots;
}

// Fetch bookings (cached)
async function fetchBookings() {
  if (cachedBookings) return cachedBookings;
  
  console.log("📋 Fetching bookings from Firestore...");
  const snapshot = await getDocs(collection(db, "bookings"));
  cachedBookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  console.log(`✅ Loaded ${cachedBookings.length} bookings`);
  return cachedBookings;
}

// FIXED: Parse Firestore Timestamp objects
function parseBookingDate(timestamp) {
  if (!timestamp) return null;
  
  try {
    let date;
    
    // Handle Firestore Timestamp object
    if (typeof timestamp === "object" && typeof timestamp.toDate === "function") {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp);
    }
    
    if (isNaN(date)) return null;
    
    // Normalize to start of day for consistent comparison
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  } catch (error) {
    console.warn("Failed to parse date:", timestamp, error);
    return null;
  }
}

// FIXED: Extract ID from Firestore DocumentReference objects
function normalizeSlotId(slotRef) {
  if (!slotRef) return null;
  
  try {
    // Handle Firestore DocumentReference object
    if (typeof slotRef === "object" && slotRef.id) {
      console.log(`📎 Found DocumentReference with id: ${slotRef.id}`);
      return slotRef.id;
    }
    
    // Handle Firestore DocumentReference with path property
    if (typeof slotRef === "object" && slotRef.path) {
      const parts = slotRef.path.split("/");
      const id = parts[parts.length - 1];
      console.log(`📎 Extracted ID from path ${slotRef.path}: ${id}`);
      return id;
    }
    
    // Handle string paths like "/ParkingSlots/abc123"
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

// Generate past 7 days labels (dd/mm/yyyy format)
function getLast7DaysLabels() {
  const today = new Date();
  const labels = [];
  const dateObjects = [];
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    
    // Normalize to start of day
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    labels.push(normalizedDate.toLocaleDateString("en-GB")); // dd/mm/yyyy
    dateObjects.push(normalizedDate);
  }
  
  return { labels, dateObjects };
}

// Check if two dates are the same day
function isSameDay(date1, date2) {
  if (!date1 || !date2) return false;
  return date1.getTime() === date2.getTime();
}

// Main aggregation function with FIXED DocumentReference handling
async function getUsageDataForBuilding(buildingName) {
  const [slots, bookings] = await Promise.all([fetchParkingSlots(), fetchBookings()]);
  
  // Create slot lookup map
  const slotMap = {};
  slots.forEach(slot => {
    slotMap[slot.id] = slot;
  });
  
  // Count total slots for this building
  const buildingSlotsCount = slots.filter(slot => {
    const slotBuilding = (slot.building || "").toLowerCase().trim();
    const targetBuilding = buildingName.toLowerCase().trim();
    return slotBuilding === targetBuilding;
  }).length;
  
  console.log(`🏢 Building "${buildingName}" has ${buildingSlotsCount} total slots`);
  
  // Get past 7 days
  const { labels, dateObjects } = getLast7DaysLabels();
  console.log(`📅 Date range: ${dateObjects[0].toLocaleDateString()} to ${dateObjects[dateObjects.length-1].toLocaleDateString()}`);
  
  // Initialize daily counts
  const dailyBookedCounts = {};
  labels.forEach(label => dailyBookedCounts[label] = 0);
  
  // Process bookings with FIXED DocumentReference handling
  let processedBookings = 0;
  let matchedBookings = 0;
  let slotMatchFailures = 0;
  let dateParseFailures = 0;
  let buildingMismatches = 0;
  
  console.log(`\n🔄 Processing ${bookings.length} bookings...`);
  
  bookings.forEach((booking, index) => {
    console.log(`\n--- Booking ${index + 1} (${booking.id}) ---`);
    
    // FIXED: Extract slot ID from DocumentReference
    const normalizedSlotId = normalizeSlotId(booking.slot_id);
    
    if (!normalizedSlotId) {
      console.log(`❌ Could not extract slot ID from:`, booking.slot_id);
      slotMatchFailures++;
      return;
    }
    
    // Find matching slot
    const slot = slotMap[normalizedSlotId];
    if (!slot) {
      console.log(`❌ No slot found for ID: ${normalizedSlotId}`);
      slotMatchFailures++;
      return;
    }
    
    console.log(`✅ Found slot: ${slot.id} in building "${slot.building}"`);
    
    // Check if slot belongs to target building
    const slotBuilding = (slot.building || "").toLowerCase().trim();
    const targetBuilding = buildingName.toLowerCase().trim();
    
    if (slotBuilding !== targetBuilding) {
      console.log(`⏭️ Wrong building: "${slotBuilding}" ≠ "${targetBuilding}"`);
      buildingMismatches++;
      return;
    }
    
    processedBookings++;
    console.log(`✅ Building match! Processing booking...`);
    
    // FIXED: Parse Firestore Timestamp
    const bookingDate = parseBookingDate(booking.booking_time);
    
    if (!bookingDate) {
      console.log(`❌ Invalid date:`, booking.booking_time);
      dateParseFailures++;
      return;
    }
    
    console.log(`✅ Parsed date: ${bookingDate.toLocaleDateString()}`);
    
    // Find which day this booking belongs to
    let dayMatched = false;
    dateObjects.forEach((dayDate, dayIndex) => {
      if (isSameDay(bookingDate, dayDate)) {
        const dayLabel = labels[dayIndex];
        dailyBookedCounts[dayLabel]++;
        console.log(`✅ Matched to day: ${dayLabel} (count now: ${dailyBookedCounts[dayLabel]})`);
        dayMatched = true;
        matchedBookings++;
      }
    });
    
    if (!dayMatched) {
      console.log(`⏭️ Date outside 7-day range: ${bookingDate.toLocaleDateString()}`);
    }
  });
  
  // Convert to arrays for Chart.js
  const bookedData = labels.map(label => dailyBookedCounts[label]);
  const freeData = labels.map(label => {
    const booked = dailyBookedCounts[label];
    return Math.max(0, buildingSlotsCount - booked);
  });
  
  // Final summary
  console.log(`\n📊 PROCESSING SUMMARY for "${buildingName}":`);
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
let myChart = null; // Variable to hold the chart instance

async function renderUsageChart(buildingName) {
    console.log(`📊 Rendering chart for building: ${buildingName}`);
    try {
        const data = await getUsageDataForBuilding(buildingName);
        const ctx = document.getElementById('usageTrendsChart').getContext('2d');

        // Destroy existing chart if it exists
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
        console.log("✅ Chart rendered successfully.");
    } catch (error) {
        console.error("❌ Failed to render chart:", error);
    }
}


// Initialize the application
async function initializeUsageTrendsChart() {
  try {
    console.log("🚀 Initializing parking usage trends chart...");
    
    // Check if Chart.js is loaded
    if (typeof Chart === "undefined") {
      console.error("❌ Chart.js is not loaded. Include: <script src='https://cdn.jsdelivr.net/npm/chart.js'></script>");
      return;
    }
    
    // Get building selector element
    const buildingSelect = document.getElementById("buildingSelect");
    if (!buildingSelect) {
      console.error("❌ Element with id 'buildingSelect' not found. Add: <select id='buildingSelect'></select>");
      return;
    }
    
    // Fetch all parking slots to populate building options
    const slots = await fetchParkingSlots();
    const uniqueBuildings = [...new Set(slots.map(slot => slot.building).filter(Boolean))].sort();
    
    if (uniqueBuildings.length === 0) {
      console.warn("⚠️ No buildings found in parking slots data");
      buildingSelect.innerHTML = '<option value="">No buildings available</option>';
      return;
    }
    
    // Populate building dropdown
    buildingSelect.innerHTML = "";
    uniqueBuildings.forEach((building, index) => {
      const option = document.createElement("option");
      option.value = building;
      option.textContent = building;
      if (index === 0) option.selected = true; // Select first building by default
      buildingSelect.appendChild(option);
    });
    
    console.log(`🏢 Found ${uniqueBuildings.length} buildings: ${uniqueBuildings.join(", ")}`);
    
    // Render initial chart for first building
    const initialBuilding = uniqueBuildings[0];
    await renderUsageChart(initialBuilding);
    
    // Add change listener for building selection
    buildingSelect.addEventListener("change", async (event) => {
      const selectedBuilding = event.target.value;
      if (selectedBuilding) {
        console.log(`🔄 Switching to building: ${selectedBuilding}`);
        await renderUsageChart(selectedBuilding);
      }
    });
    
    console.log("✅ Parking usage trends chart initialized successfully");
    
  } catch (error) {
    console.error("❌ Failed to initialize chart:", error);
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeUsageTrendsChart);
} else {
  initializeUsageTrendsChart();
}

// Function to generate and display the PDF
// ... (rest of your code and function definitions)

// Function to generate and display the PDF with dynamic data
async function generateAndDisplayPdf() {
    const selectedBuilding = document.getElementById("buildingSelect").value;
    if (!selectedBuilding) {
        alert("Please select a building.");
        return;
    }

    const weeklyReports = await getWeeklyReportData(selectedBuilding);

    if (!weeklyReports || weeklyReports.length === 0) {
        alert("No report data available for the selected building.");
        return;
    }

    const doc = new jsPDF();
    let yOffset = 20;

    // --- Header Section ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.setTextColor("#0A2351"); // ParkNex Blue
    doc.text("ParkNex", 10, yOffset);
    doc.setFontSize(18);
    doc.setFont("helvetica", "normal");
    doc.setTextColor("#6B7280");
    doc.text("Parking Management System", 10, yOffset + 8);
    yOffset += 20;

    // --- Main Title Section ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor("#374151");
    doc.text(`Weekly Report for ${selectedBuilding}`, 10, yOffset);
    yOffset += 15;

    // --- Report Period Section ---
    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.setTextColor("#6B7280");
    const startDate = new Date(weeklyReports[weeklyReports.length - 1].date.toDate()).toLocaleDateString();
    const endDate = new Date(weeklyReports[0].date.toDate()).toLocaleDateString();
    doc.text(`Period: ${startDate} - ${endDate}`, 10, yOffset);
    yOffset += 15;

    // --- Daily Metrics Section ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor("#1F2937");
    doc.text("Daily Metrics", 10, yOffset);
    yOffset += 10;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor("#374151");

    // Loop through each document in the fetched array
    weeklyReports.forEach((report, index) => {
        // Add a new page if content exceeds the current page
        if (yOffset > 250) {
            doc.addPage();
            yOffset = 20;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(18);
            doc.setTextColor("#1F2937");
            doc.text("Daily Metrics (continued)", 10, yOffset);
            yOffset += 10;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(12);
            doc.setTextColor("#374151");
        }
        
        // Add the date and a horizontal line
        doc.setFont("helvetica", "bold");
        doc.text(new Date(report.date.toDate()).toLocaleDateString(), 15, yOffset);
        doc.setLineWidth(0.5);
        doc.setDrawColor("#D1D5DB");
        doc.line(15, yOffset + 2, 190, yOffset + 2); // x1, y1, x2, y2
        yOffset += 7;

        // Display the metrics for that specific day
        doc.setFont("helvetica", "normal");
        doc.text(`Booked Slots: ${report.booked_slots}`, 20, yOffset);
        yOffset += 7;
        doc.text(`Free Slots: ${report.free_slots}`, 20, yOffset);
        yOffset += 7;
        doc.text(`Escalations: ${report.escalations}`, 20, yOffset);
        yOffset += 10; // Space between daily reports
    });

    // --- Footer ---
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor("#9CA3AF");
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, doc.internal.pageSize.width - 60, doc.internal.pageSize.height - 10);
    
    // --- Display the PDF ---
    const pdfDataUri = doc.output('datauristring');
    document.getElementById("pdfViewer").src = pdfDataUri;
    document.getElementById("pdfViewerSection").style.display = 'block';
    document.getElementById("downloadPdfBtn").onclick = () => {
        doc.save(`ParkNex_Weekly_Report_${selectedBuilding}.pdf`);
    };
}

// Add a click event listener to the generate PDF button
const generatePdfBtn = document.getElementById("generatePdfBtn");
generatePdfBtn.addEventListener("click", () => {
    generateAndDisplayPdf();
});


// Function to get all data for a specific building's weekly report
// Function to get the latest report data for a specific building
async function getWeeklyReportData(buildingName) {
    const reportsCollection = collection(db, "reports");
    console.log(`📋 Fetching last 7 reports for building: ${buildingName}`);

    // Query for the last 7 report documents for the given building
    const querySnapshot = await getDocs(
        query(
            reportsCollection,
            where("building", "==", buildingName),
            orderBy("date", "desc"), // Order by date descending
            limit(7) // Get only the last 7 documents
        )
    );

    if (querySnapshot.empty) {
        console.warn("⚠️ No report found for this building.");
        return null;
    }

    // Return the array of documents
    const weeklyReports = querySnapshot.docs.map(doc => doc.data());
    console.log("✅ Reports fetched successfully:", weeklyReports);
    return weeklyReports;
}