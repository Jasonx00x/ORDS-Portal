"use client";

import { useMemo, useState } from "react";
import type { ConsultationRecord } from "@/lib/consultations/admin-data";

function formatDateTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone || "America/New_York",
  }).format(new Date(value));
}

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "America/New_York",
  }).format(new Date(value));
}

export function ConsultationRecords({ records }: { records: ConsultationRecord[] }) {
  const [query, setQuery] = useState("");
  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return records;

    return records.filter((record) => [
      record.bookingReference,
      record.customerEmail,
      record.customerName,
      record.customerPhone,
      record.instrumentOrService,
      record.source,
      record.status,
      record.studentName,
    ].some((value) => value.toLowerCase().includes(normalizedQuery)));
  }, [query, records]);

  return (
    <>
      <input
        aria-label="Search consultation records"
        className="consultation-admin-search"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by name, email, phone, instrument, or reference"
        type="search"
        value={query}
      />

      {filteredRecords.length === 0 ? (
        <div className="booking-empty-state">
          <strong>{records.length === 0 ? "No consultation records yet" : "No matching consultations"}</strong>
          <span>{records.length === 0
            ? "Confirmed consultation requests will appear here with contact details, appointment status, source, and creation date."
            : "Try a different name, email, phone number, instrument, or booking reference."}</span>
        </div>
      ) : (
        <div className="ops-table consultation-admin-table">
          <div className="table-head">
            <span>Customer</span><span>Contact</span><span>Appointment</span><span>Student</span><span>Status</span><span>Source</span>
          </div>
          {filteredRecords.map((record) => (
            <div key={record.id}>
              <div><strong>{record.customerName}</strong><span>{record.bookingReference}</span></div>
              <div><strong>{record.customerEmail}</strong><span>{record.customerPhone}</span></div>
              <div><strong>{formatDateTime(record.startTime, record.timezone)}</strong><span>Eastern Time</span></div>
              <div><strong>{record.studentName}</strong><span>{record.instrumentOrService}</span></div>
              <span className={`booking-status ${record.status}`}>{record.status.replaceAll("_", " ")}</span>
              <div><strong>{record.source}</strong><span>Created {formatCreatedAt(record.createdAt)}</span></div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
