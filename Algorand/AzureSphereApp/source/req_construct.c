#include "req_construct.h"

int createSmartMeterIdentity(ecc_key * key) {
	WC_RNG rng;
	wc_InitRng(&rng);
	int ret = wc_ecc_make_key_ex(&rng, 32, key, ECC_SECP256K1); // initialize 32 byte ecc key
	if (ret != 0) {
		Log_Debug("There was an error while generating key %d \n", ret);
		return -1;
	}
}

int getSphereIdentity(ecc_key * key){
	Storage_DeleteMutableFile();
	int fd = Storage_OpenMutableFile();
	byte rawPrvKey[1024] = {0};
	word32 rawPrvKeySz = 1024;
	if (fd == -1) {
        Log_Debug("ERROR: Could not open the identity key %s (%d).\n", strerror(errno), errno);
		close(fd);
        return -1;
    }

    ssize_t ret = read(fd, rawPrvKey, rawPrvKeySz);

    if (ret == -1) {
        Log_Debug("ERROR: An error occurred while the identity key:  %s (%d).\n", strerror(errno),
                  errno);
		close(fd);
		return -1;
    }

	if(ret <= 0){//The key does not exist and needs to be created and stored
		byte buffer[1024] = {0}; // to write
		int bufferSz = 0;
		if(createSmartMeterIdentity(key) != 0){
			close(fd);
			return -1;
		}
		ret = wc_ecc_export_private_only(key, rawPrvKey, &rawPrvKeySz);
		if(ret != 0){
			Log_Debug("Could not export the private smart meter identity");
			close(fd);
			return -1;
		}

		//no available func for int to string
		buffer[0] = '0' + rawPrvKeySz / 10;
		buffer[1] = '0' + rawPrvKeySz % 10;

		for(int i = 0; i < rawPrvKeySz; i++){//Assuming that the length takes two bytes
			buffer[i + 2] = rawPrvKey[i];
		}
		bufferSz = rawPrvKeySz + 2;

		rawPrvKeySz = MAX_LENGTH_MSG;
		ret = wc_ecc_export_x963(key, rawPrvKey, &rawPrvKeySz);
		if(ret != 0){
			Log_Debug("Could not export the public smart meter identity");
			close(fd);
			return -1;
		}

		buffer[bufferSz] = '0' + rawPrvKeySz / 10;
		buffer[bufferSz + 1] = '0' + rawPrvKeySz % 10;

		for(int i = 0; i < rawPrvKeySz; i++){//Assuming that the length takes two bytes
			buffer[bufferSz + 2 + i] = rawPrvKey[i];
		}
		bufferSz += rawPrvKeySz + 2;

		ssize_t ret = write(fd, buffer, bufferSz);
		if (ret == -1) {
			Log_Debug("ERROR: An error occurred while saving the identity key:  %s (%d).\n",
					strerror(errno), errno);
			close(fd);
			return -1;
		} else if (ret < bufferSz) {
			Log_Debug("ERROR: Only wrote %d of %d bytes of the smart meter identity\n", ret, bufferSz);
			close(fd);
			return -1;
		}
		Log_Debug("Exported the smart meter identity key successfully!");
	}else{
		int prvSz = (rawPrvKey[0] - '0') * 10 + rawPrvKey[1] - '0';
		int pubSz = (rawPrvKey[prvSz + 2] - '0') * 10 + rawPrvKey[prvSz + 3] - '0';
		ret = wc_ecc_import_private_key(rawPrvKey + 2, prvSz, rawPrvKey + 4 + prvSz, pubSz, key);
		if(ret != 0){
			Log_Debug("Could not import encoded smart meter identity");
			close(fd);
			return -1;
		}
		Log_Debug("Imported the smart meter identity key successfully!\n");
	}

	close(fd);

	//store key 
	return 0;
}

int exportBase64Pub(ecc_key * key, char * base64PubKey, int * base64Sz){
	byte keyDer[MAX_LENGTH_MSG];
	word32 keyDerSz = sizeof(keyDer);
	
	int ret = wc_ecc_export_point_der(key->idx, &(key->pubkey), keyDer, &keyDerSz);
	if (ret != 0) {
		Log_Debug("Error Exporting the key DER");
		return -1;
	}
	for(int i = 0; i < keyDerSz; i++){
		Log_Debug("0x%02X ", ((byte *)keyDer)[i]);
	}
	Log_Debug("\n");
	if (Base64_Encode_NoNl(keyDer, keyDerSz, base64PubKey, base64Sz)) {
		Log_Debug("Error Encoding the key Base64");
		return -1;
	}
}

void createUpdateInfo(byte * req, ecc_key * key) {
	byte base64PubKey[MAX_LENGTH_MSG] = "";
	int base64Sz = MAX_LENGTH_MSG;

	if(exportBase64Pub(key, base64PubKey, &base64Sz) != 0){
		Log_Debug("Error exporting public key");
		req = NULL;
		return;
	}

	//TODO sing the request
	req[0] = '\0';
	strcat(req, "{\"type\":\"metadata\",\"PK_Master\":\"");
	strcat(req, base64PubKey);//public base64 key
	strcat(req, "\", \"gpsLatittude\":11,\"gpsLongtitude\":11}");
}


void createREC(byte * req, byte * prevTx, byte * owner, ecc_key * key) {
	Sha256 sha256[1];
	byte hashCert[32];
	
	int ret = 0;

	byte sig[1024] = "";
	int sigSz = sizeof(sig);
	byte sigBase64[1024] = "";
	int sigSzBase64 = sizeof(sigBase64);

	WC_RNG rng;
	wc_InitRng(&rng);

	int szToBeHashed = 0;
	req[0] = '\0';
	strcat(req, "\"type\":\"REC\",\"powerProdWh\":1000,\"owner\":\"");
	strcat(req, owner);
	strcat(req, "\",\"prevTx\":\"");
	strcat(req, prevTx);
	strcat(req, "\"");

	szToBeHashed = strlen(req);

	ret = wc_InitSha256(sha256);
	if(ret != 0) {
		Log_Debug("wc_InitSha256 failed");
	}
	else {
		wc_Sha256Update(sha256, req, szToBeHashed);
		wc_Sha256Final(sha256, hashCert);
	}

	ret = wc_ecc_sign_hash((byte *)&hashCert, sizeof(hashCert), sig, &sigSz, &rng, key);
	if (ret != 0) {
		Log_Debug("Error generating signature");
	}

	Log_Debug("Message to hash: ");
	for (int i = 0; i < szToBeHashed; i++) {
		Log_Debug("%c", req[i]);
	}
	Log_Debug("\n");
	Log_Debug("Sha256: ");
	for (int i = 0; i < 32; i++) {
		Log_Debug("0x%02X ", ((byte *)hashCert)[i]);
	}
	Log_Debug("\n");
	
	ret = Base64_Encode_NoNl(sig, sigSz, sigBase64, &sigSzBase64);
	if (ret != 0) {
		Log_Debug("Error Encoding the signature in Base64");
	}
	Log_Debug("Base64 signature encoded: ");
	for (int i = 0; i < sigSzBase64; i++) {
		Log_Debug("%c", sigBase64[i]);
	}
	Log_Debug("\n");

	char temp[1024] = "";
	//TODO: Fix this. Not Safe
	strcat(temp, "{");
	strcat(temp, req);
	strcpy(req, temp);
	strcat(req, ",\"sigDevice\":\"");
	strcat(req, sigBase64);
	strcat(req, "\"}");
	return req;
}