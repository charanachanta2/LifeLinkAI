// ============================================================
// LEGAL CONTENT — Privacy Policy + Terms & Conditions
// ============================================================
//
// IMPORTANT: this is a working draft written from what the app and
// backend actually do today. Before you publish to the Play Store /
// App Store, replace the two placeholders below and have a lawyer
// review it (especially the liability and governing-law sections).

export const LEGAL_LAST_UPDATED = "21 September 2026";

// TODO: replace with your real support address / legal entity name.
export const CONTACT_EMAIL = "support@lifelink.app";
export const APP_OWNER = "the LifeLink team";

export type LegalSection = {
  heading: string;
  // Each string is a paragraph. Lines starting with "• " render as bullets.
  body: string[];
};

// ------------------------------------------------------------
// PRIVACY POLICY
// ------------------------------------------------------------

export const PRIVACY_POLICY: LegalSection[] = [
  {
    heading: "1. Who we are",
    body: [
      `LifeLink is a mobile app that helps people get help faster in an emergency. It can alert your emergency contacts and nearby public services (police, hospitals, fire stations), find nearby responders, connect blood donors with people who need blood, and show your medical records. In this policy, "we" means ${APP_OWNER}.`,
      "This policy explains what information LifeLink collects, why, who sees it, and the choices you have.",
    ],
  },
  {
    heading: "2. Information we collect",
    body: [
      "• Account details: name, username, email address, password (stored only as a one-way hash), and your phone number if you add one. If you sign in with Google we receive your name, email and Google account ID.",
      "• Public service accounts: organisation name, role (police, hospital, fire station, pharmacy), contact details and the station location you choose to share.",
      "• Location: your precise location while you use maps and nearby features, when you send an SOS or an automatic crash alert, when you register as a blood donor or post a blood request, and (for public service accounts) your station location. We only read your location after you grant the location permission.",
      "• Emergency contacts: the name, phone number, email address and relationship of people you add.",
      "• Emergency incidents: the type of emergency, time, location, your optional message, which services you asked to alert, and who was notified and how they responded.",
      "• Health information: medical records that a hospital adds to your account, and an AI-generated summary of them. This is sensitive information.",
      "• Blood bank information: your blood group, donor availability and blood requests you create.",
      "• Device information: a push notification token so we can send alerts to your device. Motion-sensor readings (accelerometer/gyroscope) are used on your phone to detect a possible crash; this sensor data is processed on your device and is not uploaded.",
    ],
  },
  {
    heading: "3. How we use it",
    body: [
      "• To create and secure your account and keep you signed in.",
      "• To send SOS alerts to the emergency contacts and the public services you choose, including your name, live location, a Google Maps link and your message.",
      "• To show you nearby hospitals, police stations, fire stations, pharmacies, registered responders, blood donors and blood requests.",
      "• To show public service accounts the emergencies reported near them so they can respond.",
      "• To generate health summaries and analytics from your medical records.",
      "• To send verification codes, notifications and service messages, and to keep the app safe and working.",
      "We do not sell your personal information and we do not use it for advertising.",
    ],
  },
  {
    heading: "4. Who can see your information",
    body: [
      "• Your emergency contacts receive an email when an SOS is sent, with your name, location and message.",
      "• The public services you select on the SOS screen (or all nearby police, hospital and fire stations when an automatic crash alert is sent) can see your name, phone number, email, location and message for that incident so they can respond.",
      "• Blood donors' name, blood group, phone number and approximate distance are visible to other signed-in users searching for donors, and blood requests (including contact number and location) are visible to nearby users, only for donors and requests you create.",
      "• Hospitals that create records for you can see and add to your medical records.",
      "• Service providers that help us run LifeLink (see section 5).",
      "• Authorities, when required by law or to protect someone's life or safety.",
    ],
  },
  {
    heading: "5. Service providers we use",
    body: [
      "We share the minimum information needed with these providers, who process it on our behalf:",
      "• MongoDB Atlas — database storage.",
      "• Vercel — hosting of the LifeLink servers.",
      "• Google — Google Sign-In and the Gemini AI service used to summarise your medical records (the record text is sent to Gemini to produce the summary).",
      "• Geoapify / OpenStreetMap — map tiles and nearby-place search (your approximate coordinates are sent to look up places).",
      "• Expo — delivery of push notifications.",
      "• Email delivery provider — verification codes and SOS emails.",
      "• Firebase — phone-number verification, when you choose to verify your number.",
    ],
  },
  {
    heading: "6. How long we keep it",
    body: [
      "We keep your account information for as long as your account exists. Incident records are kept so that emergencies can be reviewed and for safety and legal purposes. Verification codes expire within minutes. When you ask us to delete your account we delete or anonymise your personal information, except what we must keep by law.",
    ],
  },
  {
    heading: "7. Your choices and rights",
    body: [
      "• You can add, edit or remove emergency contacts and your phone number in your profile at any time.",
      "• You can turn off location or notification permissions in your phone settings. Some features (SOS, nearby search, crash detection) will not work without them.",
      "• You can ask us to access, correct or delete your personal information, or withdraw your consent, by emailing us. We will respond within a reasonable time and in line with applicable law, including India's Digital Personal Data Protection Act, 2023.",
    ],
  },
  {
    heading: "8. Security",
    body: [
      "Data is sent over encrypted connections (HTTPS), passwords are stored hashed, and access to accounts is protected by signed tokens. No system is perfectly secure, so please use a strong, unique password and keep your phone locked.",
    ],
  },
  {
    heading: "9. Children",
    body: [
      "LifeLink is intended for people aged 18 and over. If you are under 18, please use it only with the involvement of a parent or guardian.",
    ],
  },
  {
    heading: "10. Changes to this policy",
    body: [
      "We may update this policy as the app changes. When we make a significant change we will tell you in the app. The date at the top shows when it was last updated.",
    ],
  },
  {
    heading: "11. Contact us",
    body: [`Questions or requests about your privacy: ${CONTACT_EMAIL}`],
  },
];

