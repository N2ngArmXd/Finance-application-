# ใช้ตอน deploy บน Render (Free: RAM 512MB) · dev ในเครื่องไม่ต้องใช้ไฟล์นี้

# --- build: compile เป็น jar ---
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
# โหลด dependency ก่อน copy source → แก้โค้ดแล้ว build ใหม่ไม่ต้องโหลดซ้ำ
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B -DskipTests package

# --- run: ใช้แค่ JRE ให้ image เล็ก ---
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
# จำกัด memory ให้พอดี 512MB + start เร็วขึ้น (ช่วยตอน Render ปลุกจากหลับ)
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=70 -XX:+UseSerialGC -Xss512k -XX:TieredStopAtLevel=1"
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "app.jar"]
