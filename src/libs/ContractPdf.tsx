import {
    Document,
    Page,
    View,
    Text,
    Image,
    StyleSheet,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
    page: {
        fontFamily: "Helvetica",
        fontSize: 11,
        padding: 40,
        lineHeight: 1.6,
        color: "#333",
    },
    header: {
        textAlign: "center",
        marginBottom: 30,
        borderBottomWidth: 2,
        borderBottomColor: "#eee",
        paddingBottom: 20,
    },
    contractTitle: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 10,
    },
    contractId: {
        color: "#666",
        fontSize: 14,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontWeight: "bold",
        fontSize: 14,
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
        paddingBottom: 5,
    },
    partyInfo: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 20,
    },
    party: {
        width: "48%",
    },
    partyLabel: {
        fontWeight: "bold",
        marginBottom: 5,
    },
    signatureArea: {
        marginTop: 50,
    },
    signatureContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 30,
    },
    signatureBox: {
        width: "45%",
    },
    signatureLine: {
        borderTopWidth: 1,
        borderTopColor: "#000",
        marginTop: 50,
        marginBottom: 5,
    },
    memberSignature: {
        marginTop: 20,
        textAlign: "center",
        alignItems: "center",
    },
    signatureImage: {
        maxWidth: 200,
        maxHeight: 80,
    },
    footer: {
        marginTop: 50,
        fontSize: 10,
        color: "#666",
        textAlign: "center",
    },
    paragraph: {
        marginBottom: 8,
    },
});

export interface ContractData {
    contract: {
        signature: string | null;
        variables: {
            contact: {
                firstName: string;
                lastName: string;
                email: string;
                phone: string;
            };
            location: {
                name: string;
                address: string | null;
                city: string | null;
                state: string | null;
                postalCode: string | null;
                phone: string | null;
            };
        };
    };
    memberName: string;
    date: string;
    contractId: string;
}

function formatSignatureUri(signature: string | null): string | null {
    if (!signature) return null;
    // If it's already a data URI, return as-is
    if (signature.startsWith("data:")) return signature;
    // Otherwise, assume it's raw base64 PNG data and add the prefix
    return `data:image/png;base64,${signature}`;
}

export function ContractDocument({ contract, date, contractId }: ContractData) {
    const member = contract.variables.contact;
    const loc = contract.variables.location;
    const location = {
        name: loc.name,
        address: loc.address || "",
        city: loc.city || "",
        state: loc.state || "",
        postalCode: loc.postalCode || "",
        phone: loc.phone || "",
    };
    const signatureUri = formatSignatureUri(contract.signature);

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.contractTitle}>CONTRACT AGREEMENT</Text>
                    <Text style={styles.contractId}>Contract #{contractId}</Text>
                </View>

                {/* Parties Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>PARTIES</Text>
                    <Text style={styles.paragraph}>
                        This agreement is made between:
                    </Text>

                    <View style={styles.partyInfo}>
                        <View style={styles.party}>
                            <Text style={styles.partyLabel}>Provider:</Text>
                            <Text>{location.name}</Text>
                            <Text>{location.address}</Text>
                            <Text>
                                {location.city}, {location.state} {location.postalCode}
                            </Text>
                            <Text>Phone: {location.phone}</Text>
                        </View>
                        <View style={styles.party}>
                            <Text style={styles.partyLabel}>Member:</Text>
                            <Text>
                                {member.firstName} {member.lastName}
                            </Text>
                            <Text>Email: {member.email}</Text>
                            <Text>Phone: {member.phone}</Text>
                        </View>
                    </View>
                </View>

                {/* Terms and Conditions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>TERMS AND CONDITIONS</Text>
                    <Text style={styles.paragraph}>
                        By signing this agreement, the Member agrees to all terms and
                        conditions set forth by {location.name}.
                    </Text>
                    <Text style={styles.paragraph}>
                        This agreement constitutes the entire understanding between the
                        parties and supersedes all prior agreements.
                    </Text>
                </View>

                {/* Effective Date */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>EFFECTIVE DATE</Text>
                    <Text style={styles.paragraph}>
                        This agreement becomes effective on {date}.
                    </Text>
                </View>

                {/* Signature Area */}
                <View style={styles.signatureArea}>
                    <Text style={styles.paragraph}>Agreed and accepted by:</Text>

                    <View style={styles.signatureContainer}>
                        <View style={styles.signatureBox}>
                            <Text>{location.name} Representative</Text>
                            <View style={styles.signatureLine} />
                            <Text>Signature</Text>
                            <Text>Date: {date}</Text>
                        </View>

                        <View style={styles.signatureBox}>
                            <Text>
                                Member: {member.firstName} {member.lastName}
                            </Text>
                            <View style={styles.signatureLine} />
                            <View style={styles.memberSignature}>
                                {signatureUri && (
                                    <Image src={signatureUri} style={styles.signatureImage} />
                                )}
                            </View>
                            <Text>Date: {date}</Text>
                        </View>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text>
                        This document was electronically signed and is valid without
                        handwritten signatures.
                    </Text>
                    <Text>Generated on {date}</Text>
                </View>
            </Page>
        </Document>
    );
}