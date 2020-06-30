#!/bin/bash
curl -k --request POST --data '{"PK_Master":"1","gpsLatittude":10, "gpsLongtitude":10}' https://localhost/register
echo ""
sleep 3
curl -k --request POST --data '{"PK_Master":"2","gpsLatittude":60, "gpsLongtitude":0}' https://localhost/register
echo ""
sleep 3
curl -k --request POST --data '{"PK_Master":"3","gpsLatittude":530, "gpsLongtitude":3210}' https://localhost/register
echo ""
sleep 3
curl -k --request POST --data '{"PK_Master":"4","gpsLatittude":2310, "gpsLongtitude":10}' https://localhost/register
echo ""
sleep 3
curl -k --request POST --data '{"PK_Master":"5","gpsLatittude":66660, "gpsLongtitude":200}' https://localhost/register
echo ""
sleep 3
curl -k --request POST --data '{"PK_Master":"6","gpsLatittude":3210, "gpsLongtitude":2230}' https://localhost/register
echo ""
sleep 3
curl -k --request POST --data '{"PK_Master":"7","gpsLatittude":2310, "gpsLongtitude":5650}' https://localhost/register
echo ""
sleep 3
curl -k --request POST --data '{"PK_Master":"8","gpsLatittude":60, "gpsLongtitude":70}' https://localhost/register
echo ""
sleep 3
curl -k --request POST --data '{"PK_Master":"9","gpsLatittude":40, "gpsLongtitude":40}' https://localhost/register
echo ""