// ------------------------------------------------------------
// TERMS & CONDITIONS
// ------------------------------------------------------------

export const TERMS: LegalSection[] = [
  {
    heading: "1. Agreement",
    body: [
      "By creating an account or using LifeLink you agree to these Terms and to our Privacy Policy. If you do not agree, please do not use the app.",
    ],
  },
  {
    heading: "2. LifeLink is a helper, not a replacement for emergency services",
    body: [
      "LifeLink is designed to make it easier to ask for help, but it does not guarantee that help will arrive, that an alert will be delivered or seen, or that anyone will respond. Alerts depend on your phone, network, location signal and on people and organisations outside our control.",
      "In an emergency, always call your local emergency number directly (112 in India) as well as using LifeLink.",
    ],
  },
  {
    heading: "3. Crash detection and automatic alerts",
    body: [
      "Crash detection uses your phone's sensors and can make mistakes: it may miss a real crash or trigger when nothing has happened. When it triggers you get a countdown so you can cancel. If you do not cancel, an alert is sent automatically to your emergency contacts and to nearby public services. You are responsible for cancelling false alarms.",
    ],
  },
  {
    heading: "4. Your account",
    body: [
      "• You must give accurate information and keep your login details private.",
      "• You are responsible for activity on your account.",
      "• Keep your emergency contacts up to date, and make sure the people you list are happy to be contacted in an emergency.",
    ],
  },
  {
    heading: "5. Acceptable use",
    body: [
      "You agree not to:",
      "• Send false or prank SOS alerts or blood requests. Misusing emergency services can waste life-saving resources and may be an offence under applicable law. We may suspend accounts that do.",
      "• Use another person's account, or pretend to be a public service or medical professional.",
      "• Collect, scrape or misuse other users' information (for example donor phone numbers).",
      "• Interfere with, reverse-engineer or attack the app or its servers.",
    ],
  },
  {
    heading: "6. Public service accounts",
    body: [
      "Police, hospital, fire station and pharmacy accounts must be approved before they receive alerts. If you use a public service account you agree to use the reporter details you see (name, phone number, location, message) only to respond to that emergency, to keep them confidential, and not to share or reuse them for any other purpose. Accounts that misuse this information can be removed.",
    ],
  },
  {
    heading: "7. Medical records and AI summaries",
    body: [
      "Health summaries and analytics are generated automatically from your records. They are for information only and are not medical advice, a diagnosis or a treatment plan. Always speak to a qualified doctor about your health.",
    ],
  },
  {
    heading: "8. Blood bank",
    body: [
      "LifeLink only connects people who need blood with people willing to donate. We do not screen donors, check blood groups or arrange transfusions. Any donation must go through a licensed hospital or blood bank with proper medical checks.",
    ],
  },
  {
    heading: "9. Maps and third-party information",
    body: [
      "Nearby places, distances and map data come from third parties and may be incomplete, out of date or inaccurate. Check important details (for example by phone) before you rely on them.",
    ],
  },
  {
    heading: "10. Availability and changes",
    body: [
      "We work to keep LifeLink available but cannot promise it will always be uninterrupted or error-free. We may change, suspend or stop features, and may update these Terms; continuing to use the app after a change means you accept it.",
    ],
  },
  {
    heading: "11. Limitation of liability",
    body: [
      "To the fullest extent permitted by law, LifeLink and the people behind it are not liable for any loss, injury or damage arising from the use of, or inability to use, the app, including delayed, missed or false alerts, or actions taken by third parties. Nothing in these Terms limits any liability that cannot be limited by law.",
    ],
  },
  {
    heading: "12. Ending your account",
    body: [
      "You can stop using LifeLink at any time and can ask us to delete your account by emailing us. We may suspend or end accounts that break these Terms.",
    ],
  },
  {
    heading: "13. Governing law",
    body: [
      "These Terms are governed by the laws of India. Disputes will be subject to the courts of India.",
    ],
  },
  {
    heading: "14. Contact",
    body: [`Questions about these Terms: ${CONTACT_EMAIL}`],
  },
];
