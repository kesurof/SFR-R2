import { render } from "@testing-library/react";
import { Input } from "antd";
import Password from "antd/es/input/Password";
import { describe, expect, it } from "vitest";

describe("attributs anti-gestionnaires de mots de passe", () => {
  it("transmet les opt-out à l’input natif", () => {
    const { container } = render(<Input data-bwignore data-1p-ignore data-form-type="other" defaultValue="x" />);
    const input = container.querySelector("input");
    expect(input).not.toBeNull();
    expect(input?.getAttribute("data-bwignore")).not.toBeNull();
    expect(input?.getAttribute("data-1p-ignore")).not.toBeNull();
    expect(input?.getAttribute("data-form-type")).toBe("other");
  });

  it("transmet les opt-out au champ mot de passe", () => {
    const { container } = render(<Password data-bwignore data-lpignore="true" autoComplete="new-password" />);
    const input = container.querySelector("input");
    expect(input).not.toBeNull();
    expect(input?.getAttribute("data-bwignore")).not.toBeNull();
    expect(input?.getAttribute("data-lpignore")).toBe("true");
  });
});
