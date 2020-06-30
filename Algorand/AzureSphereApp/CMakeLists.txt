#  Copyright (c) Microsoft Corporation. All rights reserved.
#  Licensed under the MIT License.

cmake_minimum_required(VERSION 3.10)

project(HelloWorld_HighLevelApp C)

azsphere_configure_tools(TOOLS_REVISION "20.04")
azsphere_configure_api(TARGET_API_SET "5")


FILE(GLOB MY_SOURCES "./source/*.c")
 
INCLUDE_DIRECTORIES(./include/ ./wolfssl/)

ADD_DEFINITIONS(-D NO_MAIN_DRIVER)
ADD_DEFINITIONS(-D WOLFSSL_USER_SETTINGS)
ADD_DEFINITIONS(-D WOLFSSL_LIB)
ADD_DEFINITIONS(-D _POSIX_C_SOURCE)

add_executable(${PROJECT_NAME} main.c ${MY_SOURCES})
target_link_libraries(${PROJECT_NAME} applibs pthread gcc_s c curl tlsutils)

azsphere_target_hardware_definition(${PROJECT_NAME} TARGET_DIRECTORY "./Hardware/mt3620_rdb" TARGET_DEFINITION "sample_hardware.json")

azsphere_target_add_image_package(${PROJECT_NAME} RESOURCE_FILES "certs/ca-crt.pem")
