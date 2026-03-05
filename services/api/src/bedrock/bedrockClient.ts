// services/api/src/bedrock/bedrockClient.ts

import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";

export type InvokeModelInput = {
  prompt: string;
  modelId: string;
  useGuardrails: boolean;
};

export type InvokeModelOutput = {
  text: string;
  guardrailsMode: "OFF" | "READY";
};

const client = new BedrockRuntimeClient({});

async function invokePlain(prompt: string, modelId: string): Promise<string> {
  const cmd = new ConverseCommand({
    modelId,
    messages: [
      {
        role: "user",
        content: [{ text: prompt }],
      },
    ],
  });

  const resp = await client.send(cmd);

  const text =
    resp.output?.message?.content
      ?.map((c) => ("text" in c ? c.text : ""))
      .join("") ?? "";

  return text;
}

// Placeholder: later this becomes “invoke with Guardrails configuration”
async function invokeGuarded(prompt: string, modelId: string): Promise<string> {
  // For now, same call path, but separated for future drop-in.
  return invokePlain(prompt, modelId);
}

export async function invokeModel(input: InvokeModelInput): Promise<InvokeModelOutput> {
  if (input.useGuardrails) {
    const text = await invokeGuarded(input.prompt, input.modelId);
    return { text, guardrailsMode: "READY" };
  }

  const text = await invokePlain(input.prompt, input.modelId);
  return { text, guardrailsMode: "OFF" };
}