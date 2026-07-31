import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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

export default function Profile() {
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
      backgroundColor:
        "#FFFFFF",
    },


    container: {
      flex: 1,
    },


    // ========================================================
    // HEADER
    // ========================================================

    header: {
      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",

      paddingHorizontal:
        16,

      paddingVertical:
        12,
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
      paddingHorizontal:
        20,

      paddingBottom:
        40,
    },


    // ========================================================
    // CARDS
    // ========================================================

    card: {
      backgroundColor:
        "#F9FAFB",

      borderRadius:
        12,

      padding:
        16,

      marginBottom:
        16,
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
      flexDirection:
        "row",

      alignItems:
        "center",

      gap:
        6,
    },


    verifiedText: {
      color:
        "#16A34A",

      fontWeight:
        "600",

      fontSize:
        13,
    },


    // ========================================================
    // ROLE STATUS
    // ========================================================

    roleStatusPill: {
      paddingHorizontal:
        8,

      paddingVertical:
        2,

      borderRadius:
        999,
    },


    roleStatusApproved: {
      backgroundColor:
        "#DCFCE7",
    },


    roleStatusPending: {
      backgroundColor:
        "#FEF3C7",
    },


    roleStatusRejected: {
      backgroundColor:
        "#FEE2E2",
    },


    roleStatusText: {
      fontSize:
        11,

      fontWeight:
        "700",

      color:
        "#111827",
    },


    description: {
      fontSize:
        14,

      lineHeight:
        20,

      color:
        "#6B7280",

      marginBottom:
        12,
    },


    // ========================================================
    // PHONE
    // ========================================================

    phoneHeader: {
      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",
    },


    phoneTitleContainer: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap:
        7,
    },


    phoneCardTitle: {
      marginBottom:
        0,
    },


    editText: {
      color:
        "#2563EB",

      fontWeight:
        "700",

      fontSize:
        14,
    },


    savedPhoneContainer: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap:
        10,

      backgroundColor:
        "#FFFFFF",

      borderWidth:
        1,

      borderColor:
        "#E5E7EB",

      paddingHorizontal:
        14,

      paddingVertical:
        13,

      borderRadius:
        10,

      marginTop:
        4,
    },


    savedPhone: {
      fontSize:
        16,

      fontWeight:
        "700",

      color:
        "#111827",

      letterSpacing:
        0.4,
    },


    connectionNotice: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap:
        7,

      marginTop:
        12,
    },


    connectionNoticeText: {
      color:
        "#2563EB",

      fontSize:
        13,

      fontWeight:
        "600",
    },


    verificationNote: {
      color:
        "#6B7280",

      fontSize:
        12,

      marginTop:
        8,
    },


    phoneHint: {
      fontSize:
        12,

      color:
        "#6B7280",

      marginTop:
        -3,

      marginBottom:
        12,
    },


    phoneSaveButton: {
      backgroundColor:
        "#2563EB",

      borderRadius:
        10,

      paddingVertical:
        13,

      alignItems:
        "center",

      justifyContent:
        "center",

      flexDirection:
        "row",

      gap:
        7,
    },


    cancelButton: {
      alignItems:
        "center",

      paddingVertical:
        12,

      marginTop:
        4,
    },


    cancelButtonText: {
      color:
        "#6B7280",

      fontWeight:
        "600",
    },


    // ========================================================
    // INPUT
    // ========================================================

    input: {
      borderWidth:
        1,

      borderColor:
        "#D1D5DB",

      borderRadius:
        10,

      paddingHorizontal:
        14,

      paddingVertical:
        12,

      marginBottom:
        10,

      fontSize:
        15,

      color:
        "#111827",

      backgroundColor:
        "#FFFFFF",
    },


    primaryButton: {
      backgroundColor:
        "#DC2626",

      borderRadius:
        10,

      paddingVertical:
        13,

      alignItems:
        "center",

      marginBottom:
        8,
    },


    disabledButton: {
      opacity:
        0.6,
    },


    primaryButtonText: {
      color:
        "#FFFFFF",

      fontWeight:
        "700",

      fontSize:
        15,
    },


    // ========================================================
    // CONTACTS
    // ========================================================

    contactsHeaderRow: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      alignItems:
        "center",

      marginBottom:
        12,
    },


    loader: {
      marginTop:
        12,
    },


    emptyText: {
      color:
        "#6B7280",

      textAlign:
        "center",

      marginTop:
        8,

      marginBottom:
        12,
    },


    contactRow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",

      paddingVertical:
        12,

      borderBottomWidth:
        1,

      borderBottomColor:
        "#F3F4F6",
    },


    contactDetails: {
      flex: 1,
    },


    contactName: {
      fontSize:
        15,

      fontWeight:
        "600",

      color:
        "#111827",
    },


    contactSub: {
      fontSize:
        13,

      color:
        "#6B7280",

      marginTop:
        2,
    },


    deleteButton: {
      padding:
        8,
    },


    // ========================================================
    // LOGOUT
    // ========================================================

    logoutButton: {
      borderWidth:
        1,

      borderColor:
        "#D1D5DB",

      borderRadius:
        10,

      paddingVertical:
        14,

      alignItems:
        "center",

      justifyContent:
        "center",

      flexDirection:
        "row",

      gap:
        8,

      marginTop:
        24,
    },


    logoutText: {
      color:
        "#DC2626",

      fontSize:
        16,

      fontWeight:
        "600",
    },
  });