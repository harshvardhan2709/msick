import * as SecureStore from "expo-secure-store";

const GROQ_API_KEY_STORAGE_KEY = "msick.ai.groq.apiKey";
const GROQ_MODEL_STORAGE_KEY = "msick.ai.groq.model";

export const GROQ_API_URL = "https://api.groq.com/openai/v1";

export const GROQ_MODELS = [
  { id: "openai/gpt-oss-20b", label: "GPT OSS 20B" },
  { id: "openai/gpt-oss-120b", label: "GPT OSS 120B" },
] as const;

export type GroqModelId = (typeof GROQ_MODELS)[number]["id"];

export class GroqRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GroqRequestError";
  }
}

export function groqHttpError(status: number): GroqRequestError {
  if (status === 401 || status === 403) {
    return new GroqRequestError("Groq rejected this API key. Check the key in AI Settings.");
  }
  if (status === 429) {
    return new GroqRequestError("Groq rate limit or quota reached. Wait, check your Groq usage limits, then retry.");
  }
  return new GroqRequestError(`Groq request failed (HTTP ${status}). Check your model and account access.`);
}

export async function groqResponseError(response: Response): Promise<GroqRequestError> {
  const baseError = groqHttpError(response.status);
  try {
    const payload = (await response.json()) as { error?: { message?: unknown } };
    if (typeof payload.error?.message !== "string") return baseError;

    // Provider messages help diagnose rejected request parameters; scrub credential-like text first.
    const detail = payload.error.message
      .replace(/gsk_[A-Za-z0-9_-]{8,}/gi, "[redacted]")
      .replace(/Bearer\s+[^\s"']+/gi, "Bearer [redacted]")
      .replace(/(api[_ -]?key|authorization)\s*[:=]\s*[^\s,;"']+/gi, "$1=[redacted]")
      .slice(0, 240);
    return new GroqRequestError(`${baseError.message} Provider detail: ${detail}`);
  } catch {
    return baseError;
  }
}

export async function getGroqApiKey(): Promise<string | null> {
  const key = await SecureStore.getItemAsync(GROQ_API_KEY_STORAGE_KEY);
  return key?.trim() || null;
}

export async function getGroqModel(): Promise<GroqModelId> {
  const storedModel = await SecureStore.getItemAsync(GROQ_MODEL_STORAGE_KEY);
  return GROQ_MODELS.find((model) => model.id === storedModel)?.id ?? GROQ_MODELS[0].id;
}

export async function saveGroqConfiguration(
  apiKey: string,
  model: GroqModelId,
): Promise<void> {
  const normalizedKey = apiKey.trim();
  const existingKey = normalizedKey ? null : await getGroqApiKey();
  const keyToSave = normalizedKey || existingKey;
  if (!keyToSave) {
    throw new Error("Enter an API key before saving.");
  }
  if (!GROQ_MODELS.some((option) => option.id === model)) {
    throw new Error("Choose a supported Groq model.");
  }

  if (normalizedKey) {
    await SecureStore.setItemAsync(GROQ_API_KEY_STORAGE_KEY, normalizedKey);
  }
  await SecureStore.setItemAsync(GROQ_MODEL_STORAGE_KEY, model);
}

export async function removeGroqConfiguration(): Promise<void> {
  await SecureStore.deleteItemAsync(GROQ_API_KEY_STORAGE_KEY);
  await SecureStore.deleteItemAsync(GROQ_MODEL_STORAGE_KEY);
}

export async function testGroqConnection(
  apiKey: string,
  model: GroqModelId,
): Promise<void> {
  const normalizedKey = apiKey.trim();
  if (!normalizedKey) {
    throw new Error("Enter or save an API key first.");
  }

  let response: Response;
  try {
    response = await fetch(`${GROQ_API_URL}/models`, {
      headers: { Authorization: `Bearer ${normalizedKey}` },
    });
  } catch {
    throw new Error("Could not reach Groq. Check your internet connection and try again.");
  }

  if (!response.ok) throw await groqResponseError(response);

  const result = (await response.json()) as { data?: Array<{ id?: string }> };
  if (!result.data?.some((entry) => entry.id === model)) {
    throw new Error("The selected model is not available for this Groq account.");
  }

  let completionResponse: Response;
  try {
    completionResponse = await fetch(`${GROQ_API_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${normalizedKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Reply with OK." }],
        max_completion_tokens: 16,
      }),
    });
  } catch {
    throw new Error("Could not reach Groq chat completions. Check your internet connection and try again.");
  }
  if (!completionResponse.ok) throw await groqResponseError(completionResponse);
}
