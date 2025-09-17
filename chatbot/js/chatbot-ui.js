import { db } from "../../public/js/firebase-config.js";
import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const messagesEl = document.getElementById("messages");
  const inputEl = document.getElementById("userInput");
  const sendBtn = document.getElementById("sendBtn");

  // Replace with your actual Gemini API key
  const GEMINI_API_KEY = "AIzaSyCp-51BuOXJq1V58Dz79AleKh2Nnm8DLUc";

  // Firestore-backed slot lists
  let freeSlots = [];
  let unauthorizedSlots = [];
  let bookedSlots = [];
  let currentBooking = null; // User's current booked slot

  async function loadSlotsFromDB() {
    freeSlots = [];
    unauthorizedSlots = [];
    bookedSlots = [];

    try {
      const q = collection(db, "parkingSlots");
      const snapshot = await getDocs(q);

      snapshot.forEach((doc) => {
        const data = doc.data();
        const slot_name = data.slot_name;


        switch (data.status.toLowerCase()) {
          case "free":
            freeSlots.push(slot_name);
            break;
          case "booked":
            bookedSlots.push(slot_name);
            break;
          case "unbooked":
            unauthorizedSlots.push(slot_name);
            break;
          case "reserved":
          case "named":
            // You can handle these separately if needed
            break;
        }
      });

      console.log("Slots loaded:", {
        freeSlots,
        bookedSlots,
        unauthorizedSlots,
      });
    } catch (err) {
      console.error("Error loading slots:", err);
    }
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
    slot = slot.toUpperCase();

    // Check if user already has a booking
    if (currentBooking) {
      addMessage(
        `❌ You already have slot ${currentBooking} booked. Please leave it first before booking another slot.`,
        "bot",
        false,
        "error"
      );
      return;
    }

    // Check if the slot is in unauthorized (occupied but not booked) category
    if (unauthorizedSlots.includes(slot)) {
      bookSlot(slot);
      return;
    }

    // Check if slot is already booked
    if (bookedSlots.includes(slot)) {
      addMessage(
        `❌ Slot ${slot} is already booked by someone else.`,
        "bot",
        false,
        "error"
      );
      return;
    }

    // Check if slot is free (can't book free slots directly)
    if (freeSlots.includes(slot)) {
      addMessage(
        `❌ Slot ${slot} is currently free. You can only book occupied-unbooked slots. Available slots: ${unauthorizedSlots.join(
          ", "
        )}`,
        "bot",
        false,
        "error"
      );
      return;
    }

    // Slot doesn't exist
    addMessage(
      `❌ Slot ${slot} doesn't exist or isn't available for booking. Available slots: ${unauthorizedSlots.join(
        ", "
      )}`,
      "bot",
      false,
      "error"
    );
  }

  function handleOption(opt) {
    if (opt === "book") {
      if (currentBooking) {
        addMessage(
          `❌ You already have slot ${currentBooking} booked. Please leave it first before booking another slot.`,
          "bot",
          false,
          "error"
        );
        return;
      }

      if (unauthorizedSlots.length === 0) {
        addMessage(
          "❌ No occupied-unbooked slots available right now.",
          "bot",
          false,
          "error"
        );
        return;
      }

      addMessage(
        "Here are the available slots (occupied but not booked). Please select one:"
      );
      let btns = '<div class="options">';
      unauthorizedSlots.forEach((slot) => {
        btns += `<button class="option-btn book-slot" data-slot="${slot}">📍 Slot ${slot}</button>`;
      });
      btns += "</div>";
      addMessage(btns, "bot", true);
    }

    if (opt === "manage") {
      if (currentBooking) {
        addMessage(
          `📍 Current Booking: Slot ${currentBooking}`,
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
      if (freeSlots.length > 0) {
        addMessage(
          "🅿 Currently Free Slots: " + freeSlots.join(", "),
          "bot",
          false,
          "success"
        );
      } else {
        addMessage(
          "❌ No free slots available at the moment.",
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

  function bookSlot(slot) {
    currentBooking = slot;
    unauthorizedSlots = unauthorizedSlots.filter((s) => s !== slot);
    bookedSlots.push(slot);
    addMessage(
      `✅ Slot ${slot} booked successfully! You can now manage your booking.`,
      "bot",
      false,
      "success"
    );
  }

  function extendBooking() {
    addMessage("✅ Booking extended by 1 hour.", "bot", false, "success");
  }

  function leaveSlot() {
    const leftSlot = currentBooking;
    bookedSlots = bookedSlots.filter((s) => s !== currentBooking);
    freeSlots.push(currentBooking);
    addMessage(
      `✅ Left slot ${leftSlot}. The slot is now available for others.`,
      "bot",
      false,
      "success"
    );
    currentBooking = null;
  }

  function reportSlot() {
    if (currentBooking) {
      addMessage(
        `✅ Report for your booked slot ${currentBooking} has been sent to admin.`,
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
    await loadSlotsFromDB();
    showInitialOptions();
  })();
});
