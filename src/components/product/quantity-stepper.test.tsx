import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuantityStepper } from "./quantity-stepper";

describe("QuantityStepper", () => {
  it("renders the current value", () => {
    render(<QuantityStepper value={3} onChange={() => {}} />);
    expect(screen.getByLabelText("Cantidad")).toHaveValue(3);
  });

  it("disables the minus button at lower bound", () => {
    render(<QuantityStepper value={1} onChange={() => {}} />);
    expect(screen.getByRole("button", { name: /disminuir/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /aumentar/i })).not.toBeDisabled();
  });

  it("disables the plus button at upper bound", () => {
    render(<QuantityStepper value={99} onChange={() => {}} />);
    expect(screen.getByRole("button", { name: /aumentar/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /disminuir/i })).not.toBeDisabled();
  });

  it("emits onChange with incremented value on plus click", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<QuantityStepper value={3} onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /aumentar/i }));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("emits onChange with decremented value on minus click", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<QuantityStepper value={3} onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /disminuir/i }));
    expect(onChange).toHaveBeenCalledWith(2);
  });
});
