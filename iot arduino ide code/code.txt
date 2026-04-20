#include <WiFi.h>
#include <WebServer.h>
#include <DHT.h>
#include <time.h>
#include <PubSubClient.h>

#define DHTPIN 15
#define DHTTYPE DHT11

#define PIN_FLAME 23
#define PIN_MOTION 4
#define PIN_BUZZER 5
#define LDR_PIN 34
#define LED_PIN 2
#define LED_PIN_YELLOW 25

#define LED1 13
#define LED2 12
#define LED3 14
#define LED4 27
#define LED5 26

int ldrDigital = 0;
int lightThreshold = 1500;

const char* ssid = "Anamika";
const char* password = "anamika079";

String apiKey = "J7HWFZ4R9U442CRI";

const char* mqtt_server = "broker.hivemq.com";

WiFiClient espClient;
PubSubClient mqttClient(espClient);

unsigned long lastTimeESP = 0;
unsigned long timerDelay = 5000;

float currentTemp = 0.0;
float currentHum = 0.0;
int flameDetected = 0;
int motionDetected = 0;
int ldrValue = 0;

bool buzzerEnabled = false;
bool lightState = false;
bool systemArmed = true;

DHT dht(DHTPIN, DHTTYPE);
WebServer server(80);

const long utcOffsetInSeconds = 19800;

// -------- MQTT --------
void reconnectMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("Connecting to MQTT...");
    if (mqttClient.connect("ESP32Client_Hospital1")) {
      Serial.println("MQTT Connected!");
    } else {
      Serial.print("Failed, rc=");
      Serial.println(mqttClient.state());
      delay(2000);
    }
  }
}

void publishMQTT() {
  String payload = "{";
  payload += "\"temperature\":" + String(currentTemp, 1) + ",";
  payload += "\"humidity\":" + String(currentHum, 1) + ",";
  payload += "\"flame\":" + String(flameDetected) + ",";
  payload += "\"motion\":" + String(motionDetected) + ",";
  payload += "\"ldr\":" + String(ldrValue);
  payload += "}";

  bool result = mqttClient.publish("hospital/room1", payload.c_str());
  Serial.println(result ? "MQTT Published!" : "MQTT Publish Failed");
}

// -------- HELPERS --------
String getTimestamp() {
  time_t now = time(nullptr);
  if (now < 100000) return "Time not synced";
  struct tm* timeinfo = localtime(&now);
  char buffer[50];
  strftime(buffer, sizeof(buffer), "%Y-%m-%d %H:%M:%S", timeinfo);
  return String(buffer);
}

// -------- SENSORS --------
void readSensors() {
  float t = dht.readTemperature();
  float h = dht.readHumidity();

  if (!isnan(t)) currentTemp = t;
  if (!isnan(h)) currentHum = h;

  flameDetected = digitalRead(PIN_FLAME);
  motionDetected = digitalRead(PIN_MOTION);
  ldrValue = analogRead(LDR_PIN);
  ldrDigital = (ldrValue < lightThreshold) ? 1 : 0;

  if (systemArmed) {
    if (flameDetected == HIGH) {
      digitalWrite(PIN_BUZZER, HIGH);
      digitalWrite(LED_PIN, HIGH);
      lightState = true;
    } else if (motionDetected == HIGH) {
      digitalWrite(LED_PIN_YELLOW, HIGH);
      if (buzzerEnabled) digitalWrite(PIN_BUZZER, HIGH);
      lightState = true;
    } else {
      digitalWrite(LED_PIN_YELLOW, LOW);
      digitalWrite(LED_PIN, LOW);
      digitalWrite(PIN_BUZZER, LOW);
      lightState = false;
    }
  } else {
    digitalWrite(PIN_BUZZER, LOW);
    digitalWrite(LED_PIN, LOW);
    digitalWrite(LED_PIN_YELLOW, LOW);
    lightState = false;
  }

  if (ldrDigital == 0) {
    digitalWrite(LED1, HIGH); digitalWrite(LED2, HIGH);
    digitalWrite(LED3, HIGH); digitalWrite(LED4, HIGH);
    digitalWrite(LED5, HIGH);
  } else {
    digitalWrite(LED1, LOW); digitalWrite(LED2, LOW);
    digitalWrite(LED3, LOW); digitalWrite(LED4, LOW);
    digitalWrite(LED5, LOW);
  }
}

// -------- THINGSPEAK --------
void uploadToThingSpeak() {
  WiFiClient client;
  if (!client.connect("api.thingspeak.com", 80)) {
    Serial.println("ThingSpeak failed");
    return;
  }
  String url = "/update?api_key=" + apiKey +
               "&field1=" + String(currentTemp) +
               "&field2=" + String(currentHum) +
               "&field3=" + String(flameDetected) +
               "&field4=" + String(motionDetected) +
               "&field5=" + String(ldrValue) +
               "&field6=" + String(ldrDigital);

  client.print(String("GET ") + url + " HTTP/1.1\r\n" +
               "Host: api.thingspeak.com\r\n" +
               "Connection: close\r\n\r\n");
  Serial.println("ThingSpeak uploaded");
}

