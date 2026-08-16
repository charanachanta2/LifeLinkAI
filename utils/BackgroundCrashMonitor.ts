import BackgroundService from "react-native-background-actions";
import { Accelerometer } from "expo-sensors";
import { processSensorData } from "./AIEngine";

let subscription: ReturnType<typeof Accelerometer.addListener> | null = null;

const backgroundTask = async (taskDataArguments?: { delay: number }) => {
  const { delay } = taskDataArguments ?? { delay: 200 };

  Accelerometer.setUpdateInterval(delay);

  subscription = Accelerometer.addListener(({ x, y, z }) => {
    processSensorData(x, y, z);
  });

  await new Promise<void>(() => {
    // stays pending until stopCrashMonitor() is called
  });
};

const options = {
  taskName: "LifeLink Crash Monitor",
  taskTitle: "LifeLink is monitoring for crashes",
  taskDesc: "Accident detection is active in the background",
  taskIcon: { name: "ic_launcher", type: "mipmap" },
  color: "#DC2626",
  linkingURI: "lifelink://emergency",
  parameters: { delay: 200 },
};

export async function startCrashMonitor() {
  if (BackgroundService.isRunning()) return;
  await BackgroundService.start(backgroundTask, options);
}

export async function stopCrashMonitor() {
  if (subscription) {
    subscription.remove();
    subscription = null;
  }
  await BackgroundService.stop();
}