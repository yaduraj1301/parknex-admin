import { db, auth } from "../../public/js/firebase-config.js";
import { GEMINI_API_KEY } from "../../public/js/api-config.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  query,
  where,
  doc,
  Timestamp,
  updateDoc,
  writeBatch,  // Add this
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const messagesEl = document.getElementById("messages");
  const inputEl = document.getElementById("userInput");
  const sendBtn = document.getElementById("sendBtn");
  const loadingScreen = document.getElementById("loadingScreen");
  const chatInterface = document.getElementById("chatInterface");
  const logoutBtn = document.getElementById("logoutBtn");

  let currentUser = null;
  let employeeData = null;
  
  // Replace the hardcoded EMPLOYEE_CONTACT with a variable
  let employeeContact = null;

  // Authentication check
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      try {
        // Fetch employee data based on user_id
        const employeesRef = collection(db, "employees");
        const q = query(employeesRef, where("user_id", "==", user.uid));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          console.error("No employee found for this user");
          window.location.href = "../admin/login.html";
          return;
        }

        employeeData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        employeeContact = employeeData.contact_number;

        // Initialize chatbot after getting employee data
        await loadSlotsFromDB();
        await loadExistingBooking(); // Add this line
        showInitialOptions();

        // Show chat interface
        loadingScreen.style.display = "none";
        chatInterface.style.display = "flex";
      } catch (error) {
        console.error("Error fetching employee data:", error);
        window.location.href = "../admin/login.html";
      }
    } else {
      // Not logged in, redirect to login
      window.location.href = "../admin/login.html";
    }
  });

  // Handle logout
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      window.location.href = "../admin/login.html";
    } catch (error) {
      console.error("Error signing out:", error);
    }
  });

  // Modify the getEmployeeByContact function to use the dynamic contact
  async function getEmployeeByContact(contactNo) {
    // If we already have employee data, return it
    if (employeeData && employeeData.contact_number === contactNo) {
      return { id: employeeData.id, data: employeeData };
    }

    const q = query(
      collection(db, "employees"),
      where("contact_number", "==", contactNo)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error("Employee not found");
    }

    const empDoc = snapshot.docs[0];
    return { id: empDoc.id, data: empDoc.data() };
  }

  async function getEmployeeVehicles(employeeId) {
    const vehiclesRef = collection(db, "employees", employeeId, "vehicles");
    const snapshot = await getDocs(vehiclesRef);

    const vehicles = [];
    snapshot.forEach((doc) => {
      vehicles.push({ id: doc.id, ...doc.data() });
    });

    return vehicles;
  }

  // Firestore-backed slot lists - now organized by floor
  // Modify the slotsByFloor structure to include docIds
  let slotsByFloor = {}; // Structure: { "Level 0": { free: [], unauthorized: [{name: "A1", docId: "xxx"}], booked: [] }, ... }
  let employeeBuilding = null; // Will store employee's building
  let currentBooking = null; // User's current booked slot

  async function loadSlotsFromDB() {
    slotsByFloor = {};

    try {
      // First get employee's building
      const employee = await getEmployeeByContact(employeeContact);
      employeeBuilding = employee.data.building;
      console.log("Employee building:", employeeBuilding);

      // Get all slots and filter by employee's building
      const q = collection(db, "ParkingSlots");
      const snapshot = await getDocs(q);

      snapshot.forEach((doc) => {
        const data = doc.data();

        // Check if the slot's building contains the employee's building name
        if (data.building && data.building.includes(employeeBuilding)) {
          const slotInfo = {
            name: data.slot_name,
            docId: doc.id
          };
          const floor = data.floor || "Unknown Floor";

          // Initialize floor object if it doesn't exist
          if (!slotsByFloor[floor]) {
            slotsByFloor[floor] = {
              free: [],
              unauthorized: [],
              booked: [],
            };
          }

          // Categorize slots by status
          switch (data.status.toLowerCase()) {
            case "free":
              slotsByFloor[floor].free.push(slotInfo);
              break;
            case "booked":
              slotsByFloor[floor].booked.push(slotInfo);
              break;
            case "unbooked":
              slotsByFloor[floor].unauthorized.push(slotInfo);
              break;
          }
        }
      });

      console.log("Slots loaded by floor:", slotsByFloor);
    } catch (err) {
      console.error("Error loading slots:", err);
    }
  }

  // Add this new function after loadSlotsFromDB()

  async function loadExistingBooking() {
    try {
      if (!employeeData || !employeeData.id) {
        console.error("No employee data available");
        return null;
      }

      const now = new Date();
      const bookingsRef = collection(db, "bookings");
      
      // Simplified query - just check status first
      const q = query(
        bookingsRef,
        where("status", "==", "Confirmed")
      );

      const snapshot = await getDocs(q);
      
      for (const bookingDoc of snapshot.docs) {
        const data = bookingDoc.data();
        
        // Client-side filtering for employee's bookings
        if (data.vehicle_id.startsWith(`employees/${employeeData.id}/`)) {
          const expiryTime = data.expiry_time.toDate();

          // Check if booking is still valid
          if (expiryTime > now) {
            // Get slot details
            const slotRef = data.slot_id;
            const slotDoc = await getDoc(slotRef);

            if (slotDoc.exists()) {
              // Set currentBooking
              currentBooking = {
                name: slotDoc.data().slot_name,
                id: slotDoc.id,
                bookingDocId: bookingDoc.id
              };
              console.log("Restored existing booking:", currentBooking);
              return;
            }
          }
        }
      }
      
      console.log("No active bookings found");
      currentBooking = null;

    } catch (err) {
      console.error("Error loading existing booking:", err);
      currentBooking = null;
    }
  }

  // Update the helper function to handle new structure
  function getFlatSlotsByStatus(status) {
    const slots = [];
    Object.values(slotsByFloor).forEach((floor) => {
      slots.push(...floor[status].map(slot => slot.name));
    });
    return slots;
  }

  function addMessage(text, sender = "bot", html = false, className = "") {
    let div = document.createElement("div");
    div.className = "msg " + sender;
    let bubble = document.createElement("div");
    bubble.className = "bubble " + className;
    bubble.innerHTML = html ? text : escapeHtml(text);
    div.appendChild(bubble);
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    // bind event listeners for new buttons
    bindDynamicButtons();
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function showInitialOptions() {
    addMessage(
      "👋 Hello! I'm ParkNex, your parking assistant. Say 'hi' to get started or just tell me what you want to do!"
    );
  }

  function showMainMenu() {
    addMessage(
      "Hello! Welcome to Smart Parking System. What would you like to do?"
    );
    const opts = `
                    <div class="options">
                        <button class="option-btn" data-action="book">🚗 Book a Slot</button>
                        <button class="option-btn" data-action="manage">⚙ Manage Current Booking</button>
                        <button class="option-btn" data-action="list">📋 List Free Slots</button>
                        <button class="option-btn" data-action="report">⚠ Report Issues</button>
                    </div>`;
    addMessage(opts, "bot", true);
  }

  async function analyzeUserIntent(userInput) {
    if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
      // Fallback to simple keyword matching
      return analyzeIntentFallback(userInput);
    }

    try {
      addMessage("🤔 Understanding your request...", "bot", false, "loading");

      // Get flat arrays for the prompt
      const freeSlots = getFlatSlotsByStatus("free");
      const unauthorizedSlots = getFlatSlotsByStatus("unauthorized");

      const prompt = `
                        You are a parking assistant AI. Analyze the user's input and determine their intent and extract relevant information.
                        
                        Available actions:
                        - book: User wants to book a parking slot
                        - manage: User wants to manage their current booking
                        - list: User wants to see available slots
                        - report: User wants to report an issue
                        - extend: User wants to extend their booking
                        - leave: User wants to leave/end their booking
                        - greet: User is greeting or saying hi
                        
                        Current system state:
                        - Free slots: ${freeSlots.join(", ")}
                        - Occupied but unbookable slots: ${unauthorizedSlots.join(
                          ", "
                        )}
                        - User's current booking: ${currentBooking || "None"}
                        
                        User input: "${userInput}"
                        
                        Respond ONLY with a JSON object in this exact format:
                        {
                            "intent": "action_name",
                            "slot": "slot_number_if_mentioned",
                            "confidence": 0.0-1.0
                        }
                        
                        Examples:
                        - "park at A42" → {"intent": "book", "slot": "A42", "confidence": 0.9}
                        - "A42" → {"intent": "book", "slot": "A42", "confidence": 0.9}
                        - "book slot B7" → {"intent": "book", "slot": "B7", "confidence": 0.9}
                        - "leave slot" → {"intent": "leave", "slot": null, "confidence": 0.8}
                        - "show me free slots" → {"intent": "list", "slot": null, "confidence": 0.9}
                    `;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
          }),
        }
      );

      const data = await response.json();

      // Remove the loading message
      messagesEl.removeChild(messagesEl.lastChild);

      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const result = data.candidates[0].content.parts[0].text;
        try {
          // Clean the response - remove markdown code blocks if present
          let cleanResult = result.trim();

          // Remove ```json and ``` wrappers if they exist
          if (cleanResult.startsWith("```json")) {
            cleanResult = cleanResult
              .replace(/^```json\s*/, "")
              .replace(/\s*```$/, "");
          } else if (cleanResult.startsWith("```")) {
            cleanResult = cleanResult
              .replace(/^```\s*/, "")
              .replace(/\s*```$/, "");
          }

          // Parse the cleaned JSON
          const parsed = JSON.parse(cleanResult.trim());

          // Validate the response structure
          if (parsed.intent && typeof parsed.confidence === "number") {
            return parsed;
          } else {
            console.warn("Invalid response structure:", parsed);
            return analyzeIntentFallback(userInput);
          }
        } catch (e) {
          console.error("Failed to parse Gemini response:", result);
          return analyzeIntentFallback(userInput);
        }
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Gemini API error:", error);
      // Remove loading message if it exists
      if (
        messagesEl.lastChild &&
        messagesEl.lastChild.querySelector(".loading")
      ) {
        messagesEl.removeChild(messagesEl.lastChild);
      }
      return analyzeIntentFallback(userInput);
    }
  }

  function analyzeIntentFallback(userInput) {
    const input = userInput.toLowerCase().trim();

    // Extract slot number if present
    const slotMatch = input.match(/[a-z]?\d+/i);
    const slot = slotMatch ? slotMatch[0].toUpperCase() : null;

    if (
      input.includes("hi") ||
      input.includes("hello") ||
      input.includes("start")
    ) {
      return { intent: "greet", slot: null, confidence: 0.9 };
    }

    if (
      input.includes("book") ||
      input.includes("park") ||
      input.includes("reserve")
    ) {
      return { intent: "book", slot: slot, confidence: 0.8 };
    }

    if (
      input.includes("leave") ||
      input.includes("exit") ||
      input.includes("end")
    ) {
      return { intent: "leave", slot: slot, confidence: 0.8 };
    }

    if (input.includes("extend") || input.includes("renew")) {
      return { intent: "extend", slot: null, confidence: 0.8 };
    }

    if (
      input.includes("list") ||
      input.includes("show") ||
      input.includes("available") ||
      input.includes("free")
    ) {
      return { intent: "list", slot: null, confidence: 0.8 };
    }

    if (
      input.includes("report") ||
      input.includes("problem") ||
      input.includes("issue")
    ) {
      return { intent: "report", slot: null, confidence: 0.8 };
    }

    if (
      input.includes("manage") ||
      input.includes("current") ||
      input.includes("booking")
    ) {
      return { intent: "manage", slot: null, confidence: 0.7 };
    }

    return { intent: "unknown", slot: slot, confidence: 0.1 };
  }

  async function processUserInput(userInput) {
    const analysis = await analyzeUserIntent(userInput);

    switch (analysis.intent) {
      case "greet":
        showMainMenu();
        break;

      case "book":
        if (analysis.slot) {
          validateAndBookSlot(analysis.slot);
        } else {
          handleOption("book");
        }
        break;

      case "leave":
        if (currentBooking) {
          leaveSlot();
        } else {
          addMessage(
            "❌ You don't have any active booking to leave.",
            "bot",
            false,
            "error"
          );
        }
        break;

      case "extend":
        if (currentBooking) {
          extendBooking();
        } else {
          addMessage(
            "❌ You don't have any active booking to extend.",
            "bot",
            false,
            "error"
          );
        }
        break;

      case "list":
        handleOption("list");
        break;

      case "report":
        handleOption("report");
        break;

      case "manage":
        handleOption("manage");
        break;

      default:
        addMessage(
          "❓ I didn't understand that. Could you please rephrase or use one of the menu options?",
          "bot",
          false,
          "error"
        );
        showMainMenu();
    }
  }

  function validateAndBookSlot(slot) {
    // Remove the padding logic since we're using exact names from DB
    slot = slot.toUpperCase();

    // Check if user already has a booking
    if (currentBooking) {
        addMessage(
            `❌ You already have slot ${currentBooking.name} booked. Please leave it first before booking another slot.`,
            "bot",
            false,
            "error"
        );
        return;
    }

    // Get arrays of slot objects instead of just names
    const getSlotsByStatus = (status) => {
        const slots = [];
        Object.values(slotsByFloor).forEach((floor) => {
            slots.push(...floor[status]);
        });
        return slots;
    };

    const unauthorizedSlots = getSlotsByStatus("unauthorized");
    const bookedSlots = getSlotsByStatus("booked");
    const freeSlots = getSlotsByStatus("free");

    // Check if the slot is in unauthorized (occupied but not booked) category
    if (unauthorizedSlots.find(s => s.name === slot)) {
        handleBooking(slot);
        return;
    }

    // Check if slot is already booked
    if (bookedSlots.find(s => s.name === slot)) {
        addMessage(
            `❌ Slot ${slot} is already booked by someone else.`,
            "bot",
            false,
            "error"
        );
        return;
    }

    // Check if slot is free (can't book free slots directly)
    if (freeSlots.find(s => s.name === slot)) {
        const availableSlots = unauthorizedSlots.map(s => s.name).join(", ");
        addMessage(
            `❌ Slot ${slot} is currently free. You can only book occupied-unbooked slots. Available slots: ${availableSlots}`,
            "bot",
            false,
            "error"
        );
        return;
    }

    // Slot doesn't exist
    const availableSlots = unauthorizedSlots.map(s => s.name).join(", ");
    addMessage(
        `❌ Slot ${slot} doesn't exist or isn't available for booking. Available slots: ${availableSlots}`,
        "bot",
        false,
        "error"
    );
  }

  function handleOption(opt) {
    if (opt === "book") {
      if (currentBooking) {
        addMessage(
          `❌ You already have slot ${currentBooking.name} booked. Please leave it first before booking another slot.`,
          "bot",
          false,
          "error"
        );
        return;
      }

      const unauthorizedSlots = getFlatSlotsByStatus("unauthorized");

      if (unauthorizedSlots.length === 0) {
        addMessage(
          `❌ No occupied-unbooked slots available in ${employeeBuilding} building right now.`,
          "bot",
          false,
          "error"
        );
        return;
      }

      addMessage(
        `Here are the available slots in ${employeeBuilding} building (occupied but not booked), grouped by floor:`
      );

      // Display slots grouped by floor
      Object.keys(slotsByFloor).forEach((floor) => {
        if (slotsByFloor[floor].unauthorized.length > 0) {
          addMessage(`🏢 ${floor}:`, "bot", false, "info");

          let btns = '<div class="options">';
          slotsByFloor[floor].unauthorized.forEach((slot) => {
            btns += `<button class="option-btn book-slot" data-slot="${slot.name}">📍 Slot ${slot.name}</button>`;
          });
          btns += "</div>";
          addMessage(btns, "bot", true);
        }
      });
    }

    if (opt === "manage") {
      if (currentBooking) {
        addMessage(
          `📍 Current Booking: Slot ${currentBooking.name}`,
          "bot",
          false,
          "success"
        );
        const opts = `
                            <div class="options">
                                <button class="option-btn" data-action="extend">⏰ Extend Booking</button>
                                <button class="option-btn" data-action="leave">⬅ Leave Slot</button>
                            </div>`;
        addMessage(opts, "bot", true);
      } else {
        addMessage("❌ You have no current booking.", "bot", false, "error");
      }
    }

    if (opt === "list") {
      const freeSlots = getFlatSlotsByStatus("free");

      if (freeSlots.length > 0) {
        addMessage(
          `🅿 Currently Free Slots in ${employeeBuilding} building, grouped by floor:`,
          "bot",
          false,
          "success"
        );

        // Display free slots grouped by floor
        Object.keys(slotsByFloor).forEach((floor) => {
          if (slotsByFloor[floor].free.length > 0) {
            addMessage(
              `🏢 **${floor}:** ${slotsByFloor[floor].free.join(", ")}`,
              "bot",
              false,
              "success"
            );
          }
        });
      } else {
        addMessage(
          `❌ No free slots available in ${employeeBuilding} building at the moment.`,
          "bot",
          false,
          "error"
        );
      }
    }

    if (opt === "report") {
      const opts = `
                        <div class="options">
                            <button class="option-btn" data-action="reportSlot">🚫 Report my booked slot</button>
                            <button class="option-btn" data-action="reportUnauthorized">⚠ Report unauthorized parking</button>
                        </div>`;
      addMessage(opts, "bot", true);
    }
  }

  function getTodayExpiry() {
    const expiry = new Date();
    expiry.setHours(18, 0, 0, 0); // 6 PM
    return expiry;
  }

  async function getSlotDocIdByName(slotName, building) {
    // Pad single digit numbers with leading zero
    slotName = slotName.toUpperCase().replace(/(\D)(\d)$/, "$10$2");

    const q = query(
        collection(db, "ParkingSlots"),
        where("slot_name", "==", slotName),
        where("building", "==", building)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        throw new Error(`Parking slot "${slotName}" not found in building "${building}".`);
    }

    return snapshot.docs[0].id;
  }

  // Add this new function to check for active bookings
  async function hasActiveBooking(employeeId, vehicleId) {
    try {
        const bookingsRef = collection(db, "bookings");
        const q = query(
            bookingsRef,
            where("vehicle_id", "==", `employees/${employeeId}/vehicles/${vehicleId}`),
            where("status", "==", "Confirmed")
        );

        const snapshot = await getDocs(q);
        const now = new Date();

        // Check if any booking is still active (not expired)
        for (const doc of snapshot.docs) {
            const data = doc.data();
            if (data.expiry_time.toDate() > now) {
                return true;
            }
        }
        return false;
    } catch (err) {
        console.error("Error checking active bookings:", err);
        throw err;
    }
  }

  // Modify bookSlot function to check for active bookings first
  async function bookSlot(slotName, employeeId, vehicleId) {
    // First check if user has any active booking
    const hasBooking = await hasActiveBooking(employeeId, vehicleId);
    if (hasBooking) {
        throw new Error("Active booking exists");
    }

    // Find the slot docId from our stored data
    let slotDocId = null;
    for (const floor of Object.values(slotsByFloor)) {
        const slot = floor.unauthorized.find(s => s.name === slotName);
        if (slot) {
            slotDocId = slot.docId;
            break;
        }
    }

    if (!slotDocId) {
        throw new Error(`Slot ${slotName} not found`);
    }

    try {
        const bookingsRef = collection(db, "bookings");
        const now = new Date();
        const expiry = getTodayExpiry();

        // Create the booking using the slot's document ID
        const bookingData = {
            vehicle_id: `employees/${employeeId}/vehicles/${vehicleId}`,
            slot_id: doc(db, "ParkingSlots", slotDocId),
            booking_time: Timestamp.fromDate(now),
            expiry_time: Timestamp.fromDate(expiry),
            status: "Confirmed"
        };

        // Start a batch write to ensure both operations succeed or fail together
        const batch = writeBatch(db);

        // 1. Create the booking document
        const newBookingRef = doc(bookingsRef);
        batch.set(newBookingRef, bookingData);

        // 2. Update the slot status
        const slotRef = doc(db, "ParkingSlots", slotDocId);
        batch.update(slotRef, {
            status: "Booked"  // Update status from "Unbooked" to "Booked"
        });

        // Commit both operations
        await batch.commit();

        return {
            bookingId: newBookingRef.id,
            slotName: slotName,
            slotDocId: slotDocId
        };

    } catch (err) {
        console.error("Error during booking:", err);
        throw new Error("Failed to create booking");
    }
  }

  // Example usage:
  async function handleBooking(slotName) {
    // Disable all booking buttons to prevent multiple clicks
    document.querySelectorAll(".book-slot").forEach((btn) => {
      btn.disabled = true;
      btn.style.cssText = "opacity: 0.5; cursor: not-allowed;";
    });
    try {
      const employee = await getEmployeeByContact(employeeContact);
      const vehicles = await getEmployeeVehicles(employee.id);
      if (vehicles.length === 0)
        throw new Error("No vehicles found for this employee");

      const selectedVehicle = vehicles[0];
      const bookingResult = await bookSlot(
        slotName,
        employee.id,
        selectedVehicle.id
      );

      currentBooking = {
        name: bookingResult.slotName,
        id: bookingResult.slotDocId,
        bookingDocId: bookingResult.bookingId,
      };

      // Update local arrays
      Object.keys(slotsByFloor).forEach((floor) => {
        const index = slotsByFloor[floor].unauthorized.indexOf(slotName);
        if (index > -1) {
          slotsByFloor[floor].unauthorized.splice(index, 1);
          slotsByFloor[floor].booked.push(slotName);
        }
      });
      addMessage(
        `✅ Slot ${slotName} booked successfully for vehicle ${selectedVehicle.registration_no}.`,
        "bot",
        false,
        "success"
      );
    } catch (err) {
      console.error("❌ Error booking slot:", err);

      // *** THIS IS THE CRITICAL FIX ***
      if (err.message.includes("Active booking")) {
        try {
          const employee = await getEmployeeByContact(employeeContact);
          const vehicles = await getEmployeeVehicles(employee.id);
          const activeBooking = await getCurrentBooking(
            employee.id,
            vehicles[0].id
          );

          if (activeBooking) {
            // Synchronize the local state with the database state
            currentBooking = activeBooking;
            addMessage(
              `⚠️ You already have an active booking for slot ${activeBooking.name}.`,
              "bot",
              false,
              "warning"
            );
          } else {
            addMessage(
              "⚠️ You already have an active booking.",
              "bot",
              false,
              "warning"
            );
          }
        } catch (fetchErr) {
          addMessage(
            "⚠️ You already have an active booking.",
            "bot",
            false,
            "warning"
          );
        }
      } else {
        addMessage(
          `❌ Failed to create booking for ${slotName}. Please try again. Reason: ${err.message}`,
          "bot",
          false,
          "error"
        );
      }

      // Re-enable buttons only if booking failed
      document.querySelectorAll(".book-slot").forEach((btn) => {
        btn.disabled = false;
        btn.style.cssText = "opacity: 1; cursor: pointer;";
      });
    }
  }

  // Add this new helper function
  async function getCurrentBooking(employeeId, vehicleId) {
    try {
      const bookingsRef = collection(db, "bookings");
      // Note the path construction matches the bookSlot function
      const q = query(
        bookingsRef,
        where(
          "vehicle_id",
          "==",
          `employees/${employeeId}/vehicles/${vehicleId}`
        ),
        where("status", "==", "Confirmed")
      );

      const snapshot = await getDocs(q);
      const now = new Date();

      for (const bookingDoc of snapshot.docs) {
        const data = bookingDoc.data();
        if (data.expiry_time.toDate() > now) {
          const slotRef = data.slot_id; // This is a DocumentReference
          const slotDoc = await getDoc(slotRef);
          if (slotDoc.exists()) {
            // Return the full object the app needs
            return {
              name: slotDoc.data().slot_name,
              id: slotDoc.id,
              bookingDocId: bookingDoc.id,
            };
          }
        }
      }
      return null; // No active booking found
    } catch (err) {
      console.error("Error fetching current booking:", err);
      return null;
    }
  }

  function extendBooking() {
    addMessage("✅ Booking extended by 1 hour.", "bot", false, "success");
  }

  async function leaveSlot() {
    if (!currentBooking || !currentBooking.bookingDocId) {
      addMessage(
        "⚠️ You don't have any active slot to leave.",
        "bot",
        false,
        "warning"
      );
      return;
    }

    const leftSlotName = currentBooking.name;
    const bookingDocId = currentBooking.bookingDocId;
    const slotDocId = currentBooking.id;

    try {
      // Use batch to update both booking and slot
      const batch = writeBatch(db);

      // 1. Update the booking document
      const bookingDocRef = doc(db, "bookings", bookingDocId);
      batch.update(bookingDocRef, {
        status: "Cancelled",
        expiry_time: Timestamp.now(),
      });

      // 2. Update the slot status back to free
      const slotRef = doc(db, "ParkingSlots", slotDocId);
      batch.update(slotRef, {
        status: "Free"  // Set status back to free when slot is left
      });

      // Commit both operations
      await batch.commit();

      // Update local arrays
      Object.keys(slotsByFloor).forEach((floor) => {
        const index = slotsByFloor[floor].booked.indexOf(leftSlotName);
        if (index > -1) {
          slotsByFloor[floor].booked.splice(index, 1);
          slotsByFloor[floor].free.push(leftSlotName);
        }
      });

      addMessage(
        `✅ Left slot ${leftSlotName}. The slot is now available for others.`,
        "bot",
        false,
        "success"
      );

      currentBooking = null;
    } catch (err) {
      console.error("Error leaving slot:", err);
      addMessage(
        "❌ Could not leave slot due to an error.",
        "bot",
        false,
        "error"
      );
    }
  }

  function reportSlot() {
    if (currentBooking) {
      addMessage(
        `✅ Report for your booked slot ${currentBooking.name} has been sent to admin.`,
        "bot",
        false,
        "success"
      );
    } else {
      addMessage(
        "❌ You don't have any active booking to report.",
        "bot",
        false,
        "error"
      );
    }
  }

  function reportUnauthorized() {
    addMessage("📸 Please upload an image of unauthorized parking.");
    addMessage(
      '<input type="file" accept="image/*" class="option-btn" style="background: #ff9800; margin-top: 10px;" />',
      "bot",
      true
    );
  }

  async function sendMessage() {
    const text = inputEl.value.trim();
    if (!text) return;

    addMessage(text, "user");
    inputEl.value = "";

    await processUserInput(text);
  }

  // Bind clicks for static elements
  sendBtn.addEventListener("click", sendMessage);
  inputEl.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  // Bind for dynamic buttons (after they are added)
  function bindDynamicButtons() {
    document.querySelectorAll(".option-btn").forEach((btn) => {
      if (btn.onclick) return; // Already bound

      btn.onclick = () => {
        const action = btn.dataset.action;
        if (action) {
          if (
            action === "book" ||
            action === "manage" ||
            action === "list" ||
            action === "report"
          ) {
            handleOption(action);
          } else if (action === "extend") {
            if (currentBooking) {
              extendBooking();
            } else {
              addMessage(
                "❌ You don't have any active booking to extend.",
                "bot",
                false,
                "error"
              );
            }
          } else if (action === "leave") {
            if (currentBooking) {
              leaveSlot();
            } else {
              addMessage(
                "❌ You don't have any active booking to leave.",
                "bot",
                false,
                "error"
              );
            }
          } else if (action === "reportSlot") {
            reportSlot();
          } else if (action === "reportUnauthorized") {
            reportUnauthorized();
          }
        }
      };
    });

    document.querySelectorAll(".book-slot").forEach((btn) => {
      // Remove existing event listener and add new one
      btn.onclick = null;
      btn.onclick = () => {
        const slot = btn.dataset.slot;
        validateAndBookSlot(slot);
      };
    });
  }

  // Initialize
  (async () => {
    // Remove initialization code from here since it's now handled in onAuthStateChanged
  })();
});
