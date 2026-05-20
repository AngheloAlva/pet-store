import { vi, describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppointmentsPanel } from "./appointments-panel";
import type { AppointmentAdminRow } from "@/lib/staff/appointments";

vi.mock("@/app/actions/staff/appointments", () => ({
  markAppointmentAttended: vi.fn(),
  markAppointmentNoShow: vi.fn(),
}));

const baseAppt: AppointmentAdminRow = {
  id: "appt-1",
  userId: "user-1",
  userName: "María López",
  petId: null,
  petNameSnapshot: "Firulais",
  serviceId: "svc-1",
  serviceName: "Baño y Corte",
  storeId: "providencia",
  storeName: "Providencia",
  startsAt: new Date("2026-05-19T10:00:00"),
  endsAt: new Date("2026-05-19T11:00:00"),
  status: "scheduled",
  notes: null,
  cancelReason: null,
};

describe("AppointmentsPanel", () => {
  it("scheduled appointment shows two action buttons", () => {
    render(<AppointmentsPanel storeId="providencia" initialAppointments={[baseAppt]} />);
    expect(screen.getByRole("button", { name: /marcar atendida/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /no asistió/i })).toBeInTheDocument();
  });

  it("attended appointment shows badge only (no buttons)", () => {
    render(
      <AppointmentsPanel
        storeId="providencia"
        initialAppointments={[{ ...baseAppt, status: "attended" }]}
      />,
    );
    expect(screen.queryByRole("button", { name: /marcar atendida/i })).not.toBeInTheDocument();
    expect(screen.getByText("Atendida")).toBeInTheDocument();
  });

  it("no_show appointment shows badge only", () => {
    render(
      <AppointmentsPanel
        storeId="providencia"
        initialAppointments={[{ ...baseAppt, status: "no_show" }]}
      />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("No asistió")).toBeInTheDocument();
  });

  it("canceled appointment shows badge only", () => {
    render(
      <AppointmentsPanel
        storeId="providencia"
        initialAppointments={[{ ...baseAppt, status: "canceled" }]}
      />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("Cancelada")).toBeInTheDocument();
  });

  it("shows empty state when no appointments", () => {
    render(<AppointmentsPanel storeId="providencia" initialAppointments={[]} />);
    expect(screen.getByText(/no hay citas/i)).toBeInTheDocument();
  });
});
