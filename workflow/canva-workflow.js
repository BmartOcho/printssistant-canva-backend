// workflow/canva-workflow.js
import { createWorkflow } from "@workflow/core";
import { world } from "./world.js";
import axios from "axios";

/**
 * Canva workflow — creates a design via your existing Express /agent/command endpoint.
 */
export const canvaWorkflow = createWorkflow(world, async (input) => {
  const { name, width, height } = input;

  if (!name || !width || !height) {
    throw new Error("Missing required fields: name, width, height");
  }

  const res = await axios.post(`${process.env.BASE_URL}/agent/command`, {
    action: "generate_template",
    payload: { name, width, height },
  });

  return res.data;
});
