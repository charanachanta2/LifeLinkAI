let modelLoaded = false;

export async function loadCrashModel(): Promise<void> {
  if (modelLoaded) return;

  console.log("🧠 Loading AI Crash Detection Model...");

  // Simulate loading time
  await new Promise((resolve) => setTimeout(resolve, 1000));

  modelLoaded = true;

  console.log("✅ AI Crash Detection Model Loaded");
}

export function isModelLoaded(): boolean {
  return modelLoaded;
}