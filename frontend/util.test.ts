import {
    assertEquals,
    assertArrayContains,
} from "https://deno.land/std@0.65.0/testing/asserts.ts";

import { generateSaurs } from "./util.js"

Deno.test("generateSaurs", () => {
    const saurs = generateSaurs();
    assertEquals(saurs != "", true);
})