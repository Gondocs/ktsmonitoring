// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";

// OGL is ESM-only; mock it in Jest (CRA) to avoid node_modules parse errors in tests.
jest.mock("ogl", () => ({
  Renderer: jest.fn(() => ({
    gl: {
      canvas: {},
      clearColor: jest.fn(),
    },
    setSize: jest.fn(),
    render: jest.fn(),
  })),
  Program: jest.fn(),
  Mesh: jest.fn(() => ({
    program: { uniforms: {} },
  })),
  Color: jest.fn(),
  Triangle: jest.fn(),
}));
