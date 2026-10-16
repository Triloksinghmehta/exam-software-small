import { describe, expect, it } from "vitest";
import { checkRow, identityKey, parseDob } from "../../supabase/functions/_shared/student-row";

describe("parseDob", () => {
  it("accepts DD-MM-YYYY and variants", () => {
    expect(parseDob("04-05-2015")).toBe("2015-05-04");
    expect(parseDob("4/5/2015")).toBe("2015-05-04");
  });
  it("rejects impossible or out-of-range dates", () => {
    for (const s of ["31-02-2015", "2015-05-04", "00-01-2015", "01-01-1980", "01-01-2999", ""]) expect(parseDob(s)).toBeNull();
  });
});

describe("checkRow", () => {
  it("cleans a good row", () => {
    const r = checkRow({ full_name: "  Riya   Sharma ", father_name: "Rakesh", dob: "04-05-2015", level: "Level 3" });
    expect(r).toEqual({ ok: true, value: { full_name: "Riya Sharma", father_name: "Rakesh", dob: "2015-05-04", level: 3 } });
  });
  it("lists every problem", () => {
    const r = checkRow({ full_name: "", father_name: "", dob: "31-02-2015", level: "12" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toHaveLength(4);
  });
  it("rejects level 9 and non-numbers", () => {
    for (const level of ["9", "-1", "3.5", "abc", ""]) expect(checkRow({ full_name: "a", father_name: "b", dob: "01-01-2015", level }).ok).toBe(false);
  });
  it("duplicate key ignores case", () => {
    expect(identityKey({ full_name: "Riya", father_name: "RAKESH", dob: "2015-05-04" }))
      .toBe(identityKey({ full_name: "riya", father_name: "rakesh", dob: "2015-05-04" }));
  });
});
