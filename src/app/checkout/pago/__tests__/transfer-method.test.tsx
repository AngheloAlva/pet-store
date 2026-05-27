/**
 * Task 3.4 RED — TransferMethod component tests.
 * Renders fake bank details.
 * File picker accepts image/*.
 * Selecting a valid PNG calls FileReader.readAsDataURL and fires onSubmit with base64 dataUrl.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/app/actions/checkout/submit-transfer-receipt", () => ({
  submitTransferReceipt: vi.fn(async () => ({ ok: true, orderNumber: "PET-20260101-00001" })),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() })),
}));

describe("TransferMethod component", () => {
  let readAsDataURLSpy: ReturnType<typeof vi.fn>;
  let FileReaderOriginal: typeof FileReader;

  beforeEach(() => {
    FileReaderOriginal = globalThis.FileReader;
    readAsDataURLSpy = vi.fn();

    class MockFileReader {
      result: string | null = null;
      onload: ((event: unknown) => void) | null = null;
      onerror: ((event: unknown) => void) | null = null;

      readAsDataURL = readAsDataURLSpy.mockImplementation((_file: File) => {
        // Simulate async load
        setTimeout(() => {
          this.result = "data:image/png;base64,abc123";
          if (this.onload) {
            this.onload({ target: { result: this.result } });
          }
        }, 0);
      });
    }

    globalThis.FileReader = MockFileReader as unknown as typeof FileReader;
  });

  afterEach(() => {
    globalThis.FileReader = FileReaderOriginal;
    vi.clearAllMocks();
  });

  it("renders bank details section", async () => {
    const { TransferMethod } = await import("@/app/checkout/pago/transfer-method");
    render(
      <TransferMethod
        sessionId="sess-transfer-1"
        bankReference="REF-TEST-001"
        amount={15990}
      />,
    );

    // Should show fake bank details (multiple bank-related texts visible)
    const bankElements = screen.getAllByText(/cuenta|banco|rut|transferencia/i);
    expect(bankElements.length).toBeGreaterThan(0);
  });

  it("renders file picker that accepts image/*", async () => {
    const { TransferMethod } = await import("@/app/checkout/pago/transfer-method");
    render(
      <TransferMethod
        sessionId="sess-transfer-1"
        bankReference="REF-TEST-001"
        amount={15990}
      />,
    );

    const input = document.querySelector('input[type="file"]');
    expect(input).toBeInTheDocument();
    expect(input?.getAttribute("accept")).toMatch(/image/);
  });

  it("selecting a PNG file triggers FileReader.readAsDataURL", async () => {
    const { TransferMethod } = await import("@/app/checkout/pago/transfer-method");
    render(
      <TransferMethod
        sessionId="sess-transfer-1"
        bankReference="REF-TEST-001"
        amount={15990}
      />,
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeTruthy();

    const file = new File(["fake-png-content"], "receipt.png", { type: "image/png" });
    Object.defineProperty(input, "files", {
      value: [file],
      configurable: true,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(readAsDataURLSpy).toHaveBeenCalledWith(file);
    }, { timeout: 2000 });
  });
});
