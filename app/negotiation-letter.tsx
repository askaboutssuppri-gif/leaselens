              onChangeText={setTenantName}
            />
            <Text style={styles.label}>Landlord name (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Acme Properties"
              placeholderTextColor={Colors.gray[500]}
              value={landlordName}
              onChangeText={setLandlordName}
            />
            <Text style={styles.label}>Property address (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="123 Main St, Apt 4"
              placeholderTextColor={Colors.gray[500]}
              value={propertyAddress}
              onChangeText={setPropertyAddress}
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={generate}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color={Colors.navy[900]} />
              ) : (
                <Text style={styles.buttonText}>Generate letter</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {letter && (
          <>
            <View style={styles.letterCard}>
              <Text style={styles.letterText}>{letter}</Text>
            </View>
            <TouchableOpacity style={styles.button} onPress={copyLetter}>
              {copied ? (
                <Check size={18} color={Colors.navy[900]} />
              ) : (
                <Copy size={18} color={Colors.navy[900]} />
              )}
              <Text style={styles.buttonText}>{copied ? ' Copied!' : ' Copy letter'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setLetter(null)}>
              <Text style={styles.secondaryButtonText}>Generate again</Text>
            </TouchableOpacity>
            <Text style={styles.disclaimer}>
              Review before sending. This is a starting draft, not legal advice.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy[900] },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16,
  },
  headerTitle: { fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.white },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  infoCard: {
    backgroundColor: Colors.navy[800], borderRadius: 16, padding: 20,
    alignItems: 'center', marginBottom: 20,
  },
  infoTitle: { fontFamily: 'Inter-Bold', fontSize: 17, color: Colors.white, marginTop: 10, marginBottom: 6 },
  infoBody: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.gray[400], textAlign: 'center', lineHeight: 20 },
  label: { fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.gray[300], marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: Colors.navy[800], borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 15, color: Colors.white,
    borderWidth: 1, borderColor: Colors.navy[700],
  },
  button: {
    backgroundColor: Colors.amber[400], borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row',
    marginTop: 20,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.navy[900] },
  secondaryButton: {
    borderWidth: 1, borderColor: Colors.navy[600], borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', marginTop: 10,
  },
  secondaryButtonText: { fontFamily: 'Inter-Medium', fontSize: 15, color: Colors.gray[300] },
  letterCard: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 18, marginTop: 4,
  },
  letterText: { fontSize: 14, lineHeight: 22, color: '#111827' },
  disclaimer: {
    fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.gray[500],
    textAlign: 'center', marginTop: 16, lineHeight: 17,
  },
