#include "req_construct.h"


char *getBase64Key(byte * base64Key, word32 base64KeySz) {
	//word32 reqSize = sizeof(req);
	byte keyDer[1024]; //todo check if 1024 is enough
	word32 keyDerSz = sizeof(keyDer);
	//byte base64Key[1024] = ""; //todo check if 1024 is enough
	//word32 base64KeySz = sizeof(base64Key);


	ecc_key key;
	wc_ecc_init(&key);
	WC_RNG rng;
	wc_InitRng(&rng);
	int ret = wc_ecc_make_key_ex(&rng, 32, &key, ECC_SECP256K1); // initialize 32 byte ecc key
	if (ret != 0) {
		Log_Debug("There was an error while generating key %d \n", ret);
	}
	else {
		ret = wc_ecc_export_point_der(key.idx, &key.pubkey, keyDer, &keyDerSz);
		if (ret != 0) {
			Log_Debug("Error Exporting the key DER");
		}
		else {
			//for (int i = 0; i < buffSz; i++) {
			//	Log_Debug("%c", buff[i]);
			//}
			//Log_Debug("\n");
		}
		if (Base64_Encode_NoNl(keyDer, keyDerSz, base64Key, &base64KeySz)) {
			Log_Debug("Error Encoding the key Base64");
		}
		Log_Debug("Base64 Key encoded: ");
		for (int i = 0; i < base64KeySz; i++) {
			Log_Debug("%c", base64Key[i]);
		}
		Log_Debug("\n");
		//base64Key[base64KeySz] = '\0'; It is already added if there is room for it
	}
}

char * regRequest(byte * req) {
	byte key[1024] = "";
	getBase64Key(key, sizeof(key));
	strcat(req, "{\"type\":\"DeviceReg\",\"PK_Master\":\"");
	strcat(req, key);
	strcat(req, "\", \"gpsLatittude\":11,\"gpsLongtitude\":11}");
	return req;
}


char * certRequest(byte * req, byte * prevTx, byte * owner) {

	//TODO: REMOVE THE REGENARTION OF THE KEY AND USE SAVED KEY 
	ecc_key key;
	wc_ecc_init(&key);
	WC_RNG rng;

	Sha256 sha256[1];
	byte hashCert[32];

	byte sig[1024] = "";
	int sigSz = sizeof(sig);
	byte sigBase64[1024] = "";
	int sigSzBase64 = sizeof(sigBase64);

	wc_InitRng(&rng);
	int ret = wc_ecc_make_key_ex(&rng, 32, &key, ECC_SECP256K1); // initialize 32 byte ecc key
	if (ret != 0) {
		Log_Debug("Error generation of the key!");
	}

	int szToBeHashed = 0;
	req[0] = '\0';
	strcat(req, "\"type\":\"Cert\",\"powerProdWh\":1000,\"owner\":\"");
	strcat(req, owner);
	//strcat(req, "\"}");
	strcat(req, "\",\"prevTx\":\"");
	strcat(req, prevTx);
	strcat(req, "\"");

	while (req[szToBeHashed++] != '\0');
	szToBeHashed--;
	if ((ret = wc_InitSha256(sha256)) != 0) {
		WOLFSSL_MSG("wc_InitSha256 failed");
	}
	else {
		wc_Sha256Update(sha256, req, szToBeHashed);
		wc_Sha256Final(sha256, hashCert);
	}

	ret = wc_ecc_sign_hash((byte *)&hashCert, sizeof(hashCert), sig, &sigSz, &rng, &key);
	Log_Debug("Message hashing: ");
	for (int i = 0; i < szToBeHashed; i++) {
		Log_Debug("%c", req[i]);
	}
	Log_Debug("\n");
	Log_Debug("Sha256: ");
	for (int i = 0; i < 32; i++) {
		Log_Debug("0x%02X ", ((byte *)hashCert)[i]);
	}
	

	Log_Debug("\n");
	Log_Debug("here");
	if (ret != 0) {
		Log_Debug("Error generating signature");
	}
	
	if (Base64_Encode_NoNl(sig, sigSz, sigBase64, &sigSzBase64)) {
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