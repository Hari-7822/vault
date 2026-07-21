import https from "https";
import http from "http";

const BASE_URL =
  process.env.SETU_DIGILOCKER_BASE_URL || "https://dg-sandbox.setu.co";
const CLIENT_ID = process.env.SETU_CLIENT_ID;
const CLIENT_SECRET = process.env.SETU_CLIENT_SECRET;
const REDIRECT_URL = process.env.DIGILOCKER_REDIRECT_URL;

const setuRequest = (method, path, body = null) =>
  new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const isHttps = url.protocol === "https:";
    const lib = isHttps ? https : http;
    const payload = body ? JSON.stringify(body) : null;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        "Content-Type": "application/json",
        "x-client-id": CLIENT_ID,
        "x-client-secret": CLIENT_SECRET,
        ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
      },
    };

    const req = lib.request(options, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });

export const createDigiLockerRequest = async (partnerId) => {
  if (!CLIENT_ID || !CLIENT_SECRET)
    throw new Error(
      "SETU_CLIENT_ID and SETU_CLIENT_SECRET must be set in .env",
    );
  if (!REDIRECT_URL)
    throw new Error("DIGILOCKER_REDIRECT_URL must be set in .env");

  const res = await setuRequest("POST", "/api/digilocker", {
    redirectUrl: `${REDIRECT_URL}?partnerId=${partnerId}`,
  });

  if (res.status !== 201 && res.status !== 200)
    throw new Error(`Setu error: ${JSON.stringify(res.body)}`);

  return {
    requestId: res.body.id,
    redirectUrl: res.body.url,
    validUntil: res.body.validUpto,
    status: res.body.status,
  };
};

export const getDigiLockerStatus = async (requestId) => {
  const res = await setuRequest("GET", `/api/digilocker/${requestId}`);

  if (res.status === 404)
    throw new Error("DigiLocker request not found or expired.");
  if (res.status !== 200)
    throw new Error(`Setu error: ${JSON.stringify(res.body)}`);

  return {
    requestId,
    status: res.body.status,
    partnerName: res.body.digilockerUserDetails?.name || null,
    aadhaarLinked: res.body.digilockerUserDetails?.aadhaarLinked || false,
  };
};

export const fetchAadhaarData = async (requestId) => {
  const res = await setuRequest("GET", `/api/digilocker/${requestId}/aadhaar`);

  if (res.status === 404)
    throw new Error("Aadhaar data not found. Partner may not have consented.");
  if (res.status !== 200)
    throw new Error(`Aadhaar fetch failed: ${JSON.stringify(res.body)}`);

  const a = res.body;
  return {
    maskedAadhaar: a.maskedAadhaarNumber || null,
    name: a.name || null,
    dob: a.dateOfBirth || null,
    gender: a.gender || null,
    address: {
      house: a.splitAddress?.house || null,
      street: a.splitAddress?.street || null,
      locality: a.splitAddress?.locality || null,
      district: a.splitAddress?.district || null,
      state: a.splitAddress?.state || null,
      pincode: a.splitAddress?.pincode || null,
      country: a.splitAddress?.country || "India",
    },
    photoBase64: a.photo || null,
    fileUrl: a.fileUrl || null,
  };
};

export const fetchDrivingLicense = async (requestId) => {
  const listRes = await setuRequest(
    "GET",
    `/api/digilocker/${requestId}/files`,
  );
  if (listRes.status !== 200)
    throw new Error(
      `Failed to get document list: ${JSON.stringify(listRes.body)}`,
    );
  const docs = listRes.body.files || [];
  const dlDoc = docs.find(
    (d) =>
      d.docType === "DRVLC" || d.description?.toLowerCase().includes("driving"),
  );
  if (!dlDoc)
    throw new Error(
      "Driving License not found in DigiLocker. Partner must add DL to their DigiLocker account first.",
    );
  const dlRes = await setuRequest(
    "GET",
    `/api/digilocker/${requestId}/files/${encodeURIComponent(dlDoc.uri)}`,
  );
  if (dlRes.status !== 200)
    throw new Error(`DL fetch failed: ${JSON.stringify(dlRes.body)}`);
  const dl = dlRes.body;
  return {
    licenseNumber: dl.licenseNumber || dl.dlNumber || null,
    name: dl.name || null,
    dob: dl.dob || dl.dateOfBirth || null,
    issueDate: dl.issueDate || null,
    expiryDate: dl.expiryDate || dl.validUpto || null,
    vehicleClasses: dl.vehicleClasses || dl.categories || [],
    issuingRTO: dl.issuingAuthority || null,
    state: dl.state || null,
    fileUrl: dl.fileUrl || null,
  };
};

export const validateNameMatch = (aadhaarName, dlName) => {
  if (!aadhaarName || !dlName)
    return { match: false, reason: "Name missing from one document." };
  const normalise = (s) =>
    s
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  const a = normalise(aadhaarName);
  const b = normalise(dlName);
  if (a === b) return { match: true, score: 100 };
  const aWords = new Set(a.split(" "));
  const bWords = new Set(b.split(" "));
  const smaller = aWords.size <= bWords.size ? aWords : bWords;
  const larger = aWords.size <= bWords.size ? bWords : aWords;
  const commonWords = [...smaller].filter((w) => larger.has(w));
  const score = Math.round((commonWords.length / smaller.size) * 100);

  if (score >= 70) return { match: true, score };
  return {
    match: false,
    score,
    reason: `Name mismatch: "${aadhaarName}" vs "${dlName}"`,
  };
};

export const revokeDigiLockerAccess = async (requestId) => {
  const res = await setuRequest("DELETE", `/api/digilocker/${requestId}`);
  return res.status === 200 || res.status === 204;
};
