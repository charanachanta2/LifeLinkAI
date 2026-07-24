import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { API } from "@/config/api";
import { useAuth } from "@/context/AuthContext";

type Contact = {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  relation?: string;
};

const ROLE_LABELS: Record<string, string> = {
  civilian: "Civilian",
  police: "Police",
  hospital: "Hospital",
  firestation: "Fire Station",
  pharmacy: "Pharmacy",
  admin: "Admin",
};

export default function Profile() {
  const router = useRouter();

  const {
    user,
    token,
    isLoading: authLoading,
    authHeaders,
    logout,
  } = useAuth();

  // -------------------------------------------------------
  // Emergency contacts
  // -------------------------------------------------------

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);

  const [showAddForm, setShowAddForm] = useState(false);

  const [newContact, setNewContact] = useState({
    name: "",
    phone: "",
    email: "",
    relation: "",
  });

  const [savingContact, setSavingContact] = useState(false);

  // -------------------------------------------------------
  // Load contacts
  // -------------------------------------------------------

  const loadContacts = useCallback(async () => {
    setContactsLoading(true);

    try {
      const res = await fetch(API.contacts, {
        headers: authHeaders(),
      });

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body?.message || "Failed to load contacts");
      }

      setContacts(Array.isArray(body) ? body : []);
    } catch (err: any) {
      console.error("Load contacts error:", err);

      setContacts([]);
    } finally {
      setContactsLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    // Wait for AuthContext to finish reading the token from SecureStore -
    // otherwise this fires with no token yet and the request fails with
    // "No token provided".
    if (authLoading || !token) return;
    loadContacts();
  }, [authLoading, token, loadContacts]);

  // -------------------------------------------------------
  // Add emergency contact
  // -------------------------------------------------------

  const handleAddContact = async () => {
    if (!newContact.name.trim()) {
      Alert.alert("Name is required");
      return;
    }

    if (
      !newContact.phone.trim() &&
      !newContact.email.trim()
    ) {
      Alert.alert(
        "Contact information required",
        "Enter either a phone number or an email address."
      );
      return;
    }

    setSavingContact(true);

    try {
      const payload = {
        name: newContact.name.trim(),
        phone: newContact.phone.trim(),
        email: newContact.email.trim(),
        relation: newContact.relation.trim(),
      };

      const res = await fetch(API.contacts, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      const body = await res.json();

      if (!res.ok) {
        throw new Error(
          body?.message || "Failed to add contact"
        );
      }

      setContacts((prev) => [body, ...prev]);

      setNewContact({
        name: "",
        phone: "",
        email: "",
        relation: "",
      });

      setShowAddForm(false);
    } catch (err: any) {
      Alert.alert(
        "Couldn't add contact",
        err?.message || "Please try again"
      );
    } finally {
      setSavingContact(false);
    }
  };

  // -------------------------------------------------------
  // Delete emergency contact
  // -------------------------------------------------------

  const handleDeleteContact = (id: string) => {
    Alert.alert(
      "Remove contact",
      "Are you sure you want to remove this emergency contact?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          style: "destructive",

          onPress: async () => {
            try {
              const res = await fetch(
                `${API.contacts}/${id}`,
                {
                  method: "DELETE",
                  headers: authHeaders(),
                }
              );

              if (!res.ok) {
                let message = "Failed to remove contact";

                try {
                  const body = await res.json();

                  if (body?.message) {
                    message = body.message;
                  }
                } catch {
                  // Response did not contain JSON
                }

                throw new Error(message);
              }

              setContacts((prev) =>
                prev.filter(
                  (contact) => contact._id !== id
                )
              );
            } catch (err: any) {
              Alert.alert(
                "Couldn't remove contact",
                err?.message || "Please try again"
              );
            }
          },
        },
      ]
    );
  };

  // -------------------------------------------------------
  // Logout
  // -------------------------------------------------------

  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/login");
    } catch (err: any) {
      Alert.alert(
        "Logout failed",
        err?.message || "Please try again"
      );
    }
  };

  // -------------------------------------------------------
  // Render
  // -------------------------------------------------------

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        {/* Header */}

        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color="#111827"
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            Profile
          </Text>

          <View style={styles.headerSpacer} />
        </View>

        <FlatList
          data={contacts}
          keyExtractor={(item) => item._id}
          contentContainerStyle={
            styles.scrollContent
          }
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <>
              {/* Account */}

              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  Account
                </Text>

                <Text style={styles.infoLabel}>
                  Name
                </Text>

                <Text style={styles.infoValue}>
                  {user?.name || "-"}
                </Text>

                <Text style={styles.infoLabel}>
                  Email
                </Text>

                <Text style={styles.infoValue}>
                  {user?.email || "-"}
                </Text>

                <Text style={styles.infoLabel}>
                  Role
                </Text>

                <View style={styles.verifiedRow}>
                  <Text style={styles.infoValue}>
                    {ROLE_LABELS[user?.role || "civilian"]}
                    {user?.orgName ? ` · ${user.orgName}` : ""}
                  </Text>

                  {user?.role && user.role !== "civilian" && (
                    <View
                      style={[
                        styles.roleStatusPill,
                        user.roleStatus === "approved" &&
                          styles.roleStatusApproved,
                        user.roleStatus === "pending" &&
                          styles.roleStatusPending,
                        user.roleStatus === "rejected" &&
                          styles.roleStatusRejected,
                      ]}
                    >
                      <Text style={styles.roleStatusText}>
                        {user.roleStatus === "approved"
                          ? "Verified"
                          : user.roleStatus === "pending"
                          ? "Pending"
                          : "Rejected"}
                      </Text>
                    </View>
                  )}
                </View>

                {user?.phone ? (
                  <>
                    <Text style={styles.infoLabel}>
                      Phone
                    </Text>

                    <View style={styles.verifiedRow}>
                      <Text style={styles.infoValue}>
                        {user.phone}
                      </Text>

                      {user?.isPhoneVerified && (
                        <>
                          <Ionicons
                            name="checkmark-circle"
                            size={18}
                            color="#16A34A"
                          />

                          <Text
                            style={
                              styles.verifiedText
                            }
                          >
                            Verified
                          </Text>
                        </>
                      )}
                    </View>
                  </>
                ) : null}
              </View>

              {/* Phone verification notice */}

              {!user?.isPhoneVerified && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>
                    Phone Verification
                  </Text>

                  <Text
                    style={styles.description}
                  >
                    Phone verification is not
                    currently enabled in this Expo
                    build.
                  </Text>

                  <Text
                    style={styles.description}
                  >
                    The previous implementation used
                    React Native Firebase native
                    authentication, which is not
                    available inside Expo Go.
                  </Text>
                </View>
              )}

              {/* Emergency contacts title */}

              <View
                style={styles.contactsHeaderRow}
              >
                <Text style={styles.cardTitle}>
                  Emergency Contacts
                </Text>

                <TouchableOpacity
                  onPress={() =>
                    setShowAddForm(
                      (current) => !current
                    )
                  }
                >
                  <Ionicons
                    name={
                      showAddForm
                        ? "close-circle"
                        : "add-circle"
                    }
                    size={28}
                    color="#DC2626"
                  />
                </TouchableOpacity>
              </View>

              {/* Add contact */}

              {showAddForm && (
                <View style={styles.card}>
                  <TextInput
                    style={styles.input}
                    placeholder="Name"
                    value={newContact.name}
                    onChangeText={(value) =>
                      setNewContact((prev) => ({
                        ...prev,
                        name: value,
                      }))
                    }
                  />

                  <TextInput
                    style={styles.input}
                    placeholder="Phone"
                    keyboardType="phone-pad"
                    value={newContact.phone}
                    onChangeText={(value) =>
                      setNewContact((prev) => ({
                        ...prev,
                        phone: value,
                      }))
                    }
                  />

                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={newContact.email}
                    onChangeText={(value) =>
                      setNewContact((prev) => ({
                        ...prev,
                        email: value,
                      }))
                    }
                  />

                  <TextInput
                    style={styles.input}
                    placeholder="Relation (e.g. Mother, Friend)"
                    value={newContact.relation}
                    onChangeText={(value) =>
                      setNewContact((prev) => ({
                        ...prev,
                        relation: value,
                      }))
                    }
                  />

                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      savingContact &&
                        styles.disabledButton,
                    ]}
                    onPress={handleAddContact}
                    disabled={savingContact}
                  >
                    {savingContact ? (
                      <ActivityIndicator
                        color="#FFFFFF"
                      />
                    ) : (
                      <Text
                        style={
                          styles.primaryButtonText
                        }
                      >
                        Save Contact
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Loading */}

              {contactsLoading && (
                <ActivityIndicator
                  style={styles.loader}
                  color="#2563EB"
                />
              )}

              {/* Empty contacts */}

              {!contactsLoading &&
                contacts.length === 0 && (
                  <Text style={styles.emptyText}>
                    No emergency contacts yet.
                  </Text>
                )}
            </>
          }
          renderItem={({ item }) => (
            <View style={styles.contactRow}>
              <View style={styles.contactDetails}>
                <Text style={styles.contactName}>
                  {item.name}
                </Text>

                {!!item.relation && (
                  <Text style={styles.contactSub}>
                    {item.relation}
                  </Text>
                )}

                {!!item.phone && (
                  <Text style={styles.contactSub}>
                    {item.phone}
                  </Text>
                )}

                {!!item.email && (
                  <Text style={styles.contactSub}>
                    {item.email}
                  </Text>
                )}
              </View>

              <TouchableOpacity
                onPress={() =>
                  handleDeleteContact(item._id)
                }
                style={styles.deleteButton}
              >
                <Ionicons
                  name="trash-outline"
                  size={20}
                  color="#DC2626"
                />
              </TouchableOpacity>
            </View>
          )}
          ListFooterComponent={
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Ionicons
                name="log-out-outline"
                size={20}
                color="#DC2626"
              />

              <Text style={styles.logoutText}>
                Log Out
              </Text>
            </TouchableOpacity>
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  container: {
    flex: 1,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  backButton: {
    padding: 4,
    width: 32,
  },

  headerSpacer: {
    width: 32,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  card: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },

  infoLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 6,
  },

  infoValue: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "500",
  },

  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  verifiedText: {
    color: "#16A34A",
    fontWeight: "600",
    fontSize: 13,
  },

  roleStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },

  roleStatusApproved: {
    backgroundColor: "#DCFCE7",
  },

  roleStatusPending: {
    backgroundColor: "#FEF3C7",
  },

  roleStatusRejected: {
    backgroundColor: "#FEE2E2",
  },

  roleStatusText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#111827",
  },

  description: {
    fontSize: 14,
    lineHeight: 20,
    color: "#6B7280",
    marginBottom: 8,
  },

  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },

  primaryButton: {
    backgroundColor: "#DC2626",
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    marginBottom: 8,
  },

  disabledButton: {
    opacity: 0.6,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },

  contactsHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  loader: {
    marginTop: 12,
  },

  emptyText: {
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 12,
  },

  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },

  contactDetails: {
    flex: 1,
  },

  contactName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },

  contactSub: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },

  deleteButton: {
    padding: 8,
  },

  logoutButton: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 24,
  },

  logoutText: {
    color: "#DC2626",
    fontSize: 16,
    fontWeight: "600",
  },
});