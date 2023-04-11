#include <ESP8266WiFi.h>
#include <DFRobot_DHT11.h>
#include <ArduinoJson.h>
#include <WiFiUdp.h>
#include <NTPClient.h>

#include "aWOT.h"
#include "StaticFiles.h"


// Set up temp sensort DHT11
DFRobot_DHT11 DHT;
#define DHT11_PIN D4
#define ALARM_PIN D3


// Define wifi connection
#define WIFI_SSID "yourssid"
#define WIFI_PASSWORD "********"


// Define real time
const long utcOffsetInSeconds = 3600;
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "fi.pool.ntp.org", utcOffsetInSeconds); // Use your own location

// Define server
WiFiServer server(80);
Application app;
bool alarmOn;

// Define times
unsigned long minutes_since_start = 0; 
unsigned refresh_rate = 1; // min


// Storing history data
const int LAST_N_VALS = 15;
float temps[LAST_N_VALS];
float humids[LAST_N_VALS];
unsigned long times[LAST_N_VALS];

// These global variables set up the upper and lower alarming bound
int upper_temp_bound = 25;
int lower_temp_bound = 20;

// Adds temperature and humid and time data to arrays
void add_values(float temp, float humid, unsigned long time) {

  for(int i = LAST_N_VALS - 1; i > 0; i--){
    temps[i] = temps[i - 1];
    humids[i] = humids[i - 1];
    times[i] = times[i - 1];
  }
  temps[0] = temp;
  humids[0] = humid;
  times[0] = time;
}


// Adds values into arraylogs
void log_values(){

  // Read temperature and humidity
  DHT.read(DHT11_PIN);
  float temperature = DHT.temperature + 2;
  float humidity = DHT.humidity;
  
  // Get the current time
  timeClient.update();
  unsigned long time = timeClient.getEpochTime() - 3600;

  // Log values
  add_values(temperature, humidity, time);

}


// These methods are used to monitor alarm status and handel requests coming from the frontend
void readAlarm(Request &req, Response &res) {
  //Serial.println("Request recieved READ");
  res.print(alarmOn);
}

void updateAlarm(Request &req, Response &res) {
  //Serial.println("Request recieved UPDATE");
  alarmOn = (req.read() == '0');
  digitalWrite(ALARM_PIN, 0); // upon change always disbale current alarm
  return readAlarm(req, res);
}

// Updates bounds with given put request
void updateBounds(Request &req, Response &res) {
  String sent_data = req.readString();

  DynamicJsonDocument doc(1024);
  deserializeJson(doc, sent_data);

  upper_temp_bound = (int)doc["upper_temp_bound"];
  lower_temp_bound = (int)doc["lower_temp_bound"];
  refresh_rate = (int)doc["refresh_rate"];

  res.status(200); 
  
}

// Gets all the main current data
void getAllData(Request &req, Response &res) {
  // Read temperature and humidity
  DHT.read(DHT11_PIN);
  float temperature = DHT.temperature + 2;
  float humidity = DHT.humidity;
  
  // Get the current time
  timeClient.update();
  unsigned long time = timeClient.getEpochTime() - 3600;
  
  // Create a JSON object
  DynamicJsonDocument doc(2048);
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;
  doc["time"] = time;
  doc["lower_temp_bound"] = lower_temp_bound;
  doc["upper_temp_bound"] = upper_temp_bound;
  doc["refresh_rate"] = refresh_rate; 

  for (int i = 0; i < LAST_N_VALS; i++) {
    doc["history"][(String)i]["temperature"] = temps[i];
    doc["history"][(String)i]["humidity"] = humids[i];
    doc["history"][(String)i]["time"] = times[i];
  }

  // Convert the JSON object to a string
  String jsonString;
  serializeJson(doc, jsonString);

  // Send the JSON string as the response
  res.set("Content-Type", "application/json");
  res.print(jsonString);
}


void setup() {

  // Setting up Alarm and serial
  pinMode(ALARM_PIN, OUTPUT);
  Serial.begin(115200);

  delay(500);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.println("Pending...");
  }
  Serial.println(WiFi.localIP());

  app.get("/alarm", &readAlarm);
  app.put("/alarm", &updateAlarm);

  app.put("/update_bounds", &updateBounds);

  app.get("/allData", &getAllData);

  app.use(staticFiles());

  server.begin();

}

void loop() {
  WiFiClient client = server.available();

  if (client.connected()) {
    Serial.print("Request from " + client.remoteIP().toString() + " -> ");
    app.process(&client);
  }

  // This script measures every 30 minutes!!
  if(millis()/60000 - minutes_since_start >= refresh_rate){
    minutes_since_start = millis()/60000;
    Serial.println(); 
    Serial.println("minutes passed: " + (String)minutes_since_start);
    
    log_values();

    if(temps[0] < lower_temp_bound || temps[0] > upper_temp_bound){

      digitalWrite(ALARM_PIN, alarmOn);
    }
  }
}