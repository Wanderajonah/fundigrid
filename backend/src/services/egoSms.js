const https = require("https");
const http = require("http");

// eGoSMS JSON API — same contract as Pahappa's @pahappalimited/comms-sdk.
// Credentials live in the body (userdata), not in an auth header.
const DEFAULT_ENDPOINT = "https://comms.egosms.co/api/v1/json";
const PRIORITY_HIGH = "1";

function isConfigured() {
  return Boolean(process.env.COMMS_ENDPOINT && process.env.COMMS_USERNAME && process.env.COMMS_API_KEY);
}

// eGoSMS accepts 256XXXXXXXXX, 0XXXXXXXXX and +256XXXXXXXXX — normalise all
// of them to 256… so the gateway can route them.
function normalizeNumber(phone) {
  let cleaned = String(phone || "").replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+")) cleaned = cleaned.slice(1);
  if (cleaned.startsWith("0")) cleaned = `256${cleaned.slice(1)}`;
  return cleaned;
}

function post(endpoint, payload) {
  const body = JSON.stringify(payload);
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(endpoint);
    } catch (err) {
      reject(new Error(`Invalid SMS endpoint: ${endpoint}`));
      return;
    }
    const transport = parsed.protocol === "https:" ? https : http;
    const req = transport.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
        path: `${parsed.pathname}${parsed.search || ""}`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
        timeout: Number(process.env.COMMS_TIMEOUT_MS) || 15000,
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => { raw += chunk; });
        res.on("end", () => {
          let data = raw;
          try { data = JSON.parse(raw); } catch { /* keep the raw text */ }
          resolve({ statusCode: res.statusCode, data });
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(new Error("SMS request timed out")); });
    req.write(body);
    req.end();
  });
}

function requestPayload(body) {
  return {
    method: body.method,
    userdata: {
      username: process.env.COMMS_USERNAME,
      // eGoSMS calls the API key "password" on the wire.
      password: process.env.COMMS_API_KEY,
    },
    walletType: "Local",
    ...(body.msgdata ? { msgdata: body.msgdata } : {}),
  };
}

function providerMessage(data) {
  if (data && typeof data === "object") return String(data.Message || data.message || "");
  return String(data || "").slice(0, 300);
}

async function sendSms(phone, message) {
  if (!isConfigured()) {
    return { success: false, configured: false, message: "SMS provider not configured" };
  }

  const number = normalizeNumber(phone);
  if (!/^\d{9,15}$/.test(number)) {
    return { success: false, configured: true, message: `Invalid phone number: ${phone}` };
  }

  const endpoint = process.env.COMMS_ENDPOINT || DEFAULT_ENDPOINT;
  const payload = requestPayload({
    method: "SendSms",
    msgdata: [{
      number,
      message,
      senderid: process.env.COMMS_SENDER_ID || "FundiGrid",
      priority: PRIORITY_HIGH,
    }],
  });

  try {
    const { statusCode, data } = await post(endpoint, payload);
    const status = data && typeof data === "object" ? String(data.Status || "") : "";
    const ok = statusCode >= 200 && statusCode < 300 && status.toLowerCase() === "ok";
    if (ok) {
      return { success: true, data };
    }
    const detail = providerMessage(data) || `HTTP ${statusCode}`;
    console.error(`[egoSms] send failed (${statusCode}): ${detail}`);
    return { success: false, configured: true, message: detail || "SMS rejected by provider" };
  } catch (err) {
    console.error("[egoSms] send error:", err.message);
    return { success: false, configured: true, message: err.message };
  }
}

// Read-only credits check — useful to confirm credentials without spending an SMS.
async function getBalance() {
  if (!isConfigured()) return { success: false, configured: false, message: "SMS provider not configured" };
  const endpoint = process.env.COMMS_ENDPOINT || DEFAULT_ENDPOINT;
  try {
    const { statusCode, data } = await post(endpoint, requestPayload({ method: "Balance" }));
    const ok = statusCode >= 200 && statusCode < 300 && data && typeof data === "object" && data.Balance != null;
    if (ok) return { success: true, balance: Number(data.Balance), currency: data.Currency || "" };
    return { success: false, message: providerMessage(data) || `HTTP ${statusCode}` };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

module.exports = { sendSms, getBalance, normalizeNumber, isConfigured };