// -------- API HANDLERS --------
void handleOptions() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  server.send(204);
}

void handleRoot() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "text/html", "<h1>Smart Monitoring System</h1>");
}

void apiStatus() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  String json = "{";
  json += "\"temperature\":" + String(currentTemp, 2) + ",";
  json += "\"humidity\":" + String(currentHum, 2) + ",";
  json += "\"ldrValue\":" + String(ldrValue) + ",";
  json += "\"motionDetected\":" + String(motionDetected) + ",";
  json += "\"flameDetected\":" + String(flameDetected) + ",";
  json += "\"lightState\":" + String(lightState ? "true" : "false") + ",";
  json += "\"buzzerEnabled\":" + String(buzzerEnabled ? "true" : "false") + ",";
  json += "\"systemArmed\":" + String(systemArmed ? "true" : "false") + ",";
  json += "\"timestamp\":\"" + getTimestamp() + "\"";
  json += "}";
  server.send(200, "application/json", json);
}

void toggleLight() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  lightState = !lightState;
  digitalWrite(LED_PIN, lightState ? HIGH : LOW);
  server.send(200, "application/json",
    "{\"lightState\":\"" + String(lightState ? "ON" : "OFF") + "\"}");
}

void toggleBuzzer() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  buzzerEnabled = !buzzerEnabled;
  if (!buzzerEnabled) digitalWrite(PIN_BUZZER, LOW);
  server.send(200, "application/json",
    "{\"buzzerEnabled\":" + String(buzzerEnabled ? "true" : "false") + "}");
}

void systemControl() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  if (server.hasArg("plain")) {
    String command = server.arg("plain");
    if (command == "arm=true") systemArmed = true;
    else if (command == "arm=false") {
      systemArmed = false;
      digitalWrite(PIN_BUZZER, LOW);
      digitalWrite(LED_PIN, LOW);
      digitalWrite(LED_PIN_YELLOW, LOW);
    }
    server.send(200, "application/json",
      "{\"systemArmed\":" + String(systemArmed ? "true" : "false") + "}");
  }
}

void getSensorLogs() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  String logs = "Timestamp: " + getTimestamp() + "\n";
  logs += "Temperature: " + String(currentTemp, 2) + " C\n";
  logs += "Humidity: " + String(currentHum, 2) + " %\n";
  server.send(200, "text/plain", logs);
}

// -------- SETUP --------
void setup() {
  Serial.begin(115200);
  dht.begin();

  pinMode(PIN_FLAME, INPUT);
  pinMode(PIN_MOTION, INPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(LED_PIN_YELLOW, OUTPUT);
  pinMode(LDR_PIN, INPUT);
  pinMode(LED1, OUTPUT); pinMode(LED2, OUTPUT);
  pinMode(LED3, OUTPUT); pinMode(LED4, OUTPUT);
  pinMode(LED5, OUTPUT);

  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected! IP: " + WiFi.localIP().toString());

  configTime(utcOffsetInSeconds, 0, "pool.ntp.org");

  mqttClient.setServer(mqtt_server, 1883);

  server.on("/", handleRoot);
  server.on("/update", HTTP_GET, [](){ server.send(200, "application/json", "{\"status\":\"ok\"}"); });
  server.on("/status", HTTP_GET, apiStatus);
  server.on("/status", HTTP_OPTIONS, handleOptions);
  server.on("/toggle-light", HTTP_POST, toggleLight);
  server.on("/toggle-light", HTTP_OPTIONS, handleOptions);
  server.on("/toggle-buzzer", HTTP_POST, toggleBuzzer);
  server.on("/toggle-buzzer", HTTP_OPTIONS, handleOptions);
  server.on("/sensor-logs", HTTP_GET, getSensorLogs);
  server.on("/system-control", HTTP_POST, systemControl);
  server.on("/system-control", HTTP_OPTIONS, handleOptions);

  server.begin();
  Serial.println("HTTP Server started");
}

// -------- LOOP --------
void loop() {
  server.handleClient();

  // MQTT keep-alive (runs every loop)
  if (!mqttClient.connected()) reconnectMQTT();
  mqttClient.loop();

  // Sensors run fast — every 100ms for instant buzzer/LED response
  readSensors();

  // ThingSpeak + MQTT publish every 5 seconds
  if ((millis() - lastTimeESP) > timerDelay) {
    lastTimeESP = millis();
    uploadToThingSpeak();
    publishMQTT();
  }

  delay(100);
}