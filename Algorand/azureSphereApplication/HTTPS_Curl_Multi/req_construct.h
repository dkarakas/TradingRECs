#pragma once

#include <applibs/log.h>

/* socket includes */
#include <sys/socket.h>
#include <arpa/inet.h>
#include <netinet/in.h>
#include <unistd.h>

/* wolfSSL */
#include <wolfssl/wolfcrypt/settings.h>
#include <wolfssl/ssl.h>
#include <wolfssl/certs_test.h>
#include <wolfssl/wolfcrypt/ecc.h>
#include <wolfssl/wolfcrypt/random.h>
#include <wolfssl/wolfcrypt/coding.h>

char * regRequest(byte *);

char * certRequest(byte *, byte *, byte *);