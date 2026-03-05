import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";

const REGION = process.env.BEDROCK_REGION || process.env.AWS_REGION || "us-west-2";
const MODEL_ID = process.env.MODEL_ID || "us.amazon.nova-2-lite-v1:0";

const client = new BedrockRuntimeClient({ region: REGION });

export const handler = async (event: any) => {
  try {
    const body = event?.body ? JSON.parse(event.body) : {};
    const prompt: string = body?.prompt ?? "Say hello.";

    console.log("AI_REQUEST", {
        modelId: MODEL_ID,
        promptLength: prompt.length
      });

    const cmd = new ConverseCommand({
      modelId: MODEL_ID,
      messages: [
        {
          role: "user",
          content: [{ text: prompt }],
        },
      ],
      inferenceConfig: {
        maxTokens: 128,
        temperature: 0.7,
      },
    });

    const start = Date.now();
    const resp = await client.send(cmd);
    const latencyMs = Date.now() - start;

    const outputText =
      resp?.output?.message?.content?.map((c: any) => c.text).filter(Boolean).join("") ?? "";
    
    console.log("AI_RESPONSE", {
      latencyMs,
      outputLength: outputText.length
    });

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ modelId: MODEL_ID, latencyMs, outputText }),
    };
  } catch (err: any) {
    console.error("BEDROCK_CONVERSE_FAILED", { name: err?.name, message: err?.message });
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        error: "BEDROCK_CONVERSE_FAILED",
        name: err?.name,
        message: err?.message,
        modelId: MODEL_ID,
      }),
    };
  }
};