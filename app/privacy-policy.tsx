import LegalScreen from "@/components/LegalScreen";
import { PRIVACY_POLICY } from "@/constants/legal";

export default function PrivacyPolicyScreen() {
  return (
    <LegalScreen
      title="Privacy Policy"
      intro="Your safety information is sensitive. This page explains, in plain language, what LifeLink collects and how it is used."
      sections={PRIVACY_POLICY}
    />
  );
}
