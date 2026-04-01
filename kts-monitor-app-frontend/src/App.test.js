import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("./Auth/auth.tsx", () => ({
  AuthProvider: ({ children }) => <>{children}</>,
  useAuth: () => ({ user: null, loading: false }),
}));

jest.mock("./LoginPage/LoginPage.tsx", () => ({
  LoginPage: () => <div>Mock Login</div>,
}));

import App from "./App";

test("renders login page when not authenticated", () => {
  render(<App />);
  expect(screen.getByText("Mock Login")).toBeInTheDocument();
});
