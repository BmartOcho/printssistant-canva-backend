// workflows/canva-template.js
import { createWorkflow } from "workflow";
import axios from "axios";

export const canvaTemplateGenerator = createWorkflow("canvaTemplateGenerator", async (input) => {
  "use workflow";
  const { name, width, height } = input;

  if (!name || !width || !height) {
    throw new Error("Missing required fields: name, width, height");
  }

  // Call your existing Canva backend endpoint
  const res = await axios.post(`${process.env.BASE_URL}/agent/command`, {
    action: "generate_template",
    payload: { name, width, height },
  });

  return res.data;
});
