import LegalScreen from "@/components/LegalScreen";
import { TERMS } from "@/constants/legal";

export default function TermsScreen() {
  return (
    <LegalScreen
      title="Terms & Conditions"
      intro="Please read these terms before using LifeLink."
      sections={TERMS}
    />
  );
}
