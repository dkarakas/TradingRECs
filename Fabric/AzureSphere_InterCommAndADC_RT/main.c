/* Copyright (c) Microsoft Corporation. All rights reserved.
   Licensed under the MIT License. */

#include <ctype.h>
#include <stddef.h>
#include <stdbool.h>
#include <stdint.h>
#include <errno.h>
#include <limits.h>

#include "mt3620-baremetal.h"
#include "mt3620-intercore.h"
#include "mt3620-timer-poll.h"
#include "mt3620-uart-poll.h"
#include "mt3620-adc.h"

extern uint32_t StackTop; // &StackTop == end of TCM0

static _Noreturn void DefaultExceptionHandler(void);

static void PrintBytes(const uint8_t *buf, int start, int end);
static void PrintGuid(const uint8_t *guid);

static _Noreturn void RTCoreMain(void);

// ARM DDI0403E.d SB1.5.2-3
// From SB1.5.3, "The Vector table must be naturally aligned to a power of two whose alignment
// value is greater than or equal to (Number of Exceptions supported x 4), with a minimum alignment
// of 128 bytes.". The array is aligned in linker.ld, using the dedicated section ".vector_table".

// The exception vector table contains a stack pointer, 15 exception handlers, and an entry for
// each interrupt.
#define INTERRUPT_COUNT 100 // from datasheet
#define EXCEPTION_COUNT (16 + INTERRUPT_COUNT)
#define INT_TO_EXC(i_) (16 + (i_))
const uintptr_t ExceptionVectorTable[EXCEPTION_COUNT] __attribute__((section(".vector_table")))
__attribute__((used)) = {
    [0] = (uintptr_t)&StackTop,                // Main Stack Pointer (MSP)
    [1] = (uintptr_t)RTCoreMain,               // Reset
    [2] = (uintptr_t)DefaultExceptionHandler,  // NMI
    [3] = (uintptr_t)DefaultExceptionHandler,  // HardFault
    [4] = (uintptr_t)DefaultExceptionHandler,  // MPU Fault
    [5] = (uintptr_t)DefaultExceptionHandler,  // Bus Fault
    [6] = (uintptr_t)DefaultExceptionHandler,  // Usage Fault
    [11] = (uintptr_t)DefaultExceptionHandler, // SVCall
    [12] = (uintptr_t)DefaultExceptionHandler, // Debug monitor
    [14] = (uintptr_t)DefaultExceptionHandler, // PendSV
    [15] = (uintptr_t)DefaultExceptionHandler, // SysTick

    [INT_TO_EXC(0)... INT_TO_EXC(INTERRUPT_COUNT - 1)] = (uintptr_t)DefaultExceptionHandler};

static _Noreturn void DefaultExceptionHandler(void)
{
    for (;;) {
        // empty.
    }
}

static void PrintBytes(const uint8_t *buf, int start, int end)
{
    int step = (end >= start) ? +1 : -1;

    for (/* nop */; start != end; start += step) {
        Uart_WriteHexBytePoll(buf[start]);
    }
    Uart_WriteHexBytePoll(buf[end]);
}

static void PrintGuid(const uint8_t *guid)
{
    PrintBytes(guid, 3, 0); // 4-byte little-endian word
    Uart_WriteStringPoll("-");
    PrintBytes(guid, 5, 4); // 2-byte little-endian half
    Uart_WriteStringPoll("-");
    PrintBytes(guid, 7, 6); // 2-byte little-endian half
    Uart_WriteStringPoll("-");
    PrintBytes(guid, 8, 9); // 2 bytes
    Uart_WriteStringPoll("-");
    PrintBytes(guid, 10, 15); // 6 bytes
}

static _Noreturn void RTCoreMain(void)
{
    // SCB->VTOR = ExceptionVectorTable
    WriteReg32(SCB_BASE, 0x08, (uint32_t)ExceptionVectorTable);

    Uart_Init();
    Uart_WriteStringPoll("--------------------------------\r\n");
    Uart_WriteStringPoll("AzureSpher_InterCommAndADC_RT\r\n");
    Uart_WriteStringPoll("App built on: " __DATE__ ", " __TIME__ "\r\n");

    BufferHeader *outbound, *inbound;
    uint32_t sharedBufSize = 0;
    if (GetIntercoreBuffers(&outbound, &inbound, &sharedBufSize) == -1) {
        for (;;) {
            // empty.
        }
    }

    static const size_t payloadStart = 20;

	EnableAdc();

    for (;;) {
		//xxxx%dxxxx%d
		//Setting the header. Taken from a received message.
		uint8_t buf[256] = { 0x5F, 0xAE, 0x32, 0xef, 0xf5, 0x77, 0x29, 0x47, 0xb3, 0xc1, 0xbf, 0x68, 0x02, 0x0f, 0xb0, 0x3f, 0xad, 0x00, 0x00, 0x00};
		uint32_t dataSize = sizeof(buf);
	
		//Waiting time
		Gpt3_WaitUs(1000 * 1000);

		uint32_t valueCurrent = ReadAdc(0);
		uint32_t valueVoltage = ReadAdc(1);

		// Write whole-part, ".", fractional-part
		uint32_t mVCurrent = (valueCurrent * 2500) / 0xFFF;

		Uart_WriteStringPoll("Read the following current value \r\n");

		Uart_WriteIntegerPoll(mVCurrent / 1000);
		Uart_WriteStringPoll(".");
		Uart_WriteIntegerWidthPoll(mVCurrent % 1000, 3);
		Uart_WriteStringPoll("\r\n");
		//uint8_t buf[256];
		//uint32_t dataSize = sizeof(buf);
		buf[payloadStart] = '0' + mVCurrent / 1000 % 10;
		buf[payloadStart + 1] = '.';
		buf[payloadStart + 2] = '0' + mVCurrent % 1000 / 100;
		buf[payloadStart + 3] = '0' + mVCurrent % 100 / 10;
		buf[payloadStart + 4] = '0' + mVCurrent % 10 ;

		// Write whole-part, ".", fractional-part
		uint32_t mVVoltage = (valueVoltage * 2500) / 0xFFF;
		Uart_WriteStringPoll("Read the following voltage value \r\n");

		Uart_WriteIntegerPoll(mVVoltage / 1000);
		Uart_WriteStringPoll(".");
		Uart_WriteIntegerWidthPoll(mVVoltage % 1000, 3);
		Uart_WriteStringPoll("\r\n");
		//uint8_t buf[256];
		//uint32_t dataSize = sizeof(buf);
		buf[payloadStart + 5] = '0' + mVVoltage / 1000 % 10;
		buf[payloadStart + 6] = '.';
		buf[payloadStart + 7] = '0' + mVVoltage % 1000 / 100;
		buf[payloadStart + 8] = '0' + mVVoltage % 100 / 10;
		buf[payloadStart + 9] = '0' + mVVoltage % 10;
        EnqueueData(inbound, outbound, sharedBufSize, buf, dataSize);
    }
}
