#pragma once

#include <applibs/log.h>

/* socket includes */
#include <sys/socket.h>
#include <arpa/inet.h>
#include <netinet/in.h>
#include <unistd.h>

/* wolfSSL */
#include "user_settings.h"
#include "wolfssl/wolfcrypt/settings.h"
#include "wolfssl/ssl.h"
#include "wolfssl/certs_test.h"
#include "wolfssl/wolfcrypt/ecc.h"
#include "wolfssl/wolfcrypt/random.h"
#include "wolfssl/wolfcrypt/coding.h"


#include <applibs/storage.h>
#include <stdlib.h>

#define MAX_LENGTH_MSG 1024

void createUpdateInfo(byte *, ecc_key *);

void createREC(byte *, byte *, byte *, ecc_key *);

int exportBase64Pub(ecc_key * key, char * base64PubKey, int * base64Sz);

int getSphereIdentity(ecc_key * key);

int createSmartMeterIdentity(ecc_key * key);