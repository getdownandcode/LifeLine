export type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: {
    message?: string;
    details?: unknown;
  };
};

export type ApiOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  retries?: number;
};

export type Metrics = {
  total: number;
  byEvent: Record<string, number>;
};

export type InventoryItem = {
  _id?: string;
  hospitalId: string;
  bloodType: string;
  unitsAvailable: number;
  unitsReserved?: number;
  lastUpdated?: string;
};

export type EmergencyRequest = {
  _id?: string;
  id?: string;
  patientId: string;
  bloodType: string;
  organRequired?: string;
  hospitalId: string;
  urgency: "critical" | "urgent" | "standard";
  status?: "pending" | "matched" | "fulfilled" | "cancelled";
  matchedDonorId?: string;
  requestedAt?: string;
  createdAt?: string;
};

export type DonorMatch = {
  donor: {
    _id?: string;
    name?: string;
    bloodType?: string;
    organTypes?: string[];
    availability?: boolean;
    responseRate?: number;
    contact?: {
      phone?: string;
      email?: string;
    };
  };
  distanceKm?: number;
  compatibilityScore?: number;
};

export type NotificationResult = {
  id?: string;
  channel?: string;
  status?: string;
  to?: string;
  message?: string;
  sentAt?: string;
  recipientId?: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

function correlationId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function unwrap<T>(payload: ApiEnvelope<T> | T): T {
  if (payload && typeof payload === "object" && "success" in payload) {
    const envelope = payload as ApiEnvelope<T>;
    if (envelope.success === false) {
      throw new Error(envelope.error?.message || "Request failed");
    }
    return envelope.data as T;
  }

  return payload as T;
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { retries = 1, headers, body, ...init } = options;
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          "X-Correlation-ID": correlationId(),
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await response.text();
      const payload = text ? JSON.parse(text) : {};

      if (!response.ok) {
        const envelope = payload as ApiEnvelope<unknown>;
        throw new Error(envelope.error?.message || `Request failed with ${response.status}`);
      }

      return unwrap<T>(payload);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Request failed");
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error("Request failed");
}

export function getMetrics() {
  return apiFetch<Metrics>("/api/analytics/metrics");
}

export function getLowStockAlerts(threshold = 5) {
  return apiFetch<InventoryItem[]>(`/api/inventory/alerts/low-stock?threshold=${threshold}`);
}

export function getHospitalStock(hospitalId: string) {
  return apiFetch<InventoryItem[]>(`/api/inventory/hospitals/${hospitalId}/stock`);
}

export function updateHospitalStock(hospitalId: string, body: {
  bloodType: string;
  unitsChange: number;
  lat: number;
  lng: number;
}) {
  return apiFetch<InventoryItem>(`/api/inventory/hospitals/${hospitalId}/update`, {
    method: "PUT",
    body,
  });
}

export function createEmergency(body: {
  patientId: string;
  bloodType: string;
  organRequired: string;
  hospitalId: string;
  urgency: string;
  lat: number;
  lng: number;
}) {
  return apiFetch<EmergencyRequest>("/api/matching/emergency", {
    method: "POST",
    body,
  });
}

export function getRecentEmergencies(limit = 5) {
  return apiFetch<EmergencyRequest[]>(`/api/matching/emergency/recent?limit=${limit}`);
}

export function getEmergencyStatus(requestId: string) {
  return apiFetch<EmergencyRequest>(`/api/matching/match/status/${requestId}`);
}

export function runMatch(requestId: string) {
  return apiFetch<{ request: EmergencyRequest; matches: DonorMatch[] }>(`/api/matching/match/${requestId}`, {
    method: "POST",
  });
}

export function findNearbyDonors(query: {
  lat: number;
  lng: number;
  radius: number;
  bloodType: string;
  organRequired: string;
  limit?: number;
}) {
  const params = new URLSearchParams({
    lat: String(query.lat),
    lng: String(query.lng),
    radius: String(query.radius),
    bloodType: query.bloodType,
    organRequired: query.organRequired,
    limit: String(query.limit || 10),
  });

  return apiFetch<{ items: DonorMatch[]; cached: boolean }>(`/api/matching/donors/nearby?${params}`);
}

export function sendNotification(channel: "sms" | "email" | "push" | "broadcast", body: {
  to?: string;
  recipientId?: string;
  message: string;
}) {
  return apiFetch<NotificationResult>(`/api/notifications/${channel}`, {
    method: "POST",
    body,
  });
}

export function getNotificationLogs(recipientId: string) {
  return apiFetch<NotificationResult[]>(`/api/notifications/logs/${recipientId}`);
}
