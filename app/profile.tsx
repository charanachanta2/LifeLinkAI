import { Ionicons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

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

import {
  SafeAreaView,
} from "react-native-safe-area-context";

import {
  API,
} from "@/config/api";

import {
  useAuth,
} from "@/context/AuthContext";


// ============================================================
// TYPES
// ============================================================

type Contact = {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  relation?: string;
};


// ============================================================
// ROLE LABELS
// ============================================================

const ROLE_LABELS: Record<
  string,
  string
> = {
  civilian: "Civilian",
  police: "Police",
  hospital: "Hospital",
  firestation: "Fire Station",
  pharmacy: "Pharmacy",
  admin: "Admin",
};


// ============================================================
// PROFILE
// ============================================================

function CivilianProfile() {
  const router =
    useRouter();

  const {
    user,
    token,
    isLoading: authLoading,
    authHeaders,
    logout,
    refreshUser,
  } = useAuth();


  // ==========================================================
  // PHONE NUMBER
  // ==========================================================

  const [
    phone,
    setPhone,
  ] = useState(
    user?.phone || ""
  );

  const [
    displayedPhone,
    setDisplayedPhone,
  ] = useState(
    user?.phone || ""
  );

  const [
    editingPhone,
    setEditingPhone,
  ] = useState(
    !user?.phone
  );

  const [
    savingPhone,
    setSavingPhone,
  ] = useState(false);


  // ----------------------------------------------------------
  // Keep local phone synchronized with user
  // ----------------------------------------------------------

  useEffect(() => {
    const savedPhone =
      user?.phone || "";

    setPhone(
      savedPhone
    );

    setDisplayedPhone(
      savedPhone
    );

    setEditingPhone(
      !savedPhone
    );
  }, [
    user?.phone,
  ]);


  // ==========================================================
  // EMERGENCY CONTACTS
  // ==========================================================

  const [
    contacts,
    setContacts,
  ] = useState<Contact[]>(
    []
  );

  const [
    contactsLoading,
    setContactsLoading,
  ] = useState(true);

  const [
    showAddForm,
    setShowAddForm,
  ] = useState(false);

  const [
    newContact,
    setNewContact,
  ] = useState({
    name: "",
    phone: "",
    email: "",
    relation: "",
  });

  const [
    savingContact,
    setSavingContact,
  ] = useState(false);


  // ==========================================================
  // LOAD CONTACTS
  // ==========================================================

  const loadContacts =
    useCallback(
      async () => {
        setContactsLoading(
          true
        );

        try {
          const res =
            await fetch(
              API.contacts,
              {
                headers:
                  authHeaders(),
              }
            );

          const body =
            await res.json();

          if (!res.ok) {
            throw new Error(
              body?.message ||
              "Failed to load contacts"
            );
          }

          setContacts(
            Array.isArray(body)
              ? body
              : []
          );
        } catch (
          err: any
        ) {
          console.error(
            "Load contacts error:",
            err
          );

          setContacts([]);
        } finally {
          setContactsLoading(
            false
          );
        }
      },
      [
        authHeaders,
      ]
    );


  useEffect(() => {
    if (
      authLoading ||
      !token
    ) {
      return;
    }

    loadContacts();
  }, [
    authLoading,
    token,
    loadContacts,
  ]);


  // ==========================================================
  // SAVE PHONE NUMBER
  // ==========================================================

  const handleSavePhone =
    async () => {
      const digits =
        phone.replace(
          /\D/g,
          ""
        );

      const normalizedPhone =
        digits.slice(-10);

      if (
        !/^[6-9]\d{9}$/.test(
          normalizedPhone
        )
      ) {
        Alert.alert(
          "Invalid phone number",
          "Enter a valid 10-digit mobile number."
        );

        return;
      }

      setSavingPhone(
        true
      );

      try {
        /*
         * If API.phone exists in config/api.ts,
         * use it.
         *
         * Otherwise derive it from API.me/auth endpoint
         * only if you've added API.phone as shown below.
         */

        if (!API.phone) {
          throw new Error(
            "API.phone is not configured"
          );
        }

        const res =
          await fetch(
            API.phone,
            {
              method: "PUT",

              headers:
                authHeaders(),

              body:
                JSON.stringify({
                  phone:
                    normalizedPhone,
                }),
            }
          );

        let body: any = {};

        try {
          body =
            await res.json();
        } catch {
          // Ignore malformed JSON.
        }

        if (!res.ok) {
          throw new Error(
            body?.message ||
            "Failed to save phone number"
          );
        }

        const savedPhone =
          body?.user?.phone ||
          normalizedPhone;

        setPhone(
          savedPhone
        );

        setDisplayedPhone(
          savedPhone
        );

        setEditingPhone(
          false
        );

        // Refresh the authenticated user from the backend.
        // This updates AuthContext + SecureStore so the saved
        // phone number remains visible when Profile is reopened
        // or the app is restarted.
        await refreshUser();

        Alert.alert(
          "Phone number saved",
          "Your phone number is now connected to your LifeLink account."
        );
      } catch (
        err: any
      ) {
        console.error(
          "Save phone error:",
          err
        );

        Alert.alert(
          "Couldn't save phone number",
          err?.message ||
          "Please try again."
        );
      } finally {
        setSavingPhone(
          false
        );
      }
    };


  // ==========================================================
  // CANCEL PHONE EDIT
  // ==========================================================

  const handleCancelPhoneEdit =
    () => {
      setPhone(
        displayedPhone
      );

      setEditingPhone(
        false
      );
    };


  // ==========================================================
  // ADD EMERGENCY CONTACT
  // ==========================================================

  const handleAddContact =
    async () => {
      if (
        !newContact.name.trim()
      ) {
        Alert.alert(
          "Name is required"
        );

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

      setSavingContact(
        true
      );

      try {
        const payload = {
          name:
            newContact.name.trim(),

          phone:
            newContact.phone.trim(),

          email:
            newContact.email.trim(),

          relation:
            newContact.relation.trim(),
        };

        const res =
          await fetch(
            API.contacts,
            {
              method:
                "POST",

              headers:
                authHeaders(),

              body:
                JSON.stringify(
                  payload
                ),
            }
          );

        const body =
          await res.json();

        if (!res.ok) {
          throw new Error(
            body?.message ||
            "Failed to add contact"
          );
        }

        setContacts(
          (prev) => [
            body,
            ...prev,
          ]
        );

        setNewContact({
          name: "",
          phone: "",
          email: "",
          relation: "",
        });

        setShowAddForm(
          false
        );
      } catch (
        err: any
      ) {
        Alert.alert(
          "Couldn't add contact",
          err?.message ||
          "Please try again"
        );
      } finally {
        setSavingContact(
          false
        );
      }
    };


  // ==========================================================
  // DELETE CONTACT
  // ==========================================================

  const handleDeleteContact =
    (
      id: string
    ) => {
      Alert.alert(
        "Remove contact",

        "Are you sure you want to remove this emergency contact?",

        [
          {
            text:
              "Cancel",

            style:
              "cancel",
          },

          {
            text:
              "Remove",

            style:
              "destructive",

            onPress:
              async () => {
                try {
                  const res =
                    await fetch(
                      `${API.contacts}/${id}`,
                      {
                        method:
                          "DELETE",

                        headers:
                          authHeaders(),
                      }
                    );

                  if (!res.ok) {
                    let message =
                      "Failed to remove contact";

                    try {
                      const body =
                        await res.json();

                      if (
                        body?.message
                      ) {
                        message =
                          body.message;
                      }
                    } catch {
                      // Not JSON.
                    }

                    throw new Error(
                      message
                    );
                  }

                  setContacts(
                    (prev) =>
                      prev.filter(
                        (
                          contact
                        ) =>
                          contact._id !==
                          id
                      )
                  );
                } catch (
                  err: any
                ) {
                  Alert.alert(
                    "Couldn't remove contact",

                    err?.message ||
                    "Please try again"
                  );
                }
              },
          },
        ]
      );
    };


  // ==========================================================
  // LOGOUT
  // ==========================================================

  const handleLogout =
    async () => {
      try {
        await logout();

        router.replace(
          "/login"
        );
      } catch (
        err: any
      ) {
        Alert.alert(
          "Logout failed",

          err?.message ||
          "Please try again"
        );
      }
    };


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <SafeAreaView
      style={
        styles.safeArea
      }
    >
      <KeyboardAvoidingView
        style={
          styles.container
        }
        behavior={
          Platform.OS ===
          "ios"
            ? "padding"
            : undefined
        }
      >

        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <View
          style={
            styles.header
          }
        >
          <TouchableOpacity
            onPress={() =>
              router.back()
            }
            style={
              styles.backButton
            }
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color="#111827"
            />
          </TouchableOpacity>

          <Text
            style={
              styles.headerTitle
            }
          >
            Profile
          </Text>

          <View
            style={
              styles.headerSpacer
            }
          />
        </View>


        <FlatList
          data={
            contacts
          }

          keyExtractor={(
            item
          ) => item._id}

          contentContainerStyle={
            styles.scrollContent
          }

          keyboardShouldPersistTaps="handled"

          ListHeaderComponent={
            <>

              {/* =========================================== */}
              {/* ACCOUNT */}
              {/* =========================================== */}

              <View
                style={
                  styles.card
                }
              >
                <Text
                  style={
                    styles.cardTitle
                  }
                >
                  Account
                </Text>


                <Text
                  style={
                    styles.infoLabel
                  }
                >
                  Name
                </Text>

                <Text
                  style={
                    styles.infoValue
                  }
                >
                  {user?.name ||
                    "-"}
                </Text>


                <Text
                  style={
                    styles.infoLabel
                  }
                >
                  Email
                </Text>

                <Text
                  style={
                    styles.infoValue
                  }
                >
                  {user?.email ||
                    "-"}
                </Text>


                <Text
                  style={
                    styles.infoLabel
                  }
                >
                  Role
                </Text>

                <View
                  style={
                    styles.verifiedRow
                  }
                >
                  <Text
                    style={
                      styles.infoValue
                    }
                  >
                    {
                      ROLE_LABELS[
                        user?.role ||
                        "civilian"
                      ]
                    }

                    {user?.orgName
                      ? ` · ${user.orgName}`
                      : ""}
                  </Text>


                  {user?.role &&
                    user.role !==
                      "civilian" && (
                      <View
                        style={[
                          styles.roleStatusPill,

                          user.roleStatus ===
                            "approved" &&
                            styles.roleStatusApproved,

                          user.roleStatus ===
                            "pending" &&
                            styles.roleStatusPending,

                          user.roleStatus ===
                            "rejected" &&
                            styles.roleStatusRejected,
                        ]}
                      >
                        <Text
                          style={
                            styles.roleStatusText
                          }
                        >
                          {user.roleStatus ===
                          "approved"
                            ? "Verified"
                            : user.roleStatus ===
                              "pending"
                            ? "Pending"
                            : "Rejected"}
                        </Text>
                      </View>
                    )}
                </View>
              </View>


              {/* =========================================== */}
              {/* PHONE NUMBER */}
              {/* =========================================== */}

              <View
                style={
                  styles.card
                }
              >
                <View
                  style={
                    styles.phoneHeader
                  }
                >
                  <View
                    style={
                      styles.phoneTitleContainer
                    }
                  >
                    <Ionicons
                      name="call-outline"
                      size={20}
                      color="#2563EB"
                    />

                    <Text
                      style={[
                        styles.cardTitle,
                        styles.phoneCardTitle,
                      ]}
                    >
                      Phone Number
                    </Text>
                  </View>


                  {!!displayedPhone &&
                    !editingPhone && (
                      <TouchableOpacity
                        onPress={() => {
                          setPhone(
                            displayedPhone
                          );

                          setEditingPhone(
                            true
                          );
                        }}
                      >
                        <Text
                          style={
                            styles.editText
                          }
                        >
                          Edit
                        </Text>
                      </TouchableOpacity>
                    )}
                </View>


                <Text
                  style={
                    styles.description
                  }
                >
                  Your phone number connects your
                  LifeLink account with hospital
                  records created for you.
                </Text>


                {!editingPhone &&
                displayedPhone ? (
                  <>

                    <View
                      style={
                        styles.savedPhoneContainer
                      }
                    >
                      <Ionicons
                        name="call"
                        size={19}
                        color="#111827"
                      />

                      <Text
                        style={
                          styles.savedPhone
                        }
                      >
                        +91 {displayedPhone}
                      </Text>
                    </View>


                    <View
                      style={
                        styles.connectionNotice
                      }
                    >
                      <Ionicons
                        name="link-outline"
                        size={18}
                        color="#2563EB"
                      />

                      <Text
                        style={
                          styles.connectionNoticeText
                        }
                      >
                        Connected to your LifeLink
                        account
                      </Text>
                    </View>


                    {!user?.isPhoneVerified && (
                      <Text
                        style={
                          styles.verificationNote
                        }
                      >
                        Phone OTP verification will
                        be added later.
                      </Text>
                    )}

                  </>
                ) : (
                  <>

                    <TextInput
                      style={
                        styles.input
                      }
                      placeholder="Enter 10-digit mobile number"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="phone-pad"
                      maxLength={15}
                      value={
                        phone
                      }
                      onChangeText={
                        setPhone
                      }
                    />


                    <Text
                      style={
                        styles.phoneHint
                      }
                    >
                      Example: 9876543210
                    </Text>


                    <TouchableOpacity
                      style={[
                        styles.phoneSaveButton,

                        savingPhone &&
                          styles.disabledButton,
                      ]}
                      onPress={
                        handleSavePhone
                      }
                      disabled={
                        savingPhone
                      }
                    >
                      {savingPhone ? (
                        <ActivityIndicator
                          color="#FFFFFF"
                        />
                      ) : (
                        <>
                          <Ionicons
                            name="save-outline"
                            size={18}
                            color="#FFFFFF"
                          />

                          <Text
                            style={
                              styles.primaryButtonText
                            }
                          >
                            Save Phone Number
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>


                    {!!displayedPhone && (
                      <TouchableOpacity
                        style={
                          styles.cancelButton
                        }
                        onPress={
                          handleCancelPhoneEdit
                        }
                        disabled={
                          savingPhone
                        }
                      >
                        <Text
                          style={
                            styles.cancelButtonText
                          }
                        >
                          Cancel
                        </Text>
                      </TouchableOpacity>
                    )}

                  </>
                )}
              </View>


              {/* =========================================== */}
              {/* EMERGENCY CONTACT HEADER */}
              {/* =========================================== */}

              <View
                style={
                  styles.contactsHeaderRow
                }
              >
                <Text
                  style={
                    styles.cardTitle
                  }
                >
                  Emergency Contacts
                </Text>


                <TouchableOpacity
                  onPress={() =>
                    setShowAddForm(
                      (
                        current
                      ) =>
                        !current
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


              {/* =========================================== */}
              {/* ADD CONTACT */}
              {/* =========================================== */}

              {showAddForm && (
                <View
                  style={
                    styles.card
                  }
                >
                  <TextInput
                    style={
                      styles.input
                    }
                    placeholder="Name"
                    value={
                      newContact.name
                    }
                    onChangeText={(
                      value
                    ) =>
                      setNewContact(
                        (
                          prev
                        ) => ({
                          ...prev,
                          name:
                            value,
                        })
                      )
                    }
                  />


                  <TextInput
                    style={
                      styles.input
                    }
                    placeholder="Phone"
                    keyboardType="phone-pad"
                    value={
                      newContact.phone
                    }
                    onChangeText={(
                      value
                    ) =>
                      setNewContact(
                        (
                          prev
                        ) => ({
                          ...prev,
                          phone:
                            value,
                        })
                      )
                    }
                  />


                  <TextInput
                    style={
                      styles.input
                    }
                    placeholder="Email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={
                      newContact.email
                    }
                    onChangeText={(
                      value
                    ) =>
                      setNewContact(
                        (
                          prev
                        ) => ({
                          ...prev,
                          email:
                            value,
                        })
                      )
                    }
                  />


                  <TextInput
                    style={
                      styles.input
                    }
                    placeholder="Relation (e.g. Mother, Friend)"
                    value={
                      newContact.relation
                    }
                    onChangeText={(
                      value
                    ) =>
                      setNewContact(
                        (
                          prev
                        ) => ({
                          ...prev,
                          relation:
                            value,
                        })
                      )
                    }
                  />


                  <TouchableOpacity
                    style={[
                      styles.primaryButton,

                      savingContact &&
                        styles.disabledButton,
                    ]}
                    onPress={
                      handleAddContact
                    }
                    disabled={
                      savingContact
                    }
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


              {/* =========================================== */}
              {/* CONTACT LOADING */}
              {/* =========================================== */}

              {contactsLoading && (
                <ActivityIndicator
                  style={
                    styles.loader
                  }
                  color="#2563EB"
                />
              )}


              {/* =========================================== */}
              {/* EMPTY CONTACTS */}
              {/* =========================================== */}

              {!contactsLoading &&
                contacts.length ===
                  0 && (
                  <Text
                    style={
                      styles.emptyText
                    }
                  >
                    No emergency contacts yet.
                  </Text>
                )}
            </>
          }


          // ==================================================
          // CONTACT
          // ==================================================

          renderItem={({
            item,
          }) => (
            <View
              style={
                styles.contactRow
              }
            >
              <View
                style={
                  styles.contactDetails
                }
              >
                <Text
                  style={
                    styles.contactName
                  }
                >
                  {item.name}
                </Text>


                {!!item.relation && (
                  <Text
                    style={
                      styles.contactSub
                    }
                  >
                    {item.relation}
                  </Text>
                )}


                {!!item.phone && (
                  <Text
                    style={
                      styles.contactSub
                    }
                  >
                    {item.phone}
                  </Text>
                )}


                {!!item.email && (
                  <Text
                    style={
                      styles.contactSub
                    }
                  >
                    {item.email}
                  </Text>
                )}
              </View>


              <TouchableOpacity
                onPress={() =>
                  handleDeleteContact(
                    item._id
                  )
                }
                style={
                  styles.deleteButton
                }
              >
                <Ionicons
                  name="trash-outline"
                  size={20}
                  color="#DC2626"
                />
              </TouchableOpacity>
            </View>
          )}


          // ==================================================
          // LOGOUT
          // ==================================================

          ListFooterComponent={
            <View>
            <View style={styles.legalCard}>
              <TouchableOpacity
                style={styles.legalRow}
                onPress={() => router.push("/privacy-policy" as any)}
              >
                <Ionicons name="shield-checkmark-outline" size={22} color="#374151" />
                <Text style={styles.legalText}>Privacy Policy</Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              <View style={styles.legalDivider} />

              <TouchableOpacity
                style={styles.legalRow}
                onPress={() => router.push("/terms" as any)}
              >
                <Ionicons name="document-text-outline" size={22} color="#374151" />
                <Text style={styles.legalText}>Terms & Conditions</Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={
                styles.logoutButton
              }
              onPress={
                handleLogout
              }
            >
              <Ionicons
                name="log-out-outline"
                size={20}
                color="#DC2626"
              />

              <Text
                style={
                  styles.logoutText
                }
              >
                Log Out
              </Text>
            </TouchableOpacity>
            </View>
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({

    safeArea: {
      flex: 1,
      backgroundColor: "#F3F4F6",
    },


    container: {
      flex: 1,
    },


    // ========================================================
    // HEADER
    // ========================================================

    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: "#FFFFFF",
      borderBottomWidth: 1,
      borderBottomColor: "#EEF0F3",
    },


    backButton: {
      padding: 6,
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#F3F4F6",
    },


    headerSpacer: {
      width: 36,
    },


    headerTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: "#111827",
      letterSpacing: 0.2,
    },


    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 18,
      paddingBottom: 48,
    },


    // ========================================================
    // CARDS
    // ========================================================

    card: {
      backgroundColor: "#FFFFFF",
      borderRadius: 18,
      padding: 18,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: "#F0F1F3",
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    },


    cardTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: "#0F172A",
      marginBottom: 12,
      letterSpacing: 0.1,
    },


    infoLabel: {
      fontSize: 11,
      color: "#9CA3AF",
      marginTop: 12,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },


    infoValue: {
      fontSize: 15.5,
      color: "#111827",
      fontWeight: "600",
      marginTop: 3,
    },


    verifiedRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },


    verifiedText: {
      color: "#16A34A",
      fontWeight: "700",
      fontSize: 13,
    },


    // ========================================================
    // ROLE STATUS
    // ========================================================

    roleStatusPill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: 1,
    },


    roleStatusApproved: {
      backgroundColor: "#ECFDF5",
      borderColor: "#BBF7D0",
    },


    roleStatusPending: {
      backgroundColor: "#FFFBEB",
      borderColor: "#FDE68A",
    },


    roleStatusRejected: {
      backgroundColor: "#FEF2F2",
      borderColor: "#FECACA",
    },


    roleStatusText: {
      fontSize: 11,
      fontWeight: "700",
      color: "#111827",
      letterSpacing: 0.3,
    },


    description: {
      fontSize: 13.5,
      lineHeight: 20,
      color: "#6B7280",
      marginBottom: 14,
    },


    // ========================================================
    // PHONE
    // ========================================================

    phoneHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },


    phoneTitleContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
    },


    phoneCardTitle: {
      marginBottom: 0,
    },


    editText: {
      color: "#2563EB",
      fontWeight: "700",
      fontSize: 13.5,
      backgroundColor: "#EFF6FF",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      overflow: "hidden",
    },


    savedPhoneContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: "#F8FAFC",
      borderWidth: 1,
      borderColor: "#E7EAF0",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 14,
      marginTop: 6,
    },


    savedPhone: {
      fontSize: 16.5,
      fontWeight: "700",
      color: "#111827",
      letterSpacing: 0.5,
    },


    connectionNotice: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 14,
      backgroundColor: "#EFF6FF",
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 10,
    },


    connectionNoticeText: {
      color: "#2563EB",
      fontSize: 12.5,
      fontWeight: "600",
      flexShrink: 1,
    },


    verificationNote: {
      color: "#9CA3AF",
      fontSize: 12,
      marginTop: 10,
      fontStyle: "italic",
    },


    phoneHint: {
      fontSize: 12,
      color: "#9CA3AF",
      marginTop: -4,
      marginBottom: 14,
    },


    phoneSaveButton: {
      backgroundColor: "#2563EB",
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      shadowColor: "#2563EB",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 3,
    },


    cancelButton: {
      alignItems: "center",
      paddingVertical: 13,
      marginTop: 2,
    },


    cancelButtonText: {
      color: "#6B7280",
      fontWeight: "600",
      fontSize: 13.5,
    },


    // ========================================================
    // INPUT
    // ========================================================

    input: {
      borderWidth: 1.5,
      borderColor: "#E5E7EB",
      borderRadius: 12,
      paddingHorizontal: 15,
      paddingVertical: 13,
      marginBottom: 12,
      fontSize: 15,
      color: "#111827",
      backgroundColor: "#F9FAFB",
    },


    primaryButton: {
      backgroundColor: "#DC2626",
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      marginBottom: 8,
      shadowColor: "#DC2626",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.22,
      shadowRadius: 8,
      elevation: 3,
    },


    disabledButton: {
      opacity: 0.6,
    },


    primaryButtonText: {
      color: "#FFFFFF",
      fontWeight: "700",
      fontSize: 15,
      letterSpacing: 0.2,
    },


    // ========================================================
    // CONTACTS
    // ========================================================

    contactsHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 14,
      paddingHorizontal: 2,
    },


    loader: {
      marginTop: 16,
    },


    emptyText: {
      color: "#9CA3AF",
      textAlign: "center",
      marginTop: 12,
      marginBottom: 16,
      fontSize: 13.5,
    },


    contactRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 14,
      paddingHorizontal: 16,
      backgroundColor: "#FFFFFF",
      borderRadius: 14,
      borderWidth: 1,
      borderColor: "#F0F1F3",
      marginBottom: 10,
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 1,
    },


    contactDetails: {
      flex: 1,
    },


    contactName: {
      fontSize: 15,
      fontWeight: "700",
      color: "#111827",
    },


    contactSub: {
      fontSize: 12.5,
      color: "#6B7280",
      marginTop: 3,
    },


    deleteButton: {
      padding: 9,
      borderRadius: 10,
      backgroundColor: "#FEF2F2",
      marginLeft: 8,
    },


    // ========================================================
    // LOGOUT
    // ========================================================

    logoutButton: {
      borderWidth: 1.5,
      borderColor: "#FEE2E2",
      backgroundColor: "#FFFFFF",
      borderRadius: 14,
      paddingVertical: 15,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 9,
      marginTop: 26,
    },


    logoutText: {
      color: "#DC2626",
      fontSize: 15.5,
      fontWeight: "700",
    },
  
  legalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  legalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  legalText: { flex: 1, fontSize: 15, fontWeight: "600", color: "#111827" },
  legalDivider: { height: 1, backgroundColor: "#F1F2F4" },
});

// Public-service accounts must never land on the civilian profile
// (emergency contacts, medical records...). Send them to their own
// Profile tab instead.
export default function Profile() {
  const { user, isLoading, homeRoute } = useAuth();

  if (
    !isLoading &&
    user?.role &&
    user.role !== "civilian" &&
    user.role !== "admin"
  ) {
    return <Redirect href={homeRoute() as any} />;
  }

  return <CivilianProfile />;
}
