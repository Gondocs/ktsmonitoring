import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsModal } from "./SettingsModal.tsx";

function mountSettingsModal(overrides = {}) {
  const props = {
    onClose: jest.fn(),
    intervalLoading: false,
    intervalMinutes: 30,
    setIntervalMinutes: jest.fn(),
    intervalSaving: false,
    saveInterval: jest.fn(),

    lightIntervalMinutes: 5,
    setLightIntervalMinutes: jest.fn(),
    lightIntervalSaving: false,
    saveLightInterval: jest.fn(),

    logRetentionDays: 15,
    setLogRetentionDays: jest.fn(),
    logRetentionSaving: false,
    saveLogRetention: jest.fn(),

    deletingAllLogs: false,
    handleDeleteAllLogs: jest.fn(),
    ...overrides,
  };

  render(<SettingsModal {...props} />);
  return props;
}

test("renders settings sections with initial values", () => {
  mountSettingsModal();

  expect(screen.getByText("Monitor beállítások")).toBeInTheDocument();
  expect(screen.getByText("Deep monitor intervallum")).toBeInTheDocument();
  expect(screen.getByText("Light monitor intervallum")).toBeInTheDocument();
  expect(screen.getByText("Napló megőrzési idő")).toBeInTheDocument();

  const spinboxes = screen.getAllByRole("spinbutton");
  expect(spinboxes).toHaveLength(3);
  expect(spinboxes[0]).toHaveValue(30);
  expect(spinboxes[1]).toHaveValue(5);
  expect(spinboxes[2]).toHaveValue(15);
});

test("deep interval input change and save calls the right callbacks", () => {
  const modalActions = mountSettingsModal();

  const [deepInput] = screen.getAllByRole("spinbutton");
  userEvent.clear(deepInput);
  expect(modalActions.setIntervalMinutes).toHaveBeenLastCalledWith(null);

  userEvent.type(deepInput, "42");
  expect(modalActions.setIntervalMinutes).toHaveBeenLastCalledWith(42);

  const saveButtons = screen.getAllByRole("button", { name: "Mentés" });
  userEvent.click(saveButtons[0]);
  expect(modalActions.saveInterval).toHaveBeenCalledTimes(1);
});

test("light interval, retention save and delete actions trigger callbacks", () => {
  const modalActions = mountSettingsModal();

  const saveButtons = screen.getAllByRole("button", { name: "Mentés" });
  userEvent.click(saveButtons[1]);
  expect(modalActions.saveLightInterval).toHaveBeenCalledTimes(1);

  userEvent.click(saveButtons[2]);
  expect(modalActions.saveLogRetention).toHaveBeenCalledTimes(1);

  userEvent.click(screen.getByRole("button", { name: "Minden napló törlése" }));
  expect(modalActions.handleDeleteAllLogs).toHaveBeenCalledTimes(1);
});

test("save button is disabled when deep interval value is null", () => {
  mountSettingsModal({ intervalMinutes: null });

  expect(screen.getAllByRole("button", { name: "Mentés" })[0]).toBeDisabled();
});
